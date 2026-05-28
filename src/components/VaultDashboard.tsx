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

  const [heir, period, lastPing, , triggeredAt, guardianThreshold, attestations, active, claimable] = sw as readonly [
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
    <div className="space-y-6">
      {/* Status hero */}
      <div className="rounded-2xl border border-[--border] bg-card p-6 sm:p-8 text-center">
        <div className={`text-5xl ${claimable ? "text-red-500" : "text-accent animate-heartbeat"}`}>♥</div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          {claimable ? "Released" : "Active & sealed"}
        </h2>
        <p className="mt-1 text-muted">
          {claimable
            ? "Your inactivity window has elapsed. Your beneficiary can now unlock the vault."
            : <>Your beneficiary can unlock in <span className="font-semibold text-[--foreground]">{humanDuration(secondsLeft)}</span> if you stop checking in.</>}
        </p>

        {!claimable && (
          <button
            onClick={() => tx("heartbeat", "heartbeat")}
            disabled={pending === "heartbeat"}
            className="mt-6 rounded-xl bg-accent hover:bg-accent-deep text-white font-medium px-8 py-3.5 disabled:opacity-50 transition-colors"
          >
            {pending === "heartbeat" ? "Confirming…" : "♥ I'm still here"}
          </button>
        )}

        <dl className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          <Stat label="Beneficiary" value={shortAddr(heir)} />
          <Stat label="Window" value={humanDuration(Number(period))} />
          <Stat label="Last heartbeat" value={`${humanDuration(now - Number(lastPing))} ago`} />
          <Stat label="Guardians" value={guardianThreshold > 0 ? `${attestations}/${guardianThreshold}` : "none"} />
        </dl>

        <button
          onClick={onReconfigure}
          className="mt-6 rounded-xl border border-[--border] bg-background hover:border-accent transition-colors font-medium px-5 py-3 w-full sm:w-auto"
        >
          ⚙ Change beneficiary, window &amp; secret
        </button>
      </div>

      {/* Vaults */}
      <div className="rounded-2xl border border-[--border] bg-card p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Your sealed vaults</h3>
          <button onClick={onReconfigure} className="text-sm text-accent-deep hover:underline">+ New vault / update settings</button>
        </div>
        {vaults.length === 0 ? (
          <p className="mt-3 text-muted text-sm">No vaults recorded on this device yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[--border]">
            {vaults.map((v) => (
              <li key={v.uuid} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">Vault #{v.uuid}</div>
                  <div className="text-xs text-muted">to {shortAddr(v.heir)} · {new Date(v.createdAt).toLocaleDateString()}</div>
                </div>
                <button onClick={() => copyLink(v.uuid)} className="text-sm rounded-lg border border-[--border] px-3 py-1.5 hover:border-accent transition-colors">
                  {copied === v.uuid ? "Copied!" : "Copy claim link"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Demo + danger controls */}
      <div className="rounded-2xl border border-dashed border-[--border] bg-card/60 p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted">
          <span className="font-medium text-[--foreground]">Demo controls</span> — simulate going inactive without waiting.
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => tx("demoExpire", "demoExpire")}
            disabled={pending === "demoExpire" || claimable}
            className="text-sm rounded-lg border border-[--border] px-3 py-1.5 hover:border-accent disabled:opacity-40 transition-colors"
          >
            {pending === "demoExpire" ? "…" : "Simulate inactivity"}
          </button>
          <button
            onClick={() => tx("revoke", "revoke")}
            disabled={pending === "revoke"}
            className="text-sm rounded-lg border border-red-200 text-red-600 px-3 py-1.5 hover:bg-red-50 disabled:opacity-40 transition-colors"
          >
            {pending === "revoke" ? "…" : "Revoke switch"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
