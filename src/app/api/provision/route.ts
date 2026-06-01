import { NextRequest } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  parseEther,
  isAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const aeneid = defineChain({
  id: 1315,
  name: "Story Aeneid",
  nativeCurrency: { name: "IP", symbol: "IP", decimals: 18 },
  rpcUrls: { default: { http: ["https://aeneid.storyrpc.io"] } },
});

// Per-IP rate limit: this endpoint mints wallets and gas-funds them from the
// relayer, so it's a spam / fund-drain vector if left open. In-memory window
// (per serverless instance) — enough to blunt casual abuse on testnet.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

// Given a beneficiary email, get-or-create their Privy embedded wallet and make
// sure it holds a little gas so they can later submit the unlock transaction.
export async function POST(req: NextRequest) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret)
    return Response.json({ error: "Privy not configured" }, { status: 500 });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip))
    return Response.json(
      { error: "rate limited, try again shortly" },
      { status: 429 },
    );

  let email: string;
  try {
    ({ email } = await req.json());
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  if (!email || !email.includes("@"))
    return Response.json({ error: "invalid email" }, { status: 400 });

  const privy = new PrivyClient(appId, appSecret);

  try {
    let user = await privy.getUserByEmail(email);
    if (!user) {
      user = await privy.importUser({
        linkedAccounts: [{ type: "email", address: email }],
        createEthereumWallet: true,
      });
    }

    const wallet = user.linkedAccounts.find(
      (a) =>
        a.type === "wallet" &&
        (a as { chainType?: string }).chainType === "ethereum",
    ) as { address?: string } | undefined;

    if (!wallet?.address || !isAddress(wallet.address)) {
      return Response.json(
        { error: "no embedded wallet for user" },
        { status: 500 },
      );
    }
    const heir = wallet.address as `0x${string}`;

    // Top up gas from the relayer if the embedded wallet is low.
    const relayerKey = process.env.RELAYER_PRIVATE_KEY as
      | `0x${string}`
      | undefined;
    if (relayerKey) {
      const pub = createPublicClient({ chain: aeneid, transport: http() });
      const balance = await pub.getBalance({ address: heir });
      if (balance < parseEther("0.3")) {
        const relayer = privateKeyToAccount(relayerKey);
        const wc = createWalletClient({
          account: relayer,
          chain: aeneid,
          transport: http(),
        });
        const hash = await wc.sendTransaction({
          to: heir,
          value: parseEther("0.5"),
          account: relayer,
          chain: aeneid,
        });
        await pub.waitForTransactionReceipt({ hash });
      }
    }

    return Response.json({ address: heir });
  } catch (e) {
    return Response.json(
      { error: "provision failed", detail: String(e) },
      { status: 500 },
    );
  }
}
