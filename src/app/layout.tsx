import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://heartbeatvault.vercel.app"),
  title: "Heartbeat — your keys shouldn't die with you",
  description:
    "A proof-of-life vault. Encrypt your seed phrase and final wishes on-chain; if you ever go silent, the people you choose can recover them. No lawyer, no middleman, no plaintext ever exposed.",
  openGraph: {
    title: "Heartbeat — your keys shouldn't die with you",
    description:
      "Proof-of-life crypto inheritance vaults on Story CDR. Your secret stays sealed while you check in; your heirs unlock it if you go silent — with just an email.",
    url: "https://heartbeatvault.vercel.app",
    siteName: "Heartbeat",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Heartbeat — your keys shouldn't die with you",
    description:
      "Proof-of-life crypto inheritance vaults on Story CDR. Beneficiaries claim with just an email — no wallet required.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[--background] text-[--foreground]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
