"use client";
import { useState } from "react";
import { LoginButton } from "@/components/LoginButton";
import { useActiveWallet } from "@/lib/useActiveWallet";
import { ensureWasm, createVault, readVault } from "@/lib/cdr";
import { Header } from "@/components/Header";

type Status = "idle" | "running" | "ok" | "fail";

export default function TestPage() {
  const { address, walletClient } = useActiveWallet();
  const [log, setLog] = useState<
    { time: string; line: string; tone: "info" | "ok" | "fail" }[]
  >([]);
  const [uuid, setUuid] = useState<number | null>(null);
  const [running, setRunning] = useState<string>("");
  const [status, setStatus] = useState<{
    wasm: Status;
    create: Status;
    read: Status;
  }>({
    wasm: "idle",
    create: "idle",
    read: "idle",
  });

  const push = (line: string, tone: "info" | "ok" | "fail" = "info") =>
    setLog((l) => [
      ...l,
      { time: new Date().toLocaleTimeString(), line, tone },
    ]);

  async function testWasm() {
    setRunning("wasm");
    setStatus((s) => ({ ...s, wasm: "running" }));
    try {
      push("initWasm()…");
      await ensureWasm();
      push("WASM initialized in browser", "ok");
      const r = await fetch("/api/cdr/dkg/global_public_key");
      push(`proxy /dkg/global_public_key → HTTP ${r.status}`, "ok");
      setStatus((s) => ({ ...s, wasm: "ok" }));
    } catch (e) {
      push((e as Error)?.message ?? String(e), "fail");
      setStatus((s) => ({ ...s, wasm: "fail" }));
    } finally {
      setRunning("");
    }
  }

  async function testCreate() {
    if (!walletClient || !address) {
      push("connect a wallet first", "fail");
      return;
    }
    setRunning("create");
    setStatus((s) => ({ ...s, create: "running" }));
    try {
      push("creating vault (encrypt + allocate + write)…");
      const secret = new TextEncoder().encode(
        "browser test secret " + Date.now(),
      );
      // Dev round-trip: owner is its own heir, short window.
      const id = await createVault(
        walletClient,
        address,
        address,
        120n,
        secret,
      );
      setUuid(id);
      push(`vault created, uuid=${id}`, "ok");
      setStatus((s) => ({ ...s, create: "ok" }));
    } catch (e) {
      push(
        (e as { shortMessage?: string; message?: string })?.shortMessage ??
          (e as Error)?.message ??
          String(e),
        "fail",
      );
      setStatus((s) => ({ ...s, create: "fail" }));
    } finally {
      setRunning("");
    }
  }

  async function testRead() {
    if (!walletClient || uuid === null) {
      push("create a vault first", "fail");
      return;
    }
    setRunning("read");
    setStatus((s) => ({ ...s, read: "running" }));
    try {
      push(
        `reading vault ${uuid} (gated — expected to fail unless conditions are met)…`,
      );
      const data = await readVault(walletClient, uuid);
      push("recovered: " + new TextDecoder().decode(data), "ok");
      setStatus((s) => ({ ...s, read: "ok" }));
    } catch (e) {
      push(
        (e as { shortMessage?: string; message?: string })?.shortMessage ??
          (e as Error)?.message ??
          String(e),
        "fail",
      );
      setStatus((s) => ({ ...s, read: "fail" }));
    } finally {
      setRunning("");
    }
  }

  return (
    <>
      <Header />
      <main className="relative">
        <div className="hero-glow absolute inset-x-0 top-0 h-72 -z-10" />
        <div className="mx-auto max-w-3xl px-5 py-14 w-full space-y-6 animate-fade-up">
          {/* Page header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-medium text-accent-deep">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-heartbeat" />{" "}
                Developer
              </p>
              <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
                Browser{" "}
                <span className="font-display italic font-normal text-accent-deep">
                  integration test.
                </span>
              </h1>
              <p className="mt-2 text-foreground-soft text-sm max-w-xl">
                Confirms the CDR WASM + REST proxy + wallet transactions work
                end-to-end in the browser. Your connected wallet needs Aeneid
                testnet IP for the create step.
              </p>
            </div>
            <LoginButton />
          </div>

          {/* Steps */}
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <Step
              num="01"
              title="WASM + REST proxy"
              hint="Initialize the threshold-crypto WASM and ping the CDR proxy."
              status={status.wasm}
              busy={running === "wasm"}
              onRun={testWasm}
              disabled={running !== ""}
            />
            <Step
              num="02"
              title="Create a vault"
              hint="Encrypt a test secret, allocate a CDR vault, and write the ciphertext."
              status={status.create}
              busy={running === "create"}
              onRun={testCreate}
              disabled={running !== "" || !address}
              disabledHint={
                !address ? "Connect a funded wallet first" : undefined
              }
            />
            <Step
              num="03"
              title="Read the vault"
              hint="Try the heir-side accessCDR path. Expected to fail unless the read condition is met."
              status={status.read}
              busy={running === "read"}
              onRun={testRead}
              disabled={running !== "" || uuid === null}
              disabledHint={uuid === null ? "Run step 02 first" : undefined}
              last
            />
          </div>

          {/* Terminal log */}
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-border-soft flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <p className="ml-2 text-[11px] uppercase tracking-wider text-muted font-mono">
                heartbeat / log
              </p>
              {log.length > 0 && (
                <button
                  onClick={() => setLog([])}
                  className="ml-auto text-[11px] uppercase tracking-wider text-muted hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <pre className="bg-surface-2 text-foreground font-mono text-xs p-4 min-h-48 max-h-80 overflow-auto whitespace-pre-wrap leading-relaxed">
              {log.length === 0 ? (
                <span className="text-muted">logs will appear here…</span>
              ) : (
                log.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-muted-soft shrink-0">{l.time}</span>
                    <span className={toneClass(l.tone)}>
                      {l.tone === "ok" ? "✓ " : l.tone === "fail" ? "✗ " : "· "}
                      {l.line}
                    </span>
                  </div>
                ))
              )}
            </pre>
          </div>
        </div>
      </main>
    </>
  );
}

function Step({
  num,
  title,
  hint,
  status,
  busy,
  onRun,
  disabled,
  disabledHint,
  last,
}: {
  num: string;
  title: string;
  hint: string;
  status: Status;
  busy: boolean;
  onRun: () => void;
  disabled?: boolean;
  disabledHint?: string;
  last?: boolean;
}) {
  return (
    <div
      className={`px-6 py-5 flex items-center justify-between gap-4 ${
        last ? "" : "border-b border-border-soft"
      } hover:bg-surface-2 transition-colors`}
    >
      <div className="flex items-start gap-4 min-w-0">
        <span className="font-display italic text-2xl text-accent-deep w-10 shrink-0 leading-none mt-0.5">
          {num}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">{title}</p>
            <StatusPill status={status} busy={busy} />
          </div>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">{hint}</p>
          {disabled && disabledHint && (
            <p className="text-[11px] text-muted-soft mt-1">{disabledHint}</p>
          )}
        </div>
      </div>
      <button
        onClick={onRun}
        disabled={disabled || busy}
        className="shrink-0 rounded-lg bg-accent hover:bg-accent-deep text-white text-sm font-medium px-4 py-2 disabled:opacity-40 transition-colors"
      >
        {busy ? "Running…" : "Run"}
      </button>
    </div>
  );
}

function StatusPill({ status, busy }: { status: Status; busy: boolean }) {
  if (busy) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft text-accent-deep text-[10px] uppercase tracking-wider px-1.5 py-0.5 font-medium">
        <span className="h-1 w-1 rounded-full bg-accent animate-heartbeat" />{" "}
        running
      </span>
    );
  }
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft text-accent-deep text-[10px] uppercase tracking-wider px-1.5 py-0.5 font-medium">
        ✓ pass
      </span>
    );
  }
  if (status === "fail") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warm-soft text-warm text-[10px] uppercase tracking-wider px-1.5 py-0.5 font-medium">
        ✗ fail
      </span>
    );
  }
  return null;
}

function toneClass(tone: "info" | "ok" | "fail") {
  if (tone === "ok") return "text-accent-deep";
  if (tone === "fail") return "text-warm";
  return "text-foreground-soft";
}
