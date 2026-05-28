import { defineChain } from "viem";

export const aeneid = defineChain({
  id: 1315,
  name: "Story Aeneid",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: { default: { http: ["https://aeneid.storyrpc.io"] } },
  blockExplorers: { default: { name: "Storyscan", url: "https://aeneid.storyscan.io" } },
  testnet: true,
});
