# Planeto - Technical Overview

## Vision & Philosophy

Planeto is a modern, interactive 3D planetary system simulation. All bodies are simulated as planets with real-time gravity and collisions using the Rapier physics engine. The goal is to provide a clear, extensible foundation for more complex planetary systems and features.

## Key Principles

- **Strong Domain Model:** Zod schemas define the structure for planets.
- **Component-Based 3D Rendering:** React Three Fiber is used for all 3D rendering. The main scene logic is in `src/app/components/Scene3D.tsx`.
- **Physics-Driven Simulation:** Rapier physics provides real-time rigid body dynamics, gravity, and collisions.
- **Type Safety:** TypeScript and Zod ensure robust, maintainable code.

## Core Components & Architecture

- **Next.js App Router:** Manages routing and page structure (`src/app/page.tsx`).
- **Scene3D.tsx:**
  - Renders all planets as dynamic rigid bodies
  - Applies gravity between every pair of planets (N-body)
  - Handles collisions and orbits
  - Provides camera controls with OrbitControls

## Data Flow

- **Planet Configs:**
  - All planet properties (mass, radius, position, velocity, color) are defined in a `planetConfigs` array in `Scene3D.tsx`.
- **Refs:**
  - Each planet has a ref to its Rapier rigid body instance for physics updates.
- **Gravity:**
  - A custom `Gravity` component applies gravitational force between every pair of planets every frame.
- **Rendering:**
  - All planets are rendered as colored spheres.

## Extending

- To add more planets, update the planet generation logic in `Scene3D.tsx`.

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

## Camera Following Logic

The camera now follows the focused object (planet or sun) in world space. Each frame, the camera's position and lookAt target are updated to keep the focused object centered on the screen. This approach replaces the previous method of offsetting the entire group of objects, resulting in more natural camera movement, improved lighting and depth, and a more robust experience for features like shadows and post-processing effects.
