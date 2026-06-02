import { NextRequest } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";

/**
 * Owner-side: when a vault is sealed to a beneficiary email, register the
 * (vaultUuid, ownerAddress, heirAddress, period) on the heir's Privy user
 * customMetadata so they can later discover it without the claim link.
 *
 * Privy customMetadata only accepts primitive values, so we JSON-stringify
 * the list under a single "inheritances" key.
 */
export async function POST(req: NextRequest) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) return Response.json({ error: "Privy not configured" }, { status: 500 });

  let body: {
    heirEmail?: string;
    vaultUuid?: number;
    ownerAddress?: string;
    heirAddress?: string;
    period?: number;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const { heirEmail, vaultUuid, ownerAddress, heirAddress, period } = body;
  if (
    typeof heirEmail !== "string" || !heirEmail.includes("@") ||
    typeof vaultUuid !== "number" ||
    typeof ownerAddress !== "string" || !ownerAddress.startsWith("0x") ||
    typeof heirAddress !== "string" || !heirAddress.startsWith("0x") ||
    typeof period !== "number"
  ) {
    return Response.json({ error: "missing or invalid fields" }, { status: 400 });
  }

  const privy = new PrivyClient(appId, appSecret);

  try {
    let user = await privy.getUserByEmail(heirEmail);
    if (!user) {
      user = await privy.importUser({
        linkedAccounts: [{ type: "email", address: heirEmail }],
        createEthereumWallet: true,
      });
    }

    type Inheritance = {
      vaultUuid: number;
      ownerAddress: string;
      heirAddress: string;
      period: number;
      sealedAt: number;
    };

    const existingRaw = (user.customMetadata as Record<string, unknown> | undefined)?.inheritances;
    let existing: Inheritance[] = [];
    if (typeof existingRaw === "string") {
      try {
        const parsed = JSON.parse(existingRaw);
        if (Array.isArray(parsed)) existing = parsed as Inheritance[];
      } catch { /* ignore */ }
    }

    // De-duplicate by vaultUuid so re-sealing the same vault doesn't double-list it.
    const filtered = existing.filter((i) => i.vaultUuid !== vaultUuid);
    const updated: Inheritance[] = [
      ...filtered,
      { vaultUuid, ownerAddress, heirAddress, period, sealedAt: Date.now() },
    ];

    await privy.setCustomMetadata(user.id, { inheritances: JSON.stringify(updated) });

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "register failed", detail: String(e) }, { status: 500 });
  }
}
