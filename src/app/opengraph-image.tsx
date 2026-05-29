import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Heartbeat — your keys shouldn't die with you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #f7f5f1 0%, #ffffff 50%, #d7efe9 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
          fontFamily: "system-ui, sans-serif",
          color: "#1c2421",
        }}
      >
        <div style={{ fontSize: 200, lineHeight: 1, color: "#0d9488" }}>♥</div>
        <div
          style={{
            fontSize: 100,
            fontWeight: 700,
            marginTop: 20,
            letterSpacing: "-0.03em",
            color: "#0f5f57",
          }}
        >
          Heartbeat
        </div>
        <div
          style={{
            fontSize: 44,
            marginTop: 12,
            color: "#1c2421",
            textAlign: "center",
            maxWidth: 1000,
            lineHeight: 1.2,
          }}
        >
          Your keys shouldn&apos;t die with you.
        </div>
        <div
          style={{
            fontSize: 24,
            marginTop: 36,
            color: "#5c6b65",
          }}
        >
          Proof-of-life vaults · Powered by Story CDR
        </div>
      </div>
    ),
    { ...size }
  );
}
