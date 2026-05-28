import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Heartbeat — your keys outlive you",
  description:
    "A proof-of-life vault. Encrypt your seed phrase and final wishes on-chain; if you ever go silent, the people you choose can recover them. No lawyer, no middleman, no plaintext ever exposed.",
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
