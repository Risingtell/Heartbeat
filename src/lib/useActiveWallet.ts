"use client";
import { useEffect, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, type WalletClient } from "viem";
import { aeneid } from "./chain";

// Builds a viem WalletClient directly from the active Privy wallet's EIP-1193
// provider (and ensures it's on Aeneid). More reliable than wagmi's connector
// sync under Privy, and works for both injected and embedded wallets.
export function useActiveWallet() {
  const { wallets, ready } = useWallets();
  const wallet = wallets[0];
  const address = wallet?.address as `0x${string}` | undefined;
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!wallet) {
        setWalletClient(null);
        return;
      }
      try {
        await wallet.switchChain(aeneid.id);
      } catch {
        /* user may decline / chain already set */
      }
      try {
        const provider = await wallet.getEthereumProvider();
        if (cancelled) return;
        setWalletClient(
          createWalletClient({ account: wallet.address as `0x${string}`, chain: aeneid, transport: custom(provider) })
        );
      } catch {
        if (!cancelled) setWalletClient(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet?.address]);

  return { walletClient, address, ready };
}
