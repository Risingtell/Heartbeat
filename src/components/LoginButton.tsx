"use client";
import { usePrivy } from "@privy-io/react-auth";
import { shortAddr } from "@/lib/format";
import { useActiveWallet } from "@/lib/useActiveWallet";

export function LoginButton({ label = "Sign in" }: { label?: string }) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { address } = useActiveWallet();

  const base = "rounded-xl font-medium px-4 py-2 text-sm transition-colors";

  if (!ready) return <button className={`${base} border border-[--border] opacity-60`} disabled>…</button>;

  if (!authenticated)
    return (
      <button onClick={login} className={`${base} bg-accent text-white hover:bg-accent-deep`}>
        {label}
      </button>
    );

  const display = address ? shortAddr(address) : user?.email?.address ?? "Account";
  return (
    <button onClick={logout} className={`${base} border border-[--border] hover:border-accent`} title="Sign out">
      {display}
    </button>
  );
}
