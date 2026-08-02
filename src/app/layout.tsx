import type { Metadata } from "next";
import type { ReactNode } from "react";
import { env } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEON//FORGE — Technology Architect",
  description: "A living technology headquarters for systems, security, and field-tested ideas.",
  metadataBase: new URL(env.siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "NEON//FORGE",
    title: "NEON//FORGE — Technology Architect",
    description: "A living technology headquarters for systems, security, and field-tested ideas.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEON//FORGE — Technology Architect",
    description: "A living technology headquarters for systems, security, and field-tested ideas.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>{children}</body>
    </html>
  );
}
