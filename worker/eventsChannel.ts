// Durable Object holding one room's shared multiplayer state and fanning it out
// over Server-Sent Events. Each instance (idFromName "room-N") keeps the latest
// "eye" position per user in that room and broadcasts eye/symbol events to every
// connected browser there. State is purely in-memory - once all browsers close
// their EventSource the DO can be evicted.
//
// Rooms are capped (ROOM_CAP) so per-event fan-out stays bounded; the Worker
// routes overflow to new rooms. Each connect/disconnect is reported to the
// RoomDirector so it can hand new clients the lowest non-full room.
//
// The pure state transitions (apply event, prune stale, encode frame) live in
// src/domain/eventsCore.ts and are unit-tested; this file is the SSE plumbing.

import {
  EventSchema,
  type EventType,
  type EyeUpdateType,
} from "../src/domain/event";
import {
  applyEvent,
  encodeEventFrame,
  pruneStaleEyes,
} from "../src/domain/eventsCore";
import { ROOM_CAP } from "../src/domain/rooms";

const KEEPALIVE_MS = 20_000;

const SSE_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache, no-transform",
  // Tell intermediaries (especially Cloudflare) not to buffer the stream so
  // chunks reach the browser as they are written.
  "x-accel-buffering": "no",
  connection: "keep-alive",
} as const;

const KEEPALIVE_FRAME = new TextEncoder().encode(`:keepalive\n\n`);

interface Env {
  ROOM_DIRECTOR: DurableObjectNamespace;
}

type Writer = {
  readonly controller: ReadableStreamDefaultController<Uint8Array>;
  readonly keepalive: ReturnType<typeof setInterval>;
  readonly room: number;
  closed: boolean;
};

export class EventsChannel implements DurableObject {
  private readonly eyes = new Map<string, EyeUpdateType>();
  private readonly writers = new Set<Writer>();
  private readonly env: Env;

  constructor(_state: DurableObjectState, env: Env) {
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/subscribe") {
      const room = Number(url.searchParams.get("room") ?? 0);
      return this.subscribe(Number.isFinite(room) ? room : 0);
    }
    if (request.method === "POST" && url.pathname === "/publish") {
      return this.publish(request);
    }
    return new Response("not_found", { status: 404 });
  }

  private subscribe(room: number): Response {
    if (this.writers.size >= ROOM_CAP) {
      return new Response("at_capacity", { status: 503 });
    }
    pruneStaleEyes(this.eyes, Date.now());
    let writer: Writer | null = null;
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        writer = {
          controller,
          keepalive: setInterval(() => {
            if (writer) this.safeEnqueue(writer, KEEPALIVE_FRAME);
          }, KEEPALIVE_MS),
          room,
          closed: false,
        };
        this.writers.add(writer);
        this.notifyDirector("join", room);
        // Replay the current eyes so a fresh client immediately sees everyone.
        for (const eye of this.eyes.values()) {
          this.safeEnqueue(writer, encodeEventFrame(eye));
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

    const now = Date.now();
    pruneStaleEyes(this.eyes, now);
    this.fanout(applyEvent(this.eyes, parsed.data, now));
    return Response.json({ ok: true });
  }

  private fanout(event: EventType): void {
    const frame = encodeEventFrame(event);
    for (const writer of this.writers) {
      this.safeEnqueue(writer, frame);
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
    this.notifyDirector("leave", writer.room);
  }

  // Best-effort occupancy report so the director can pick non-full rooms. Fire
  // and forget: a dropped report only causes a brief miscount, which each room's
  // own cap absorbs.
  private notifyDirector(path: "join" | "leave", room: number): void {
    const stub = this.env.ROOM_DIRECTOR.get(
      this.env.ROOM_DIRECTOR.idFromName("director"),
    );
    void stub
      .fetch(`https://director/${path}`, {
        method: "POST",
        body: JSON.stringify({ room }),
      })
      .catch(() => {});
  }
}
