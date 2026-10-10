import type { Metadata } from "next";
import { Bodoni_Moda, Geist, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Interface and body text.
const sans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Headlines: a high-contrast Didone, the letterform of certificates and banknotes.
const display = Bodoni_Moda({
  variable: "--font-display-face",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

// Annotations, labels and identifiers.
const mono = IBM_Plex_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CipherComply — private eligibility verification",
  description: "Privacy-preserving eligibility attestation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable} antialiased`}>
      <body className="min-h-screen bg-canvas font-sans text-ink">{children}</body>
    </html>
  );
}
