// Cloudflare Worker entry point. The static Next export in ./out is served by
// the [assets] binding; only /api/events and /api/room run the Worker
// (run_worker_first), which forwards them to the EventsChannel (one DO per room)
// and the RoomDirector. Anything else falls through to static assets.

import { MAX_ROOMS } from "../src/domain/rooms";

import { EventsChannel } from "./eventsChannel";
import { RateLimiter, type RateLimitHit } from "./rateLimiter";
import { RoomDirector } from "./roomDirector";

export { EventsChannel, RateLimiter, RoomDirector };

interface Env {
  EVENTS: DurableObjectNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  ROOM_DIRECTOR: DurableObjectNamespace;
  ASSETS: Fetcher;
}

const DIRECTOR = "director";

// Per-IP rate limit on the public /api endpoints, covering the SSE GET
// (connection opens), the POST write path, and room assignment. Generous on
// purpose so that normal play (one SSE connection plus frequent eye/symbol
// beacons) and the Playwright e2e are never throttled. Matches antenna's public
// limit (120 / 60s).
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;

// Parse ?room=N, clamped to a valid room id (0-based, below MAX_ROOMS). Missing
// or invalid values fall back to room 0 (the default room), so a direct
// /api/events call (and the e2e) still works without a room param.
function roomFromQuery(url: URL): number {
  const raw = Number(url.searchParams.get("room"));
  if (!Number.isInteger(raw) || raw < 0 || raw >= MAX_ROOMS) return 0;
  return raw;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Assign a new client to the lowest non-full room.
    if (url.pathname === "/api/room" && request.method === "GET") {
      const limited = await isRateLimited(request, env);
      if (limited) return limited;
      const director = env.ROOM_DIRECTOR.get(
        env.ROOM_DIRECTOR.idFromName(DIRECTOR),
      );
      return director.fetch("https://director/assign");
    }

    if (url.pathname === "/api/events") {
      if (request.method === "GET" || request.method === "POST") {
        const limited = await isRateLimited(request, env);
        if (limited) return limited;
      }
      const room = roomFromQuery(url);
      const stub = env.EVENTS.get(env.EVENTS.idFromName(`room-${room}`));
      if (request.method === "GET") {
        return stub.fetch(`https://do/subscribe?room=${room}`);
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
