"use client";
import { useMemo, useEffect } from "react";

import { EyeUpdateType, Vec3, EYE_STALE_MS } from "@/domain/event";
import { useEventStore } from "@/stores/eventStore";
import { useEyeStore } from "@/stores/eyeStore";

const CLEANUP_INTERVAL_MS = 5000;

export const useEyes = () => {
  const connectToEventSource = useEventStore((s) => s.connect);
  const subscribeToEyeUpdates = useEventStore((s) => s.subscribeEyeUpdates);
  const eventSourceConnected = useEventStore((s) => s.isConnected);

  const setEyeInStore = useEyeStore((s) => s.setEye);
  const removeStaleEyesInStore = useEyeStore((s) => s.removeStaleEyes);
  const eyesFromStore = useEyeStore((s) => s.eyes);

  useEffect(() => {
    if (!eventSourceConnected) {
      connectToEventSource();
    }
  }, [connectToEventSource, eventSourceConnected]);

  useEffect(() => {
    const handleEyeUpdate = (event: EyeUpdateType) => {
      if (event.p) {
        setEyeInStore(event);
      }
    };

    const unsubscribe = subscribeToEyeUpdates(handleEyeUpdate);
    return () => unsubscribe();
  }, [subscribeToEyeUpdates, setEyeInStore]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      removeStaleEyesInStore(EYE_STALE_MS);
    }, CLEANUP_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [removeStaleEyesInStore]);

  return useMemo(
    () =>
      Object.entries(eyesFromStore).map(
        ([id, v]) => [id, v.p] as [string, Vec3],
      ),
    [eyesFromStore],
  );
};
