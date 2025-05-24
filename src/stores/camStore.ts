import { z } from "zod";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { EyeUpdateType, Vec3Schema } from "@/domain/event";

type Vec3 = z.infer<typeof Vec3Schema>;

interface CamStoreState {
  cams: Record<string, { p: Vec3; t: number }>;
}

interface CamStoreActions {
  setEye: (eyeUpdate: EyeUpdateType) => void;
  removeStaleEyes: (thresholdMs: number) => void;
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
    setEye: (eyeUpdate) =>
      set((state) => {
        state.cams[eyeUpdate.id] = { p: eyeUpdate.p, t: eyeUpdate.t };
      }),
    removeStaleEyes: (thresholdMs) =>
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
