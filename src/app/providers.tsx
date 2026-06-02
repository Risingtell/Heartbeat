"use client";
import { useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";
import { PrivyProvider, useWallets } from "@privy-io/react-auth";
import { WagmiProvider, useSetActiveWallet } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import { aeneid } from "@/lib/chain";

// Keep the wagmi "active wallet" in sync with whatever Privy connected.
function ActiveWalletSync() {
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  useEffect(() => {
    if (wallets.length > 0) setActiveWallet(wallets[0]);
  }, [wallets, setActiveWallet]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange={false}>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? ""}
        config={{
          defaultChain: aeneid,
          supportedChains: [aeneid],
          embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" }, showWalletUIs: false },
          loginMethods: ["email", "wallet", "google"],
          appearance: { theme: "light", accentColor: "#0d9488", walletChainType: "ethereum-only" },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <ActiveWalletSync />
            {children}
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </ThemeProvider>
  );
}
