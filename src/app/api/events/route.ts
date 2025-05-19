import { subscribe, unsubscribe } from "@/lib/sseStore";

export const runtime = "nodejs";

export const GET = async () => {
  // console.log("/api/events endpoint HIT");
  const encoder = new TextEncoder();
  let writer: { write: (data: string) => void; closed: boolean };

  const stream = new ReadableStream({
    start: (controller) => {
      // console.log("/api/events: creating subscription");
      writer = {
        write: (s: string) => controller.enqueue(encoder.encode(s)),
        closed: false,
      };
      subscribe(writer);
    },
    cancel: () => {
      if (writer) {
        writer.closed = true;
        unsubscribe(writer);
        // console.log("/api/events: subscription closed (cancel)");
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
