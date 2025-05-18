# Planeto - Technical Overview

## Vision & Philosophy

Planeto is a modern, interactive 3D solar system simulation. The current implementation focuses on a single Sun and four planets, all simulated as rigid bodies with real-time gravity and collisions using the Rapier physics engine. The goal is to provide a clear, extensible foundation for more complex planetary systems and features.

## Key Principles

- **Strong Domain Model:** Zod schemas define the structure for stars and star fields (`src/lib/domain/starField.ts`).
- **Component-Based 3D Rendering:** React Three Fiber is used for all 3D rendering. The main scene logic is in `src/app/components/Scene3D.tsx`.
- **Physics-Driven Simulation:** Rapier physics provides real-time rigid body dynamics, gravity, and collisions.
- **Type Safety:** TypeScript and Zod ensure robust, maintainable code.

## Core Components & Architecture

- **Next.js App Router:** Manages routing and page structure (`src/app/page.tsx`).
- **Scene3D.tsx:**
  - Renders the Sun and four planets as dynamic rigid bodies
  - Applies gravity between the Sun and each planet
  - Handles collisions and orbits
  - Renders a distant, static star field
  - Provides camera controls with OrbitControls
- **starField.ts:**
  - Zod schemas for star and star field
  - Helper to generate a random star field

## Data Flow

- **Planet Configs:**
  - All planet properties (mass, radius, position, velocity, color) are defined in a `planetConfigs` array in `Scene3D.tsx`.
- **Refs:**
  - The Sun and each planet have a ref to their Rapier rigid body instance for physics updates.
- **Gravity:**
  - A custom `Gravity` component applies gravitational force between the Sun and each planet every frame.
- **Rendering:**
  - The Sun and planets are rendered as colored spheres.
  - The star field is rendered as small white spheres in a distant shell.

## Extending

- To add more planets, update the `planetConfigs` array in `Scene3D.tsx`.
- To change the star field, update the generator in `starField.ts` and its usage in `Scene3D.tsx`.

## Future Directions

- Add more complex N-body gravity (planet-planet interactions)
- Procedural planet textures and atmospheres
- UI for adjusting simulation parameters
- Save/load planetary systems
- More advanced rendering (shaders, postprocessing)

## Libraries

- React Three Fiber
- Drei
- Rapier physics
- Zod
- TypeScript
