# Multiplayer Architecture for Planeto

This document outlines the architecture for the real-time multiplayer functionality in Planeto, allowing users to control spaceships and see each other's movements within the 3D solar system.

## Core Technologies

- **Next.js:** Framework for the application, including API Routes and Server Actions.
- **Server-Sent Events (SSE):** Used for unidirectional real-time communication from the server to clients (broadcasting game state).
- **Next.js Server Actions:** Used for client-to-server communication (sending spaceship movement commands).
- **Zod:** For schema definition and validation of data structures (positions, spaceship states, etc.).
- **Zustand:** For client-side state management (managing the local game state).
- **Immer:** Used with Zustand for immutable state updates.
- **React Three Fiber / Drei:** For rendering the 3D scene and spaceships.

## System Components

### 1. Domain Types (`src/lib/domain/game.types.ts`)

- Defines the core data structures using Zod schemas:
  - `UserId`, `SpaceshipId`: Unique identifiers.
  - `Position`, `Rotation`: 3D coordinates and orientation.
  - `SpaceshipState`: Complete state of a single spaceship (ID, owner, position, rotation, last updated timestamp).
  - `GameState`: Overall state of the game, primarily a record of all active `SpaceshipState`s, keyed by `SpaceshipId`.
  - `ClientToServerEvents`, `ServerToClientEvents`: Schemas/types for messages passed (though SSE is primary for server->client).

### 2. Server-Side Game State Manager (`src/lib/server/gameStateManager.ts`)

- **Purpose:** Maintains the authoritative state of the game on the server.
- **Implementation:** An in-memory store (currently a simple JavaScript object).
- **Functionality:**
  - `getGameState()`: Returns the current game state.
  - `addPlayerSpaceship(userId: UserId)`: Creates a new spaceship for a user, adds it to the state, and returns the new spaceship state.
  - `removePlayerSpaceship(userId: UserId)`: Removes a user's spaceship from the state.
  - `updateSpaceship(spaceshipId: SpaceshipId, newPosition: Position, newRotation: Rotation, userId?: UserId)`: Updates the position and rotation of a specific spaceship. Can optionally check for ownership if `userId` is provided.
  - `subscribeToGameStateChanges(listener: (gameState: GameState) => void)`: Allows other server modules (like the SSE route) to listen for changes to the game state.
- **Notifications:** Uses a simple observer pattern (a set of listener functions) to notify subscribers whenever the game state is modified.

### 3. SSE API Route (`src/app/api/game-events/route.ts`)

- **Purpose:** Establishes and manages SSE connections with clients for real-time game state updates.
- **Endpoint:** `GET /api/game-events`
- **Functionality:**
  - **Connection Handling:**
    - When a client connects, it authenticates the user (placeholder, needs full NextAuth integration).
    - A `ReadableStream` is created for the client.
    - The client's controller for this stream is stored in a server-side `Map` (`activeStreams`), keyed by `UserId`.
    - The `addPlayerSpaceship` function from `gameStateManager` is called to create/register the user's spaceship.
    - An initial `gameStateUpdate` is sent to the newly connected client.
    - A `userJoined` event (containing the new spaceship) is broadcast to all clients.
  - **Broadcasting Updates:**
    - Subscribes to changes from the `gameStateManager`.
    - When the game state changes, it serializes the new `GameState` (or a diff/event) and sends it as an SSE `message` event to all connected clients (`broadcastToAll`).
    - Event types sent: `gameStateUpdate`, `userJoined`, `userLeft`.
  - **Disconnection Handling:**
    - When a client disconnects (stream is canceled), their stream controller is removed from `activeStreams`.
    - `removePlayerSpaceship` is called.
    - A `userLeft` event is broadcast to all remaining clients.
- **Authentication:** Currently uses a `userId` query parameter for testing. **This MUST be replaced with proper session-based authentication using NextAuth.**

### 4. Server Actions (`src/app/actions/gameActions.ts`)

- **Purpose:** Allow clients to send commands to the server, specifically to move their spaceship.
- **Action:** `moveSpaceship(formData: FormData)`
  - **Input:** `FormData` containing `spaceshipId`, `userId` (for auth, currently from form, should be from session), `position: {x,y,z}`, and `rotation: {x,y,z}`.
  - **Authentication/Authorization:** (Placeholder) It should retrieve the authenticated `UserId` from the server session. It should then verify that this `UserId` owns the `SpaceshipId` they are trying to move (by looking up the owner in the current game state).
  - **Validation:** Uses Zod schemas to validate the input payload.
  - **State Update:** Calls `updateSpaceship` in the `gameStateManager` with the validated new position and rotation for the specified `spaceshipId`.
  - **Response:** Returns an object indicating success or failure, and potentially the updated spaceship state or error messages.

### 5. Client-Side Game Store (`src/lib/store/gameStore.ts`)

- **Purpose:** Manages the client's local copy of the game state and interacts with the server.
- **Technology:** Zustand with Immer middleware.
- **State:**
  - `gameState: GameState`: The local replica of the game world.
  - `isConnected: boolean`: Status of the SSE connection.
  - `error: string | null`: Any errors from the server or connection.
  - `currentUserId: UserId | null`: The ID of the currently authenticated user.
  - `currentSpaceshipId: SpaceshipId | null`: The ID of the spaceship controlled by `currentUserId`.
- **Actions:**
  - `setCurrentUserId(userId: UserId)`: Sets the user ID (typically after login) and can trigger `connect`.
  - `connect(userId: UserId)`: Initializes the `EventSource` connection to `/api/game-events` (passing `userId` as a query param for now).
    - Handles `onopen`, `onmessage`, and `onerror` for the SSE connection.
    - Parses incoming messages (JSON string) and updates the local `gameState` based on event `type` (`gameStateUpdate`, `userJoined`, etc.).
    - Identifies and stores `currentSpaceshipId` when the user's spaceship data is received.
  - `disconnect()`: Closes the `EventSource` connection.
  - `moveMySpaceship(position: Position, rotation: Rotation)`:
    - Constructs `FormData` with the current user's `spaceshipId`, `userId`, and new `position`/`rotation`.
    - Calls the `moveSpaceship` Server Action.
    - Handles success/error responses from the action.
    - (Optional: Could implement optimistic updates here).

### 6. React Components

- **`Spaceship.tsx` (`src/components/Spaceship.tsx`):**

  - A `react-three-fiber` component representing a single spaceship.
  - Props: `id`, `initialPosition`, `initialRotation`, `color`, `isCurrentUser`.
  - Renders a 3D model (e.g., a `Box`).
  - Its position and rotation are updated based on props derived from the `useGameStore`.

- **Main Scene Component (e.g., `SolarSystemScene.tsx`):**
  - Retrieves `currentUserId` (e.g., via NextAuth's `useSession`).
  - Calls `setCurrentUserId` on the `useGameStore` to establish the SSE connection.
  - Subscribes to `gameState.spaceships` from `useGameStore`.
  - Renders a `<Spaceship />` component for each spaceship in the `gameState`.
  - Implements input handling (e.g., keyboard controls) to calculate new position/rotation for the current user's spaceship.
  - Calls `moveMySpaceship` action from `useGameStore` to send updates to the server.

## Data Flow (Spaceship Movement)

1.  **Client (Input):** User presses a key to move their spaceship.
2.  **Client (Scene Component):** Input handler calculates the new `Position` and `Rotation`.
3.  **Client (Store Action):** Calls `useGameStore.getState().moveMySpaceship(newPosition, newRotation)`.
4.  **Client (Store Internals):** The `moveMySpaceship` action prepares `FormData` (including `spaceshipId` and `userId`).
5.  **Client (Server Action Call):** Invokes the `moveSpaceship` Server Action.
6.  **Server (Server Action):**
    - Authenticates the user and authorizes the action (ensures they own the spaceship).
    - Validates the payload.
    - Calls `gameStateManager.updateSpaceship()`.
7.  **Server (Game State Manager):**
    - Updates the `SpaceshipState` in its in-memory store.
    - Notifies all subscribed listeners (the SSE route handler) about the state change.
8.  **Server (SSE Route):**
    - Receives the updated `GameState` from the `gameStateManager`.
    - Serializes the `GameState` to JSON.
    - Broadcasts the JSON payload as an SSE `message` event to all connected clients.
9.  **Client (Store SSE Handler):**
    - The `EventSource` in `useGameStore` receives the message.
    - `onmessage` handler parses the JSON, validates it, and updates the local `gameState` in the Zustand store.
10. **Client (React Components):**
    - Components subscribed to `useGameStore` (like `SolarSystemScene` and individual `Spaceship` components) re-render with the new state, showing the spaceship move.

## Future Considerations & Improvements

- **Authentication:** Fully integrate NextAuth for secure `UserId` retrieval on the server (SSE route and Server Actions) and ownership checks.
- **Database Persistence:** For a more robust system, persist `GameState` to a database (e.g., `better-sqlite3` as mentioned, or another DB) instead of in-memory, especially if game state needs to survive server restarts.
- **Scalability:** The current in-memory approach with a single server instance will have limitations for a large number of users. Consider solutions like Redis for distributed state/messaging if scaling becomes necessary.
- **Optimistic Updates:** Implement optimistic updates on the client for smoother perceived movement.
- **Server-Side Physics/Validation:** For more complex games, perform physics calculations and more rigorous validation on the server to prevent cheating.
- **Delta Compression/Event-Specific Updates:** Instead of sending the entire `GameState` on every update, send only the changes (deltas) or more specific events (e.g., `spaceshipMoved` with only that spaceship's new state) to reduce bandwidth.
- **Error Handling & Resilience:** Enhance error handling on both client and server, and add resilience to network interruptions.
- **Interpolation/Extrapolation:** Client-side techniques to smooth out movement between infrequent updates.
- **Testing:** Add comprehensive tests for all parts of the system.
