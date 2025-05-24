import { NextRequest, NextResponse } from "next/server";

import { EventSchema } from "@/lib/domainTypes/event";
import { broadcast, setCamera, subscribe, unsubscribe } from "@/lib/sseStore";

export const GET = async () => {
  const encoder = new TextEncoder();
  let writer: { write: (data: string) => void; closed: boolean };

  const stream = new ReadableStream({
    start: (controller) => {
      writer = {
        write: (s: string) => controller.enqueue(encoder.encode(s)),
        closed: false,
      };
      console.log("GET /api/events - new subscriber");
      subscribe(writer);
    },
    cancel: () => {
      if (writer) {
        writer.closed = true;
        unsubscribe(writer);
        console.log("GET /api/events - subscriber disconnected");
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};

export const POST = async (req: NextRequest) => {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsedEvent = EventSchema.safeParse(payload);

  if (!parsedEvent.success) {
    return NextResponse.json(
      { error: "Invalid event payload", details: parsedEvent.error.flatten() },
      { status: 400 },
    );
  }

  const event = parsedEvent.data;

  if (event.type === "cameraUpdate") {
    setCamera(event.id, event.p);
  } else if (event.type === "keyboard") {
    broadcast(event);
  }

  return NextResponse.json({ ok: true });
};
