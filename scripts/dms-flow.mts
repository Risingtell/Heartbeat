import "dotenv/config";
import {
  createPublicClient, createWalletClient, http, defineChain,
  encodeAbiParameters, toHex, parseEther, formatEther,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { CDRClient, initWasm, uuidToLabel } from "@piplabs/cdr-sdk";
import deployments from "../deployments.json" with { type: "json" };

const RPC = process.env.STORY_RPC_URL ?? "https://aeneid.storyrpc.io";
const API = process.env.CDR_API_URL ?? "http://172.192.41.96:1317";
const DMS = deployments.aeneid.deadManSwitch as `0x${string}`;
const OWNER_WRITE = deployments.aeneid.ownerWriteCondition as `0x${string}`;
const ALWAYS_ALLOW = "0xe866296168cb98c437b15b1ce623696738dc897a" as `0x${string}`; // returns true for any caller

const aeneid = defineChain({
  id: 1315,
  name: "Story Aeneid",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

const dmsAbi = [
  { type: "function", name: "configure", stateMutability: "nonpayable",
    inputs: [
      { name: "guardians", type: "address[]" }, { name: "guardianThreshold", type: "uint32" },
      { name: "challengeWindow", type: "uint64" },
    ], outputs: [] },
  { type: "function", name: "heartbeat", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "demoExpire", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "isClaimable", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "period", type: "uint64" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "checkReadCondition", stateMutability: "view",
    inputs: [{ name: "uuid", type: "uint32" }, { name: "conditionData", type: "bytes" }, { name: "accessAuxData", type: "bytes" }, { name: "caller", type: "address" }],
    outputs: [{ type: "bool" }] },
] as const;

const PERIOD = 120n; // per-vault inactivity window for this test

const ok = (b: boolean, msg: string) => console.log(`${b ? "[OK]  " : "[FAIL]"} ${msg}`);

async function main() {
  await initWasm();
  const owner = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  const heir = privateKeyToAccount(generatePrivateKey());
  console.log("owner:", owner.address);
  console.log("heir :", heir.address);

  const publicClient = createPublicClient({ chain: aeneid, transport: http(RPC) });
  const ownerWallet = createWalletClient({ account: owner, chain: aeneid, transport: http(RPC) });
  const heirWallet = createWalletClient({ account: heir, chain: aeneid, transport: http(RPC) });
  const ownerClient = new CDRClient({ network: "testnet", publicClient, walletClient: ownerWallet, apiUrl: API });
  const heirClient = new CDRClient({ network: "testnet", publicClient, walletClient: heirWallet, apiUrl: API });

  // 1. Fund the heir with a little gas (read fee is 0, but the read tx needs gas).
  console.log("\n1) funding heir with 1 IP for gas...");
  const fundTx = await ownerWallet.sendTransaction({ to: heir.address, value: parseEther("1"), account: owner, chain: aeneid });
  await publicClient.waitForTransactionReceipt({ hash: fundTx });
  console.log("   heir balance:", formatEther(await publicClient.getBalance({ address: heir.address })), "IP");

  // 2. Owner configures the proof-of-life clock (no guardians for this test).
  console.log("\n2) owner.configure(no guardians)...");
  const cfgTx = await ownerWallet.writeContract({
    address: DMS, abi: dmsAbi, functionName: "configure",
    args: [[], 0, 0n], account: owner, chain: aeneid,
  });
  await publicClient.waitForTransactionReceipt({ hash: cfgTx });

  // 3. Owner allocates a vault gated by DeadManSwitch (both write & read), writes a secret.
  //    conditionData binds (owner, heir, period) to this specific vault.
  console.log("\n3) owner allocates vault + writes secret...");
  const conditionData = encodeAbiParameters(
    [{ type: "address" }, { type: "address" }, { type: "uint64" }],
    [owner.address, heir.address, PERIOD],
  );
  const { uuid } = await ownerClient.uploader.allocate({
    updatable: false,
    writeConditionAddr: DMS, readConditionAddr: DMS, // self-contained: DMS gates both write and read
    writeConditionData: conditionData, readConditionData: conditionData,
    skipConditionValidation: true,
  });
  const dataKey = crypto.getRandomValues(new Uint8Array(32));
  const ciphertext = await ownerClient.uploader.encryptDataKey({ dataKey, label: uuidToLabel(uuid) });
  await ownerClient.uploader.write({ uuid, accessAuxData: "0x", encryptedData: toHex(ciphertext.raw) });
  console.log("   vault uuid:", uuid, "| secret:", Buffer.from(dataKey).toString("hex"));

  // 4. BEFORE expiry: heir must be blocked.
  const claimableBefore = await publicClient.readContract({ address: DMS, abi: dmsAbi, functionName: "isClaimable", args: [owner.address, PERIOD] });
  const readGateBefore = await publicClient.readContract({ address: DMS, abi: dmsAbi, functionName: "checkReadCondition", args: [0, conditionData, "0x", heir.address] });
  ok(claimableBefore === false, `before expiry: isClaimable == ${claimableBefore} (want false)`);
  ok(readGateBefore === false, `before expiry: checkReadCondition(heir) == ${readGateBefore} (want false)`);

  // 4b. An attacker supplying a non-empty accessAuxData must be rejected (arg-confusion guard).
  const injected = await publicClient.readContract({ address: DMS, abi: dmsAbi, functionName: "checkReadCondition", args: [0, conditionData, conditionData, heir.address] });
  ok(injected === false, `accessAuxData injection rejected: checkReadCondition == ${injected} (want false)`);

  // 4c. BEFORE expiry the heir's REAL CDR read must fail at the validators -- this
  //     proves gating happens in the TEEs, not just in the on-chain view above.
  //     Short timeout so a correctly-gated (hanging/refused) read doesn't block long.
  console.log("\n4c) heir.accessCDR() BEFORE expiry (expected to be rejected)...");
  let earlyBlocked = false;
  try {
    await heirClient.consumer.accessCDR({ uuid, accessAuxData: "0x", timeoutMs: 30_000 });
  } catch {
    earlyBlocked = true; // refused / timed out collecting partials == correctly gated
  }
  ok(earlyBlocked, `before expiry: accessCDR rejected by validators (want rejected)`);

  // 5. Owner triggers demo expiry (simulates going inactive).
  console.log("\n5) owner.demoExpire() (simulate inactivity)...");
  const expTx = await ownerWallet.writeContract({ address: DMS, abi: dmsAbi, functionName: "demoExpire", args: [], account: owner, chain: aeneid });
  await publicClient.waitForTransactionReceipt({ hash: expTx });

  const claimableAfter = await publicClient.readContract({ address: DMS, abi: dmsAbi, functionName: "isClaimable", args: [owner.address, PERIOD] });
  const readGateAfter = await publicClient.readContract({ address: DMS, abi: dmsAbi, functionName: "checkReadCondition", args: [0, conditionData, "0x", heir.address] });
  ok(claimableAfter === true, `after expiry: isClaimable == ${claimableAfter} (want true)`);
  ok(readGateAfter === true, `after expiry: checkReadCondition(heir) == ${readGateAfter} (want true)`);

  // 6. Heir claims via CDR (real validator threshold decryption).
  console.log("\n6) heir.accessCDR() (collecting partials, ~30-60s)...");
  const got = await heirClient.consumer.accessCDR({ uuid, accessAuxData: "0x", timeoutMs: 120_000 });
  const recovered = Buffer.from(got.dataKey).toString("hex");
  ok(recovered === Buffer.from(dataKey).toString("hex"), `heir recovered secret: ${recovered}`);

  console.log("\nDONE.");
}

main().catch((e) => { console.error("\n[ERROR]", e?.shortMessage ?? e); process.exit(1); });
