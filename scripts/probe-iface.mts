import "dotenv/config";
import { createPublicClient, http, defineChain, toFunctionSelector, pad } from "viem";
import deployments from "../deployments.json" with { type: "json" };

const RPC = process.env.STORY_RPC_URL ?? "https://aeneid.storyrpc.io";
const OWNER_WRITE = deployments.aeneid.ownerWriteCondition as `0x${string}`;

const aeneid = defineChain({ id: 1315, name: "Story Aeneid", nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pc = createPublicClient({ chain: aeneid, transport: http(RPC) });

const erc165Abi = [{ type: "function", name: "supportsInterface", stateMutability: "view", inputs: [{ type: "bytes4" }], outputs: [{ type: "bool" }] }] as const;

const selRead = toFunctionSelector("checkReadCondition(address,bytes,bytes)");
const selWrite = toFunctionSelector("checkWriteCondition(address,bytes,bytes)");
const xor = (a: string, b: string) => "0x" + Buffer.from(a.slice(2), "hex").map((x, i) => x ^ Buffer.from(b.slice(2), "hex")[i]).toString ? "" : "";

function xorSel(a: `0x${string}`, b: `0x${string}`): `0x${string}` {
  const ab = Buffer.from(a.slice(2), "hex");
  const bb = Buffer.from(b.slice(2), "hex");
  const out = Buffer.alloc(4);
  for (let i = 0; i < 4; i++) out[i] = ab[i] ^ bb[i];
  return ("0x" + out.toString("hex")) as `0x${string}`;
}

async function probe(id: `0x${string}`, label: string) {
  try {
    const r = await pc.readContract({ address: OWNER_WRITE, abi: erc165Abi, functionName: "supportsInterface", args: [id] });
    console.log(`  ${label.padEnd(40)} ${id} -> ${r}`);
  } catch (e: any) {
    console.log(`  ${label.padEnd(40)} ${id} -> REVERT (${e?.shortMessage ?? "no supportsInterface"})`);
  }
}

async function main() {
  console.log("OwnerWriteCondition:", OWNER_WRITE);
  console.log("selectors: checkRead", selRead, "checkWrite", selWrite);
  console.log("\nsupportsInterface probes:");
  await probe("0x01ffc9a7", "ERC165");
  await probe("0xffffffff", "ERC165 must-be-false");
  await probe(selRead, "checkReadCondition selector");
  await probe(selWrite, "checkWriteCondition selector");
  await probe(xorSel(selRead, selWrite), "read^write");

  // Does it have getter functions hinting the interface? Probe bytecode size.
  const code = await pc.getBytecode({ address: OWNER_WRITE });
  console.log("\nbytecode length:", code ? (code.length - 2) / 2 : 0, "bytes");
}

main().catch((e) => { console.error(e); process.exit(1); });
