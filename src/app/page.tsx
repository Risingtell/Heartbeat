import Link from "next/link";
import { Header } from "@/components/Header";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pt-16 pb-12 text-center">
          <div className="text-7xl text-accent animate-heartbeat mb-6 leading-none">♥</div>
          <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft text-accent-deep px-3 py-1 text-xs font-medium">
            <span className="animate-heartbeat">♥</span> Proof-of-life vaults · powered by Story CDR
          </p>
          <h1 className="mt-6 text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
            Your keys shouldn&apos;t<br className="hidden sm:block" /> die with you.
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-lg text-muted">
            Billions in crypto are lost forever because seed phrases vanish with their owners. Heartbeat lets you
            encrypt your recovery phrase and final wishes on-chain. Check in now and then. If you ever go silent,
            the people you choose can recover them — and no one, not even us, ever sees the secret.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/vault"
              className="rounded-xl bg-accent hover:bg-accent-deep transition-colors text-white font-medium px-6 py-3.5 shadow-sm"
            >
              Create your vault
            </Link>
            <Link
              href="/claim"
              className="rounded-xl border border-[--border] bg-card hover:border-accent transition-colors font-medium px-6 py-3.5"
            >
              I&apos;m a beneficiary
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">Runs on Story Aeneid testnet · your secret is encrypted in your browser</p>
        </section>

        {/* Dashboard preview */}
        <section className="mx-auto max-w-3xl px-5 pb-16">
          <p className="text-center text-xs uppercase tracking-wider text-muted mb-3">A peek at your dashboard</p>
          <div className="rounded-2xl border border-[--border] bg-card shadow-xl p-6 sm:p-10">
            <div className="text-center">
              <div className="text-5xl text-accent animate-heartbeat leading-none">♥</div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">Active &amp; sealed</h3>
              <p className="mt-1 text-muted">
                Your beneficiary can unlock in{" "}
                <span className="font-semibold text-[--foreground]">29d 14h</span> if you stop checking in.
              </p>
              <div className="mt-6 inline-flex rounded-xl bg-accent text-white font-medium px-8 py-3.5">
                ♥ I&apos;m still here
              </div>
            </div>
            <dl className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
              <div className="rounded-xl bg-background px-3 py-2.5">
                <dt className="text-xs text-muted">Beneficiary</dt>
                <dd className="mt-0.5 font-medium font-mono text-sm">mom@…</dd>
              </div>
              <div className="rounded-xl bg-background px-3 py-2.5">
                <dt className="text-xs text-muted">Window</dt>
                <dd className="mt-0.5 font-medium">30d</dd>
              </div>
              <div className="rounded-xl bg-background px-3 py-2.5">
                <dt className="text-xs text-muted">Last heartbeat</dt>
                <dd className="mt-0.5 font-medium">2h 14m ago</dd>
              </div>
              <div className="rounded-xl bg-background px-3 py-2.5">
                <dt className="text-xs text-muted">Guardians</dt>
                <dd className="mt-0.5 font-medium">2 of 3</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-[--border] bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16 grid gap-10 sm:grid-cols-3">
            {[
              { n: "01", t: "Seal your secret", d: "Write your seed phrase and a final message. It's encrypted in your browser and stored as an on-chain vault — the plaintext never leaves your device." },
              { n: "02", t: "Stay alive, stay sealed", d: "A single click is your heartbeat. As long as you check in, the vault stays locked to everyone — including your heirs." },
              { n: "03", t: "Pass it on", d: "If you go quiet past your chosen window, the people you named (or your guardians together) can finally unlock it. No lawyer, no middleman." },
            ].map((s) => (
              <div key={s.n}>
                <div className="text-accent font-mono text-sm">{s.n}</div>
                <h3 className="mt-2 text-xl font-semibold">{s.t}</h3>
                <p className="mt-2 text-muted leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust */}
        <section className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Trust math, not people</h2>
          <p className="mt-4 text-muted leading-relaxed">
            Heartbeat is built on Confidential Data Rails. Your secret is split across a decentralized network of
            secure enclaves and only reassembled when your on-chain conditions are met. There is no company holding
            your keys, no database to breach, and no one to bribe.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted">
            <span>✓ Time-based release</span>
            <span>✓ Trusted guardians</span>
            <span>✓ Cancel anytime</span>
            <span>✓ Zero plaintext exposure</span>
          </div>
        </section>
      </main>

      <footer className="border-t border-[--border] py-8 text-center text-sm text-muted">
        Heartbeat · built for the Story CDR Hackathon
      </footer>
    </>
  );
}
