"use client";
import Link from "next/link";
import { LoginButton } from "./LoginButton";

export function Header() {
  return (
    <header className="w-full border-b border-[--border] bg-[--background]/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-[--foreground]">
          <span className="text-accent animate-heartbeat text-xl leading-none">♥</span>
          <span className="tracking-tight">Heartbeat</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-muted">
          <Link href="/vault" className="hover:text-[--foreground] transition-colors">Your vault</Link>
          <Link href="/claim" className="hover:text-[--foreground] transition-colors">Beneficiary</Link>
        </nav>
        <LoginButton />
      </div>
    </header>
  );
}
