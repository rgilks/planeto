# End-to-End (E2E) Testing

This project uses [Playwright](https://playwright.dev/) for end-to-end testing to ensure key user flows and functionalities are working correctly in a browser environment.

## Running Tests

E2E tests are part of the comprehensive check script:

```sh
npm run check
```

To run only the E2E tests:

```sh
npx playwright test
```

Tests are executed using Chromium by default. Configuration can be found in `playwright.config.ts`.

## Test Suites

Currently, there are three main E2E test suites:

### 1. Basic Functional and Multi-User Tests (`tests/basic.spec.ts`)

This suite focuses on core application functionality related to real-time events and state management, including multi-user scenarios:

- **Single User Test**:
  - Verifies the application page loads and has the correct title (`/`).
  - Checks that a client can successfully POST camera data to the `/api/events` endpoint.
  - Ensures the client-side `EventSource` connection to `/api/events` is established upon page load.
  - Confirms that initial camera data (posted in the test) is received by the client via the EventSource and correctly updates the Zustand store (`useCamStore`).
- **Multi-User Camera Synchronization**:
  - Simulates two users (two browser pages).
  - User1 posts a camera update via API call.
  - User2 verifies it receives this camera update in its `useCamStore`.
- **Multi-User Keyboard Synchronization (API-driven)**:
  - Simulates two users.
  - User1 posts a keyboard event via API call.
  - User2 verifies it receives this keyboard event in its `useKeyboardStore`.
- **Multi-User Keyboard Synchronization (Full Client-Side Flow)**:
  - Simulates two users.
  - User1 simulates a physical key press on its page.
  - User2 verifies it receives the corresponding keyboard event in its `useKeyboardStore`, testing the full client-to-client pathway.

### 2. API Robustness Tests (`tests/api.spec.ts`)

This suite directly tests the `/api/events` POST endpoint for resilience against malformed or incomplete data:

- Verifies that the API returns a `400 Bad Request` status for various invalid payloads, such as:
  - Empty payload.
  - Missing or invalid `type` field.
  - For `keyboard` events: missing `id` or `key`.
  - For `cameraUpdate` events: missing `id`, `p`, `t`, or `p` having an incorrect structure (e.g., not an array, wrong number of elements, non-numeric elements).
- Confirms that the API returns a `200 OK` status for valid keyboard and camera update events.

### 3. Visual Snapshot Tests (`tests/visual-snapshot.spec.ts`)

This suite is responsible for visual regression testing. It ensures the application's UI remains consistent.

- Navigates to the main page (`/`).
- Waits for a specific duration (3 seconds) to allow animations or initial rendering to complete.
- Takes a full-page screenshot and saves it to `screenshots/loaded.png`. This allows for manual or external comparison for visual consistency.
- Verifies that the main `canvas` element (used for the 3D scene) is visible.

Note: For automated visual regression testing where Playwright compares the screenshot against a previously approved baseline image and fails the test on pixel differences, one would typically use an assertion like `await expect(page).toHaveScreenshot('loaded.png');`. The current test provides the screenshot for review.

## Key Testing Strategies

- **Multi-Page Simulation**: For multi-user tests, Playwright's ability to create multiple browser contexts and pages is used to simulate distinct client instances.
- **Direct API Interaction**: Some tests directly interact with API endpoints (e.g., POSTing to `/api/events`) using `request.post()` to set up preconditions or verify backend responses and validation logic.
- **Full Client-Side Event Simulation**: Tests simulate actual user interactions like keyboard presses (`page.keyboard.press()`) to verify the entire event pipeline from client input to server broadcast and reception by other clients.
- **Client-Side State Verification**: For state managed by Zustand, tests access the store's state (exposed on `window.__camStore` and `window.__keyboardStore` in non-production environments) to confirm that client-side logic and event handling are working as expected.
- **Polling Helper**: A custom `pollForCondition` function is used to gracefully wait for asynchronous operations (like SSE message reception and state updates) to complete before making assertions.
- **Focus on Core User Experience and Robustness**: The tests aim to cover critical paths that impact the user's ability to see and interact with the shared environment, as well as the API's ability to handle invalid data gracefully.
