"use client";
import { useEffect } from "react";

import { useEventStore } from "@/stores/eventStore";
import { useKeyboardStore } from "@/stores/keyboardStore";

import type { KeyboardEventType } from "@/domain/event"; // Ensure path and type name are correct
import type { State as KeyboardState } from "@/stores/keyboardStore";

export const useEventSource = (myId: React.RefObject<string>) => {
  const connectToEventSource = useEventStore((s) => s.connect);
  const subscribeToKeyboardEvents = useEventStore(
    (s) => s.subscribeKeyboardEvents,
  );
  const eventSourceConnected = useEventStore((s) => s.isConnected);

  const setRemoteKey = useKeyboardStore((s: KeyboardState) => s.setRemoteKey);

  useEffect(() => {
    // Attempt to connect to the EventSource when the hook mounts
    // if not already connected.
    if (!eventSourceConnected) {
      connectToEventSource();
    }
  }, [connectToEventSource, eventSourceConnected]);

  useEffect(() => {
    const handleKeyboardEvent = (event: KeyboardEventType) => {
      if (event.id !== myId.current) {
        setRemoteKey(event.id, event.key);
      }
    };

    const unsubscribe = subscribeToKeyboardEvents(handleKeyboardEvent);
    return () => unsubscribe();
  }, [subscribeToKeyboardEvents, myId, setRemoteKey]);
};
