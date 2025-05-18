# Multiplayer Architecture for Planeto

This document outlines the architecture for the real-time multiplayer functionality in Planeto, allowing users to see each other's presence within the 3D solar system.

## Core Technologies

- **Next.js:** Framework for the application, including API Routes and Server Actions.
- **Server-Sent Events (SSE):** Used for unidirectional real-time communication from the server to clients (broadcasting sim state).
- **Next.js Server Actions:** Used for client-to-server communication.
- **Zod:** For schema definition and validation of data structures (positions, celestial body states, etc.).
- **Zustand:** For client-side state management (managing the local sim state).
- **Immer:** Used with Zustand for immutable state updates.
- **React Three Fiber / Drei:** For rendering the 3D scene.

## System Components

### 1. Domain Types (`src/lib/domain/sim.types.ts`)

- Defines the core data structures using Zod schemas:
  - `UserId`: Unique identifiers.
  - `Position`, `Rotation`: 3D coordinates and orientation.
  - `CelestialBodyState`: Complete state of a single celestial body (ID, name, position, rotation, last updated timestamp).
  - `SimState`: Overall state of the sim, primarily a record of all active `CelestialBodyState`s, keyed by `CelestialBodyId`.
  - `ClientToServerEvents`, `ServerToClientEvents`: Schemas/types for messages passed (though SSE is primary for server->client).

### 2. Server-Side Sim State Manager (`src/lib/server/simStateManager.ts`)

- **Purpose:** Maintains the authoritative state of the sim on the server.
- **Implementation:** An in-memory store (currently a simple JavaScript object).
- **Functionality:**
  - `getSimState()`: Returns the current sim state.
  - `subscribeToSimStateChanges(listener: (simState: SimState) => void)`: Allows other server modules (like the SSE route) to listen for changes to the sim state.
- **Notifications:** Uses a simple observer pattern (a set of listener functions) to notify subscribers whenever the sim state is modified.

### 3. SSE API Route (`src/app/api/sim-events/route.ts`)

- **Purpose:** Establishes and manages SSE connections with clients for real-time sim state updates.
- **Endpoint:** `GET /api/sim-events`
- **Functionality:**
  - **Connection Handling:**
    - When a client connects, it authenticates the user (placeholder, needs full NextAuth integration).
    - A `ReadableStream` is created for the client.
    - The client's controller for this stream is stored in a server-side `Map` (`activeStreams`), keyed by `UserId`.
    - An initial `simStateUpdate` is sent to the newly connected client.
    - A `userJoined` event is broadcast to all clients.
  - **Broadcasting Updates:**
    - Subscribes to changes from the `simStateManager`.
    - When the sim state changes, it serializes the new `SimState` (or a diff/event) and sends it as an SSE `message` event to all connected clients (`broadcastToAll`).
    - Event types sent: `simStateUpdate`, `userJoined`, `userLeft`.
  - **Disconnection Handling:**
    - When a client disconnects (stream is canceled), their stream controller is removed from `activeStreams`.
    - A `userLeft` event is broadcast to all remaining clients.
- **Authentication:** Currently uses a `userId` query parameter for testing. **This MUST be replaced with proper session-based authentication using NextAuth.**

### 4. Server Actions (`src/app/actions/simActions.ts`)

- **Purpose:** Allow clients to send commands to the server.

### 5. Client-Side Sim Store (`src/lib/store/simStore.ts`)

- **Purpose:** Manages the client's local copy of the sim state and interacts with the server.
- **Technology:** Zustand with Immer middleware.
- **State:**
  - `simState: SimState`: The local replica of the sim world.
  - `isConnected: boolean`: Status of the SSE connection.
  - `error: string | null`: Any errors from the server or connection.
  - `currentUserId: UserId | null`: The ID of the currently authenticated user.
- **Actions:**
  - `setCurrentUserId(userId: UserId)`: Sets the user ID (typically after login) and can trigger `connect`.
  - `connect(userId: UserId)`: Initializes the `EventSource` connection to `/api/sim-events` (passing `userId` as a query param for now).
    - Handles `onopen`, `onmessage`, and `onerror` for the SSE connection.
    - Parses incoming messages (JSON string) and updates the local `simState` based on event `type` (`simStateUpdate`, `userJoined`, etc.).
  - `disconnect()`: Closes the `EventSource` connection.

### 6. React Components

- **Main Scene Component (e.g., `SolarSystemScene.tsx`):**
  - Retrieves `currentUserId` (e.g., via NextAuth's `useSession`).
  - Calls `setCurrentUserId` on the `useSimStore` to establish the SSE connection.
  - Subscribes to `simState.celestialBodies` from `useSimStore`.
  - Renders celestial bodies in the scene.

## Data Flow

1.  **Client (Input):** User interacts with the UI.
2.  **Client (Scene Component):** Input handler calculates the new state.
3.  **Client (Store Action):** Calls a store action to update state.
4.  **Client (Server Action Call):** Invokes a Server Action.
5.  **Server (Server Action):**
    - Authenticates the user and authorizes the action.
    - Validates the payload.
    - Updates the sim state.
6.  **Server (Sim State Manager):**
    - Updates the state in its in-memory store.
    - Notifies all subscribed listeners (the SSE route handler) about the state change.
7.  **Server (SSE Route):**
    - Receives the updated `SimState` from the `simStateManager`.
    - Serializes the `SimState` to JSON.
    - Broadcasts the JSON payload as an SSE `message` event to all connected clients.
8.  **Client (Store SSE Handler):**
    - The `EventSource` in `useSimStore` receives the message.
    - `onmessage` handler parses the JSON, validates it, and updates the local `simState` in the Zustand store.
9.  **Client (React Components):**
    - Components subscribed to `useSimStore` re-render with the new state.

## Future Considerations & Improvements

- **Authentication:** Fully integrate NextAuth for secure `UserId` retrieval on the server (SSE route and Server Actions) and ownership checks.
- **Database Persistence:** For a more robust system, persist `SimState` to a database (e.g., `better-sqlite3` as mentioned, or another DB) instead of in-memory, especially if sim state needs to survive server restarts.
