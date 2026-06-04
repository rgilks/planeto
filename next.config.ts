import type { NextConfig } from "next";

// Static export: the app is a client-only WebGL toy. It is served as static
// assets by the Cloudflare Worker (see wrangler.toml); the only server concern,
// /api/events, is handled by the EventsChannel Durable Object, not Next.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
