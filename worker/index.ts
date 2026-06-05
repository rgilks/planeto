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

// Per-IP rate limit on the public /api/events endpoint, covering both the SSE
// GET (connection opens) and the POST write path. Generous on purpose so that
// normal play (one SSE connection plus frequent eye/symbol beacons) and the
// Playwright e2e are never throttled. Matches antenna's public limit (120 / 60s).
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/events") {
      if (request.method === "GET" || request.method === "POST") {
        const limited = await isRateLimited(request, env);
        if (limited) return limited;
      }
      const stub = env.EVENTS.get(env.EVENTS.idFromName(ROOM));
      if (request.method === "GET") {
        return stub.fetch("https://do/subscribe");
      }
      if (request.method === "POST") {
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
// window budget is now exceeded, return a 429 to short-circuit the request.
// Returns null when within budget (forward as normal).
async function isRateLimited(
  request: Request,
  env: Env,
): Promise<Response | null> {
  // CF-Connecting-IP is the real client IP in production. It is absent under
  // local `wrangler dev`, so fall back to a constant key: every local request
  // shares one generous bucket, keeping the app and the e2e suite working.
  const ip = request.headers.get("CF-Connecting-IP") ?? "local";
  const now = Date.now();

  const stub = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(ip));
  const response = await stub.fetch("https://rate-limiter/hit", {
    method: "POST",
    body: JSON.stringify({ windowMs: RATE_WINDOW_MS, now }),
  });
  const { count, resetAt } = await response.json<RateLimitHit>();

  if (count <= RATE_LIMIT) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
  return Response.json(
    {
      error: "rate_limited",
      retry_after_seconds: retryAfterSeconds,
      limit: RATE_LIMIT,
      reset_at: Math.ceil(resetAt / 1000),
    },
    {
      status: 429,
      headers: { "retry-after": String(retryAfterSeconds) },
    },
  );
}
