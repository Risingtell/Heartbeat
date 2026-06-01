// Import specific submodules (not the package barrel) to avoid pulling in the
// optional Helia/IPFS storage providers, which need uninstalled peer deps.
import { CDRClient } from "@piplabs/cdr-sdk/dist/client.js";
import { uuidToLabel } from "@piplabs/cdr-sdk/dist/label.js";
import { initWasm } from "@piplabs/cdr-crypto";
import {
  createPublicClient,
  http,
  encodeAbiParameters,
  toHex,
  type WalletClient,
} from "viem";
import { aeneid } from "./chain";
import { DEAD_MAN_SWITCH } from "./contract";

let wasmReady: Promise<void> | null = null;
export const ensureWasm = () => (wasmReady ??= initWasm());

// CDR's REST endpoint is plain HTTP; route it through our same-origin proxy so
// the browser (on HTTPS) doesn't block it as mixed content.
const apiUrl = () =>
  typeof window !== "undefined"
    ? `${window.location.origin}/api/cdr`
    : "/api/cdr";

async function makeClient(walletClient: WalletClient) {
  await ensureWasm();
  const publicClient = createPublicClient({ chain: aeneid, transport: http() });
  return new CDRClient({
    network: "testnet",
    publicClient,
    walletClient,
    apiUrl: apiUrl(),
  });
}

// Per-vault condition data: (owner, heir, period). The DeadManSwitch read/write
// gates decode this; binding heir + window per vault keeps each vault independent.
const vaultData = (owner: `0x${string}`, heir: `0x${string}`, period: bigint) =>
  encodeAbiParameters(
    [{ type: "address" }, { type: "address" }, { type: "uint64" }],
    [owner, heir, period],
  );

/** Allocate a DeadManSwitch-gated vault and write the encrypted secret. Returns the vault uuid. */
export async function createVault(
  walletClient: WalletClient,
  owner: `0x${string}`,
  heir: `0x${string}`,
  period: bigint,
  secret: Uint8Array,
): Promise<number> {
  const cdr = await makeClient(walletClient);
  const cd = vaultData(owner, heir, period);
  const { uuid } = await cdr.uploader.allocate({
    updatable: false,
    writeConditionAddr: DEAD_MAN_SWITCH,
    readConditionAddr: DEAD_MAN_SWITCH,
    writeConditionData: cd,
    readConditionData: cd,
    // Keep enabled: the SDK's validator probes the stale documented selector
    // checkReadCondition(address,bytes,bytes); our contract implements the
    // actually-deployed checkReadCondition(uint32,bytes,bytes,address), so the
    // client-side check would wrongly reject it. On-chain enforcement is unaffected.
    skipConditionValidation: true,
  });
  const ciphertext = await cdr.uploader.encryptDataKey({
    dataKey: secret,
    label: uuidToLabel(uuid),
  });
  await cdr.uploader.write({
    uuid,
    accessAuxData: "0x",
    encryptedData: toHex(ciphertext.raw),
  });
  return uuid;
}

/** Heir-side: collect validator partials and recover the plaintext secret bytes. */
export async function readVault(
  walletClient: WalletClient,
  uuid: number,
): Promise<Uint8Array> {
  const cdr = await makeClient(walletClient);
  const { dataKey } = await cdr.consumer.accessCDR({
    uuid,
    accessAuxData: "0x",
    timeoutMs: 120_000,
  });
  return dataKey;
}
