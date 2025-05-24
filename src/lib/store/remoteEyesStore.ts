import { produce } from "immer";
import { ShaderMaterial, Vector3 } from "three";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import {
  EyeState,
  EyeStatus,
  INITIAL_SCALE,
  TARGET_SCALE,
  FADE_DURATION,
} from "@/lib/domain/eye";

type RemoteEyesState = {
  managedEyes: Record<string, EyeState>;
};

type RemoteEyesActions = {
  syncEyes: (
    cams: [string, [number, number, number]][],
    myId: string,
    baseShaderMaterial: ShaderMaterial,
  ) => void;
  updateEyeAnimations: (delta: number) => void;
  removeEye: (id: string) => void;
};

export const useRemoteEyesStore = create<RemoteEyesState & RemoteEyesActions>()(
  immer((set) => ({
    managedEyes: {},

    syncEyes: (cams, myId, baseShaderMaterial) =>
      set(
        produce((draft: RemoteEyesState) => {
          const incomingCamIds = new Set(cams.map(([id]) => id));

          for (const [id, p] of cams) {
            if (id === myId) continue;

            const positionVec = new Vector3(...p);

            if (draft.managedEyes[id]) {
              draft.managedEyes[id].targetPosition.copy(positionVec);
              if (draft.managedEyes[id].status === "disappearing") {
                draft.managedEyes[id].status = "appearing";
              }
            } else {
              draft.managedEyes[id] = {
                id,
                position: positionVec.clone(),
                targetPosition: positionVec.clone(),
                opacity: 0,
                scale: INITIAL_SCALE,
                status: "appearing" as EyeStatus,
                material: baseShaderMaterial.clone(),
              };
            }
          }

          for (const id in draft.managedEyes) {
            if (id === myId) continue;
            if (!incomingCamIds.has(id)) {
              if (draft.managedEyes[id].status !== "disappearing") {
                draft.managedEyes[id].status = "disappearing";
              }
            }
          }
        }),
      ),

    updateEyeAnimations: (delta) =>
      set(
        produce((draft: RemoteEyesState) => {
          let changed = false;
          for (const id in draft.managedEyes) {
            const eye = draft.managedEyes[id];

            if (!eye.position.equals(eye.targetPosition)) {
              eye.position.lerp(eye.targetPosition, 0.05);
              changed = true;
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
              changed = true;
            } else if (eye.status === "disappearing") {
              eye.opacity -= delta / FADE_DURATION;
              eye.scale =
                INITIAL_SCALE +
                (TARGET_SCALE - INITIAL_SCALE) * Math.max(eye.opacity, 0);

              if (eye.opacity <= 0) {
                delete draft.managedEyes[id];
                changed = true;
                continue;
              }
              changed = true;
            }
          }
          return changed ? draft : undefined;
        }),
      ),
    removeEye: (id: string) =>
      set(
        produce((draft: RemoteEyesState) => {
          delete draft.managedEyes[id];
        }),
      ),
  })),
);
