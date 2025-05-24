import { z } from "zod";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { CameraUpdateType, Vec3Schema } from "@/domain/event";

type Vec3 = z.infer<typeof Vec3Schema>;

interface CamStoreState {
  cams: Record<string, { p: Vec3; t: number }>;
}

interface CamStoreActions {
  setCamera: (cameraUpdate: CameraUpdateType) => void;
  removeStaleCameras: (thresholdMs: number) => void;
}

// Augment the Window interface for the debug store
declare global {
  interface Window {
    __camStore?: typeof useCamStore;
  }
}

export const useCamStore = create<CamStoreState & CamStoreActions>()(
  immer((set) => ({
    cams: {},
    setCamera: (cameraUpdate) =>
      set((state) => {
        state.cams[cameraUpdate.id] = { p: cameraUpdate.p, t: cameraUpdate.t };
      }),
    removeStaleCameras: (thresholdMs) =>
      set((state) => {
        const now = Date.now();
        for (const id in state.cams) {
          if (now - state.cams[id].t > thresholdMs) {
            delete state.cams[id];
          }
        }
      }),
  })),
);

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  window.__camStore = useCamStore;
}
