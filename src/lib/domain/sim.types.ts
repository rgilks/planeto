import { z } from "zod";

export const UserIdSchema = z.string().uuid().brand<"UserId">();
export type UserId = z.infer<typeof UserIdSchema>;

export const CelestialBodyIdSchema = z
  .string()
  .uuid()
  .brand<"CelestialBodyId">();
export type CelestialBodyId = z.infer<typeof CelestialBodyIdSchema>;

export const CelestialTypeSchema = z.enum([
  "sun",
  "planet",
  "moon",
  "asteroid",
]);
export type CelestialType = z.infer<typeof CelestialTypeSchema>;

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});
export type Position = z.infer<typeof PositionSchema>;

export const RotationSchema = z.object({
  // Euler angles
  x: z.number(),
  y: z.number(),
  z: z.number(),
});
export type Rotation = z.infer<typeof RotationSchema>;

export const AtmospherePropertiesSchema = z.object({
  textureUrl: z.string().url().optional(),
  color: z.string().optional(), // e.g., '#FFFFFF' or 'rgba(255,255,255,0.5)'
  thickness: z.number().positive().optional(), // Multiplier for radius to determine atmosphere size
  density: z.number().min(0).max(1).optional(), // For shader effects or opacity
});
export type AtmosphereProperties = z.infer<typeof AtmospherePropertiesSchema>;

export const CelestialBodyStateSchema = z.object({
  id: CelestialBodyIdSchema,
  type: CelestialTypeSchema,
  name: z.string(),
  mass: z.number().positive(),
  radius: z.number().positive(), // For rendering and potentially collisions
  position: PositionSchema,
  velocity: PositionSchema, // Represents dx, dy, dz per second or physics tick
  rotation: RotationSchema, // For visual representation (e.g., axial tilt, rotation period)
  rotationSpeed: z.number().optional(), // Radians per frame delta, for visual rotation
  initialAngularVelocity: PositionSchema.optional(), // For initial Rapier spin setup
  orbitingBodyId: CelestialBodyIdSchema.optional(), // For initial setup, physics will take over
  textureUrl: z.string().url().optional(),
  bumpMapUrl: z.string().url().optional(),
  specularMapUrl: z.string().url().optional(),
  atmosphere: AtmospherePropertiesSchema.optional(),
  lastUpdated: z.string().datetime(),
});
export type CelestialBodyState = z.infer<typeof CelestialBodyStateSchema>;

export const SimStateSchema = z.object({
  celestialBodies: z.record(CelestialBodyIdSchema, CelestialBodyStateSchema),
});
export type SimState = z.infer<typeof SimStateSchema>;
