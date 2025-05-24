import { useEffect, useRef } from "react";

import { useKeyboardStore } from "../stores/keyboardStore";

import type { State as KeyboardState } from "../stores/keyboardStore";

const THROTTLE_MS = 100;

export const useInputThrottle = (myId: React.RefObject<string>) => {
  const lastInput = useKeyboardStore((s: KeyboardState) => s.lastInput);
  const lastSentTimeRef = useRef(0);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!lastInput) return;

    const now = Date.now();
    const timeSinceLastSend = now - lastSentTimeRef.current;
    const currentLastInput = lastInput;

    const sendEvent = () => {
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "keyboard",
          id: myId.current,
          key: currentLastInput.key,
        }),
      });
      lastSentTimeRef.current = Date.now();
    };

    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    if (timeSinceLastSend >= THROTTLE_MS) {
      sendEvent();
    } else {
      throttleTimeoutRef.current = setTimeout(
        sendEvent,
        THROTTLE_MS - timeSinceLastSend,
      );
    }

    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [lastInput, myId]);
};
