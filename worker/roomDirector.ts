// RoomDirector Durable Object: a tiny global coordinator that assigns new SSE
// clients to a room. It tracks live occupancy (each EventsChannel reports a
// join when a client connects and a leave when it disconnects) and hands out the
// lowest room with spare capacity, so the usually-small crowd shares one room
// and load overflows into new rooms only under real traffic.
//
// State is in-memory. If the DO is evicted while idle the counts simply rebuild
// from later joins/leaves; a transient miscount only ever causes a brief
// over/under-assign, which each room's own cap absorbs (full rooms return 503
// and the client re-asks for a room).

import { pickRoom } from "../src/domain/rooms";

export class RoomDirector implements DurableObject {
  private readonly counts: Record<number, number> = {};

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/assign") {
      return Response.json({ room: pickRoom(this.counts) });
    }
    if (request.method === "POST" && url.pathname === "/join") {
      const { room } = await request.json<{ room: number }>();
      this.counts[room] = (this.counts[room] ?? 0) + 1;
      return Response.json({ ok: true });
    }
    if (request.method === "POST" && url.pathname === "/leave") {
      const { room } = await request.json<{ room: number }>();
      this.counts[room] = Math.max(0, (this.counts[room] ?? 0) - 1);
      return Response.json({ ok: true });
    }
    return new Response("not_found", { status: 404 });
  }
}
