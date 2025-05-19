# Real-Time Communication Architecture

This document outlines the real-time communication mechanisms used in the application, focusing on how camera positions and game events (like keyboard inputs) are shared between clients and the server, and the strategies employed to minimize bandwidth.

## Overview

- **Purpose**: To enable near real-time sharing of dynamic data (camera movements, user inputs) among all connected clients.
- **Core Technologies**:
  - **Server-Sent Events (SSE)**: Used for unidirectional communication from the server to clients. This allows the server to push updates (e.g., other users' camera positions, game events) to all connected clients efficiently.
  - **HTTP POST Requests**: Used for client-to-server communication (e.g., sending the current user's camera position or keyboard input).
- **Key Goal**: Minimize bandwidth consumption to support a public, unauthenticated application cost-effectively, while providing a responsive experience.

## 1. Camera Position Sharing

This system allows clients to see the camera positions of other users in near real-time.

### a. Client-Side Publisher (`src/app/components/useCameraPublisher.ts`)

- A custom React hook `useCameraPublisher` is responsible for sending the local camera's position to the server.
- **Update Logic**:
  1.  An initial camera position is sent to the server as soon as the component mounts.
  2.  It then periodically checks the camera's position (default: every 1 second via `setInterval`).
  3.  An update (containing a client `id` and position `p`) is sent to the `/api/camera` POST endpoint **only if** the current rounded camera position has changed significantly from the last sent position. This comparison uses a small epsilon value to avoid updates for micro-movements.
- **Data Transmission**: Uses `navigator.sendBeacon` for sending updates. This API is designed for sending small amounts of data asynchronously, often when a page is unloading, without expecting a response, making it suitable for "fire-and-forget" telemetry like position updates.

### b. Server-Side Receiver (`src/app/api/camera/route.ts`)

- A simple POST endpoint that receives the camera data:
  - `id`: A string identifying the client/camera.
  - `p` (optional): A `Vec3` array `[x, y, z]` representing the camera position.
- It calls the `setCamera(id, p)` function from `src/lib/sseStore.ts`. If `p` is not provided, it's treated as a "ping" to keep the camera data alive.

### c. Server-Side State & SSE Broadcasting (`src/lib/sseStore.ts`)

- This module acts as the central hub for managing camera states and broadcasting updates.
- **State (`cameras` Map)**: A `Map` stores the latest known `CameraMessage ({ id, p, t })` for each active camera, where `t` is the timestamp of the last update.
- **`setCamera(id, p?)`**:
  - If `p` (position) is provided: Updates the camera's entry in the `cameras` Map with the new position and current timestamp. It then calls `broadcast(msg)`.
  - If `p` is _not_ provided (ping): Only updates the timestamp `t` for the given `id`. This does _not_ trigger a broadcast, saving bandwidth for simple keep-alives.
- **`broadcast(msg: CameraMessage)`**:
  - Formats the `CameraMessage` as an SSE data string (`data: JSON.stringify(msg)\\n\\n`).
  - Sends this string to all currently connected subscribers of the `/api/events` SSE stream.
- **`subscribe(writer)`**:
  - When a new client connects to the `/api/events` SSE stream, this function is called.
  - It adds the client's `writer` to a `Set` of subscribers.
  - Critically, it then immediately sends the current state of _all_ cameras in the `cameras` Map to the new subscriber. This ensures the new client gets the full picture right away.
- **`purgeStale(maxAge = 4000)`**:
  - This function iterates through the `cameras` Map and removes any camera whose timestamp `t` is older than `maxAge` (default 4 seconds).
  - It is invoked periodically by a `setInterval` (default every 3 seconds) within `sseStore.ts` itself. This is crucial for:
    - Preventing the `cameras` Map from growing indefinitely with stale data.
    - Ensuring new subscribers don't receive outdated information.
    - Reducing server memory usage.
- **`unsubscribe(writer)`**: Removes a client's writer from the subscribers set when they disconnect.

### d. Server-Side SSE Endpoint (`src/app/api/events/route.ts`)

- A standard Next.js route handler that establishes an SSE connection.
- Sets appropriate headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`).
- Uses a `ReadableStream` to manage the connection.
- Calls `sseStore.subscribe()` when a connection starts and `sseStore.unsubscribe()` when it cancels.

## 2. Game Event Sharing (Keyboard Inputs)

This system allows clients to send their keyboard inputs to the server, which then broadcasts them to other clients.

### a. Client-Side Input Capture (`src/app/page.tsx` - `KeyboardHandler`)

- A `KeyboardHandler` component wraps the main application content.
- It sets up a global `window.addEventListener("keydown", ...)` listener.
- **Optimization**: Inside the `handleKeyDown` function, it checks `if (e.repeat) return;`. This prevents events from being processed (and sent) when a key is held down and the browser fires repeated `keydown` events. This is a key bandwidth-saving measure.
- If the event is not a repeat, it calls `setLastInput({ key: e.key })` from `useKeyboardStore`.

### b. Client-Side State Management (`src/lib/store/keyboardStore.ts`)

- A Zustand store (`useKeyboardStore`) is used.
- `lastInput: KeyboardInput | null`: Stores the most recent, non-repeated keyboard input from the local user.
- `setLastInput(input)`: Updates `lastInput`.
- `remoteKeys`: Stores a record of the last key events received from other users, indexed by their ID.

### c. Client-Side Event Sender (`src/app/components/Scene3D.tsx`)

- A `useEffect` hook in the `Scene3D` component subscribes to changes in `lastInput` from the `useKeyboardStore`.
- When `lastInput` changes, it triggers a `fetch` POST request to `/api/game-events`.
- The payload is `{ id: myId.current, key: lastInput.key }`, where `myId.current` is a unique client ID (generated via `nanoid`).

### d. Server-Side Receiver & SSE Broadcaster (`src/app/api/game-events/route.ts`)

- **`POST` Handler**:
  - Receives the JSON payload (`{ id, key }`).
  - Validates the payload using a Zod schema (`KeyboardEventSchema`).
  - If valid, it formats the event data as an SSE message (`data: JSON.stringify(event)\\n\\n`).
  - It then iterates through all current subscribers to this SSE stream and sends them the message.
- **`GET` Handler**:
  - Standard SSE setup. Clients connect here to subscribe to game events from other users.
  - Maintains an in-memory array of `subscribers`. Adds a writer on connection, filters it out on cancellation.

## 3. Bandwidth and Cost Optimization Strategies Implemented

- **Camera Data (`/api/events` & `/api/camera`):**
  - **Conditional Publishing**: The client-side `useCameraPublisher` only sends position data to `/api/camera` if the (rounded) position has actually changed, significantly reducing updates for idle or slowly moving cameras.
  - **Server-Side Purging**: The `sseStore` automatically purges camera data for clients that haven't sent an update or ping in a configurable interval (default 4 seconds), preventing stale data broadcasts and keeping the server state lean.
  - **Ping Mechanism**: `setCamera(id)` (without position) updates a timestamp without broadcasting, allowing clients to signal they are still active without sending redundant position data. The `useCameraPublisher` currently relies on new movement to re-establish presence after being purged, but could be extended to send pings.
- **Game Events (`/api/game-events`):**
  - **Ignoring Key Repeats**: The client-side global keyboard listener explicitly ignores `keydown` events where `event.repeat` is true. This drastically cuts down on messages sent when a user holds a key.
- **General SSE Practices:**
  - Data payloads are JSON, which is text-based but generally compact for the structured data being sent.
  - SSE connections are kept alive, but only data changes trigger messages (for camera events) or new inputs (for game events).
  - Upon new subscription to camera events, only the _current_ state of active cameras is sent, not a long history.

These strategies aim to make the real-time features usable for a public application by minimizing unnecessary data transfer, thereby reducing server load and potential bandwidth costs.
