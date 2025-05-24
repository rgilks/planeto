# Real-Time Communication

This document details Planeto's real-time communication architecture, focusing on sharing camera positions and game events (e.g., keyboard inputs) between clients and the server, and strategies to minimize bandwidth usage.

## Overview

- **Purpose**: Enable near real-time sharing of dynamic data (camera movements, user inputs) among connected clients.
- **Technologies**:
  - **Server-Sent Events (SSE)**: Unidirectional communication from server to clients for pushing updates (e.g., other users' camera positions, game events).
  - **HTTP POST Requests**: Client-to-server communication (e.g., sending the current user's camera position or keyboard input).
- **Key Goal**: Minimize bandwidth consumption for a public, unauthenticated application while maintaining a responsive user experience.

## Camera Position Sharing

This system allows clients to view other users' camera positions in near real-time.

### Client-Side Publisher (`src/app/components/useCameraPublisher.ts`)

- The `useCameraPublisher` React hook sends the local camera's position to the server.
- **Update Logic**:
  1. Sends initial camera position on component mount.
  2. Periodically checks camera position (every 2 seconds):
     - If position changed significantly (epsilon comparison), sends new position (`id`, `p`) and resets a 20-second forced update timer.
     - If position unchanged but 20 seconds (`FORCE_POSITION_UPDATE_INTERVAL_MS`) have passed since last full update, sends full position update and resets the timer.
- **Data Transmission**: Uses `navigator.sendBeacon`.

### Server-Side Receiver (`src/app/api/camera/route.ts`)

- A POST endpoint receives camera data:
  - `id`: Client/camera identifier (string).
  - `p` (optional): `Vec3` array `[x, y, z]` for camera position.
- Calls `setCamera(id, p)` from `src/lib/sseStore.ts`. If `p` is absent, it acts as a keep-alive ping.

### Server-Side State & SSE Broadcasting (`src/lib/sseStore.ts`)

- Manages camera states and broadcasts updates.
- **State (`cameras` Map)**: Stores the latest `CameraMessage ({ id, p, t })` for each active camera (`t` is the update timestamp).
- **`setCamera(id, p?)`**:
  - If `p` (position) is provided: Updates camera entry in `cameras` Map with new position and timestamp, then calls `broadcast(msg)`.
  - If `p` is not provided (ping): Updates timestamp `t` for the given `id` without broadcasting.
- **`broadcast(msg: CameraMessage)`**:
  - Formats `CameraMessage` as an SSE data string.
  - Sends to all subscribers of the `/api/events` SSE stream.
- **`subscribe(writer)`**:
  - Adds new client's `writer` to a subscriber Set on connection to `/api/events`.
  - Immediately sends current state of all cameras to the new subscriber.
- **`purgeStale(maxAge = 60000)`**:
  - Removes cameras from `cameras` Map if timestamp `t` exceeds `maxAge` (default 60s).
  - Invoked periodically by `setInterval` (default every 10s) in `sseStore.ts` to prevent stale data and reduce memory usage.
- **`unsubscribe(writer)`**: Removes client's writer from subscribers on disconnect.

### Server-Side SSE Endpoint (`src/app/api/events/route.ts`)

- Establishes SSE connection via a Next.js route handler.
- Sets headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- Uses `ReadableStream` to manage the connection.
- Calls `sseStore.subscribe()` on connection start and `sseStore.unsubscribe()` on cancellation.

## Game Event Sharing (Keyboard Inputs)

Allows clients to send keyboard inputs to the server, which then broadcasts them.

### Client-Side Input Capture (`src/app/page.tsx` - `KeyboardHandler`)

- `KeyboardHandler` component wraps the main application.
- Uses a global `window.addEventListener("keydown", ...)`.
- **Optimization**: `if (e.repeat) return;` in `handleKeyDown` prevents sending events for held keys, saving bandwidth.
- If not a repeat, calls `setLastInput({ key: e.key })` from `useKeyboardStore`.

### Client-Side State Management (`src/lib/store/keyboardStore.ts`)

- Zustand store `useKeyboardStore`.
- `lastInput: KeyboardInput | null`: Stores the latest non-repeated local keyboard input.
- `setLastInput(input)`: Updates `lastInput`.
- `remoteKeys`: Stores last key events from other users, indexed by ID.

### Client-Side Event Sender (`src/app/components/Scene3D.tsx`)

- `useEffect` hook in `Scene3D` subscribes to `lastInput` changes from `useKeyboardStore`.
- On `lastInput` change, sends a `fetch` POST to `/api/game-events`.
- Payload: `{ id: myId.current, key: lastInput.key }` (`myId.current` is a unique `nanoid`).

### Server-Side Receiver & SSE Broadcaster (`src/app/api/game-events/route.ts`)

- **`POST` Handler**:
  - Receives JSON payload (`{ id, key }`).
  - Validates with Zod schema (`KeyboardEventSchema`).
  - If valid, formats as SSE message and sends to all stream subscribers.
- **`GET` Handler**:
  - Standard SSE setup for clients to subscribe to game events.
  - Maintains an in-memory array of `subscribers`.

## Bandwidth and Cost Optimization

- **Camera Data (`/api/events` & `/api/camera`):**
  - **Conditional Publishing**: `useCameraPublisher` sends full position data only if position changes or 20s pass since last full update. No other pings are sent.
  - **Server-Side Purging**: `sseStore` purges camera data inactive for >60s.
  - **Ping Removal**: Client-side explicit pings removed; server relies on periodic/movement-triggered updates.
- **Game Events (`/api/game-events`):**
  - **Key Repeat Ignored**: Client ignores `keydown` events where `event.repeat` is true.
- **General SSE Practices:**
  - JSON payloads (compact for structured data).
  - SSE connections kept alive; data sent only on changes/new inputs.
  - New camera event subscribers receive only current active camera states.

These strategies minimize data transfer, reducing server load and bandwidth costs for the public application.
