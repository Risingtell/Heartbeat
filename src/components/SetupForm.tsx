"use client";
import { useState } from "react";
import { isAddress, type Address } from "viem";
import { DEAD_MAN_SWITCH, deadManSwitchAbi } from "@/lib/contract";
import { createVault } from "@/lib/cdr";
import { addVault } from "@/lib/storage";
import { PERIOD_PRESETS } from "@/lib/format";
import { useActiveWallet } from "@/lib/useActiveWallet";
import { publicClient } from "@/lib/viem";

const MAX_SECRET_BYTES = 760;

type Step = "idle" | "provisioning" | "configuring" | "allocating" | "done" | "error";

export function SetupForm({ onComplete }: { onComplete: (uuid: number) => void }) {
  const { address, walletClient } = useActiveWallet();

  const [heirMode, setHeirMode] = useState<"email" | "address">("email");
  const [heir, setHeir] = useState("");
  const [heirEmail, setHeirEmail] = useState("");
  const [periodSeconds, setPeriodSeconds] = useState(PERIOD_PRESETS[0].seconds);
  const [seed, setSeed] = useState("");
  const [message, setMessage] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [guardiansRaw, setGuardiansRaw] = useState("");
  const [threshold, setThreshold] = useState(0);
  const [challengeMin, setChallengeMin] = useState(0);

  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [createdUuid, setCreatedUuid] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const secretBytes = new TextEncoder().encode(`${seed.trim()}\n\n--- MESSAGE ---\n\n${message.trim()}`);
  const tooLong = secretBytes.length > MAX_SECRET_BYTES;

  const guardians = guardiansRaw
    .split(/[\s,]+/)
    .map((g) => g.trim())
    .filter((g) => g.length > 0);
  const guardiansValid = guardians.every((g) => isAddress(g));

  const heirValid = isAddress(heir) && heir.toLowerCase() !== address?.toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(heirEmail.trim());
  const heirReady = heirMode === "address" ? heirValid : emailValid;
  const guardiansOk = !advanced || (guardiansValid && threshold <= guardians.length);
  const ready = step === "idle" || step === "error";
  const canSubmit =
    !!walletClient && !!address && heirReady && seed.trim().length > 0 && !tooLong && guardiansOk && ready;

  const disabledReason =
    !address ? "Connect your wallet first." :
    !walletClient ? "Wallet is still connecting — give it a second, then try again." :
    !heirReady ? (heirMode === "email" ? "Enter a valid beneficiary email address." : "Enter a valid beneficiary wallet address (not your own).") :
    seed.trim().length === 0 ? "Enter the recovery phrase or secret you want to protect." :
    tooLong ? "Your secret + message is too long — shorten the message." :
    !guardiansOk ? "Check the guardian addresses and the number required." :
    "";

  async function handleSubmit() {
    if (!walletClient || !address) return;
    setError("");
    try {
      let heirAddress = heir;
      if (heirMode === "email") {
        setStep("provisioning");
        const res = await fetch("/api/provision", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: heirEmail.trim() }),
        });
        const data = await res.json();
        if (!res.ok || !data.address) throw new Error(data.error ?? "Could not set up the beneficiary");
        heirAddress = data.address;
      }

      setStep("configuring");
      const gList = (advanced ? guardians : []) as Address[];
      const gThreshold = advanced ? threshold : 0;
      const challenge = advanced ? BigInt(challengeMin * 60) : 0n;
      const cfgHash = await walletClient.writeContract({
        address: DEAD_MAN_SWITCH,
        abi: deadManSwitchAbi,
        functionName: "configure",
        args: [heirAddress as Address, BigInt(periodSeconds), gList, gThreshold, challenge],
        account: walletClient.account!,
        chain: walletClient.chain,
      });
      await publicClient.waitForTransactionReceipt({ hash: cfgHash });

      setStep("allocating");
      const uuid = await createVault(walletClient, address as Address, secretBytes);
      addVault(address, { uuid, heir: heirAddress, createdAt: Date.now() });

      setCreatedUuid(uuid);
      setStep("done");
    } catch (e) {
      const msg = (e as { shortMessage?: string; message?: string })?.shortMessage ?? (e as Error)?.message ?? String(e);
      setError(msg);
      setStep("error");
    }
  }

  const busy = step === "provisioning" || step === "configuring" || step === "allocating";

  /* ───────────────────  Success / "sealed" state  ─────────────────── */
  if (step === "done" && createdUuid !== null) {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/claim?owner=${address}&uuid=${createdUuid}`;
    return (
      <div className="relative rounded-3xl border border-accent/40 bg-surface overflow-hidden animate-fade-up">
        <div className="hero-glow absolute inset-0 -z-10" />
        <div className="px-6 sm:px-12 py-14 text-center">
          <div className="heart-halo mx-auto text-accent text-6xl leading-none animate-heartbeat">♥</div>
          <p className="mt-6 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-medium text-accent-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Sealed
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
            Your vault is <span className="font-display italic font-normal text-accent-deep">protected.</span>
          </h2>
          <p className="mt-3 text-foreground-soft max-w-md mx-auto">
            It&apos;s encrypted on-chain and locked to your heartbeat. Save this link and share it with your beneficiary — it only ever opens if you go silent.
          </p>
          <div className="mt-7 flex items-center gap-2 rounded-xl bg-background border border-border p-2 max-w-lg mx-auto">
            <code className="flex-1 text-xs text-left truncate px-2 font-mono text-foreground-soft">{link}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="rounded-lg bg-accent text-white px-3 py-1.5 text-sm font-medium hover:bg-accent-deep transition-colors shrink-0"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
          <button
            onClick={() => onComplete(createdUuid)}
            className="mt-7 rounded-xl border border-border bg-background hover:border-accent transition-colors font-medium px-6 py-3"
          >
            Go to my dashboard →
          </button>
        </div>
      </div>
    );
  }

  /* ───────────────────  Setup form  ─────────────────── */
  return (
    <div className="rounded-3xl border border-border bg-surface overflow-hidden animate-fade-up">
      <div className="px-6 sm:px-10 py-8 border-b border-border-soft">
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent-deep font-medium">Create a vault</p>
        <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
          Set up your <span className="font-display italic font-normal text-accent-deep">vault.</span>
        </h2>
        <p className="mt-2 text-foreground-soft">
          Your secret is encrypted in your browser before it ever touches the network. We never see it.
        </p>
      </div>

      <div className="px-6 sm:px-10 py-8 space-y-7">
        {/* Beneficiary */}
        <div>
          <FieldLabel>Beneficiary</FieldLabel>
          <FieldHint>Who can recover your secret if you go silent.</FieldHint>
          <div className="mt-3 inline-flex rounded-lg border border-border p-0.5 bg-background text-sm">
            <button
              type="button" onClick={() => setHeirMode("email")}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-colors ${heirMode === "email" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              Email · no wallet
            </button>
            <button
              type="button" onClick={() => setHeirMode("address")}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-colors ${heirMode === "address" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              Wallet address
            </button>
          </div>
          <div className="mt-3">
            {heirMode === "email" ? (
              <>
                <input
                  type="email" value={heirEmail} onChange={(e) => setHeirEmail(e.target.value)}
                  placeholder="mom@email.com"
                  className={`field-input ${heirEmail.length > 0 && !emailValid ? "invalid" : ""}`}
                />
                <p className="mt-2 text-xs text-muted">
                  We&apos;ll create a secure wallet for them automatically — they just sign in with this email to unlock. No crypto knowledge needed.
                </p>
              </>
            ) : (
              <>
                <input
                  value={heir} onChange={(e) => setHeir(e.target.value)} placeholder="0x…"
                  className={`field-input font-mono text-sm ${heir.length > 0 && !heirValid ? "invalid" : ""}`}
                />
                {heir.length > 0 && !heirValid && (
                  <p className="mt-2 text-xs text-warm">Enter a valid address that isn&apos;t your own.</p>
                )}
              </>
            )}
          </div>
        </div>

        <Field label="Inactivity window" hint="How long without a heartbeat before your beneficiary can unlock.">
          <select
            value={periodSeconds}
            onChange={(e) => setPeriodSeconds(Number(e.target.value))}
            className="field-input"
          >
            {PERIOD_PRESETS.map((p) => (
              <option key={p.seconds} value={p.seconds}>{p.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Recovery phrase / secret" hint="Seed phrase, private key, or anything you need to pass on.">
          <textarea
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            rows={3}
            placeholder="word1 word2 word3 …"
            className="field-input font-mono text-sm resize-none"
          />
        </Field>

        <Field label="Final message (optional)" hint="A note your beneficiary will read alongside the secret.">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Everything you need is here. I love you."
            className="field-input resize-none"
          />
        </Field>

        <p className={`text-xs ${tooLong ? "text-warm" : "text-muted"}`}>
          {secretBytes.length}/{MAX_SECRET_BYTES} bytes {tooLong ? "— too long, shorten the message." : ""}
        </p>

        <button
          type="button"
          onClick={() => setAdvanced((a) => !a)}
          className="text-sm text-accent-deep hover:underline"
        >
          {advanced ? "− Hide" : "+ Add"} trusted guardians (optional)
        </button>

        {advanced && (
          <div className="rounded-2xl bg-accent-soft/30 border border-accent/20 p-5 space-y-4">
            <Field label="Guardian addresses" hint="People who can together confirm you're gone, to release early.">
              <textarea
                value={guardiansRaw}
                onChange={(e) => setGuardiansRaw(e.target.value)}
                rows={2}
                placeholder="0x…, 0x…"
                className={`field-input font-mono text-sm resize-none ${guardiansRaw.length > 0 && !guardiansValid ? "invalid" : ""}`}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Guardians required">
                <input
                  type="number" min={0} max={guardians.length}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="field-input"
                />
              </Field>
              <Field label="Challenge window (min)" hint="Grace period to cancel a false trigger.">
                <input
                  type="number" min={0}
                  value={challengeMin}
                  onChange={(e) => setChallengeMin(Number(e.target.value))}
                  className="field-input"
                />
              </Field>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-warm/30 bg-warm-soft px-4 py-3">
            <p className="text-sm text-warm break-words">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="group w-full rounded-xl bg-accent hover:bg-accent-deep text-white font-medium px-6 py-3.5 shadow-md hover:shadow-lg disabled:opacity-40 disabled:shadow-none transition-all focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          {step === "provisioning" ? "Setting up your beneficiary…" :
           step === "configuring" ? "Confirm setup in wallet…" :
           step === "allocating" ? "Encrypting & sealing vault…" :
           <span className="inline-flex items-center gap-2">Seal my vault <span className="transition-transform inline-block group-hover:translate-x-0.5">→</span></span>}
        </button>
        {busy && (
          <p className="text-xs text-muted text-center">
            This takes a few wallet confirmations: configure → allocate → write. Approve each prompt.
          </p>
        )}
        {!canSubmit && !busy && disabledReason && (
          <p className="text-xs text-warm text-center">{disabledReason}</p>
        )}
      </div>
    </div>
  );
}

/* ─────────  shared bits  ───────── */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      {hint && <FieldHint>{hint}</FieldHint>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-medium text-foreground">{children}</span>;
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs text-muted mt-1">{children}</span>;
}
