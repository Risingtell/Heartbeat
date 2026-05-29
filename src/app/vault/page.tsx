"use client";
import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useReadContract } from "wagmi";
import { LoginButton } from "@/components/LoginButton";
import { Header } from "@/components/Header";
import { SetupForm } from "@/components/SetupForm";
import { VaultDashboard } from "@/components/VaultDashboard";
import { DEAD_MAN_SWITCH, deadManSwitchAbi } from "@/lib/contract";
import { useActiveWallet } from "@/lib/useActiveWallet";

export default function VaultPage() {
  const { ready, authenticated } = usePrivy();
  const { address } = useActiveWallet();
  const [forceSetup, setForceSetup] = useState(false);

  const { data: sw, refetch, isLoading } = useReadContract({
    address: DEAD_MAN_SWITCH,
    abi: deadManSwitchAbi,
    functionName: "getSwitch",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const active = Array.isArray(sw) ? Boolean(sw[7]) : false;

  return (
    <>
      <Header />
      <main className="relative">
        <div className="hero-glow absolute inset-x-0 top-0 h-80 -z-10" />
        <div className="mx-auto max-w-3xl px-5 py-14 w-full">
          {!ready ? (
            <LoadingFrame label="Loading…" />
          ) : !authenticated ? (
            <ConnectGate />
          ) : !address ? (
            <LoadingFrame label="Connecting your wallet…" />
          ) : isLoading ? (
            <LoadingFrame label="Loading your vault…" />
          ) : active && !forceSetup ? (
            <VaultDashboard onReconfigure={() => setForceSetup(true)} />
          ) : (
            <>
              {active && forceSetup && (
                <button
                  onClick={() => setForceSetup(false)}
                  className="mb-5 inline-flex items-center gap-1 text-sm text-accent-deep hover:text-accent transition-colors"
                >
                  <span className="transition-transform inline-block group-hover:-translate-x-0.5">←</span> Back to dashboard
                </button>
              )}
              <SetupForm
                onComplete={() => {
                  setForceSetup(false);
                  refetch();
                }}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}

function ConnectGate() {
  return (
    <div className="relative rounded-3xl border border-border bg-surface overflow-hidden animate-fade-up">
      <div className="hero-glow absolute inset-0 -z-10" />
      <div className="px-6 sm:px-12 py-16 text-center">
        <div className="heart-halo mx-auto text-accent text-6xl leading-none animate-heartbeat">♥</div>
        <p className="mt-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-medium text-accent-deep">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-heartbeat" /> Your vault
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
          Connect to <span className="font-display italic font-normal text-accent-deep">begin.</span>
        </h1>
        <p className="mt-3 text-foreground-soft max-w-md mx-auto">
          Sign in with your wallet to create a vault and check in. Creating a vault sends transactions, so use a funded wallet.
        </p>
        <div className="mt-7 flex justify-center"><LoginButton label="Connect to begin" /></div>
      </div>
    </div>
  );
}

function LoadingFrame({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border border-border bg-surface px-6 py-16 text-center">
      <div className="heart-halo inline-flex text-accent text-3xl leading-none animate-heartbeat">♥</div>
      <p className="mt-4 text-muted text-sm">{label}</p>
    </div>
  );
}
