import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(circle at 30% 30%, #2dd4bf, #0d9488 55%, #0f5f57)",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 120,
          fontFamily: "system-ui, sans-serif",
          fontWeight: 700,
        }}
      >
        ♥
      </div>
    ),
    { ...size },
  );
}
