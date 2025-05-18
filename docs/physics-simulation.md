# Physics Simulation in Planeto

This document outlines the key aspects of the physics simulation implemented in the Planeto project, focusing on celestial body interactions and relevant parameters.

## Overview

The simulation aims to model a solar system where planets interact gravitationally with each other and the central star. The physics is primarily handled client-side using the Rapier physics engine integrated with React Three Fiber.

Key characteristics:

- **N-Body Gravitation:** Each celestial body (planets, sun) exerts gravitational forces on all other celestial bodies.
- **Client-Side Calculation:** Gravitational forces and physics updates are calculated within the `SolarSystem3D.tsx` component in the `useFrame` loop.
- **Rapier Physics Engine:** Rapier is used for rigid body dynamics, collision detection (though collisions aren't the primary focus for orbital mechanics), and applying forces.
- **Server-Side Initialization:** The initial state of the solar system (number of planets, their masses, initial positions, and velocities) is determined by `src/lib/server/gameStateManager.ts`.

## Core Components & Logic

- **`src/components/SolarSystem3D.tsx`**: This is the heart of the client-side simulation. In its `useFrame` hook:
  - It iterates through all pairs of celestial bodies.
  - Calculates the gravitational force between them using `SIMULATION_G`.
  - Applies these forces to the respective `RapierRigidBody` instances.
  - Rapier then updates the positions and velocities of the bodies based on these forces and other physics properties.
- **`src/lib/physics.ts`**: Defines `SIMULATION_G`, the primary gravitational constant for the simulation. It previously contained server-side physics update logic, which is currently inactive.
- **`src/lib/server/gameStateManager.ts`**: Responsible for:
  - Defining the `sunMass`.
  - Setting `numberOfPlanets`.
  - Calculating initial orbital parameters (`baseOrbitRadius`, `orbitRadiusIncrement`, `maxOrbitRandomOffset`).
  - Determining initial velocities for planets, using a `velocityScalingFactor` relative to an ideal circular orbit speed.
- **`src/components/Sun.tsx` & `src/components/Planet.tsx`**: These components wrap `RapierRigidBody` and set up initial physics properties like mass, position, and `restitution`.

## Key Simulation Parameters & Tuning

Several parameters can be adjusted to significantly alter the behavior and stability of the simulation:

1.  **`SIMULATION_G`** (in `src/lib/physics.ts`):

    - The gravitational constant used for the simulation. Higher values mean stronger gravity.
    - _Current Value (approx.): 6.0_

2.  **`sunMass`** (in `src/lib/server/gameStateManager.ts`):

    - The mass of the central star. Directly affects the gravitational pull of the sun.
    - _Current Value (approx.): 1.989e6 (scaled units)_

3.  **Planet `mass`** (generated in `src/lib/server/gameStateManager.ts`):

    - Randomly assigned to each planet. Affects how it's influenced by gravity and how much gravity it exerts.

4.  **`velocityScalingFactor`** (in `src/lib/server/gameStateManager.ts`):

    - Scales the initial velocity of planets relative to an ideal circular orbital velocity. Values less than 1.0 give planets a sub-orbital initial speed, allowing gravity to capture them more easily or leading to elliptical orbits.
    - _Current Value (approx.): 0.05 (5% of ideal)_

5.  **Orbital Generation Parameters** (in `src/lib/server/gameStateManager.ts`):

    - `baseOrbitRadius`: The starting radius for the innermost planet.
    - `orbitRadiusIncrement`: How much further out each subsequent planet starts.
    - `maxOrbitRandomOffset`: Adds some randomness to the orbital radii.
    - _Current Values: `baseOrbitRadius = 40`, `orbitRadiusIncrement = 5`, `maxOrbitRandomOffset = 2`_

6.  **`restitution`** (in `src/components/Sun.tsx`, `src/components/Planet.tsx`):

    - A Rapier physics property determining the "bounciness" of objects. A value of `0.5` means bodies retain 50% of their relative velocity after a very close approach or collision.
    - _Current Value: 0.5 for Sun and Planets_

7.  **`linearDamping` & `angularDamping`** (in `src/components/Planet.tsx`):

    - Rapier properties that gradually reduce linear and angular velocities over time, helping with simulation stability but can also make orbits decay if too high.
    - _Current Value: 0.1 for Planets_

8.  **`minEffectiveDistanceSq`** (in `src/components/SolarSystem3D.tsx`):
    - A clamping value for the squared distance in the gravity calculation (`Math.max(distanceSq, minEffectiveDistanceSq)`). This prevents excessively large forces if bodies get extremely close, which can destabilize the simulation.
    - _Current Value (approx.): 0.25_

## Current State of Server-Side Physics

The `updatePhysics` function in `src/lib/physics.ts`, which would be called by the server-side game loop in `gameStateManager.ts`, currently has its main logic commented out or removed. This means that after initial state generation, the server **does not** update the positions or velocities of celestial bodies over time. All gravitational interactions and subsequent movements are simulated purely on the client side.

This approach simplifies the server's role but means that each client runs its own independent physics simulation based on the initial state received from the server.

## Future Considerations

- **Server-Authoritative Physics:** For a shared, consistent simulation state across multiple clients, server-authoritative physics for celestial bodies would be necessary.
- **Performance Optimization:** With many bodies, client-side N-body calculations can become performance-intensive.
