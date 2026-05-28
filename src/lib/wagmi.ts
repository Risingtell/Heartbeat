"use client";
import { http } from "viem";
import { createConfig } from "@privy-io/wagmi";
import { aeneid } from "./chain";

export const wagmiConfig = createConfig({
  chains: [aeneid],
  transports: { [aeneid.id]: http() },
});
