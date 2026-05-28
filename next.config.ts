import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The CDR SDK + crypto ship ESM with a bundled WASM module; let Next process them.
  transpilePackages: ["@piplabs/cdr-sdk", "@piplabs/cdr-crypto", "@piplabs/cdr-contracts"],
  // Next 16 uses Turbopack by default (handles WebAssembly natively).
  turbopack: {},
};

export default nextConfig;
