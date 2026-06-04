# Event Store (`worker/eventsChannel.ts`)

The `EventsChannel` Durable Object holds Planeto's shared multiplayer state and fans out Server-Sent Events (SSE) to every connected browser. A single global instance (`idFromName("global")`) is the whole "room". Browsers connect to it over the standard `/api/events` SSE protocol.

The Worker (`worker/index.ts`) forwards `/api/events` to this DO: a `GET` becomes the DO's `/subscribe`, a `POST` becomes `/publish`.

## Key responsibilities

- **Subscriber management**: keeps a `Set` of active SSE writers.
- **Event broadcasting (fan-out)**: sends each event to every connected writer.
- **Eye state**: stores the latest `eyeUpdate` per user id, replayed to new subscribers.
- **State purging**: drops eye data older than 30 s.

## Behaviour

- **subscribe** (`GET /subscribe`): opens an SSE `ReadableStream`, registers the writer, replays the current eyes (so a fresh client immediately sees everyone), and starts a 20 s keepalive ping. The writer is cleaned up when the stream is cancelled.
- **publish** (`POST /publish`): parses the body and validates it against `EventSchema` (from `src/domain/event.ts`, shared with the client). On failure it returns `400` with the flattened error. On success an `eyeUpdate` is stored (with a **server-stamped** `t`) and fanned out, while a `symbol` is fanned out only (never stored).
- **fan-out**: encodes `data:${JSON.stringify(event)}\n\n` and enqueues it to every writer; writers whose stream has closed are dropped (safe-enqueue).
- **purge**: stale eyes (`now - t > 30_000`) are removed lazily on each subscribe/publish — no background timer is needed, because the DO only matters while clients are connected and active clients re-report every ≤ 20 s.

## State

- `eyes: Map<string, EyeUpdateType>` — last known eye per id (type from `src/domain/event.ts`).
- `writers: Set<Writer>` — one entry per open SSE connection, each holding its stream controller, keepalive interval, and a `closed` flag.

State is purely in memory. When the last browser disconnects the DO is evicted; eyes are ephemeral and re-reported, so nothing important is lost.
