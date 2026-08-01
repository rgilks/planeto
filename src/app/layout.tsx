import Script from "next/script";

import type { Metadata } from "next";

import "./globals.css";

const title = "Planeto";
const description =
  "A tiny shared universe - drift among little planets and wave at strangers.";

export const metadata: Metadata = {
  metadataBase: new URL("https://planeto.tre.systems"),
  title,
  description,
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.json",
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Planeto",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
};

const beaconToken = process.env["NEXT_PUBLIC_CF_BEACON_TOKEN"];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {beaconToken && (
          <Script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: beaconToken })}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
