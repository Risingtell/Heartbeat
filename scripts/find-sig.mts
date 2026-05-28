import { toFunctionSelector } from "viem";

const TARGETS = new Set(["0x5645dbbf", "0x8db3eb17", "0x52211e00"]);

const names = [
  "checkReadCondition", "checkWriteCondition", "checkRead", "checkWrite",
  "read", "write", "verifyRead", "verifyWrite", "isReadAllowed", "isWriteAllowed",
  "canRead", "canWrite", "check", "checkCondition", "verify", "isAuthorized",
  "evaluate", "evaluateRead", "evaluateWrite", "checkAccess",
];

const paramSets = [
  "address,bytes,bytes",
  "uint32,address,bytes,bytes",
  "address,uint32,bytes,bytes",
  "uint256,address,bytes,bytes",
  "address,uint256,bytes,bytes",
  "address,bytes",
  "address,bytes,bytes,bytes",
  "address,address,bytes,bytes",
  "uint32,address,bytes",
  "uint64,address,bytes,bytes",
  "address,uint64,bytes,bytes",
  "bytes,address,bytes",
  "address,bytes32,bytes",
  "uint32,address,bytes,bytes,bytes",
  "address,bytes,uint32",
  "address,bytes,bytes,uint32",
  "uint256,address,bytes",
  "address,bytes,address",
  "uint32,bytes,bytes",
  "uint256,bytes,bytes",
  "uint32,address",
  "address",
  "address,bytes,bytes,address",
  "uint32,address,uint256,bytes,bytes",
  "(uint32,address,address,bytes,bytes)",
  "address,uint32,bytes",
];

for (const n of names) {
  for (const p of paramSets) {
    const sig = `${n}(${p})`;
    let sel: string;
    try { sel = toFunctionSelector(sig as `0x${string}`); } catch { continue; }
    if (TARGETS.has(sel)) console.log(`MATCH ${sel}  <=  ${sig}`);
  }
}
console.log("done scanning", names.length * paramSets.length, "combos");
