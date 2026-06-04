import { ShaderMaterial, Vector3 } from "three";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import {
  EyeState,
  INITIAL_SCALE,
  TARGET_SCALE,
  FADE_DURATION,
} from "@/domain/eye";

type EyesState = {
  managedEyes: Record<string, EyeState>;
};

type EyesActions = {
  syncEyes: (
    eyes: [string, [number, number, number]][],
    myId: string,
    baseShaderMaterial: ShaderMaterial,
  ) => void;
  updateEyeAnimations: (delta: number) => void;
};

export type { EyeState as ManagedEye };

export const useEyesStore = create<EyesState & EyesActions>()(
  immer((set) => ({
    managedEyes: {},

    syncEyes: (eyes, myId, baseShaderMaterial) =>
      set((state) => {
        const incomingEyeIds = new Set(eyes.map(([id]) => id));

        for (const [id, p] of eyes) {
          if (id === myId) continue;

          const positionVec = new Vector3(...p);

          if (state.managedEyes[id]) {
            state.managedEyes[id].targetPosition.copy(positionVec);
            if (state.managedEyes[id].status === "disappearing") {
              state.managedEyes[id].status = "appearing";
            }
          } else {
            state.managedEyes[id] = {
              id,
              position: positionVec.clone(),
              targetPosition: positionVec.clone(),
              opacity: 0,
              scale: INITIAL_SCALE,
              status: "appearing",
              material: baseShaderMaterial.clone(),
            };
          }
        }

        for (const id in state.managedEyes) {
          if (id === myId) continue;
          if (!incomingEyeIds.has(id)) {
            state.managedEyes[id].status = "disappearing";
          }
        }
      }),

    updateEyeAnimations: (delta) =>
      set((state) => {
        for (const id in state.managedEyes) {
          const eye = state.managedEyes[id];

          if (!eye.position.equals(eye.targetPosition)) {
            eye.position.lerp(eye.targetPosition, 0.05);
          }

          if (eye.status === "appearing") {
            eye.opacity += delta / FADE_DURATION;
            eye.scale =
              INITIAL_SCALE +
              (TARGET_SCALE - INITIAL_SCALE) * Math.min(eye.opacity, 1);

            if (eye.opacity >= 1) {
              eye.opacity = 1;
              eye.scale = TARGET_SCALE;
              eye.status = "visible";
            }
          } else if (eye.status === "disappearing") {
            eye.opacity -= delta / FADE_DURATION;
            eye.scale =
              INITIAL_SCALE +
              (TARGET_SCALE - INITIAL_SCALE) * Math.max(eye.opacity, 0);

            if (eye.opacity <= 0) {
              delete state.managedEyes[id];
            }
          }
        }
      }),
  })),
);
