import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { EventSchema, SymbolEventType, EyeUpdateType } from "@/domain/event";

type SymbolEventListener = (event: SymbolEventType) => void;
type EyeUpdateEventListener = (event: EyeUpdateType) => void;

declare global {
  interface Window {
    __eventStore?: typeof useEventStore;
  }
}

// When a connection never opens (its room filled in a race), wait this long
// before re-acquiring a room and retrying, so we never hammer /api/room.
const RECONNECT_BACKOFF_MS = 1500;

// Ask the server which room to join (the lowest non-full one). Falls back to
// room 0 so the app still works if the request fails.
const fetchRoom = async (): Promise<number> => {
  try {
    const res = await fetch("/api/room");
    const data = (await res.json()) as { room?: number };
    return typeof data.room === "number" ? data.room : 0;
  } catch {
    return 0;
  }
};

interface EventStoreState {
  isConnected: boolean;
  connecting: boolean;
  // The room this client is in; null until the first connection is established.
  // The outbound hooks read it to target their POSTs at the same room.
  room: number | null;
  eventSourceInstance: EventSource | null;
  listeners: {
    symbol: SymbolEventListener[];
    eyeUpdate: EyeUpdateEventListener[];
  };
}

interface EventStoreActions {
  connect: () => void;
  subscribeSymbolEvents: (callback: SymbolEventListener) => () => void;
  subscribeEyeUpdates: (callback: EyeUpdateEventListener) => () => void;
  _handleMessage: (event: MessageEvent) => void;
}

export const useEventStore = create<EventStoreState & EventStoreActions>()(
  immer((set, get) => ({
    isConnected: false,
    connecting: false,
    room: null,
    eventSourceInstance: null,
    listeners: {
      symbol: [],
      eyeUpdate: [],
    },

    connect: () => {
      const s = get();
      if (s.eventSourceInstance || s.isConnected || s.connecting) return;
      set({ connecting: true });

      void (async () => {
        const room = await fetchRoom();
        const es = new EventSource(`/api/events?room=${room}`);
        let opened = false;

        es.onopen = () => {
          opened = true;
          set({ isConnected: true });
        };
        es.onmessage = (event: MessageEvent) => get()._handleMessage(event);
        es.onerror = () => {
          console.error(`EventSource error (room ${room})`);
          set({ isConnected: false });
          if (!opened) {
            // Never connected: the room likely filled in a race. Drop this
            // stream and re-acquire a (probably different) room after a short
            // backoff; EventSource would otherwise retry the same full room
            // forever.
            es.close();
            set({ eventSourceInstance: null, room: null, connecting: true });
            setTimeout(() => {
              set({ connecting: false });
              get().connect();
            }, RECONNECT_BACKOFF_MS);
          }
          // If we had connected, keep the instance: the browser auto-reconnects
          // to the same room, and the connect-on-disconnect effect is a no-op
          // while the instance is still set.
        };

        set({
          eventSourceInstance: es,
          isConnected: false,
          room,
          connecting: false,
        });
      })();
    },

    subscribeSymbolEvents: (callback: SymbolEventListener) => {
      set((state) => {
        state.listeners.symbol.push(callback);
      });
      return () => {
        set((state) => {
          state.listeners.symbol = state.listeners.symbol.filter(
            (cb: SymbolEventListener) => cb !== callback,
          );
        });
      };
    },

    subscribeEyeUpdates: (callback: EyeUpdateEventListener) => {
      set((state) => {
        state.listeners.eyeUpdate.push(callback);
      });
      return () => {
        set((state) => {
          state.listeners.eyeUpdate = state.listeners.eyeUpdate.filter(
            (cb: EyeUpdateEventListener) => cb !== callback,
          );
        });
      };
    },

    _handleMessage: (event: MessageEvent) => {
      try {
        const rawData = JSON.parse(event.data);
        const parsedEvent = EventSchema.safeParse(rawData);

        if (parsedEvent.success) {
          const data = parsedEvent.data;
          if (data.type === "symbol") {
            [...get().listeners.symbol].forEach((callback) =>
              callback(data as SymbolEventType),
            );
          } else if (data.type === "eyeUpdate") {
            [...get().listeners.eyeUpdate].forEach((callback) =>
              callback(data as EyeUpdateType),
            );
          }
        } else {
          console.error(
            "Failed to parse general event:",
            parsedEvent.error.flatten(),
            "Data:",
            rawData,
          );
        }
      } catch (error) {
        console.error(
          "Error processing SSE message:",
          error,
          "Data:",
          event.data,
        );
      }
    },
  })),
);

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  window.__eventStore = useEventStore;
}
