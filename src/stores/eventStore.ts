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

interface EventStoreState {
  isConnected: boolean;
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
  _handleError: (event: Event) => void;
}

export const useEventStore = create<EventStoreState & EventStoreActions>()(
  immer((set, get) => ({
    isConnected: false,
    eventSourceInstance: null,
    listeners: {
      symbol: [],
      eyeUpdate: [],
    },

    connect: () => {
      if (get().eventSourceInstance || get().isConnected) {
        return;
      }
      const es = new EventSource("/api/events");
      set({ eventSourceInstance: es, isConnected: false });

      es.onopen = () => {
        set({ isConnected: true });
      };
      es.onmessage = (event: MessageEvent) => get()._handleMessage(event);
      es.onerror = (event: Event) => get()._handleError(event);
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

    _handleError: (event: Event) => {
      console.error("EventSource encountered an error:", event);
      // Keep the instance: the browser auto-reconnects the EventSource (with
      // backoff). Nulling it here would orphan that reconnecting stream and let
      // the connect-on-disconnect effects open a duplicate.
      set((state) => {
        state.isConnected = false;
      });
    },
  })),
);

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  window.__eventStore = useEventStore;
}
