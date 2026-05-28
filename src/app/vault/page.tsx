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
      <main className="mx-auto max-w-2xl px-5 py-12 w-full">
        {!ready ? (
          <div className="text-muted">Loading…</div>
        ) : !authenticated ? (
          <div className="rounded-2xl border border-[--border] bg-card p-10 text-center">
            <div className="text-4xl text-accent animate-heartbeat">♥</div>
            <h1 className="mt-4 text-2xl font-semibold">Connect to begin</h1>
            <p className="mt-2 text-muted">
              Sign in with your wallet to create a vault and check in. (Creating a vault sends transactions, so use a funded wallet.)
            </p>
            <div className="mt-6 flex justify-center"><LoginButton label="Connect to begin" /></div>
          </div>
        ) : !address ? (
          <div className="text-muted">Connecting your wallet…</div>
        ) : isLoading ? (
          <div className="text-muted">Loading your vault…</div>
        ) : active && !forceSetup ? (
          <VaultDashboard onReconfigure={() => setForceSetup(true)} />
        ) : (
          <>
            {active && forceSetup && (
              <button onClick={() => setForceSetup(false)} className="mb-4 text-sm text-accent-deep hover:underline">
                ← Back to dashboard
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
      </main>
    </>
  );
}
