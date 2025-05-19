"use client";
import { create } from "zustand";
import { useMemo, useEffect } from "react";

type Vec3 = [number, number, number];
interface Cam {
  id: string;
  p: Vec3;
}

interface StoreState {
  cams: Record<string, Vec3>;
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
  set: (c) => set((s) => ({ cams: { ...s.cams, [c.id]: c.p } })),
}));

export const useRemoteCameras = () => {
  const set = useCamStore((s) => s.set);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.__es) {
      console.log("useRemoteCameras subscribing");
      window.__es = new EventSource("/api/events");
      window.__es.onmessage = (e) => {
        console.log("RECEIVED CAMERA POSITION", e.data);
        set(JSON.parse(e.data));
      };
    }
  }, [set]);

  const cams = useCamStore((s) => s.cams);
  return useMemo(() => Object.entries(cams), [cams]);
};
