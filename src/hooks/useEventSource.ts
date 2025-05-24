import { useEffect } from "react";

import { EventSchema } from "../lib/domainTypes/event";
import { useKeyboardStore } from "../lib/store/keyboardStore";

import type { State as KeyboardState } from "../lib/store/keyboardStore";

export const useEventSource = (myId: React.RefObject<string>) => {
  const setRemoteKey = useKeyboardStore((s: KeyboardState) => s.setRemoteKey);

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (e) => {
      try {
        const rawData = JSON.parse(e.data);
        const parsedEvent = EventSchema.safeParse(rawData);

        if (parsedEvent.success && parsedEvent.data.type === "keyboard") {
          const { id, key } = parsedEvent.data;
          if (id !== myId.current) {
            setRemoteKey(id, key);
          }
        }
      } catch {
        // console.error(
        //   "Error processing SSE message. Data:",
        //   e.data,
        //   "Error:",
        //   error
        // );
      }
    };
    return () => es.close();
  }, [setRemoteKey, myId]);
};
