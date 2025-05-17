import { NextRequest, NextResponse } from "next/server";
import {
  subscribeToGameStateChanges,
  getGameState,
  addPlayerSpaceship,
  removePlayerSpaceship,
} from "@/lib/server/gameStateManager";
import { GameState, UserId } from "@/lib/domain/game.types";
// import { getServerSession } from "next-auth/next"; // Commented out as it's not used yet
// import { authOptions } from '../auth/[...nextauth]/route'; // Adjust this path to your actual authOptions
import { v4 as uuidv4 } from "uuid"; // Import uuid

// A Map to keep track of active streams for each user
const activeStreams = new Map<UserId, ReadableStreamDefaultController>();

// Helper to broadcast data to all active streams
const broadcastToAll = (data: string) => {
  activeStreams.forEach((controller) => {
    controller.enqueue(`data: ${data}\n\n`);
  });
};

// Subscribe to game state changes from the manager and broadcast them
subscribeToGameStateChanges((gameState: GameState) => {
  broadcastToAll(
    JSON.stringify({ type: "gameStateUpdate", payload: gameState }),
  );
});

export async function GET(req: NextRequest) {
  // TODO: Replace with actual user session retrieval
  // const session = await getServerSession(authOptions);
  // if (!session || !session.user?.id) {
  //   return new NextResponse('Unauthorized', { status: 401 });
  // }
  // const userId = session.user.id as UserId;

  // For now, let's use a placeholder userId from query params for testing if no session
  // In a real app, ensure this is secured and comes from an authenticated session.
  const url = new URL(req.url);
  let userId = url.searchParams.get("userId") as UserId | null;

  if (!userId) {
    console.warn(
      "game-events: userId not found in query params or session, using mock generated UUID. THIS IS FOR TESTING ONLY.",
    );
    userId = uuidv4() as UserId; // Generate a real UUID for fallback
  }
  const finalUserId = userId as UserId; // Ensure it is UserId type

  const stream = new ReadableStream({
    start(controller) {
      activeStreams.set(finalUserId, controller);

      // Send current game state immediately
      const currentGameState = getGameState();
      controller.enqueue(
        `data: ${JSON.stringify({ type: "gameStateUpdate", payload: currentGameState })}\n\n`,
      );

      // Add player's spaceship and notify others
      const newSpaceship = addPlayerSpaceship(finalUserId);
      broadcastToAll(
        JSON.stringify({
          type: "userJoined",
          payload: { userId: finalUserId, spaceship: newSpaceship },
        }),
      );
    },
    cancel() {
      activeStreams.delete(finalUserId);
      const removedSpaceshipId = removePlayerSpaceship(finalUserId);
      if (removedSpaceshipId) {
        broadcastToAll(
          JSON.stringify({
            type: "userLeft",
            payload: { userId: finalUserId, spaceshipId: removedSpaceshipId },
          }),
        );
      }
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
