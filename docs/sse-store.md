# SSE Store (`src/stores/sseStore.ts`)

The `sseStore.ts` module is responsible for managing Server-Sent Events (SSE) connections and broadcasting events to connected clients. It plays a crucial role in the real-time communication features of Planeto, such as synchronizing camera positions and keyboard events.

## Key Responsibilities

- **Subscriber Management**: Maintains a list of active SSE subscribers (client connections).
- **Event Broadcasting**: Sends event data to all subscribed clients.
- **Camera State Management**: Stores the latest camera position for each connected user.
- **State Purging**: Periodically removes stale camera data to keep the state fresh and reduce memory usage.

## Core Functions

- `setCamera(id: string, p: Vec3)`: Updates the camera position for a given user ID and broadcasts this update to all subscribers.
- `broadcast(msg: EventType)`: Sends a generic event message to all subscribers. This is used for events like keyboard inputs.
- `subscribe(writer: Writer)`: Adds a new subscriber (client connection) to the list. It also sends the current state of all cameras to the new subscriber.
- `unsubscribe(writer: Writer)`: Removes a subscriber from the list, typically when a client disconnects.
- `purgeStale(maxAge?: number)`: Removes camera data for users whose information hasn't been updated within the `maxAge` (default 30 seconds). This is called automatically at a regular interval.

## Data Structures

- `cameras`: A `Map` storing the last known `CameraUpdateType` for each user ID.
- `subs`: A `Set` storing `Writer` objects, where each `Writer` represents an active SSE connection to a client. The `Writer` object has:
  - `write: (data: string) => void`: A function to send data to the client.
  - `closed: boolean`: A flag indicating if the connection is closed.

## Error Handling

The `broadcast` and `subscribe` functions include `try...catch` blocks to handle potential errors when writing to a subscriber. If an error occurs (e.g., the client has disconnected abruptly), the problematic subscriber is removed from the `subs` set to prevent further failed attempts.

## Automatic Purging

An interval timer is set up within the module to call `purgeStale` every 10 seconds. This ensures that camera data for users who have been inactive or disconnected for more than 30 seconds is automatically cleaned up. This helps in maintaining an accurate representation of active users and conserves server resources.

## Integration

The `sseStore` is primarily used by the API route `src/app/api/events/route.ts`:

- The `GET` handler in the route uses `subscribe` and `unsubscribe` to manage client connections for the SSE stream.
- The `POST` handler uses `setCamera` (for camera updates) and `broadcast` (for other events like keyboard inputs) to push data to connected clients via the store.
