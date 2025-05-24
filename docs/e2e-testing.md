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

Currently, there are two main E2E test suites:

### 1. Basic Functional Tests (`tests/basic.spec.ts`)

This suite focuses on core application functionality related to real-time events and state management. It verifies:

- The application page loads and has the correct title (`/`).
- The client can successfully POST camera data to the `/api/events` endpoint.
- The client-side `EventSource` connection to `/api/events` is established upon page load.
- Initial camera data (posted in the test) is received by the client via the EventSource and correctly updates the Zustand store (`useCamStore`). This is verified by inspecting the store's state exposed on the `window` object during tests (non-production builds only).

### 2. Visual Snapshot Tests (`tests/visual-snapshot.spec.ts`)

This suite is responsible for visual regression testing. It ensures the application's UI remains consistent.

- Navigates to the main page (`/`).
- Waits for a specific duration (currently 3 seconds) to allow animations or initial rendering to complete.
- Takes a full-page screenshot and saves it to `screenshots/loaded.png`. Playwright will compare this against a previously approved snapshot. If differences are detected, the test will fail, prompting a review of the visual changes.
- Verifies that the main `canvas` element (used for the 3D scene) is visible.

## Key Testing Strategies

- **API Interaction**: Tests directly interact with API endpoints (e.g., POSTing to `/api/events`) to set up preconditions or verify backend integration.
- **Client-Side State Verification**: For state managed by Zustand, tests access the store's state (exposed on `window.__camStore` in non-production environments) to confirm that client-side logic and event handling are working as expected.
- **Focus on Core User Experience**: The tests aim to cover critical paths that impact the user's ability to see and interact with the shared environment.
