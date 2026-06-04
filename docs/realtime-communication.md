# Real-Time Communication in Planeto

This document outlines Planeto's real-time communication architecture, designed to share eye positions and symbol inputs between clients. It leverages Server-Sent Events (SSE) for server-to-client updates and HTTP POST requests for client-to-server data transmission, all consolidated through a single API endpoint (`/api/events`).

## Core Architecture

- **Single API Endpoint (`/api/events`)**:
  - **`POST /api/events`**: Clients send `EyeUpdateEvent` or `SymbolEvent` data to this endpoint.
  - **`GET /api/events`**: Clients establish an SSE connection via `useEventSource` to receive real-time events broadcast by the server.
- **Server-Side Logic (`src/app/api/events/sseStore.ts`)**: (Or a similar module within `src/app/api/events/`)
  - Manages a map of current eye positions.
  - Maintains a set of active SSE subscribers.
  - Broadcasts received and processed events to all subscribers.
  - Periodically purges stale eye data.
- **Event Schemas (`src/domain/index.ts`)**: Zod schemas define the structure for `EyeUpdateEvent`, `SymbolEvent`, and other domain types.

## Event Flows

### 1. Eye Position Sharing

**Goal**: Allow clients to see other users' eye movements.

**Client-Side Publishing (`src/hooks/useEyePositionReporting.ts`)**:

- The `useEyePositionReporting` hook captures the local camera's position from `three.js` (via `useThree` in `CanvasContent`).
- **Sending Data**:
  - An initial eye position might be sent on setup.
  - Periodically (throttled, e.g., every 500ms as in the hook):
    - If the camera position has changed significantly, the new position is sent.
  - Data is transmitted as an `EyeUpdateEvent` to `POST /api/events` using `fetch`.

**Server-Side Handling (`src/app/api/events/route.ts` & `src/app/api/events/sseStore.ts`)**:

- The `POST` handler validates the `EyeUpdateEvent`.
- The server-side store (e.g., `sseStore.ts`) updates the eye's position and timestamp.
- The store then broadcasts the `EyeUpdateEvent` to all connected SSE clients.

**Client-Side Receiving (`src/hooks/useEventSource.ts` & `src/stores/useCamStore.ts`)**:

- The `useEventSource` hook (used in `Scene.tsx`) establishes an SSE connection to `GET /api/events`.
- It listens for `EyeUpdateEvent` messages.
- Received eye data updates a Zustand store (e.g., `useCamStore.ts` or potentially `useSymbolStore.ts` if consolidated), making remote eye positions available to the UI (e.g., for rendering remote user representations in `Eyes.tsx`).
- Stale eye data might be handled by the server-side purging or client-side logic.

### 2. Symbol Event Sharing

**Goal**: Allow clients to react to symbol inputs from other users.

**Client-Side Input & Publishing (`src/app/components/Scene.tsx` & `src/stores/symbolStore.ts`)**:

- User interactions (e.g., a double-click in `Scene.tsx`) trigger an update to `lastInput` in `useSymbolStore` (Zustand).
- An effect or handler observes `lastInput`. When it changes:
  - A `SymbolEvent` payload (including a unique client `id` and the `key`) is created.
  - This payload is sent via `fetch` to `POST /api/events` (throttled by `useInputThrottle`).

**Server-Side Handling (`src/app/api/events/route.ts` & `src/app/api/events/sseStore.ts`)**:

- The `POST` handler validates the `SymbolEvent`.
- The server-side store (e.g., `sseStore.ts`) immediately broadcasts the `SymbolEvent` to all connected SSE clients.

**Client-Side Receiving (`src/hooks/useEventSource.ts` & `src/stores/symbolStore.ts`)**:

- The same SSE connection managed by `useEventSource` also receives `SymbolEvent` messages.
- If the event `id` does not match the local client's `id`, `setRemoteKey` (or a similar action) is called in `useSymbolStore` to store the remote key press.
- UI components like `Eyes.tsx` can then react to changes in `useSymbolStore` to display symbols for remote users.

## Bandwidth and Latency Considerations

The "real-time" nature of this system is subject to various factors affecting latency. It's important to note that certain delays are an **accepted consequence of design choices aimed at minimizing hosting costs and bandwidth usage**.

- **Network Conditions**: User's internet speed, ping to the server.
- **Server Load & Processing**: A Cloudflare Worker serves the static app, and a single `EventsChannel` Durable Object handles the SSE connections and fan-out.
- **Client-Side Throttling/Polling**:
  - Eye updates are throttled by `useEyePositionReporting` (e.g., 500ms).
  - Symbol event submissions are throttled by `useInputThrottle` (e.g., 100ms).
- **SSE Connection Stability**: Frequent SSE disconnects/reconnects would delay message delivery.
- **Client-Side Rendering**: Time taken for clients to process incoming SSE messages and update their UI.

**Understanding Observed Delays in Context of Design**: If delays are observed, it's crucial to view them through the lens of these optimization strategies. The system is not designed for ultra-low latency for all event types due to these explicit choices.

Alternative technologies like WebSockets might be considered for applications requiring minimal latency above all else.

## Key Files Summary

- **API Route**: `src/app/api/events/route.ts`
- **Server State/SSE Logic**: `src/app/api/events/sseStore.ts` (or similar within the API directory)
- **Event Definitions**: `src/domain/index.ts`
- **Eye Publishing (Client)**: `src/hooks/useEyePositionReporting.ts`
- **Symbol Input Throttling (Client)**: `src/hooks/useInputThrottle.ts`
- **SSE Event Handling (Client)**: `src/hooks/useEventSource.ts`
- **Client State Management**: `src/stores/symbolStore.ts`, `src/stores/useCamStore.ts` (verify `useCamStore` usage)
