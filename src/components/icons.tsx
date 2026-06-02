type IconProps = { className?: string; size?: number };

export function HeartIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 21.4s-7.2-4.6-9.7-9.4C.8 8.2 3.4 3.5 7.6 3.5c2.2 0 3.6 1.2 4.4 2.5.8-1.3 2.2-2.5 4.4-2.5 4.2 0 6.8 4.7 5.3 8.5C19.2 16.8 12 21.4 12 21.4z" />
    </svg>
  );
}

export function PulseIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M2 12h4l2-6 4 12 3-9 2 3h5" />
    </svg>
  );
}

export function MailIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3.5 7.5l8.5 5.5 8.5-5.5" />
    </svg>
  );
}

export function GuardianIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 2.5L4 5.5V11c0 4.8 3.5 9 8 10.5 4.5-1.5 8-5.7 8-10.5V5.5l-8-3z" />
      <circle cx="9.5" cy="11" r="1.2" />
      <circle cx="14.5" cy="11" r="1.2" />
      <path d="M9 14.6c.6-.7 1.5-1.2 2.5-1.2s1.9.5 2.5 1.2" />
    </svg>
  );
}

export function ClockIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5L15.5 14.5" />
    </svg>
  );
}

export function LockShieldIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" />
      <circle cx="12" cy="15.5" r="1.1" />
    </svg>
  );
}

export function LinkIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1" />
      <path d="M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" />
    </svg>
  );
}

/** Heartbeat-vault brand mark: a vault shield with a proof-of-life pulse. */
export function BrandMark({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M12 2.4L4 5.3V11c0 4.8 3.4 9 8 10.6 4.6-1.6 8-5.8 8-10.6V5.3L12 2.4z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6.6 12.3h2.2l1.2-3.1 1.9 6.1 1.3-3h2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KeyIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="8" cy="8" r="4.2" />
      <path d="M11 11l7.5 7.5M15.5 15.5l2-2M17.5 17.5l2-2" />
    </svg>
  );
}

/** Secret split across a network of enclaves (one node fanning into three). */
export function NetworkIcon({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 7.4v8.4M12 7.4L5.5 15.6M12 7.4L18.5 15.6" />
      <circle cx="12" cy="5.2" r="2.2" fill="currentColor" fillOpacity="0.12" />
      <circle cx="5" cy="17.8" r="2.2" fill="currentColor" fillOpacity="0.12" />
      <circle
        cx="12"
        cy="17.8"
        r="2.2"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <circle
        cx="19"
        cy="17.8"
        r="2.2"
        fill="currentColor"
        fillOpacity="0.12"
      />
    </svg>
  );
}

/** Decorative ring of dots around a focal element (hero ornament). */
export function HaloRing({ className = "", size = 200 }: IconProps) {
  const dots = 24;
  const r = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden
    >
      {Array.from({ length: dots }).map((_, i) => {
        const angle = (i / dots) * Math.PI * 2 - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        const opacity =
          0.18 +
          0.5 * (1 - Math.abs(((i + dots / 4) % dots) - dots / 2) / (dots / 2));
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={1.6}
            fill="currentColor"
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
}
