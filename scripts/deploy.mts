import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC = process.env.STORY_RPC_URL ?? "https://aeneid.storyrpc.io";

const aeneid = defineChain({
  id: 1315,
  name: "Story Aeneid",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

// usage: tsx scripts/deploy.mts <path/to/File.sol> <ContractName> [constructorArgsJson]
const file = process.argv[2];
const contractName = process.argv[3];
if (!file || !contractName) {
  throw new Error("usage: tsx scripts/deploy.mts <file.sol> <ContractName> [constructorArgsJson]");
}
const args = process.argv[4] ? JSON.parse(process.argv[4]) : [];

const source = fs.readFileSync(file, "utf8");
const input = {
  language: "Solidity",
  sources: { [path.basename(file)]: { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const out = JSON.parse(solc.compile(JSON.stringify(input)));
if (out.errors) {
  let fatal = false;
  for (const e of out.errors) {
    console.log(e.formattedMessage);
    if (e.severity === "error") fatal = true;
  }
  if (fatal) process.exit(1);
}

const c = out.contracts[path.basename(file)][contractName];
const abi = c.abi;
const bytecode = ("0x" + c.evm.bytecode.object) as `0x${string}`;

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const publicClient = createPublicClient({ chain: aeneid, transport: http(RPC) });
const walletClient = createWalletClient({ account, chain: aeneid, transport: http(RPC) });

console.log("Deploying", contractName, "from", account.address, "with args", args);
const hash = await walletClient.deployContract({ abi, bytecode, args, account, chain: aeneid });
console.log("deploy tx:", hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("DEPLOYED", contractName, "at:", receipt.contractAddress);
