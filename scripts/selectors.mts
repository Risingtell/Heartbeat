import "dotenv/config";
import { createPublicClient, http, defineChain, toFunctionSelector } from "viem";
import deployments from "../deployments.json" with { type: "json" };

const RPC = process.env.STORY_RPC_URL ?? "https://aeneid.storyrpc.io";
const aeneid = defineChain({ id: 1315, name: "Story Aeneid", nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pc = createPublicClient({ chain: aeneid, transport: http(RPC) });

// Candidate function signatures the core might call on a condition contract.
const candidates = [
  "checkReadCondition(address,bytes,bytes)",
  "checkWriteCondition(address,bytes,bytes)",
  "checkCondition(address,bytes,bytes)",
  "check(address,bytes,bytes)",
  "verify(address,bytes,bytes)",
  "isAuthorized(address,bytes,bytes)",
  "canRead(address,bytes,bytes)",
  "canWrite(address,bytes,bytes)",
  "checkReadCondition(address,bytes)",
  "checkWriteCondition(address,bytes)",
  "checkReadCondition(address,uint32,bytes,bytes)",
  "checkWriteCondition(address,uint32,bytes,bytes)",
  "checkAccess(address,bytes,bytes)",
  "validate(address,bytes,bytes)",
  "checkReadCondition(uint32,address,bytes,bytes)",
  "checkWriteCondition(uint32,address,bytes,bytes)",
];
const known: Record<string, string> = {};
for (const sig of candidates) known[toFunctionSelector(sig as `0x${string}`)] = sig;

function extractSelectors(bytecode: string): string[] {
  const code = bytecode.slice(2);
  const found = new Set<string>();
  // scan for PUSH4 (0x63) <4 bytes>
  for (let i = 0; i + 10 <= code.length; i += 2) {
    if (code.slice(i, i + 2).toLowerCase() === "63") {
      found.add("0x" + code.slice(i + 2, i + 10).toLowerCase());
    }
  }
  return [...found];
}

async function dump(label: string, addr: `0x${string}`) {
  const code = await pc.getBytecode({ address: addr });
  console.log(`\n=== ${label} (${addr}) ===`);
  if (!code) { console.log("  no bytecode"); return; }
  console.log("  size:", (code.length - 2) / 2, "bytes");
  const sels = extractSelectors(code);
  for (const s of sels) {
    console.log("  selector", s, known[s] ? "=> " + known[s] : "");
  }
}

async function main() {
  await dump("OwnerWriteCondition", deployments.aeneid.ownerWriteCondition as `0x${string}`);
  await dump("LicenseReadCondition", "0xC0640AD4CF2CaA9914C8e5C44234359a9102f7a3");
  await dump("DeadManSwitch (mine)", deployments.aeneid.deadManSwitch as `0x${string}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
