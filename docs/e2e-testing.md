# End-to-End (E2E) Testing Strategy

This document outlines the end-to-end testing strategy for the Planeto project, utilizing Playwright.

## Overview

E2E tests ensure the application behaves as expected from a user's perspective. They simulate real user scenarios by interacting with the application's UI in a browser.

We use Playwright for E2E testing due to its robust features, cross-browser support, and developer-friendly API.

## Configuration

Playwright is configured in `playwright.config.ts`:

- **Reporters**: `html` for manual inspection, `json` for structured output and debugging.
- **`testDir`**: Tests are in the `./tests` directory.
- **`baseURL`**: Set to `http://localhost:3000`.
- **`webServer`**: Playwright launches the dev server before tests run and shuts it down afterwards.

## Writing Tests

Tests are written in TypeScript (`.spec.ts` files) within the `tests` directory. We follow Playwright's best practices:

- Use web-first assertions and auto-waiting.
- Prefer user-visible locators like roles, text, and test IDs.
- Keep tests focused and independent.

## Running Tests

- `npm run test:e2e`: Runs all E2E tests.
- `npm run test:e2e:watch`: Runs E2E tests in watch mode.

## Debugging

- Use the HTML report (`npx playwright show-report`) for visual inspection.
- Use the JSON report for structured debugging.

## Future Enhancements

- Visual regression testing.
- CI integration.
