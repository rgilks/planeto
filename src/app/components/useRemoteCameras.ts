"use client";
import { useMemo, useEffect } from "react";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type Vec3 = [number, number, number];
interface Cam {
  id: string;
  p: Vec3;
  t: number;
}

interface StoreState {
  cams: Record<string, { p: Vec3; t: number }>;
  set: (c: Cam) => void;
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
    set: (c: Cam) =>
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

const STALE_THRESHOLD_MS = 30000; // 30 seconds
const CLEANUP_INTERVAL_MS = 5000; // 5 seconds

export const useRemoteCameras = () => {
  const storeSet = useCamStore((s) => s.set);
  const removeStale = useCamStore((s) => s.removeStaleCams);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.__es) {
        window.__es = new EventSource("/api/events");
        window.__es.onmessage = (e) => {
          const data = JSON.parse(e.data) as Cam;
          storeSet(data);
        };
      }

      const intervalId = setInterval(() => {
        removeStale(STALE_THRESHOLD_MS);
      }, CLEANUP_INTERVAL_MS);

      return () => {
        clearInterval(intervalId);
        // Optional: Close EventSource when the last hook unmounts or component unmounts
        // This part depends on how you want to manage the EventSource lifecycle globally
        // For now, we'll leave it open as it's stored on `window.__es`
      };
    }
    return () => {}; // Always return a cleanup function
  }, [storeSet, removeStale]);

  const cams = useCamStore((s) => s.cams);
  return useMemo(
    () => Object.entries(cams).map(([id, v]) => [id, v.p] as [string, Vec3]),
    [cams],
  );
};
