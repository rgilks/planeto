"use client";
import { useMemo, useEffect } from "react";
import { create } from "zustand";

type Vec3 = [number, number, number];
interface Cam {
  id: string;
  p: Vec3;
  t: number; // Server sends t, and it's used in the store
}

interface StoreState {
  cams: Record<string, { p: Vec3; t: number }>; // t here is server's timestamp
  set: (c: Cam) => void;
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
        [c.id]: { p: c.p, t: c.t },
      },
    })),
}));

export const useRemoteCameras = () => {
  const storeSet = useCamStore((s) => s.set);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.__es) {
      window.__es = new EventSource("/api/events");
      window.__es.onmessage = (e) => {
        const data = JSON.parse(e.data) as Cam;
        storeSet(data);
      };
    }
  }, [storeSet]);

  const cams = useCamStore((s) => s.cams);
  return useMemo(
    () => Object.entries(cams).map(([id, v]) => [id, v.p] as [string, Vec3]),
    [cams],
  );
};
