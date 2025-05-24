# API Documentation

This document outlines the API endpoints for the Planeto application.

## Event Handling

All real-time events are handled through a single set of endpoints:

- **`POST /api/events`**: This endpoint is used to send event data to the server. The server will then broadcast these events to all subscribed clients.

  - **Request Body**: The request body should be a JSON object representing the event. The `type` field determines how the event is processed.
    - **Keyboard Event**:
      ```json
      {
        "type": "keyboard",
        "id": "<string>", // Unique identifier for the event source
        "key": "<string>" // The key that was pressed
      }
      ```
    - **Camera Update Event**:
      ```json
      {
        "type": "cameraUpdate",
        "id": "<string>", // Unique identifier for the camera
        "p": [<number>, <number>, <number>], // Position vector [x, y, z]
        "t": <number> // Timestamp of the update
      }
      ```
  - **Responses**:
    - `200 OK`: Event received and broadcast successfully.
    - `400 Bad Request`: Invalid JSON payload or event structure.

- **`GET /api/events`**: This endpoint establishes a Server-Sent Events (SSE) connection. Clients subscribing to this endpoint will receive real-time updates for all broadcast events.
  - **Response Format**: `text/event-stream`
  - **Events**: Events are sent in the format `data: <JSON_EVENT_OBJECT>\n\n`.
