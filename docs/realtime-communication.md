# Real-Time Communication in Planeto

This document outlines Planeto's real-time communication architecture, designed to share camera positions and keyboard inputs between clients. It leverages Server-Sent Events (SSE) for server-to-client updates and HTTP POST requests for client-to-server data transmission, all consolidated through a single API endpoint (`/api/events`).

## Core Architecture

- **Single API Endpoint (`/api/events`)**:
  - **`POST /api/events`**: Clients send `CameraUpdate` or `KeyboardEvent` data to this endpoint.
  - **`GET /api/events`**: Clients establish an SSE connection to receive real-time events broadcast by the server.
- **Server-Side Logic (`src/lib/sseStore.ts`)**:
  - Manages a map of current camera positions (`cameras`).
  - Maintains a set of active SSE subscribers (`subs`).
  - Broadcasts received and processed events to all subscribers.
  - Periodically purges stale camera data.
- **Event Schemas (`src/lib/domain.ts`)**: Zod schemas define the structure for `CameraUpdateEvent` and `KeyboardEvent`.

## Event Flows

### 1. Camera Position Sharing

**Goal**: Allow clients to see other users' camera movements.

**Client-Side Publishing (`src/app/components/useCameraPublisher.ts`)**:

- A React hook (`useCameraPublisher`) captures the local camera's position from `three.js`.
- **Sending Data**:
  - An initial camera position is sent on component mount.
  - Periodically (every 2 seconds):
    - If the camera position has changed significantly (epsilon comparison), the new position is sent.
    - A full position update is forcibly sent every 20 seconds, regardless of change, to ensure eventual consistency.
  - Data is transmitted as a `CameraUpdateType` event to `POST /api/events` using `navigator.sendBeacon()`. This method is chosen for its ability to reliably send data during page unload and to minimize impact on other network requests, though it can be lower priority.

**Server-Side Handling (`src/app/api/events/route.ts` & `src/lib/sseStore.ts`)**:

- The `POST` handler validates the `CameraUpdateEvent`.
- `sseStore.setCamera(id, p)` updates the camera's position and timestamp in the `cameras` map.
- `sseStore.broadcast(event)` then sends the `CameraUpdateEvent` to all connected SSE clients.

**Client-Side Receiving (`src/app/components/useRemoteCameras.ts`)**:

- The `useRemoteCameras` hook establishes an SSE connection to `GET /api/events`.
- It listens for `CameraUpdateEvent` messages.
- Received camera data updates a Zustand store (`useCamStore`), making remote camera positions available to the UI (e.g., for rendering remote user representations like `RemoteEyes`).
- Stale camera data is periodically removed from the client-side store.

### 2. Keyboard Event Sharing

**Goal**: Allow clients to react to keyboard inputs from other users.

**Client-Side Input & Publishing (`src/app/components/Scene3D.tsx` & `src/lib/store/keyboardStore.ts`)**:

- An event listener (implicitly via `KeyboardControls` or a direct listener, managed by `useKeyboardControls` from `@react-three/drei` or similar, eventually updating `useKeyboardStore`) captures key presses.
- To avoid spamming, only non-repeating key presses are processed.
- The `lastInput` in `useKeyboardStore` (Zustand) is updated.
- An effect in `Scene3D.tsx` observes `lastInput`. When it changes:
  - A `KeyboardEventType` payload (including a unique client `id` and the `key`) is created.
  - This payload is sent via `fetch` to `POST /api/events`.
  - Sends are throttled (e.g., every 100ms) to manage send frequency.

**Server-Side Handling (`src/app/api/events/route.ts` & `src/lib/sseStore.ts`)**:

- The `POST` handler validates the `KeyboardEvent`.
- `sseStore.broadcast(event)` immediately sends the `KeyboardEvent` to all connected SSE clients. (Note: Keyboard events are not persistently stored on the server in `sseStore` beyond broadcasting).

**Client-Side Receiving (`src/app/components/Scene3D.tsx` & `src/lib/store/keyboardStore.ts`)**:

- The same SSE connection established for camera updates (in `Scene3D.tsx` or a shared hook) also receives `KeyboardEvent` messages.
- If the event `id` does not match the local client's `id`, `setRemoteKey(id, key)` is called in `useKeyboardStore` to store the remote key press.
- UI components can then react to changes in `remoteKeys`.

## Bandwidth and Latency Considerations

The "real-time" nature of this system is subject to various factors affecting latency. It's important to note that certain delays are an **accepted consequence of design choices aimed at minimizing hosting costs and bandwidth usage** for this public, unauthenticated application.

- **Network Conditions**: User's internet speed, ping to the server (London).
- **Server Load & Processing**: The single `256mb` VM on Fly.io handles all requests and SSE connections. High load could increase processing time. The choice of a small, single VM that can scale to zero is a primary cost-saving measure.
- **Client-Side Throttling/Polling (Deliberate for Cost/Bandwidth)**:
  - Camera updates are inherently delayed by the 2-second polling interval and the 20-second forced updates in `useCameraPublisher`. This is a **deliberate trade-off to significantly reduce the volume of camera data sent**, thus lowering bandwidth and server processing load.
  - Keyboard events are throttled (e.g., 100ms) on the client before sending, balancing responsiveness with server load.
- **`navigator.sendBeacon()` for Camera Updates (Deliberate for Cost/Reliability)**: While beneficial for sending data reliably without blocking other requests and during page unload, `sendBeacon` requests are often treated as lower priority by the browser. This choice prioritizes data delivery and reduced client-side performance impact over achieving the lowest possible latency for camera updates, aligning with cost-saving goals by ensuring data isn't lost and doesn't overwhelm a small server.
- **SSE Connection Stability**: Frequent SSE disconnects/reconnects would delay message delivery.
- **Client-Side Rendering**: Time taken for clients to process incoming SSE messages and update their UI.

**Understanding Observed Delays in Context of Design**: If delays are observed, it's crucial to view them through the lens of these cost-optimization strategies. The system is not designed for sub-second, high-frequency updates for all event types due to these explicit choices.

For applications where minimizing latency is the absolute top priority (over costs and architectural simplicity), alternative technologies like WebSockets might be considered. The current HTTP/SSE approach is tailored for simplicity, robustness for intermittent sending, and cost-effectiveness on platforms like Fly.io with auto-scaling to zero.

## Key Files Summary

- **API Route**: `src/app/api/events/route.ts`
- **Server State/SSE Logic**: `src/lib/sseStore.ts`
- **Event Definitions**: `src/lib/domain.ts`
- **Camera Publishing (Client)**: `src/app/components/useCameraPublisher.ts`
- **Camera Receiving (Client)**: `src/app/components/useRemoteCameras.ts` & `src/lib/store/camStore.ts` (implicitly, via `useRemoteCameras`)
- **Keyboard Logic (Client)**: `src/app/components/Scene3D.tsx`, `src/lib/store/keyboardStore.ts`
