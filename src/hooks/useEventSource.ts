"use client";
import { useEffect } from "react";

import { useEventStore } from "@/stores/eventStore";
import { useSymbolStore } from "@/stores/symbolStore";

import type { SymbolEventType } from "@/domain/event";

export const useEventSource = (myId: React.RefObject<string>) => {
  const connectToEventSource = useEventStore((s) => s.connect);
  const subscribeToSymbolEvents = useEventStore((s) => s.subscribeSymbolEvents);
  const eventSourceConnected = useEventStore((s) => s.isConnected);

  const setRemoteKey = useSymbolStore((s) => s.setRemoteKey);

  // Re-runs when isConnected flips false so the stream reconnects after a drop.
  useEffect(() => {
    if (!eventSourceConnected) {
      connectToEventSource();
    }
  }, [connectToEventSource, eventSourceConnected]);

  useEffect(() => {
    const handleSymbolEvent = (event: SymbolEventType) => {
      if (event.id !== myId.current) {
        setRemoteKey(event.id, event.key);
      }
    };

    return subscribeToSymbolEvents(handleSymbolEvent);
  }, [subscribeToSymbolEvents, myId, setRemoteKey]);
};
