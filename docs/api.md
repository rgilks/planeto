# API Documentation

This document outlines the API endpoints for the Planeto application.

## Event Handling

All real-time events are handled through a single set of endpoints:

- **`POST /api/events`**: This endpoint is used to send event data to the server.

  - For `eyeUpdate` events, the server updates its internal state for the given eye ID and then broadcasts the event to subscribed clients.
  - For `symbol` events, the server directly broadcasts the event to subscribed clients.

  - **Request Body**: The request body should be a JSON object representing the event, adhering to one of the schemas below. The `type` field determines how the event is processed.
    - **Symbol Event**:
      ```json
      {
        "type": "symbol",
        "id": "<string>", // Unique identifier for the event source (e.g., client ID)
        "key": "<string>" // The key that was pressed
      }
      ```
    - **Eye Update Event**:
      ```json
      {
        "type": "eyeUpdate",
        "id": "<string>", // Unique identifier for the eye
        "p": [<number>, <number>, <number>], // Position vector [x, y, z]
        "t": <number> // Timestamp of the update (milliseconds since epoch)
      }
      ```
  - **Responses**:
    - `200 OK` with body `{"ok": true}`: Event received and processed successfully.
    - `400 Bad Request`: Invalid JSON payload or event structure. The response body may contain `{ "error": "...", "details": { ... } }` with more information.

- **`GET /api/events`**: This endpoint establishes a Server-Sent Events (SSE) connection. Clients subscribing to this endpoint will receive real-time updates for events broadcast by the server.
  - **Response Format**: `text/event-stream`
  - **Events**: Events are sent in the format `data: <JSON_EVENT_OBJECT>\n\n`. The `<JSON_EVENT_OBJECT>` will be one of the following types (as defined in the `POST /api/events` section):
    - Symbol Event
    - Eye Update Event
