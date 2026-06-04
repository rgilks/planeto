import type { Texture } from "three";

export type Moon = {
  radius: number;
  color: string;
  orbitRadius: number;
  orbitSpeed: number;
  phase: number;
};

export type AtmosphereLayer = {
  color: string;
  opacity: number;
  scale: number;
  additive?: boolean;
};

// Fully-resolved, client-side planet. Generated locally from a seed
// (usePlanetData), never sent over the wire, so it is a plain type rather than
// a Zod schema — the only validated boundary is event.ts.
export type Planet = {
  mass: number;
  radius: number;
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  id: string;
  bumpMap: Texture;
  colorMap: Texture;
  metalness: number;
  roughness: number;
  hasRing: boolean;
  ringColor: string;
  ringInner: number;
  ringOuter: number;
  moons: Moon[];
  atmosphereColor: string;
  atmosphereLayers: AtmosphereLayer[];
  geometryType: "sphere" | "lowpoly" | "oblate";
  angularVelocity: [number, number, number];
  isDarkSun?: boolean;
};
