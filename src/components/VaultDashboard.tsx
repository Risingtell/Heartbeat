"use client";
import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { DEAD_MAN_SWITCH, deadManSwitchAbi } from "@/lib/contract";
import { getVaults, type VaultRecord } from "@/lib/storage";
import { humanDuration, shortAddr } from "@/lib/format";
import { useActiveWallet } from "@/lib/useActiveWallet";
import { publicClient } from "@/lib/viem";

export function VaultDashboard({ onReconfigure }: { onReconfigure: () => void }) {
  const { address, walletClient } = useActiveWallet();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [vaults, setVaults] = useState<VaultRecord[]>([]);
  const [pending, setPending] = useState<string>("");
  const [copied, setCopied] = useState<number | null>(null);

  const { data: sw, refetch } = useReadContract({
    address: DEAD_MAN_SWITCH,
    abi: deadManSwitchAbi,
    functionName: "getSwitch",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (address) setVaults(getVaults(address));
  }, [address, pending]);

  if (!sw) return <div className="text-muted">Loading your vault…</div>;

  const [heir, period, lastPing, , , guardianThreshold, attestations, , claimable] = sw as readonly [
    string, bigint, bigint, bigint, bigint, number, number, boolean, boolean
  ];

  const releaseAt = Number(lastPing) + Number(period);
  const secondsLeft = releaseAt - now;

  async function tx(label: string, fn: "heartbeat" | "demoExpire" | "revoke") {
    if (!walletClient) return;
    setPending(label);
    try {
      const hash = await walletClient.writeContract({
        address: DEAD_MAN_SWITCH, abi: deadManSwitchAbi, functionName: fn, args: [],
        account: walletClient.account!, chain: walletClient.chain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refetch();
    } catch {
      /* user rejected or failed; refetch keeps UI honest */
    } finally {
      setPending("");
    }
  }

  function copyLink(uuid: number) {
    const url = `${window.location.origin}/claim?owner=${address}&uuid=${uuid}`;
    navigator.clipboard.writeText(url);
    setCopied(uuid);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ───────────────  Status hero  ─────────────── */}
      <div className="relative rounded-3xl border border-border bg-surface overflow-hidden">
        <div className="hero-glow absolute inset-0 -z-10 opacity-60" />
        <div className="px-6 sm:px-10 py-12 text-center">
          <div className={`heart-halo mx-auto text-5xl leading-none ${claimable ? "text-warm" : "text-accent animate-heartbeat"}`}>♥</div>

          <p
            className="mt-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-medium"
            style={{ color: claimable ? "var(--warm)" : "var(--accent-deep)" }}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${claimable ? "bg-warm" : "bg-accent animate-heartbeat"}`}
            />
            {claimable ? "Released" : "Alive & sealed"}
          </p>

          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.05]">
            {claimable ? (
              <>Your vault is <span className="font-display italic font-normal text-accent-deep">unlockable.</span></>
            ) : (
              <>Sealed, for <span className="font-display italic font-normal text-accent-deep">now.</span></>
            )}
          </h2>
          <p className="mt-3 text-foreground-soft max-w-md mx-auto">
            {claimable
              ? "Your inactivity window has elapsed. Your beneficiary can now unlock the vault."
              : <>Your beneficiary can unlock in <span className="font-semibold text-foreground">{humanDuration(secondsLeft)}</span> if you stop checking in.</>}
          </p>

          {!claimable && (
            <button
              onClick={() => tx("heartbeat", "heartbeat")}
              disabled={pending === "heartbeat"}
              className="group mt-7 rounded-xl bg-accent hover:bg-accent-deep text-white font-medium px-8 py-3.5 shadow-md hover:shadow-lg disabled:opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {pending === "heartbeat" ? (
                "Confirming…"
              ) : (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block group-hover:scale-110 transition-transform">♥</span>
                  I&apos;m still here
                </span>
              )}
            </button>
          )}
        </div>

        {/* Stats strip */}
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border-soft border-t border-border-soft">
          {[
            ["Beneficiary", shortAddr(heir)],
            ["Window", humanDuration(Number(period))],
            ["Last heartbeat", `${humanDuration(now - Number(lastPing))} ago`],
            ["Guardians", guardianThreshold > 0 ? `${attestations}/${guardianThreshold}` : "none"],
          ].map(([k, v]) => (
            <div key={k} className="bg-surface px-4 py-4">
              <dt className="text-[11px] uppercase tracking-wider text-muted">{k}</dt>
              <dd className="mt-1 font-medium text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ───────────────  Reconfigure CTA  ─────────────── */}
      <button
        onClick={onReconfigure}
        className="group w-full rounded-2xl border border-border bg-surface hover:border-accent hover:bg-surface-2 transition-all px-5 py-4 text-left flex items-center justify-between gap-3"
      >
        <span>
          <span className="block font-medium">Change beneficiary, window &amp; secret</span>
          <span className="block text-xs text-muted mt-0.5">Update your settings or seal a fresh vault — current vault stays unchanged until you re-seal.</span>
        </span>
        <span className="text-muted group-hover:text-accent transition-colors text-lg">→</span>
      </button>

      {/* ───────────────  Vaults list  ─────────────── */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-border-soft flex items-center justify-between">
          <p className="text-sm font-medium">Your sealed vaults</p>
          <span className="text-xs text-muted">{vaults.length} on this device</span>
        </div>
        {vaults.length === 0 ? (
          <p className="px-6 py-8 text-muted text-sm">No vaults recorded on this device yet.</p>
        ) : (
          <ul className="divide-y divide-border-soft">
            {vaults.map((v) => (
              <li key={v.uuid} className="px-6 py-4 flex items-center justify-between gap-3 hover:bg-surface-2 transition-colors">
                <div>
                  <div className="font-medium">Vault #{v.uuid}</div>
                  <div className="text-xs text-muted mt-0.5">to {shortAddr(v.heir)} · {new Date(v.createdAt).toLocaleDateString()}</div>
                </div>
                <button
                  onClick={() => copyLink(v.uuid)}
                  className="text-sm rounded-lg border border-border bg-background px-3.5 py-1.5 hover:border-accent transition-colors"
                >
                  {copied === v.uuid ? "Copied!" : "Copy claim link"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ───────────────  Demo + danger  ─────────────── */}
      <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted">
          <span className="font-medium text-foreground">Demo controls</span> — simulate going inactive without waiting.
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => tx("demoExpire", "demoExpire")}
            disabled={pending === "demoExpire" || claimable}
            className="text-sm rounded-lg border border-border bg-background px-3.5 py-2 hover:border-accent disabled:opacity-40 transition-colors"
          >
            {pending === "demoExpire" ? "…" : "Simulate inactivity"}
          </button>
          <button
            onClick={() => tx("revoke", "revoke")}
            disabled={pending === "revoke"}
            className="text-sm rounded-lg border border-warm/40 text-warm px-3.5 py-2 hover:bg-warm-soft disabled:opacity-40 transition-colors"
          >
            {pending === "revoke" ? "…" : "Revoke switch"}
          </button>
        </div>
      </div>
    </div>
  );
}
