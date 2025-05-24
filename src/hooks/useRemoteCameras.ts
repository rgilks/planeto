"use client";
import { useMemo, useEffect } from "react";
import { z } from "zod";

import { CameraUpdateType, Vec3Schema } from "@/domain/event"; // Ensure path is correct
import { useCamStore } from "@/stores/camStore";
import { useEventStore } from "@/stores/eventStore";

type Vec3 = z.infer<typeof Vec3Schema>;

const STALE_THRESHOLD_MS = 30000;
const CLEANUP_INTERVAL_MS = 5000;

export const useRemoteCameras = () => {
  const connectToEventSource = useEventStore((s) => s.connect);
  const subscribeToCameraUpdates = useEventStore(
    (s) => s.subscribeCameraUpdates,
  );
  const eventSourceConnected = useEventStore((s) => s.isConnected);

  const setCameraInStore = useCamStore((s) => s.setCamera);
  const removeStaleCamerasInStore = useCamStore((s) => s.removeStaleCameras);
  const camsFromStore = useCamStore((s) => s.cams);

  useEffect(() => {
    if (!eventSourceConnected) {
      connectToEventSource();
    }
  }, [connectToEventSource, eventSourceConnected]);

  useEffect(() => {
    const handleCameraUpdate = (event: CameraUpdateType) => {
      if (event.p) {
        setCameraInStore(event);
      }
    };

    const unsubscribe = subscribeToCameraUpdates(handleCameraUpdate);
    return () => unsubscribe();
  }, [subscribeToCameraUpdates, setCameraInStore]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      removeStaleCamerasInStore(STALE_THRESHOLD_MS);
    }, CLEANUP_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [removeStaleCamerasInStore]);

  return useMemo(
    () =>
      Object.entries(camsFromStore).map(
        ([id, v]) => [id, v.p] as [string, Vec3],
      ),
    [camsFromStore],
  );
};
