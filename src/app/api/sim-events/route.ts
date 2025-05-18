import { NextRequest, NextResponse } from "next/server";
import { getSimState } from "@/lib/server/simStateManager";
import { UserId } from "@/lib/domain/sim.types";
import { v4 as uuidv4 } from "uuid"; // Import uuid

// A Map to keep track of active streams for each user
const activeStreams = new Map<UserId, ReadableStreamDefaultController>();

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  let userId = url.searchParams.get("userId") as UserId | null;

  if (!userId) {
    console.warn(
      "sim-events: userId not found in query params or session, using mock generated UUID. THIS IS FOR TESTING ONLY.",
    );
    userId = uuidv4() as UserId; // Generate a real UUID for fallback
  }
  const finalUserId = userId as UserId; // Ensure it is UserId type

  const stream = new ReadableStream({
    start(controller) {
      activeStreams.set(finalUserId, controller);

      // Send current sim state immediately
      const currentSimState = getSimState();
      controller.enqueue(
        `data: ${JSON.stringify({ type: "simStateUpdate", payload: currentSimState })}\n\n`,
      );
    },
    cancel() {
      activeStreams.delete(finalUserId);
      console.log(`Client disconnected: ${finalUserId}`);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Required for Next.js edge runtime or for specific configurations
// export const runtime = 'edge'; // Uncomment if you deploy to edge
