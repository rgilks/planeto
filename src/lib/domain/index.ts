import { z } from "zod";

// Define the TS interface for PlanetData first
export interface PlanetData {
  id: string;
  name: string;
  radius: number;
  color: string;
  orbitRadius: number;
  orbitalPeriod: number;
  moons?: PlanetData[]; // Recursive and optional
}

// Define the Zod schema, using z.lazy for recursion
// Explicitly type the schema with the interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PlanetDataSchema: any = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    radius: z.number().positive(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    orbitRadius: z.number().positive(),
    orbitalPeriod: z.number().positive(),
    moons: z.array(PlanetDataSchema).optional(), // Use PlanetDataSchema here
  }),
);

// StarData schema
export interface StarData {
  id: string;
  name: string;
  type: string;
  luminosity: number;
  planets: PlanetData[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StarDataSchema: any = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    type: z.string(),
    luminosity: z.number().positive(),
    planets: z.array(PlanetDataSchema),
  }),
);

// SolarSystemData schema
export interface SolarSystemData {
  id: string;
  name: string;
  star: StarData;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SolarSystemDataSchema: any = z.lazy(() =>
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    star: StarDataSchema,
  }),
);
