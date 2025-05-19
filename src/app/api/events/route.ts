import { subscribe } from "@/lib/sseStore";

export const runtime = "edge";

export const GET = async () => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start: (controller) => {
      const writer = {
        write: (s: string) => controller.enqueue(encoder.encode(s)),
        closed: false,
      };
      subscribe(writer);
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
