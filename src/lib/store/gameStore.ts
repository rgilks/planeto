import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  GameState,
  GameStateSchema,
  SpaceshipState,
  UserId,
  SpaceshipId,
  Position,
  Rotation,
} from "@/lib/domain/game.types";
import { moveSpaceship as moveSpaceshipAction } from "@/app/actions/gameActions";

interface GameStoreState {
  gameState: GameState;
  isConnected: boolean;
  error: string | null;
  currentUserId: UserId | null; // This should be set after authentication
  currentSpaceshipId: SpaceshipId | null; // This is set when the user's spaceship is created/identified
}

interface GameStoreActions {
  connect: (userId: UserId) => void;
  disconnect: () => void;
  setGameState: (gameState: GameState) => void;
  updatePlayerSpaceship: (update: Partial<SpaceshipState>) => void;
  moveMySpaceship: (position: Position, rotation: Rotation) => Promise<void>;
  setCurrentUserId: (userId: UserId) => void;
  // No direct setCurrentSpaceshipId, it is derived when user joins
}

let eventSource: EventSource | null = null;

export const useGameStore = create<GameStoreState & GameStoreActions>()(
  immer((set, get) => ({
    gameState: {
      spaceships: {},
    },
    isConnected: false,
    error: null,
    currentUserId: null, // Initialize as null
    currentSpaceshipId: null,

    setCurrentUserId: (userId) => {
      set((state) => {
        state.currentUserId = userId;
      });
      // Automatically connect if not already connected and userId is set
      if (!get().isConnected && userId) {
        get().connect(userId);
      }
    },

    connect: (userId) => {
      if (eventSource || !userId) {
        console.warn("SSE connection already exists or userId not provided.");
        return;
      }

      // Clear any previous error. isConnected remains its current state (e.g., false)
      // until onopen successfully fires.
      set({ error: null });

      eventSource = new EventSource(
        `/api/game-events?userId=${encodeURIComponent(userId)}`,
      );

      eventSource.onopen = () => {
        console.log("SSE connection established.");
        set({ isConnected: true, error: null }); // Set isConnected to true ONLY when open
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          const { type, payload } = parsedData;

          if (type === "gameStateUpdate") {
            const validation = GameStateSchema.safeParse(payload);
            if (validation.success) {
              set((state) => {
                state.gameState = validation.data;
                const mySpaceship = Object.values(
                  validation.data.spaceships,
                ).find((s) => s && s.owner === get().currentUserId);
                if (mySpaceship) {
                  state.currentSpaceshipId = mySpaceship.id;
                }
              });
            } else {
              console.error("Invalid game state received:", validation.error);
              set({ error: "Invalid game state data from server." });
            }
          } else if (type === "userJoined") {
            // Optional: more specific handling for userJoined if needed beyond full gameStateUpdate
            console.log("User joined:", payload);
            // The gameStateUpdate will typically cover this, but you can add specific logic
            // Ensure currentSpaceshipId is set if this join event is for the current user
            if (payload.userId === get().currentUserId) {
              set((state) => {
                state.currentSpaceshipId = payload.spaceship.id;
              });
            }
          } else if (type === "userLeft") {
            // Optional: more specific handling for userLeft
            console.log("User left:", payload);
          } else if (type === "error") {
            console.error("Server error via SSE:", payload.message);
            set({ error: payload.message });
          }
        } catch (e) {
          console.error("Error parsing SSE message:", e);
          set({ error: "Failed to parse message from server." });
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE connection error:", err);
        // Only update state if we were trying to connect or thought we were connected.
        // This avoids an unnecessary state update if error occurs before any onopen/set call.
        if (get().isConnected || eventSource != null) {
          set({ isConnected: false, error: "SSE connection failed." });
        }
        eventSource?.close();
        eventSource = null;
      };
    },

    disconnect: () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      set({ isConnected: false, currentSpaceshipId: null }); // Reset spaceshipId on disconnect
    },

    setGameState: (newGameState) => {
      set((state) => {
        state.gameState = newGameState;
      });
    },

    updatePlayerSpaceship: (update) => {
      const spaceshipId = get().currentSpaceshipId;
      if (!spaceshipId) return;

      set((state) => {
        const spaceship = state.gameState.spaceships[spaceshipId];
        if (spaceship) {
          Object.assign(spaceship, update); // Apply partial update
          // Ensure position and rotation are fully present if partially updated
          if (update.position && !spaceship.position)
            spaceship.position = { x: 0, y: 0, z: 0 };
          if (update.rotation && !spaceship.rotation)
            spaceship.rotation = { x: 0, y: 0, z: 0 };
          if (update.position)
            spaceship.position = { ...spaceship.position, ...update.position };
          if (update.rotation)
            spaceship.rotation = { ...spaceship.rotation, ...update.rotation };

          spaceship.lastUpdated = new Date().toISOString();
        }
      });
    },

    moveMySpaceship: async (position, rotation) => {
      const spaceshipId = get().currentSpaceshipId;
      const userId = get().currentUserId;

      if (!spaceshipId || !userId) {
        console.error(
          "Cannot move spaceship: spaceshipId or userId is not set.",
        );
        set({
          error: "Spaceship ID or User ID not available for movement command.",
        });
        return;
      }

      // Optimistic update
      get().updatePlayerSpaceship({ position, rotation });

      const formData = new FormData();
      formData.append("spaceshipId", spaceshipId);
      formData.append("userId", userId); // Send userId with the action
      formData.append("position.x", position.x.toString());
      formData.append("position.y", position.y.toString());
      formData.append("position.z", position.z.toString());
      formData.append("rotation.x", rotation.x.toString());
      formData.append("rotation.y", rotation.y.toString());
      formData.append("rotation.z", rotation.z.toString());

      try {
        const result = await moveSpaceshipAction(formData);
        if (!result.success) {
          console.error("Failed to move spaceship:", result.error);
          set({ error: result.error || "Failed to move spaceship on server." });
          // TODO: Revert optimistic update if the server call definitively failed
          // For now, if the server fails, the client will be out of sync until the next gameStateUpdate.
          // A proper revert would involve storing the pre-optimistic state and restoring it.
        }
      } catch (error) {
        console.error("Error calling moveSpaceship action:", error);
        set({ error: "Network error while moving spaceship." });
        // TODO: Revert optimistic update here as well
      }
    },
  })),
);

// Ensure disconnection on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    useGameStore.getState().disconnect();
  });
}
