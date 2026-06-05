// Cloudflare Worker entry point. The static Next export in ./out is served by
// the [assets] binding; only /api/events runs the Worker (run_worker_first),
// which forwards it to the single global EventsChannel Durable Object. Anything
// else falls through to static assets.

import { EventsChannel } from "./eventsChannel";
import { RateLimiter, type RateLimitHit } from "./rateLimiter";

export { EventsChannel, RateLimiter };

interface Env {
  EVENTS: DurableObjectNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  ASSETS: Fetcher;
}

const ROOM = "global";

// Per-IP cap on the unauthenticated POST /api/events write path. Generous on
// purpose — normal play beacons eye/symbol events frequently, and the Playwright
// e2e POSTs many times in quick succession from one IP — so legitimate traffic
// is never throttled. Matches antenna's public-read limit (120 / 60s).
const POST_RATE_LIMIT = 120;
const POST_RATE_WINDOW_MS = 60_000;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/events") {
      const stub = env.EVENTS.get(env.EVENTS.idFromName(ROOM));
      if (request.method === "GET") {
        return stub.fetch("https://do/subscribe");
      }
      if (request.method === "POST") {
        const limited = await isRateLimited(request, env);
        if (limited) return limited;
        const body = await request.text();
        return stub.fetch("https://do/publish", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        });
      }
      return new Response("method_not_allowed", { status: 405 });
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

// Record one hit for the caller's IP against the RateLimiter DO and, if the
// window budget is now exceeded, return a 429 response to short-circuit the
// POST. Returns null when the request is within budget (forward as normal).
async function isRateLimited(
  request: Request,
  env: Env,
): Promise<Response | null> {
  // CF-Connecting-IP is the real client IP in production. It is absent under
  // local `wrangler dev`, so fall back to a constant key — every local request
  // shares one generous bucket, keeping the app and the e2e suite working.
  const ip = request.headers.get("CF-Connecting-IP") ?? "local";
  const now = Date.now();

  const stub = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(ip));
  const response = await stub.fetch("https://rate-limiter/hit", {
    method: "POST",
    body: JSON.stringify({ windowMs: POST_RATE_WINDOW_MS, now }),
  });
  const { count, resetAt } = await response.json<RateLimitHit>();

  if (count <= POST_RATE_LIMIT) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
  return Response.json(
    {
      error: "rate_limited",
      retry_after_seconds: retryAfterSeconds,
      limit: POST_RATE_LIMIT,
      reset_at: Math.ceil(resetAt / 1000),
    },
    {
      status: 429,
      headers: { "retry-after": String(retryAfterSeconds) },
    },
  );
}
