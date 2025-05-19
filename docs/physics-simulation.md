# The Physics of the Void

> In the darkness, planetoids drift. Gravity whispers. Collisions echo. The void is never still.

## The Dance of the Cluster

- Every planetoid pulls on every other, unseen threads binding the void.
- Collisions are rare, but when they occur, the cluster shudders and shifts.
- All is calculated in the heart of the cluster: `Scene3D.tsx`.

## The Flow of Forces

```mermaid
flowchart TD
    A[Planetoid] -- gravity --> B[Planetoid]
    B -- gravity --> A
    A -- collision --> B
    B -- collision --> A
    subgraph The Cluster
      A
      B
      C[...]
    end
    D[Watcher] -- observes --> The Cluster
```

## Core Runes

- **Scene3D.tsx:**
  - The locus of all movement and force.
  - Each planetoid is given mass, color, and motion.
  - Gravity and collisions are calculated every frame.

## Tuning the Void

- Gravitational constant
- Mass of each planetoid
- Initial positions and velocities
- Restitution, damping, and other properties

All are set or conjured in `Scene3D.tsx`.

## The State of the Void

- All movement and force is calculated on the client, in the watcher's own void.
- Each watcher sees their own cluster, ever-shifting.

## Future Whispers

- Server-authoritative physics may one day bind all voids together.
- With many planetoids, the dance grows ever more complex.
