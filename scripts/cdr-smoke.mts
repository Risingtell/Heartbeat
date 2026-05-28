import "dotenv/config";
import { createPublicClient, createWalletClient, http, defineChain, formatEther, encodeAbiParameters, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CDRClient, initWasm, uuidToLabel } from "@piplabs/cdr-sdk";

const RPC = process.env.STORY_RPC_URL ?? "https://aeneid.storyrpc.io";
const API = process.env.CDR_API_URL ?? "http://172.192.41.96:1317";
// Pre-deployed OwnerWriteCondition on Aeneid (only the encoded owner may write)
const OWNER_WRITE = "0x4C9bFC96d7092b590D497A191826C3dA2277c34B" as const;

const aeneid = defineChain({
  id: 1315,
  name: "Story Aeneid",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

async function main() {
  const pk = process.env.PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) throw new Error("Set PRIVATE_KEY in .env");

  console.log("- initWasm...");
  await initWasm();

  const account = privateKeyToAccount(pk);
  const publicClient = createPublicClient({ chain: aeneid, transport: http(RPC) });
  const walletClient = createWalletClient({ account, chain: aeneid, transport: http(RPC) });
  const client = new CDRClient({ network: "testnet", publicClient, walletClient, apiUrl: API });

  console.log("- Wallet:", account.address);
  const bal = await publicClient.getBalance({ address: account.address });
  console.log("- Balance:", formatEther(bal), "IP");

  console.log("- Querying DKG global key + fees (connectivity test)...");
  const gpk = await client.observer.getGlobalPubKey();
  const [a, w, r] = await Promise.all([
    client.observer.getAllocateFee(),
    client.observer.getWriteFee(),
    client.observer.getReadFee(),
  ]);
  console.log("  globalPubKey bytes:", gpk.length);
  console.log("  fees alloc/write/read:", a.toString(), w.toString(), r.toString());

  if (bal === 0n) {
    console.log("\n[!] Wallet has 0 IP. Fund it via the faucet, then re-run for the full round-trip.");
    return;
  }

  const maxSize = await client.observer.getMaxEncryptedDataSize();
  console.log("- maxEncryptedDataSize:", maxSize.toString(), "bytes");

  // CDR vaults store a 32-byte data key (the docs pattern). Real secrets get
  // AES-encrypted under this key and stored off-chain; here we just round-trip the key.
  const dataKey = crypto.getRandomValues(new Uint8Array(32));
  console.log("- dataKey (hex):", Buffer.from(dataKey).toString("hex"));

  const owner = account.address;
  const writeConditionData = encodeAbiParameters([{ type: "address" }], [owner]);

  console.log("- allocate (write=OwnerWriteCondition, read=owner EOA)...");
  const { uuid, txHash: allocTx } = await client.uploader.allocate({
    updatable: false,
    writeConditionAddr: OWNER_WRITE,
    readConditionAddr: owner, // EOA read gate: only this caller can read
    writeConditionData,
    readConditionData: "0x",
    skipConditionValidation: true, // EOA read condition has no contract interface
  });
  console.log("  vault uuid:", uuid, "| allocate tx:", allocTx);

  console.log("- encrypt + write...");
  const label = uuidToLabel(uuid);
  const ciphertext = await client.uploader.encryptDataKey({ dataKey, label });
  const { txHash: writeTx } = await client.uploader.write({
    uuid,
    accessAuxData: "0x",
    encryptedData: toHex(ciphertext.raw),
  });
  console.log("  write tx:", writeTx);

  console.log("- accessCDR (collecting validator partials, may take ~30-60s)...");
  const got = await client.consumer.accessCDR({ uuid, accessAuxData: "0x", timeoutMs: 120_000 });
  const recoveredHex = Buffer.from(got.dataKey).toString("hex");
  const originalHex = Buffer.from(dataKey).toString("hex");
  console.log("  recovered (hex):", recoveredHex);
  console.log(recoveredHex === originalHex ? "\n[OK] ROUND-TRIP SUCCEEDED" : "\n[FAIL] MISMATCH");
}

main().catch((e) => {
  console.error("\n[ERROR]", e);
  process.exit(1);
});
