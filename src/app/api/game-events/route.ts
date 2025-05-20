import { NextRequest } from "next/server";
import { z } from "zod";

const KeyboardEventSchema = z.object({
  id: z.string(),
  key: z.string().min(1),
});

type Subscriber = { write: (msg: string) => void };
let subscribers: Subscriber[] = [];

export const POST = async (req: NextRequest) => {
  const data = await req.json();
  const parsed = KeyboardEventSchema.safeParse(data);
  if (!parsed.success) return new Response("Invalid", { status: 400 });
  const event = parsed.data;
  console.log("POST /api/game-events", event);
  for (const res of subscribers) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }
  return new Response("ok");
};

export const GET = async () => {
  let subscriber: Subscriber;
  const stream = new ReadableStream({
    start(controller) {
      subscriber = {
        write: (msg: string) =>
          controller.enqueue(new TextEncoder().encode(msg)),
      };
      subscribers.push(subscriber);
    },
    cancel() {
      subscribers = subscribers.filter((s) => s !== subscriber);
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
