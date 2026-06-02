import { NextRequest } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";

/**
 * Beneficiary-side: given a signed-in Privy session (access token in the
 * Authorization header), return the list of inheritances the owner sealed
 * to them. Lets a heir discover their vaults without needing the claim link.
 */
export async function POST(req: NextRequest) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) return Response.json({ error: "Privy not configured" }, { status: 500 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return Response.json({ error: "missing auth token" }, { status: 401 });

  const privy = new PrivyClient(appId, appSecret);

  try {
    const claims = await privy.verifyAuthToken(token);
    const user = await privy.getUserById(claims.userId);

    const raw = (user.customMetadata as Record<string, unknown> | undefined)?.inheritances;
    let inheritances: unknown[] = [];
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) inheritances = parsed;
      } catch { /* ignore */ }
    }

    return Response.json({ inheritances });
  } catch (e) {
    return Response.json({ error: "auth failed", detail: String(e) }, { status: 401 });
  }
}
