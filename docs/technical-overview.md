# Planeto - Technical Overview

## Vision & Philosophy

Planeto is a modern, interactive 3D planetary system simulation. All bodies are simulated as planets with real-time gravity and collisions using the Rapier physics engine. The goal is to provide a clear, extensible foundation for more complex planetary systems and features.

## Key Principles

- **Strong Domain Model:** Zod schemas define the structure for planets and keyboard events.
- **Component-Based 3D Rendering:** React Three Fiber is used for all 3D rendering. The main scene logic is in `src/app/components/Scene3D.tsx`.
- **Physics-Driven Simulation:** Rapier physics provides real-time rigid body dynamics, gravity, and collisions.
- **Type Safety:** TypeScript and Zod ensure robust, maintainable code.
- **Multiplayer Keyboard Events:** Keyboard events are broadcast in real time and visualized above remote players' eyes.

## Core Components & Architecture

- **Next.js App Router:** Manages routing and page structure (`src/app/page.tsx`).
- **Scene3D.tsx:**
  - Renders all planets as dynamic rigid bodies
  - Applies gravity between every pair of planets (N-body)
  - Handles collisions and orbits
  - Provides camera controls with OrbitControls
  - Handles multiplayer keyboard event display

## Data Flow

- **Planet Generation:**
  - All planet properties (mass, radius, position, velocity, color) are generated in `Scene3D.tsx`.
- **Refs:**
  - Each planet has a ref to its Rapier rigid body instance for physics updates.
- **Gravity:**
  - Gravity is applied between every pair of planets every frame in `Scene3D.tsx`.
- **Rendering:**
  - All planets are rendered as colored spheres.

## Extending

- To add more planets, update the planet generation logic in `Scene3D.tsx`.

## Libraries

- React Three Fiber
- Drei
- Rapier physics
- Zod
- TypeScript

## Camera Logic

The camera is fixed in position and does not follow any object. The view remains static, providing a consistent perspective of the planetary system.
