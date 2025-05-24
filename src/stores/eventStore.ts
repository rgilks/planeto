import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import {
  EventSchema,
  KeyboardEventType,
  CameraUpdateType,
} from "@/domain/event";

// Define listener types
type KeyboardEventListener = (event: KeyboardEventType) => void;
type CameraUpdateEventListener = (event: CameraUpdateType) => void;

// Augment the Window interface for the debug store
declare global {
  interface Window {
    __eventStore?: typeof useEventStore;
  }
}

interface EventStoreState {
  isConnected: boolean;
  lastError: string | null;
  eventSourceInstance: EventSource | null;
  listeners: {
    keyboard: KeyboardEventListener[];
    cameraUpdate: CameraUpdateEventListener[];
  };
}

interface EventStoreActions {
  connect: () => void;
  disconnect: () => void;
  subscribeKeyboardEvents: (callback: KeyboardEventListener) => () => void;
  subscribeCameraUpdates: (callback: CameraUpdateEventListener) => () => void;
  _handleMessage: (event: MessageEvent) => void;
  _handleError: (event: Event) => void;
}

export const useEventStore = create<EventStoreState & EventStoreActions>()(
  immer((set, get) => ({
    isConnected: false,
    lastError: null,
    eventSourceInstance: null,
    listeners: {
      keyboard: [],
      cameraUpdate: [],
    },

    connect: () => {
      if (get().eventSourceInstance || get().isConnected) {
        console.log(
          "EventSource connection attempt skipped: already connected or connecting.",
        );
        return;
      }
      console.log("Attempting to connect to EventSource...");
      const es = new EventSource("/api/events");
      set({ eventSourceInstance: es, isConnected: false, lastError: null });

      es.onopen = () => {
        console.log("EventSource connected.");
        set({ isConnected: true, lastError: null });
      };
      es.onmessage = (event: MessageEvent) => get()._handleMessage(event);
      es.onerror = (event: Event) => get()._handleError(event);
    },

    disconnect: () => {
      const es = get().eventSourceInstance;
      if (es) {
        console.log("Disconnecting EventSource...");
        es.close();
        set({
          eventSourceInstance: null,
          isConnected: false,
        });
      }
    },

    subscribeKeyboardEvents: (callback: KeyboardEventListener) => {
      set((state) => {
        state.listeners.keyboard.push(callback);
      });
      return () => {
        set((state) => {
          state.listeners.keyboard = state.listeners.keyboard.filter(
            (cb: KeyboardEventListener) => cb !== callback,
          );
        });
      };
    },

    subscribeCameraUpdates: (callback: CameraUpdateEventListener) => {
      set((state) => {
        state.listeners.cameraUpdate.push(callback);
      });
      return () => {
        set((state) => {
          state.listeners.cameraUpdate = state.listeners.cameraUpdate.filter(
            (cb: CameraUpdateEventListener) => cb !== callback,
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
          if (data.type === "keyboard") {
            [...get().listeners.keyboard].forEach((callback) =>
              callback(data as KeyboardEventType),
            );
          } else if (data.type === "cameraUpdate") {
            [...get().listeners.cameraUpdate].forEach((callback) =>
              callback(data as CameraUpdateType),
            );
          }
        } else {
          console.error(
            "Failed to parse general event:",
            parsedEvent.error.flatten(),
            "Data:",
            rawData,
          );
          set({ lastError: "Failed to parse event data" });
        }
      } catch (error) {
        console.error(
          "Error processing SSE message:",
          error,
          "Data:",
          event.data,
        );
        set({ lastError: "Error processing SSE message" });
      }
    },

    _handleError: (event: Event) => {
      console.error("EventSource encountered an error:", event);
      set((state) => {
        state.lastError = "EventSource connection error";
        state.isConnected = false;
      });
    },
  })),
);

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  window.__eventStore = useEventStore;
}
