import type { ShaderMaterial, Vector3 } from "three";

export type EyeStatus = "appearing" | "visible" | "disappearing";

// Client-side runtime state for one rendered eye. Holds live three.js
// instances, so it never crosses the wire — the network shape is EyeUpdate
// in event.ts.
export type EyeState = {
  id: string;
  position: Vector3;
  targetPosition: Vector3;
  opacity: number;
  scale: number;
  status: EyeStatus;
  material: ShaderMaterial;
};

export const INITIAL_SCALE = 0.01;
export const TARGET_SCALE = 1.0;
export const FADE_DURATION = 1.0;
