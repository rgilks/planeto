import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { SimState, SimStateSchema, UserId } from "@/lib/domain/sim.types";

interface SimStoreState {
  simState: SimState | null;
  isConnected: boolean;
  error: string | null;
  currentUserId: UserId | null;
}

interface SimStoreActions {
  connect: (userId: UserId) => void;
  disconnect: () => void;
  setSimState: (simState: SimState) => void;
  setCurrentUserId: (userId: UserId) => void;
}

let eventSource: EventSource | null = null;

export const useSimStore = create<SimStoreState & SimStoreActions>()(
  immer((set, get) => ({
    simState: null,
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
        `/api/sim-events?userId=${encodeURIComponent(userId)}`,
      );
      eventSource.onopen = () => {
        set({ isConnected: true, error: null });
      };
      eventSource.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          const { type, payload } = parsedData;
          if (type === "simStateUpdate") {
            const validation = SimStateSchema.safeParse(payload);
            if (validation.success) {
              set((state) => {
                state.simState = validation.data;
              });
            } else {
              set({ error: "Invalid sim state data from server." });
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

    setSimState: (newSimState) => {
      set((state) => {
        state.simState = newSimState;
      });
    },
  })),
);

// Ensure disconnection on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    useSimStore.getState().disconnect();
  });
}
