"use client";
import { useMemo, useEffect } from "react";
import { create } from "zustand";

type Vec3 = [number, number, number];
interface Cam {
  id: string;
  p: Vec3;
}

interface StoreState {
  cams: Record<string, { p: Vec3; t: number }>;
  set: (c: Cam) => void;
  cleanup: () => void;
}

// Add EventSource to Window interface
declare global {
  interface Window {
    __es?: EventSource;
  }
}

export const useCamStore = create<StoreState>((set) => ({
  cams: {},
  set: (c) =>
    set((s) => ({
      cams: {
        ...s.cams,
        [c.id]: { p: c.p, t: Date.now() },
      },
    })),
  cleanup: () => {
    const now = Date.now();
    set((s) => {
      const cams = { ...s.cams };
      for (const id in cams) {
        if (now - cams[id].t > 4000) delete cams[id];
      }
      return { cams };
    });
  },
}));

export const useRemoteCameras = () => {
  const set = useCamStore((s) => s.set);
  const cleanup = useCamStore((s) => s.cleanup);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.__es) {
      // console.log("useRemoteCameras subscribing");
      window.__es = new EventSource("/api/events");
      window.__es.onmessage = (e) => {
        // console.log("RECEIVED CAMERA POSITION", e.data);
        set(JSON.parse(e.data));
      };
    }
    const interval = setInterval(cleanup, 1000);
    return () => clearInterval(interval);
  }, [set, cleanup]);

  const cams = useCamStore((s) => s.cams);
  return useMemo(
    () => Object.entries(cams).map(([id, v]) => [id, v.p] as [string, Vec3]),
    [cams],
  );
};
