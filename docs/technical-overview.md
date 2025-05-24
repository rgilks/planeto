# Planeto Technical Overview

## Core Technologies

- **Rendering**: React Three Fiber and Drei for 3D scene rendering.
- **Physics**: Rapier for physics simulation (gravity, collisions).
- **State Management**: Zustand for global state.
- **Data Validation**: Zod for schema definition and validation.
- **Language**: TypeScript for type safety.
- **Framework**: Next.js.

## Architecture

Planeto simulates a cluster of planetoids. Users (Watchers) observe the scene. Keyboard inputs are translated into symbols (glyphs) displayed locally and broadcast to other Watchers.

```mermaid
flowchart TD
    A[User] -- presses key --> B{Keyboard Event}
    B -- to local UI --> C[Symbol Displayed Locally]
    B -- POST /api/game-events --> D[Server]
    D -- SSE /api/game-events --> E[Other Users]
    E -- see symbol --> F[Symbol Displayed Remotely]

    G[Planetoids] -- physics simulation --> G
    G -- rendered --> A
    G -- rendered --> E

    H[User Camera] -- POST /api/camera --> D
    D -- SSE /api/events --> E
    E -- render remote camera --> I[Remote Camera Displayed]
```

## Key Components

- `src/app/components/Scene3D.tsx`: Main 3D scene, renders planetoids, user camera, remote cameras, and handles physics updates. Initiates glyph broadcast on keyboard input.
- `src/app/components/RemoteEyes.tsx`: Renders other users' camera positions and their broadcasted glyphs.
- `src/app/components/KeyboardDisplay.tsx`: Displays the local user's current glyph.
- `src/app/page.tsx`: Main application entry point, integrates `KeyboardHandler` for input.
- `src/lib/store/`: Zustand stores for managing application state (keyboard input, camera data).
- `src/app/api/`: Backend API routes for handling camera position updates and game event (glyph) broadcasting via SSE.

## Data Flow

- **Planetoid Simulation**:
  - Initialized in `Scene3D.tsx` with initial properties (mass, color, position, velocity).
  - Physics (gravity, collisions) managed by Rapier, updated each frame.
- **Keyboard Input (Glyphs)**:
  - `KeyboardHandler` captures `keydown` events.
  - Input stored in `useKeyboardStore` (Zustand).
  - `Scene3D.tsx` observes store; on change, POSTs `{id, key}` to `/api/game-events`.
  - `/api/game-events` (server) validates and broadcasts via SSE to all connected clients (except sender).
  - Remote clients receive glyphs via SSE and display them using `RemoteEyes.tsx`.
- **Camera Position Sharing**:
  - `useCameraPublisher` hook sends local camera position to `/api/camera` (POST) periodically or on significant movement.
  - `/api/camera` (server) updates camera state in `sseStore`.
  - `sseStore` broadcasts updated camera positions (`{id, p, t}`) via `/api/events` (SSE) to all clients.
  - Remote clients receive camera updates and render them using `RemoteEyes.tsx`.
  - `sseStore` periodically purges stale camera data.

## Camera System

- The user's camera is fixed. Its position is shared with other users.
- To maintain presence with minimal data, if the camera hasn't moved, only its `id` (as a ping) is sent periodically (every 20 seconds by `useCameraPublisher` as a full position update, or via no-position `setCamera` calls which are currently not implemented client-side for pure pings). The server updates the timestamp, preventing the camera from being purged as stale unless the connection is lost.

## Customization

- **Planetoids**: Modify initialization parameters in `Scene3D.tsx`.
- **Glyphs**: Update the `SYMBOLS` array in `KeyboardDisplay.tsx` and potentially related rendering logic if visual representation changes.
