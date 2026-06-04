// Durable Object holding planeto's shared multiplayer state and fanning it out
// over Server-Sent Events. A single global instance (idFromName "global") is the
// whole "room": it keeps the latest "eye" position per user and broadcasts
// eye/symbol events to every connected browser. State is purely in-memory — once
// all browsers close their EventSource the DO can be evicted.
//
// Browsers talk to it over the standard /api/events SSE protocol; the
// EventSchema is reused verbatim from the domain layer.

import { EventSchema, type EyeUpdateType } from "../src/domain/event";

const KEEPALIVE_MS = 20_000;
const EYE_MAX_AGE_MS = 30_000;

const SSE_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache, no-transform",
  // Tell intermediaries (especially Cloudflare) not to buffer the stream so
  // chunks reach the browser as they are written.
  "x-accel-buffering": "no",
  connection: "keep-alive",
} as const;

const encoder = new TextEncoder();
const encodeFrame = (data: unknown): Uint8Array =>
  encoder.encode(`data:${JSON.stringify(data)}\n\n`);
const KEEPALIVE_FRAME = encoder.encode(`:keepalive\n\n`);

type Writer = {
  readonly controller: ReadableStreamDefaultController<Uint8Array>;
  readonly keepalive: ReturnType<typeof setInterval>;
  closed: boolean;
};

export class EventsChannel implements DurableObject {
  private readonly eyes = new Map<string, EyeUpdateType>();
  private readonly writers = new Set<Writer>();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/subscribe") {
      return this.subscribe();
    }
    if (request.method === "POST" && url.pathname === "/publish") {
      return this.publish(request);
    }
    return new Response("not_found", { status: 404 });
  }

  private subscribe(): Response {
    this.purgeStale();
    let writer: Writer | null = null;
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        writer = {
          controller,
          keepalive: setInterval(() => {
            if (writer) this.safeEnqueue(writer, KEEPALIVE_FRAME);
          }, KEEPALIVE_MS),
          closed: false,
        };
        this.writers.add(writer);
        // Replay the current eyes so a fresh client immediately sees everyone.
        for (const eye of this.eyes.values()) {
          this.safeEnqueue(writer, encodeFrame(eye));
        }
      },
      cancel: () => {
        if (writer) this.closeWriter(writer);
      },
    });
    return new Response(stream, { headers: SSE_HEADERS });
  }

  private async publish(request: Request): Promise<Response> {
    let payload: unknown;
    try {
      payload = JSON.parse(await request.text());
    } catch {
      return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const parsed = EventSchema.safeParse(payload);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid event payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    this.purgeStale();
    const event = parsed.data;
    if (event.type === "eyeUpdate") {
      // The server stamps the timestamp (used for staleness), matching the old
      // store — the client's `t` is not trusted.
      const msg: EyeUpdateType = {
        type: "eyeUpdate",
        id: event.id,
        p: event.p,
        t: Date.now(),
      };
      this.eyes.set(event.id, msg);
      this.fanout(msg);
    } else {
      this.fanout(event);
    }
    return Response.json({ ok: true });
  }

  private fanout(event: unknown): void {
    const frame = encodeFrame(event);
    for (const writer of this.writers) {
      this.safeEnqueue(writer, frame);
    }
  }

  private purgeStale(): void {
    const now = Date.now();
    for (const [id, eye] of this.eyes) {
      if (now - eye.t > EYE_MAX_AGE_MS) this.eyes.delete(id);
    }
  }

  private safeEnqueue(writer: Writer, bytes: Uint8Array): void {
    if (writer.closed) return;
    try {
      writer.controller.enqueue(bytes);
    } catch {
      // enqueue throws once the reader has closed the stream.
      this.closeWriter(writer);
    }
  }

  private closeWriter(writer: Writer): void {
    if (writer.closed) return;
    writer.closed = true;
    clearInterval(writer.keepalive);
    this.writers.delete(writer);
  }
}
