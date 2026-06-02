"use client";
import { useEffect, useRef, useState } from "react";
import { useReadContract } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { LoginButton } from "@/components/LoginButton";
import { isAddress, type Address } from "viem";
import { useActiveWallet } from "@/lib/useActiveWallet";
import { publicClient } from "@/lib/viem";
import { Header } from "@/components/Header";
import { DEAD_MAN_SWITCH, deadManSwitchAbi } from "@/lib/contract";
import { readVault } from "@/lib/cdr";
import { humanDuration, shortAddr } from "@/lib/format";

type Inheritance = {
  vaultUuid: number;
  ownerAddress: string;
  heirAddress: string;
  period: number;
  sealedAt: number;
};

export default function ClaimPage() {
  const { address, walletClient } = useActiveWallet();
  const { authenticated, getAccessToken } = usePrivy();

  const [owner, setOwner] = useState("");
  const [uuid, setUuid] = useState("");
  const [heir, setHeir] = useState("");
  const [period, setPeriod] = useState(0);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [unlocking, setUnlocking] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [attesting, setAttesting] = useState(false);
  const [attestError, setAttestError] = useState("");
  const [inheritances, setInheritances] = useState<Inheritance[]>([]);
  const [loadingInheritances, setLoadingInheritances] = useState(false);
  const secretRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("owner")) setOwner(p.get("owner")!);
    if (p.get("uuid")) setUuid(p.get("uuid")!);
    if (p.get("heir")) setHeir(p.get("heir")!);
    if (p.get("period")) setPeriod(Number(p.get("period")) || 0);
  }, []);

  // Fetch the signed-in user's inheritance list once authenticated, if they
  // haven't already loaded a vault from a claim link.
  useEffect(() => {
    if (!authenticated) return;
    if (owner && uuid) return; // a link is already loading a specific vault
    let cancelled = false;
    (async () => {
      setLoadingInheritances(true);
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch("/api/my-inheritances", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data?.inheritances) ? (data.inheritances as Inheritance[]) : [];
        setInheritances(list);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingInheritances(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authenticated, owner, uuid, getAccessToken]);

  function openInheritance(it: Inheritance) {
    setOwner(it.ownerAddress);
    setUuid(String(it.vaultUuid));
    setHeir(it.heirAddress);
    setPeriod(it.period);
    setSecret(null);
    setError("");
  }
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // When the secret first appears, scroll it into view and focus the reveal
  // card so a beneficiary doesn't miss it below the fold.
  useEffect(() => {
    if (!secret || !secretRef.current) return;
    const el = secretRef.current;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [secret]);

  const ownerValid = isAddress(owner);

  const { data: clock, refetch } = useReadContract({
    address: DEAD_MAN_SWITCH,
    abi: deadManSwitchAbi,
    functionName: "getClock",
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
    lastPing: bigint;
    guardianThreshold: number;
    attestations: number;
    active: boolean;
    guardianTripped: boolean;
    claimable: boolean;
  } = null;
  if (Array.isArray(clock)) {
    const [
      lastPing,
      ,
      ,
      guardianThreshold,
      attestations,
      active,
      guardianTripped,
    ] = clock as readonly [
      bigint,
      bigint,
      bigint,
      number,
      number,
      boolean,
      boolean,
    ];
    const claimable =
      active &&
      (guardianTripped || (period > 0 && now >= Number(lastPing) + period));
    view = {
      lastPing,
      guardianThreshold,
      attestations,
      active,
      guardianTripped,
      claimable,
    };
  }

  const isHeir =
    !!heir && !!address && heir.toLowerCase() === address.toLowerCase();
  const secondsLeft =
    view && period > 0 ? Number(view.lastPing) + period - now : 0;

  async function unlock() {
    if (!walletClient || uuid === "") return;
    setError("");
    setUnlocking(true);
    setSecret(null);
    try {
      const data = await readVault(walletClient, Number(uuid));
      setSecret(new TextDecoder().decode(data));
    } catch (e) {
      setError(
        (e as { shortMessage?: string; message?: string })?.shortMessage ??
          (e as Error)?.message ??
          String(e),
      );
    } finally {
      setUnlocking(false);
    }
  }

  async function attest() {
    if (!walletClient || !ownerValid) return;
    setAttesting(true);
    setAttestError("");
    try {
      const hash = await walletClient.writeContract({
        address: DEAD_MAN_SWITCH,
        abi: deadManSwitchAbi,
        functionName: "attestInactive",
        args: [owner as Address],
        account: walletClient.account!,
        chain: walletClient.chain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refetch();
    } catch (e) {
      const msg =
        (e as { shortMessage?: string; message?: string })?.shortMessage ??
        (e as Error)?.message ??
        String(e);
      if (!/rejected|denied|cancell?ed/i.test(msg)) setAttestError(msg);
    } finally {
      setAttesting(false);
    }
  }

  const [seedPart, msgPart] = secret ? splitSecret(secret) : ["", ""];

  return (
    <>
      <Header />
      <main className="relative">
        <div className="hero-glow absolute inset-x-0 top-0 h-72 -z-10" />
        <div className="mx-auto max-w-2xl px-5 py-14 w-full space-y-6 animate-fade-up">
          {/* Page header */}
          <div className="text-center">
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-medium text-accent-deep">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-heartbeat" />{" "}
              Beneficiary
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
              Recover a{" "}
              <span className="font-display italic font-normal text-accent-deep">
                vault.
              </span>
            </h1>
            <p className="mt-2 text-foreground-soft max-w-md mx-auto text-sm">
              Sign in with the email your benefactor registered, and any vaults sealed for you will appear here. Or open a claim link, or enter the details by hand.
            </p>
          </div>

          {/* Inheritance inbox — visible once signed in */}
          {authenticated && !(owner && uuid) && (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-accent-deep font-medium">
                    Sealed for you
                  </p>
                  <p className="mt-1 font-semibold">Your inheritances</p>
                </div>
                {loadingInheritances && (
                  <span className="text-xs text-muted">loading…</span>
                )}
              </div>
              {!loadingInheritances && inheritances.length === 0 && (
                <p className="mt-3 text-sm text-muted">
                  No vaults registered to this account yet. If someone sealed one for you with a different email, ask them for the claim link or enter the details below.
                </p>
              )}
              {inheritances.length > 0 && (
                <ul className="mt-4 divide-y divide-border-soft">
                  {inheritances.map((it) => (
                    <li key={`${it.ownerAddress}-${it.vaultUuid}`} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          Vault #{it.vaultUuid} from {shortAddr(it.ownerAddress)}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {humanDuration(it.period)} inactivity window · sealed {new Date(it.sealedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => openInheritance(it)}
                        className="shrink-0 text-sm rounded-lg bg-accent text-white px-3.5 py-1.5 hover:bg-accent-deep transition-colors"
                      >
                        Open
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Step 1 — Sign in */}
          {!address && (
            <div className="rounded-2xl border border-border bg-surface p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-accent-glow transition-colors">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-accent-deep font-medium">
                  Step 1
                </p>
                <div className="mt-1 font-semibold">Sign in</div>
                <p className="text-sm text-muted mt-1">
                  Use the{" "}
                  <span className="font-medium text-foreground">email</span>{" "}
                  your benefactor registered for you — we email you a code, no
                  wallet or seed phrase needed. (Or connect your own wallet.)
                </p>
              </div>
              <LoginButton label="Sign in with email" />
            </div>
          )}

          {/* Step 2 — Vault details */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-accent-deep font-medium">
                {address ? "" : "Step 2"}
              </p>
              <p className={`font-semibold ${address ? "" : "mt-1"}`}>
                Vault details
              </p>
              <p className="text-xs text-muted mt-1">
                Filled in automatically when you open a claim link.
              </p>
            </div>
            <label className="block">
              <span className="text-sm font-medium">Owner address</span>
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="0x…"
                className="field-input mt-2 font-mono text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Vault number</span>
              <input
                value={uuid}
                onChange={(e) => setUuid(e.target.value)}
                placeholder="e.g. 4077"
                inputMode="numeric"
                className="field-input mt-2 font-mono text-sm"
              />
            </label>
          </div>

          {/* Status card */}
          {ownerValid && view && view.active && (
            <div className="relative rounded-3xl border border-border bg-surface overflow-hidden">
              <div className="hero-glow absolute inset-0 -z-10 opacity-60" />
              <div className="px-6 sm:px-10 py-10">
                <div className="flex items-center gap-4">
                  <span
                    className={`heart-halo text-4xl leading-none ${view.claimable ? "text-warm" : "text-accent animate-heartbeat"}`}
                  >
                    ♥
                  </span>
                  <div>
                    <p
                      className="text-[11px] uppercase tracking-[0.18em] font-medium"
                      style={{
                        color: view.claimable
                          ? "var(--warm)"
                          : "var(--accent-deep)",
                      }}
                    >
                      {view.claimable ? "Released" : "Still sealed"}
                    </p>
                    <p className="mt-0.5 text-lg font-semibold">
                      {view.claimable ? (
                        "Available to unlock"
                      ) : period > 0 ? (
                        <>
                          Unlocks in{" "}
                          <span className="font-display italic font-normal text-accent-deep">
                            {humanDuration(secondsLeft)}
                          </span>
                        </>
                      ) : (
                        "Open the full claim link to see the countdown"
                      )}
                    </p>
                    <p className="text-sm text-muted mt-0.5">
                      {view.claimable
                        ? "The owner's inactivity window has elapsed."
                        : "…unless the owner checks in."}
                    </p>
                  </div>
                </div>

                <dl className="mt-7 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl bg-surface-2 border border-border-soft px-3.5 py-3">
                    <dt className="text-[11px] uppercase tracking-wider text-muted">
                      Beneficiary
                    </dt>
                    <dd className="mt-1 font-medium font-mono">
                      {heir ? shortAddr(heir) : "—"}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-surface-2 border border-border-soft px-3.5 py-3">
                    <dt className="text-[11px] uppercase tracking-wider text-muted">
                      Inactivity window
                    </dt>
                    <dd className="mt-1 font-medium">
                      {period > 0 ? humanDuration(period) : "—"}
                    </dd>
                  </div>
                  {view.guardianThreshold > 0 && (
                    <div className="rounded-xl bg-surface-2 border border-border-soft px-3.5 py-3">
                      <dt className="text-[11px] uppercase tracking-wider text-muted">
                        Guardian attestations
                      </dt>
                      <dd className="mt-1 font-medium">
                        {view.attestations}/{view.guardianThreshold}
                      </dd>
                    </div>
                  )}
                </dl>

                {!address ? (
                  <div className="mt-7">
                    <p className="text-sm text-muted mb-3">
                      Sign in with the email your benefactor used (or your own
                      wallet) to unlock.
                    </p>
                    <LoginButton label="Sign in to unlock" />
                  </div>
                ) : isHeir ? (
                  <button
                    onClick={unlock}
                    disabled={!view.claimable || unlocking || uuid === ""}
                    className="group mt-7 w-full rounded-xl bg-accent hover:bg-accent-deep text-white font-medium px-6 py-3.5 shadow-md hover:shadow-lg disabled:opacity-40 disabled:shadow-none transition-all focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    {unlocking ? (
                      "Collecting validator approvals… (~30–60s)"
                    ) : view.claimable ? (
                      <span className="inline-flex items-center gap-2">
                        Unlock the secret{" "}
                        <span className="transition-transform inline-block group-hover:translate-x-0.5">
                          →
                        </span>
                      </span>
                    ) : (
                      "Not yet unlockable"
                    )}
                  </button>
                ) : heir ? (
                  <p className="mt-7 text-sm text-muted">
                    Connected wallet isn&apos;t the named beneficiary for this
                    vault.
                  </p>
                ) : (
                  <p className="mt-7 text-sm text-muted">
                    Open the full claim link (with the beneficiary details) to
                    unlock, or connect the beneficiary wallet.
                  </p>
                )}

                {amGuardian && !view.claimable && (
                  <button
                    onClick={attest}
                    disabled={attesting}
                    className="mt-3 w-full rounded-xl border border-border bg-background hover:border-accent px-6 py-3 text-sm disabled:opacity-40 transition-colors"
                  >
                    {attesting
                      ? "Submitting…"
                      : "As a guardian, attest the owner is inactive"}
                  </button>
                )}
                {attestError && (
                  <div className="mt-3 rounded-xl border border-warm/30 bg-warm-soft px-4 py-3">
                    <p className="text-sm text-warm break-words">
                      {attestError}
                    </p>
                  </div>
                )}
                {error && (
                  <div className="mt-4 rounded-xl border border-warm/30 bg-warm-soft px-4 py-3">
                    <p className="text-sm text-warm break-words">{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {ownerValid && view && !view.active && (
            <p className="text-sm text-muted text-center">
              No active vault switch found for this address.
            </p>
          )}

          {/* Revealed secret */}
          {secret && (
            <div
              ref={secretRef}
              className="relative rounded-3xl border border-accent/40 bg-surface overflow-hidden animate-fade-up scroll-mt-20"
            >
              <div className="hero-glow absolute inset-0 -z-10" />
              <div className="px-6 sm:px-10 py-10">
                <div className="flex items-center gap-3">
                  <span className="heart-halo text-3xl text-accent animate-heartbeat leading-none">
                    ♥
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] font-medium text-accent-deep">
                      Recovered
                    </p>
                    <h3 className="text-xl font-semibold">It&apos;s yours.</h3>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="text-[11px] uppercase tracking-wider text-muted">
                    Recovery phrase / secret
                  </div>
                  <pre className="mt-2 rounded-xl bg-background border border-border-soft p-4 font-mono text-sm whitespace-pre-wrap break-words text-foreground">
                    {seedPart}
                  </pre>
                </div>
                {msgPart && (
                  <div className="mt-5">
                    <div className="text-[11px] uppercase tracking-wider text-muted">
                      Message
                    </div>
                    <p className="mt-2 rounded-xl bg-background border border-border-soft p-4 whitespace-pre-wrap break-words text-foreground">
                      {msgPart}
                    </p>
                  </div>
                )}
                <p className="mt-5 text-xs text-muted">
                  Anyone who can see this screen can see your secret. Move it
                  somewhere safe.
                </p>
              </div>
            </div>
          )}
        </div>
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
