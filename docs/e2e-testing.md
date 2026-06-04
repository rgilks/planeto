# End-to-End (E2E) Testing

This project uses [Playwright](https://playwright.dev/) for end-to-end testing of the deployed shape of the app.

Because the realtime backend is a Cloudflare Worker + Durable Object, the Playwright `webServer` builds the static export and serves it together with the Worker via `wrangler dev` (the `npm run preview` script). The tests therefore run against the same code path that ships to Cloudflare, not against `next dev`.

## Running Tests

E2E tests are part of the full check:

```sh
npm run check
```

To run only the E2E tests:

```sh
npx playwright test
```

Tests run on Chromium by default; configuration is in `playwright.config.ts`.

## Test Suites

### 1. SSE event fan-out (`tests/basic.spec.ts`)

Exercises the `/api/events` SSE endpoint (backed by the `EventsChannel` Durable Object) directly over the wire — opening an `EventSource` from a page and asserting on the frames it receives — so it is independent of the client app's internal stores:

- **Eye fan-out**: a subscriber connects, an `eyeUpdate` is POSTed, and the subscriber receives it.
- **Symbol fan-out**: a subscriber connects, a `symbol` is POSTed, and the subscriber receives it.
- **Replay on subscribe**: an `eyeUpdate` is POSTed first; a newly connecting subscriber receives the stored eye replayed on connect.

### 2. API robustness (`tests/api.spec.ts`)

Directly tests the `/api/events` POST endpoint:

- Returns `400 Bad Request` for invalid payloads — empty body; missing/invalid `type`; `symbol` missing `id`/`key`; `eyeUpdate` missing `id`/`p`/`t` or with a malformed `p`.
- Returns `200 OK` for valid `symbol` and `eyeUpdate` events.

### 3. Visual snapshot (`tests/visual-snapshot.spec.ts`)

- Navigates to `/`, waits ~3 s for the scene to render, screenshots to `screenshots/loaded.png`, and asserts the `<canvas>` is visible.

## Notes

- **Direct API interaction**: tests POST to `/api/events` with `request.post()` to drive the backend.
- **SSE over the wire**: the fan-out tests read events via a browser `EventSource`, verifying the real Worker → Durable Object → client path without relying on dev-only globals.
