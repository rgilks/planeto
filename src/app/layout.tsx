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

// The Web Analytics beacon token is public by design (it ships in the page
// HTML). Default to the tre.systems site token - Cloudflare records the real
// request host, so planeto.tre.systems visits are attributed correctly - and
// keep the env override for other deployments.
const beaconToken =
  process.env["NEXT_PUBLIC_CF_BEACON_TOKEN"] ??
  "893eaee1dc1d46109119d2b54cdf023e";

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
