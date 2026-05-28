"use client";
import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { LoginButton } from "@/components/LoginButton";
import { isAddress, type Address } from "viem";
import { useActiveWallet } from "@/lib/useActiveWallet";
import { publicClient } from "@/lib/viem";
import { Header } from "@/components/Header";
import { DEAD_MAN_SWITCH, deadManSwitchAbi } from "@/lib/contract";
import { readVault } from "@/lib/cdr";
import { humanDuration, shortAddr } from "@/lib/format";

export default function ClaimPage() {
  const { address, walletClient } = useActiveWallet();

  const [owner, setOwner] = useState("");
  const [uuid, setUuid] = useState("");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [unlocking, setUnlocking] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [attesting, setAttesting] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("owner")) setOwner(p.get("owner")!);
    if (p.get("uuid")) setUuid(p.get("uuid")!);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const ownerValid = isAddress(owner);

  const { data: sw, refetch } = useReadContract({
    address: DEAD_MAN_SWITCH,
    abi: deadManSwitchAbi,
    functionName: "getSwitch",
    args: ownerValid ? [owner as Address] : undefined,
    query: { enabled: ownerValid, refetchInterval: 8_000 },
  });

  const { data: amGuardian } = useReadContract({
    address: DEAD_MAN_SWITCH,
    abi: deadManSwitchAbi,
    functionName: "isGuardian",
    args: ownerValid && address ? [owner as Address, address] : undefined,
    query: { enabled: ownerValid && !!address },
  });

  let view: null | {
    heir: string; period: bigint; lastPing: bigint; triggeredAt: bigint;
    guardianThreshold: number; attestations: number; active: boolean; claimable: boolean;
  } = null;
  if (Array.isArray(sw)) {
    const [heir, period, lastPing, , triggeredAt, guardianThreshold, attestations, active, claimable] = sw as readonly [
      string, bigint, bigint, bigint, bigint, number, number, boolean, boolean];
    view = { heir, period, lastPing, triggeredAt, guardianThreshold, attestations, active, claimable };
  }

  const isHeir = view && address && view.heir.toLowerCase() === address.toLowerCase();
  const secondsLeft = view ? Number(view.lastPing) + Number(view.period) - now : 0;

  async function unlock() {
    if (!walletClient || uuid === "") return;
    setError(""); setUnlocking(true); setSecret(null);
    try {
      const data = await readVault(walletClient, Number(uuid));
      setSecret(new TextDecoder().decode(data));
    } catch (e) {
      setError((e as { shortMessage?: string; message?: string })?.shortMessage ?? (e as Error)?.message ?? String(e));
    } finally {
      setUnlocking(false);
    }
  }

  async function attest() {
    if (!walletClient || !ownerValid) return;
    setAttesting(true);
    try {
      const hash = await walletClient.writeContract({
        address: DEAD_MAN_SWITCH, abi: deadManSwitchAbi, functionName: "attestInactive", args: [owner as Address],
        account: walletClient.account!, chain: walletClient.chain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refetch();
    } catch { /* ignore */ } finally { setAttesting(false); }
  }

  const [seedPart, msgPart] = secret ? splitSecret(secret) : ["", ""];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-5 py-12 w-full space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recover a vault</h1>
          <p className="mt-1 text-muted text-sm">
            If someone named you as their beneficiary, open their claim link (or enter the details below), sign in, and unlock.
          </p>
        </div>

        {!address && (
          <div className="rounded-2xl border border-[--border] bg-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="font-medium">Step 1 · Sign in</div>
              <p className="text-sm text-muted mt-0.5">
                Use the <span className="font-medium text-[--foreground]">email</span> your benefactor registered for you — Privy emails you a code, no wallet or seed phrase needed. (Or connect your own wallet.)
              </p>
            </div>
            <LoginButton label="Sign in with email" />
          </div>
        )}

        <div className="rounded-2xl border border-[--border] bg-card p-6 space-y-4">
          <p className="text-sm font-medium">{address ? "Vault details" : "Step 2 · Vault details"}</p>
          <p className="text-xs text-muted -mt-2">Filled in automatically when you open a claim link.</p>
          <label className="block">
            <span className="text-sm font-medium">Owner address</span>
            <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="0x…"
              className="mt-2 w-full rounded-lg border border-[--border] bg-background px-3.5 py-2.5 outline-none focus:border-accent" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Vault number</span>
            <input value={uuid} onChange={(e) => setUuid(e.target.value)} placeholder="e.g. 4077" inputMode="numeric"
              className="mt-2 w-full rounded-lg border border-[--border] bg-background px-3.5 py-2.5 outline-none focus:border-accent" />
          </label>
        </div>

        {ownerValid && view && view.active && (
          <div className="rounded-2xl border border-[--border] bg-card p-6">
            <div className="flex items-center gap-3">
              <span className={`text-3xl ${view.claimable ? "text-red-500" : "text-accent animate-heartbeat"}`}>♥</span>
              <div>
                <div className="font-semibold">{view.claimable ? "Available to unlock" : "Still sealed"}</div>
                <div className="text-sm text-muted">
                  {view.claimable
                    ? "The owner's inactivity window has elapsed."
                    : `Unlocks in ${humanDuration(secondsLeft)} unless the owner checks in.`}
                </div>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted text-xs">Beneficiary</dt><dd>{shortAddr(view.heir)}</dd></div>
              <div><dt className="text-muted text-xs">Inactivity window</dt><dd>{humanDuration(Number(view.period))}</dd></div>
              {view.guardianThreshold > 0 && (
                <div><dt className="text-muted text-xs">Guardian attestations</dt><dd>{view.attestations}/{view.guardianThreshold}</dd></div>
              )}
            </dl>

            {!address ? (
              <div className="mt-6">
                <p className="text-sm text-muted mb-2">Sign in with the email your benefactor used (or your wallet) to unlock.</p>
                <LoginButton label="Sign in to unlock" />
              </div>
            ) : isHeir ? (
              <button onClick={unlock} disabled={!view.claimable || unlocking || uuid === ""}
                className="mt-6 w-full rounded-xl bg-accent hover:bg-accent-deep text-white font-medium px-6 py-3.5 disabled:opacity-40 transition-colors">
                {unlocking ? "Collecting validator approvals… (~30–60s)" : view.claimable ? "Unlock the secret" : "Not yet unlockable"}
              </button>
            ) : (
              <p className="mt-6 text-sm text-muted">Connected wallet isn&apos;t the named beneficiary for this vault.</p>
            )}

            {amGuardian && !view.claimable && (
              <button onClick={attest} disabled={attesting}
                className="mt-3 w-full rounded-xl border border-[--border] px-6 py-3 text-sm hover:border-accent disabled:opacity-40 transition-colors">
                {attesting ? "Submitting…" : "As a guardian, attest the owner is inactive"}
              </button>
            )}
            {error && <p className="mt-4 text-sm text-red-600 break-words">{error}</p>}
          </div>
        )}

        {ownerValid && view && !view.active && (
          <p className="text-sm text-muted">No active vault switch found for this address.</p>
        )}

        {secret && (
          <div className="rounded-2xl border-2 border-accent bg-accent-soft/40 p-6">
            <h3 className="font-semibold text-accent-deep">🔓 Recovered</h3>
            <div className="mt-3">
              <div className="text-xs text-muted">Secret / recovery phrase</div>
              <pre className="mt-1 rounded-lg bg-background p-3 font-mono text-sm whitespace-pre-wrap break-words">{seedPart}</pre>
            </div>
            {msgPart && (
              <div className="mt-4">
                <div className="text-xs text-muted">Message</div>
                <p className="mt-1 rounded-lg bg-background p-3 whitespace-pre-wrap break-words">{msgPart}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

function splitSecret(s: string): [string, string] {
  const marker = "\n\n--- MESSAGE ---\n\n";
  const i = s.indexOf(marker);
  if (i === -1) return [s, ""];
  return [s.slice(0, i), s.slice(i + marker.length)];
}
