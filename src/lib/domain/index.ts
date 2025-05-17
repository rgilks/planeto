import { z } from "zod";

// Position and Rotation schemas are in game.types.ts, re-export if needed or ensure they are imported where used.

// Base for celestial bodies that have mass
const CelestialBodySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  mass: z.number().positive(),
  radius: z.number().positive(),
});

// PlanetData schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PlanetDataSchema: any = z.lazy(() =>
  CelestialBodySchema.extend({
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    orbitRadius: z.number().positive(),
    orbitalPeriod: z.number().positive(),
    moons: z.array(MoonDataSchema).optional(),
  }),
);
export type PlanetData = z.infer<typeof PlanetDataSchema>;

// MoonData schema - essentially a PlanetData without its own moons for simplicity
// and to prevent excessively deep recursion if not handled carefully.
// Moons will inherit mass, radius, etc., from CelestialBodySchema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MoonDataSchema: any = z.lazy(() =>
  CelestialBodySchema.extend({
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    orbitRadius: z.number().positive(), // Orbit radius around its parent planet
    orbitalPeriod: z.number().positive(), // Orbital period around its parent planet
  }),
);
export type MoonData = z.infer<typeof MoonDataSchema>;

// StarData schema
export const StarDataSchema = CelestialBodySchema.extend({
  type: z.string(),
  luminosity: z.number().positive(),
  planets: z.array(PlanetDataSchema),
});
export type StarData = z.infer<typeof StarDataSchema>;

// SolarSystemData schema
export const SolarSystemDataSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  star: StarDataSchema,
});
export type SolarSystemData = z.infer<typeof SolarSystemDataSchema>;

export * from "./game.types"; // This already exports PositionSchema, RotationSchema etc.
// Do NOT re-export solar-system.types if it's becoming obsolete or only contains helpers

// Note: The previous export * from "./solar-system.types" is removed
// if that file is being refactored to not export these core types anymore.
// If it still contains other relevant types (like the original MoonData if different), adjust accordingly.
