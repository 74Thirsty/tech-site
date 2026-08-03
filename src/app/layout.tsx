import type { Metadata } from "next";
import type { ReactNode } from "react";
import { env } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crystal Forge — Technology Architect",
  description: "A living technology headquarters for systems, security, and field-tested ideas.",
  metadataBase: new URL(env.siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Crystal Forge",
    title: "Crystal Forge — Technology Architect",
    description: "A living technology headquarters for systems, security, and field-tested ideas.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crystal Forge — Technology Architect",
    description: "A living technology headquarters for systems, security, and field-tested ideas.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>{children}</body>
    </html>
  );
}
