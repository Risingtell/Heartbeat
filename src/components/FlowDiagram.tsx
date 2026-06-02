import {
  KeyIcon,
  LockShieldIcon,
  NetworkIcon,
  ClockIcon,
  MailIcon,
} from "./icons";

const STEPS = [
  { Icon: KeyIcon, t: "Your secret", d: "Seed phrase + a final message" },
  {
    Icon: LockShieldIcon,
    t: "Encrypted in your browser",
    d: "Plaintext never leaves your device",
  },
  {
    Icon: NetworkIcon,
    t: "Split across secure enclaves",
    d: "Threshold-encrypted — no node holds the key",
  },
  {
    Icon: ClockIcon,
    t: "On-chain dead-man's switch",
    d: "Opens only after you go silent",
  },
  {
    Icon: MailIcon,
    t: "Your heir, with an email",
    d: "No wallet, no seed, no lawyer",
  },
];

export function FlowDiagram() {
  return (
    <div className="flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-3 lg:gap-2">
      {STEPS.map(({ Icon, t, d }, i) => (
        <div key={t} className="contents">
          <div className="flex flex-col items-center text-center gap-3 lg:w-44 shrink-0">
            <div className="grid place-items-center h-14 w-14 rounded-2xl bg-accent-soft text-accent-deep border border-accent/20 shadow-sm">
              <Icon size={26} />
            </div>
            <div>
              <p className="font-medium text-sm leading-tight">{t}</p>
              <p className="text-xs text-muted mt-1 leading-snug">{d}</p>
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <>
              <div
                className="hidden lg:block flow-line h-0.5 flex-1 self-center mt-[-2.25rem] rounded-full min-w-6"
                aria-hidden
              />
              <div
                className="lg:hidden flow-line w-0.5 h-5 rounded-full"
                aria-hidden
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
