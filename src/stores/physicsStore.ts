import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface PhysicsState {
  isGravityDisabled: boolean;
  disableGravityTemporarily: (durationMs: number) => void;
}

let gravityTimeoutId: NodeJS.Timeout | null = null;

export const usePhysicsStore = create(
  immer<PhysicsState>((set) => ({
    isGravityDisabled: false,
    disableGravityTemporarily: (durationMs: number) => {
      if (gravityTimeoutId) {
        clearTimeout(gravityTimeoutId);
      }
      set((state) => {
        state.isGravityDisabled = true;
      });
      gravityTimeoutId = setTimeout(() => {
        set((state) => {
          state.isGravityDisabled = false;
        });
        gravityTimeoutId = null;
      }, durationMs);
    },
  })),
);
