// This file previously contained duplicated type definitions for PlanetData, StarData etc.
// These are now defined via Zod schemas and z.infer in src/lib/domain/index.ts
// This file can be removed or repurposed if other specific, non-Zod-derived solar system types are needed.

// export interface MoonData extends Omit<PlanetData, "moons" | "mass"> {
//   // mass is already part of the base PlanetData from which MoonData might be derived in index.ts
//   // Re-evaluating if MoonData needs a separate definition here or if index.ts covers it sufficiently.
// }

// Keeping the file for now, but its contents are effectively replaced by index.ts definitions.
