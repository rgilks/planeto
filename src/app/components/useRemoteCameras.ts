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
  set: (c: Cam) => void; // Cam now includes t
  // cleanup: () => void; // Removed
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
        [c.id]: { p: c.p, t: c.t }, // Use server's timestamp
      },
    })),
  // cleanup: () => { // Removed
  //   const now = Date.now();
  //   set((s) => {
  //     const cams = { ...s.cams };
  //     for (const id in cams) {
  //       if (now - cams[id].t > 4000) delete cams[id];
  //     }
  //     return { cams };
  //   });
  // },
}));

export const useRemoteCameras = () => {
  const storeSet = useCamStore((s) => s.set);
  // const cleanup = useCamStore((s) => s.cleanup); // Removed

  useEffect(() => {
    if (typeof window !== "undefined" && !window.__es) {
      // console.log("useRemoteCameras subscribing");
      window.__es = new EventSource("/api/events");
      window.__es.onmessage = (e) => {
        // console.log("RECEIVED CAMERA POSITION", e.data);
        const data = JSON.parse(e.data) as Cam; // Simpler assertion now
        storeSet(data);
      };
    }
    // const interval = setInterval(cleanup, 1000); // Removed
    // return () => clearInterval(interval); // Removed

    // Optional: cleanup EventSource on component unmount if window.__es is component-specific
    // For a global singleton like window.__es, this might not be needed here
    // unless the component that mounts useRemoteCameras is the one that should control its lifecycle.
    // return () => {
    //   if (window.__es) {
    //     window.__es.close();
    //     delete window.__es;
    //   }
    // };
  }, [storeSet]);

  const cams = useCamStore((s) => s.cams);
  return useMemo(
    () => Object.entries(cams).map(([id, v]) => [id, v.p] as [string, Vec3]),
    [cams]
  );
};
