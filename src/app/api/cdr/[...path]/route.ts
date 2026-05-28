import { NextRequest } from "next/server";

const UPSTREAM = process.env.CDR_API_URL ?? "http://172.192.41.96:1317";

// Same-origin proxy to the CDR Story-API REST endpoint (plain HTTP), so the
// browser doesn't block it as mixed content when the app runs over HTTPS.
export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const search = req.nextUrl.search;
  const url = `${UPSTREAM}/${path.join("/")}${search}`;
  try {
    const upstream = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "cdr proxy failed", detail: String(e) }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}
