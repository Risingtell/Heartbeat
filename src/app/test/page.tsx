"use client";
import { LoginButton } from "@/components/LoginButton";
import { useActiveWallet } from "@/lib/useActiveWallet";
import { useState } from "react";
import { ensureWasm, createVault, readVault } from "@/lib/cdr";
import { Header } from "@/components/Header";

export default function TestPage() {
  const { address, walletClient } = useActiveWallet();
  const [log, setLog] = useState<string[]>([]);
  const [uuid, setUuid] = useState<number | null>(null);
  const add = (m: string) => setLog((l) => [...l, `${new Date().toLocaleTimeString()}  ${m}`]);

  async function testWasm() {
    try {
      add("initWasm()…");
      await ensureWasm();
      add("✓ WASM initialized in browser");
      const r = await fetch("/api/cdr/dkg/global_public_key");
      add(`✓ proxy /dkg/global_public_key → HTTP ${r.status}`);
    } catch (e) {
      add("✗ " + ((e as Error)?.message ?? String(e)));
    }
  }

  async function testCreate() {
    if (!walletClient || !address) return add("connect a wallet first");
    try {
      add("creating vault (encrypt + allocate + write)…");
      const secret = new TextEncoder().encode("browser test secret " + Date.now());
      const id = await createVault(walletClient, address, secret);
      setUuid(id);
      add(`✓ vault created, uuid=${id}`);
    } catch (e) {
      add("✗ " + ((e as { shortMessage?: string; message?: string })?.shortMessage ?? (e as Error)?.message ?? String(e)));
    }
  }

  async function testRead() {
    if (!walletClient || uuid === null) return add("create a vault first");
    try {
      add(`reading vault ${uuid} (note: gated — only works if conditions met)…`);
      const data = await readVault(walletClient, uuid);
      add("✓ recovered: " + new TextDecoder().decode(data));
    } catch (e) {
      add("✗ " + ((e as { shortMessage?: string; message?: string })?.shortMessage ?? (e as Error)?.message ?? String(e)));
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-2xl font-semibold">Browser integration test</h1>
        <p className="mt-2 text-muted text-sm">
          Confirms the CDR WASM + REST proxy + wallet transactions work end-to-end in the browser.
          Your connected wallet needs Aeneid testnet IP for gas.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <LoginButton />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={testWasm} className="rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent-deep">1 · Test WASM + proxy</button>
          <button onClick={testCreate} className="rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent-deep disabled:opacity-40" disabled={!address}>2 · Create vault</button>
          <button onClick={testRead} className="rounded-lg border border-[--border] px-4 py-2 text-sm font-medium hover:border-accent disabled:opacity-40" disabled={uuid === null}>3 · Read vault</button>
        </div>
        <pre className="mt-6 rounded-xl bg-[#10201d] text-[#c7f5ec] text-xs p-4 min-h-48 overflow-auto whitespace-pre-wrap">
{log.length ? log.join("\n") : "logs will appear here…"}
        </pre>
      </main>
    </>
  );
}
