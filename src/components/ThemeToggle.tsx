"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border bg-surface hover:border-accent text-foreground transition-colors"
    >
      {/* Sun (shown in dark mode to indicate "switch to light") */}
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        className={isDark ? "block" : "hidden"}
        aria-hidden
      >
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M12 3v2" /><path d="M12 19v2" />
          <path d="M3 12h2" /><path d="M19 12h2" />
          <path d="M5.6 5.6l1.4 1.4" /><path d="M17 17l1.4 1.4" />
          <path d="M5.6 18.4l1.4-1.4" /><path d="M17 7l1.4-1.4" />
        </g>
      </svg>
      {/* Moon (shown in light mode to indicate "switch to dark") */}
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        className={isDark ? "hidden" : "block"}
        aria-hidden
      >
        <path
          d="M20 14.5A8 8 0 0 1 9.5 4a1 1 0 0 0-1.3-1.3A10 10 0 1 0 21.3 15.8 1 1 0 0 0 20 14.5z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}
