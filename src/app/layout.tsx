import type { Metadata } from "next";
import type { ReactNode } from "react";
import { env } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRYSTAL // FORGE — Technology Architect",
  description: "A living technology headquarters for systems, security, and field-tested ideas.",
  metadataBase: new URL(env.siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "CRYSTAL // FORGE",
    title: "CRYSTAL // FORGE — Technology Architect",
    description: "A living technology headquarters for systems, security, and field-tested ideas.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CRYSTAL // FORGE — Technology Architect",
    description: "A living technology headquarters for systems, security, and field-tested ideas.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>{children}</body>
    </html>
  );
}
