import { toFunctionSelector } from "viem";

const TARGETS: Record<string, string> = {
  "0x5645dbbf": "OwnerWriteCondition.write-check",
  "0x8db3eb17": "LicenseReadCondition.read-check",
  "0x52211e00": "LicenseReadCondition.other",
};

const names = [
  "checkWriteCondition", "checkReadCondition", "checkCondition", "check",
  "read", "write", "verify", "validate", "evaluate", "isAuthorized",
];

const types = ["address", "bytes", "uint256", "uint32", "uint64", "bytes32", "bool", "uint16"];

function* combos(len: number): Generator<string[]> {
  if (len === 0) { yield []; return; }
  for (const t of types) for (const rest of combos(len - 1)) yield [t, ...rest];
}

let scanned = 0;
const hits: string[] = [];
for (const n of names) {
  for (let len = 0; len <= 5; len++) {
    for (const c of combos(len)) {
      const sig = `${n}(${c.join(",")})`;
      let sel: string;
      try { sel = toFunctionSelector(sig as `0x${string}`); } catch { continue; }
      scanned++;
      if (TARGETS[sel]) hits.push(`MATCH ${sel} (${TARGETS[sel]})  <=  ${sig}`);
    }
  }
}
for (const h of hits) console.log(h);
console.log("scanned", scanned, "signatures;", hits.length, "matches");
