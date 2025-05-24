"use client";
import { useMemo, useEffect } from "react";
import { z } from "zod";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import {
  EventSchema,
  CameraUpdateType,
  Vec3Schema,
} from "../../lib/domainTypes/event";

type Vec3 = z.infer<typeof Vec3Schema>;

interface StoreState {
  cams: Record<string, { p: Vec3; t: number }>;
  set: (c: CameraUpdateType) => void;
  removeStaleCams: (threshold: number) => void;
}

declare global {
  interface Window {
    __es?: EventSource;
  }
}

export const useCamStore = create(
  immer<StoreState>((set) => ({
    cams: {},
    set: (c: CameraUpdateType) =>
      set((s: StoreState) => {
        s.cams[c.id] = { p: c.p, t: c.t };
      }),
    removeStaleCams: (threshold: number) =>
      set((s: StoreState) => {
        const now = Date.now();
        for (const id in s.cams) {
          if (now - s.cams[id].t > threshold) {
            delete s.cams[id];
          }
        }
      }),
  })),
);

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  // @ts-expect-error - for debugging purposes
  window.__camStore = useCamStore;
}

const STALE_THRESHOLD_MS = 30000;
const CLEANUP_INTERVAL_MS = 5000;

export const useRemoteCameras = () => {
  const storeSet = useCamStore((s) => s.set);
  const removeStale = useCamStore((s) => s.removeStaleCams);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.__es) {
        window.__es = new EventSource("/api/events");
        window.__es.onmessage = (e) => {
          try {
            const rawData = JSON.parse(e.data);
            const parsedEvent = EventSchema.safeParse(rawData);
            if (
              parsedEvent.success &&
              parsedEvent.data.type === "cameraUpdate"
            ) {
              if (parsedEvent.data.p) {
                storeSet(parsedEvent.data);
              }
            }
          } catch {
            // console.error(
            //   "Error processing SSE for remote cameras:",
            //   e.data
            // );
          }
        };
      }

      const intervalId = setInterval(() => {
        removeStale(STALE_THRESHOLD_MS);
      }, CLEANUP_INTERVAL_MS);

      return () => {
        clearInterval(intervalId);
      };
    }
    return () => {};
  }, [storeSet, removeStale]);

  const cams = useCamStore((s) => s.cams);
  return useMemo(
    () => Object.entries(cams).map(([id, v]) => [id, v.p] as [string, Vec3]),
    [cams],
  );
};
