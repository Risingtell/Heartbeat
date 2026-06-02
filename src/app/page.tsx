import Link from "next/link";
import { Header } from "@/components/Header";
import { FadeUp } from "@/components/FadeUp";
import { FlowDiagram } from "@/components/FlowDiagram";
import {
  BrandMark,
  HeartIcon,
  PulseIcon,
  MailIcon,
  GuardianIcon,
  ClockIcon,
  LockShieldIcon,
  LinkIcon,
  HaloRing,
} from "@/components/icons";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* ─────────────────────────────  Hero  ───────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="hero-glow absolute inset-0 -z-10" />
          <div className="mx-auto max-w-6xl px-5 pt-20 sm:pt-28 pb-16 text-center animate-fade-up">
            <div className="relative inline-flex items-center justify-center mb-7">
              <HaloRing className="absolute text-accent" size={220} />
              <span className="heart-halo text-accent animate-heartbeat">
                <BrandMark size={64} />
              </span>
            </div>
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-medium text-accent-deep">
              <span className="h-1 w-1 rounded-full bg-accent" /> Powered by
              Story · Confidential Data Rails
            </p>
            <h1 className="mt-5 text-5xl sm:text-7xl leading-[1.02] tracking-tight font-semibold">
              Your keys shouldn&apos;t
              <br />
              <span className="font-display italic text-accent-deep font-normal">
                die with you.
              </span>
            </h1>
            <p className="mt-7 mx-auto max-w-2xl text-lg sm:text-xl text-foreground-soft leading-relaxed">
              Encrypt your seed phrase and final wishes into a proof-of-life
              vault on-chain. Check in now and then. If you ever go silent, the
              people you choose can recover them, and no one, not even us, ever
              sees the secret.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/vault"
                className="group rounded-xl bg-accent hover:bg-accent-deep text-white font-medium px-7 py-3.5 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                Seal your first vault
                <span className="ml-1 transition-transform inline-block group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
              <Link
                href="/claim"
                className="rounded-xl border border-border bg-surface hover:border-accent hover:-translate-y-0.5 hover:shadow-md text-foreground font-medium px-7 py-3.5 transition-all"
              >
                I&apos;m a beneficiary
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Check /> Encrypted in your browser
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check /> No wallet needed for heirs
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check /> Story Aeneid testnet
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check /> Open source
              </span>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────  Stat band  ───────────────────────────── */}
        <FadeUp as="section" className="border-y border-border bg-surface-2">
          <div className="mx-auto max-w-5xl px-5 py-14 grid sm:grid-cols-3 gap-10 sm:gap-6 text-center">
            <div>
              <div className="font-display text-5xl sm:text-6xl text-accent-deep leading-none">
                ~20%
              </div>
              <p className="mt-3 text-sm text-muted leading-relaxed">
                of all bitcoin is already lost forever — most of it keys that
                died with their owner.
                <span className="block mt-1 text-[11px] text-muted-soft">
                  Widely cited industry estimate
                </span>
              </p>
            </div>
            <div>
              <div className="font-display text-5xl sm:text-6xl text-accent-deep leading-none">
                0
              </div>
              <p className="mt-3 text-sm text-muted leading-relaxed">
                people who can ever see your secret while you&apos;re checking
                in — not even us.
              </p>
            </div>
            <div>
              <div className="font-display text-5xl sm:text-6xl text-accent-deep leading-none">
                1 email
              </div>
              <p className="mt-3 text-sm text-muted leading-relaxed">
                is all your heir needs to recover it — no wallet, no seed
                phrase, no lawyer.
              </p>
            </div>
          </div>
        </FadeUp>

        {/* ──────────────────────  Dashboard preview  ────────────────────── */}
        <FadeUp as="section" className="relative pb-24">
          <div className="dot-grid absolute inset-0 -z-10 opacity-60" />
          <div className="mx-auto max-w-4xl px-5">
            <div className="rounded-3xl border border-border bg-surface shadow-2xl overflow-hidden">
              {/* Faux browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border-soft bg-surface-2">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                <div className="mx-auto rounded-md bg-surface border border-border px-3 py-1 text-[11px] text-muted font-mono">
                  heartbeatvault.vercel.app/vault
                </div>
              </div>
              {/* Dashboard body */}
              <div className="px-6 sm:px-10 py-10">
                <div className="text-center">
                  <span className="heart-halo inline-flex text-accent animate-heartbeat">
                    <HeartIcon size={44} />
                  </span>
                  <h3 className="mt-4 text-3xl font-semibold tracking-tight">
                    Active &amp; sealed
                  </h3>
                  <p className="mt-2 text-foreground-soft">
                    Your beneficiary can unlock in{" "}
                    <span className="font-semibold text-foreground">
                      29d 14h 02m
                    </span>{" "}
                    if you stop checking in.
                  </p>
                  <div className="mt-7 inline-flex items-center gap-2 rounded-xl bg-accent text-white font-medium px-8 py-3.5 shadow-md">
                    <HeartIcon size={16} /> I&apos;m still here
                  </div>
                </div>
                <dl className="mt-9 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                  {[
                    ["Beneficiary", "mom@email.com"],
                    ["Window", "30 days"],
                    ["Last heartbeat", "2h 14m ago"],
                    ["Guardians", "2 of 3"],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-xl bg-surface-2 border border-border-soft px-3.5 py-3"
                    >
                      <dt className="text-[11px] uppercase tracking-wider text-muted">
                        {k}
                      </dt>
                      <dd className="mt-1 font-medium text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            {/* Floating badges */}
            <div className="hidden md:flex justify-between -mt-4 px-8">
              <div className="rounded-full border border-border bg-surface shadow-md px-3 py-1.5 text-xs flex items-center gap-2 animate-float">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-heartbeat" />{" "}
                Encrypted client-side
              </div>
              <div
                className="rounded-full border border-border bg-surface shadow-md px-3 py-1.5 text-xs flex items-center gap-2 animate-float"
                style={{ animationDelay: "1.2s" }}
              >
                <HeartIcon className="text-accent" size={12} /> Live on Aeneid
              </div>
            </div>
          </div>
        </FadeUp>

        {/* ─────────────────────  How it works  ────────────────────── */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <FadeUp className="text-center max-w-2xl mx-auto">
              <p className="text-[11px] uppercase tracking-[0.18em] text-accent-deep font-medium">
                How it works
              </p>
              <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">
                Three steps.{" "}
                <span className="font-display italic font-normal text-accent-deep">
                  No trust required.
                </span>
              </h2>
            </FadeUp>

            {/* Visual CDR flow: how the secret travels from you to your heir */}
            <FadeUp className="mt-14 rounded-3xl border border-border-soft bg-background px-5 sm:px-10 py-10">
              <FlowDiagram />
            </FadeUp>

            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {[
                {
                  n: "01",
                  t: "Seal your secret",
                  d: "Write your seed phrase and a final message. It's encrypted in your browser and stored as an on-chain vault. The plaintext never leaves your device.",
                },
                {
                  n: "02",
                  t: "Stay alive, stay sealed",
                  d: "A single click is your heartbeat. As long as you check in, the vault stays locked to everyone, including your heirs.",
                },
                {
                  n: "03",
                  t: "Pass it on",
                  d: "If you go quiet past your chosen window, or your guardians attest, the people you named can finally unlock it. No lawyer, no middleman.",
                },
              ].map((s, i) => (
                <FadeUp
                  key={s.n}
                  delay={i * 120}
                  className="group rounded-2xl border border-border-soft bg-background hover:bg-surface hover:border-accent-glow hover:-translate-y-1 hover:shadow-lg transition-all p-7"
                >
                  <div className="font-display text-3xl text-accent-deep italic">
                    {s.n}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold">{s.t}</h3>
                  <p className="mt-2 text-muted leading-relaxed">{s.d}</p>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────────────  Feature grid  ────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-24">
          <FadeUp className="text-center max-w-2xl mx-auto">
            <p className="text-[11px] uppercase tracking-[0.18em] text-accent-deep font-medium">
              What makes it different
            </p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">
              Built like{" "}
              <span className="font-display italic font-normal text-accent-deep">
                infrastructure
              </span>
              , designed for humans.
            </h2>
          </FadeUp>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: PulseIcon,
                t: "Proof-of-life trigger",
                d: "Automatic release on inactivity, not dependent on someone finding a piece of paper.",
              },
              {
                Icon: MailIcon,
                t: "Email-based recovery",
                d: "Beneficiaries unlock with email or Google. A wallet is created and gas-funded for them automatically.",
              },
              {
                Icon: GuardianIcon,
                t: "Guardian quorum",
                d: "An optional M-of-N of trusted people can attest and accelerate release, behind a challenge window you can cancel.",
              },
              {
                Icon: ClockIcon,
                t: "Time-locked & revocable",
                d: "Set the window. Change beneficiaries. Cancel a false trigger. Rotate the secret. Paper can't.",
              },
              {
                Icon: LockShieldIcon,
                t: "Zero plaintext exposure",
                d: "Split across a network of secure enclaves; nothing reassembled until the on-chain condition passes.",
              },
              {
                Icon: LinkIcon,
                t: "Composable on-chain",
                d: "Any contract can read isClaimable(). Heartbeat vaults are programmable building blocks, not silos.",
              },
            ].map(({ Icon, t, d }, i) => (
              <FadeUp
                key={t}
                delay={(i % 3) * 100}
                className="rounded-2xl border border-border-soft bg-surface p-6 hover:border-accent-glow hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-deep">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm text-muted leading-relaxed">{d}</p>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* ─────────────────────  Trust math  ────────────────────── */}
        <section className="border-y border-border bg-surface-2">
          <div className="mx-auto max-w-3xl px-5 py-24 text-center">
            <FadeUp>
              <p className="text-[11px] uppercase tracking-[0.18em] text-accent-deep font-medium">
                The security model
              </p>
              <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight">
                Trust math,
                <br />
                <span className="font-display italic font-normal text-accent-deep">
                  not people.
                </span>
              </h2>
              <p className="mt-6 text-foreground-soft leading-relaxed text-lg">
                Heartbeat is built on Confidential Data Rails. Your secret is
                split across a decentralized network of secure enclaves and only
                reassembled when your on-chain conditions are met. No company
                holds your keys. No database to breach. No one to bribe,
                including us.
              </p>
            </FadeUp>
            <div className="mt-10 grid sm:grid-cols-3 gap-3 text-sm">
              {[
                [
                  "Client-side encryption",
                  "Plaintext never leaves your device.",
                ],
                ["On-chain conditions", "A custom contract gates every read."],
                [
                  "Threshold TEEs",
                  "Keys reassemble only when conditions pass.",
                ],
              ].map(([t, d], i) => (
                <FadeUp
                  key={t}
                  delay={i * 100}
                  className="rounded-2xl bg-surface border border-border-soft p-5 text-left"
                >
                  <p className="font-medium">{t}</p>
                  <p className="mt-1 text-muted text-sm">{d}</p>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────────────  Final CTA  ────────────────────── */}
        <FadeUp
          as="section"
          className="mx-auto max-w-3xl px-5 py-28 text-center"
        >
          <div className="relative inline-flex items-center justify-center mb-7">
            <HaloRing className="absolute text-accent" size={180} />
            <span className="heart-halo text-accent animate-heartbeat">
              <BrandMark size={56} />
            </span>
          </div>
          <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
            Seal one in
            <br />
            <span className="font-display italic font-normal text-accent-deep">
              under a minute.
            </span>
          </h2>
          <p className="mt-5 text-foreground-soft max-w-xl mx-auto">
            Your seed phrase deserves better than a sticky note. Heartbeat takes
            a few clicks and lasts longer than you do.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/vault"
              className="rounded-xl bg-accent hover:bg-accent-deep text-white font-medium px-8 py-3.5 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Create your vault
            </Link>
            <Link
              href="/claim"
              className="rounded-xl border border-border bg-surface hover:border-accent hover:-translate-y-0.5 hover:shadow-md text-foreground font-medium px-8 py-3.5 transition-all"
            >
              I&apos;m a beneficiary
            </Link>
          </div>
        </FadeUp>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
          <p className="flex items-center gap-2">
            <BrandMark className="text-accent" size={14} /> Heartbeat · built
            for the Story CDR Hackathon
          </p>
          <p className="flex items-center gap-5">
            <a
              className="hover:text-foreground transition-colors"
              href="https://github.com/Risingtell/Heartbeat"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              className="hover:text-foreground transition-colors"
              href="https://www.story.foundation/blog/confidential-data-rails"
              target="_blank"
              rel="noreferrer"
            >
              About CDR
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2 7.5L5.5 11L12 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-accent"
      />
    </svg>
  );
}
