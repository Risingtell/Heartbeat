// Lightweight local index of vaults a user has created, so the dashboard can
// list them and build shareable claim links. (The on-chain switch state is the
// source of truth; this just remembers vault uuids, which aren't enumerable on-chain.)
export type VaultRecord = { uuid: number; heir: string; createdAt: number };

const key = (owner: string) => `heartbeat:vaults:${owner.toLowerCase()}`;

export function getVaults(owner: string): VaultRecord[] {
  if (typeof window === "undefined" || !owner) return [];
  try {
    return JSON.parse(localStorage.getItem(key(owner)) || "[]");
  } catch {
    return [];
  }
}

export function addVault(owner: string, rec: VaultRecord) {
  const list = getVaults(owner);
  if (!list.some((v) => v.uuid === rec.uuid)) list.push(rec);
  localStorage.setItem(key(owner), JSON.stringify(list));
}
