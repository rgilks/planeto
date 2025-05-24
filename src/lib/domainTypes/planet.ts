import * as THREE from "three";
import { z } from "zod";

const TextureSchema = z.custom<THREE.Texture>(
  (val) => val instanceof THREE.Texture,
);

const MoonSchema = z.object({
  radius: z.number(),
  color: z.string(),
  orbitRadius: z.number(),
  orbitSpeed: z.number(),
  phase: z.number(),
});

const AtmosphereLayerSchema = z.object({
  color: z.string(),
  opacity: z.number(),
  scale: z.number(),
  additive: z.boolean().optional(),
});

export const PlanetSchema = z.object({
  mass: z.number(),
  radius: z.number(),
  position: z.tuple([z.number(), z.number(), z.number()]),
  velocity: z.tuple([z.number(), z.number(), z.number()]),
  color: z.string(),
  id: z.string(),
  bumpMap: TextureSchema,
  colorMap: TextureSchema,
  metalness: z.number(),
  roughness: z.number(),
  hasRing: z.boolean(),
  ringColor: z.string(),
  ringInner: z.number(),
  ringOuter: z.number(),
  moons: z.array(MoonSchema),
  atmosphereColor: z.string(),
  atmosphereLayers: z.array(AtmosphereLayerSchema),
  geometryType: z.enum(["sphere", "lowpoly", "oblate"]),
  angularVelocity: z.tuple([z.number(), z.number(), z.number()]),
});

export type Planet = z.infer<typeof PlanetSchema>;
export type Moon = z.infer<typeof MoonSchema>;
export type AtmosphereLayer = z.infer<typeof AtmosphereLayerSchema>;
