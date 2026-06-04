import { useEffect, useRef } from "react";

import { useSymbolStore } from "@/stores/symbolStore";

import type { State as SymbolState } from "@/stores/symbolStore";

const THROTTLE_MS = 100;

export const useInputThrottle = (myId: React.RefObject<string>) => {
  const lastInput = useSymbolStore((s: SymbolState) => s.lastInput);
  const lastSentTimeRef = useRef(0);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!lastInput) return;

    const timeSinceLastSend = Date.now() - lastSentTimeRef.current;

    const sendEvent = () => {
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "symbol",
          id: myId.current,
          key: lastInput.key,
        }),
      });
      lastSentTimeRef.current = Date.now();
    };

    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    // Leading-edge throttle: send immediately if enough time has elapsed,
    // otherwise defer to the trailing edge so rapid input can't flood /api/events.
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
