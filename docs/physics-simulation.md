# Physics Simulation in Planeto

This document outlines the key aspects of the physics simulation implemented in the Planeto project, focusing on celestial body interactions and relevant parameters.

## Overview

The simulation models a solar system where planets interact gravitationally with each other and the central star. Physics is handled client-side using the Rapier physics engine integrated with React Three Fiber, all within `src/app/components/Scene3D.tsx`.

Key characteristics:

- **N-Body Gravitation:** Each celestial body (planets, sun) exerts gravitational forces on all other celestial bodies.
- **Client-Side Calculation:** Gravitational forces and physics updates are calculated in the `useFrame` loop in `Scene3D.tsx`.
- **Rapier Physics Engine:** Rapier is used for rigid body dynamics, collision detection, and applying forces.

## Core Components & Logic

- **`src/app/components/Scene3D.tsx`**: The heart of the simulation. In its `useFrame` hook:
  - Iterates through all pairs of celestial bodies.
  - Calculates the gravitational force between them.
  - Applies these forces to the respective `RapierRigidBody` instances.
  - Rapier updates the positions and velocities of the bodies based on these forces and other physics properties.

## Key Simulation Parameters & Tuning

Several parameters can be adjusted to alter the behavior and stability of the simulation:

- **Gravitational constant**
- **Planet and sun mass**
- **Initial positions and velocities**
- **Restitution, damping, and other Rapier properties**

All of these are set or generated in `Scene3D.tsx`.

## Current State

All gravitational interactions and subsequent movements are simulated purely on the client side. Each client runs its own independent physics simulation based on the initial state.

## Future Considerations

- **Server-Authoritative Physics:** For a shared, consistent simulation state across multiple clients, server-authoritative physics would be necessary.
- **Performance Optimization:** With many bodies, client-side N-body calculations can become performance-intensive.
