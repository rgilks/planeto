// Per-IP rate limiter Durable Object for the public POST /api/events write path.
// Modelled on the sibling antenna's RateLimiter DO.
//
// Each rate-limit key (here: one client IP) is routed through `idFromName(key)`
// in worker/index.ts, funnelling every request for that key into one globally
// addressable instance. That makes the count authoritative across isolates/colos
// instead of each isolate keeping its own per-key tally and handing out a fresh
// budget whenever a caller's requests land on a different isolate.
//
// The bucket lives only in the DO's memory (like EventsChannel). If the DO is
// evicted after a quiet period the window resets early, but an actively abused
// key keeps its DO warm — an acceptable trade for avoiding a storage read+write
// on every limited request.

export type Bucket = {
  count: number;
  resetAt: number;
};

// Return the live bucket, or start a fresh window once the current one expires.
export const nextBucket = (
  bucket: Bucket | undefined,
  timestamp: number,
  windowMs: number,
): Bucket => {
  if (!bucket || timestamp >= bucket.resetAt) {
    return { count: 0, resetAt: timestamp + windowMs };
  }
  return bucket;
};

type HitRequest = {
  readonly windowMs: number;
  readonly now: number;
};

export type RateLimitHit = {
  readonly count: number;
  readonly resetAt: number;
};

export class RateLimiter implements DurableObject {
  // Bucket lives only in memory; the DO needs neither its state nor env, so no
  // explicit constructor — the platform instantiates the class for us.
  private bucket: Bucket | undefined;

  // One atomic increment per request. DO fetch handlers run to completion
  // without interleaving, so read-increment-write needs no extra locking.
  async fetch(request: Request): Promise<Response> {
    const { windowMs, now } = await request.json<HitRequest>();
    this.bucket = nextBucket(this.bucket, now, windowMs);
    this.bucket.count += 1;
    return Response.json({
      count: this.bucket.count,
      resetAt: this.bucket.resetAt,
    } satisfies RateLimitHit);
  }
}
