import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { GameState, GameStateSchema, UserId } from "@/lib/domain/game.types";

interface GameStoreState {
  gameState: GameState;
  isConnected: boolean;
  error: string | null;
  currentUserId: UserId | null;
}

interface GameStoreActions {
  connect: (userId: UserId) => void;
  disconnect: () => void;
  setGameState: (gameState: GameState) => void;
  setCurrentUserId: (userId: UserId) => void;
}

let eventSource: EventSource | null = null;

export const useGameStore = create<GameStoreState & GameStoreActions>()(
  immer((set, get) => ({
    gameState: {
      celestialBodies: {},
    },
    isConnected: false,
    error: null,
    currentUserId: null,

    setCurrentUserId: (userId) => {
      set((state) => {
        state.currentUserId = userId;
      });
      if (!get().isConnected && userId) {
        get().connect(userId);
      }
    },

    connect: (userId) => {
      if (eventSource || !userId) {
        console.warn("SSE connection already exists or userId not provided.");
        return;
      }
      set({ error: null });
      eventSource = new EventSource(
        `/api/game-events?userId=${encodeURIComponent(userId)}`,
      );
      eventSource.onopen = () => {
        set({ isConnected: true, error: null });
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
              });
            } else {
              set({ error: "Invalid game state data from server." });
            }
          } else if (type === "userJoined") {
          } else if (type === "userLeft") {
          } else if (type === "error") {
            set({ error: payload.message });
          }
        } catch {
          set({ error: "Failed to parse message from server." });
        }
      };
      eventSource.onerror = () => {
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
      set({ isConnected: false });
    },

    setGameState: (newGameState) => {
      set((state) => {
        state.gameState = newGameState;
      });
    },
  })),
);

// Ensure disconnection on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    useGameStore.getState().disconnect();
  });
}
