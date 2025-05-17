# End-to-End (E2E) Testing Strategy

This document outlines the end-to-end testing strategy for the Planeto project, utilizing Playwright.

## Overview

E2E tests are crucial for ensuring that the application behaves as expected from a user's perspective. They simulate real user scenarios by interacting with the application's UI in a browser.

We use Playwright for our E2E testing needs due to its robust features, cross-browser support, and developer-friendly API.

## Configuration

Playwright is configured in `playwright.config.ts`. Key aspects of the configuration include:

- **Reporters**: We use two main reporters:
  - `html`: Generates an HTML report (viewable with `npx playwright show-report`) for easy manual inspection of test runs. This report includes traces, screenshots, and videos for failed tests.
  - `json`: Generates a `playwright-report/report.json` file. This structured JSON output is vital for enabling AI-assisted debugging. It allows automated tools and AI assistants to parse test results, understand failures, and suggest or apply fixes.
- **`testDir`**: Tests are located in the `./tests` directory.
- **`baseURL`**: Set to `http://localhost:3000`, which is the default development server URL.
- **`webServer`**: Playwright is configured to automatically launch the development server (`npm run dev`) before tests run and shut it down afterwards. This ensures tests are always run against the latest code.

## Writing Tests

Tests are written in TypeScript (`.spec.ts` files) within the `tests` directory. We follow Playwright's best practices for writing reliable and maintainable tests, including:

- Using web-first assertions and auto-waiting mechanisms.
- Preferring user-visible locators like roles, text, and test IDs.
- Keeping tests focused and independent.

## Running Tests

Test execution is managed via npm scripts defined in `package.json`:

- `npm run test:e2e`: Runs all E2E tests. This is suitable for CI environments or one-off checks.
- `npm run test:e2e:watch`: Runs E2E tests in watch mode. Playwright will re-run tests automatically when test files or application code changes. This is highly beneficial during development.

## AI-Assisted Debugging and Self-Healing Tests

The primary goal of this E2E setup, particularly the JSON reporter, is to facilitate AI-assisted debugging. Here's how it works:

1.  **Monitored Terminals**: When running `npm run test:e2e:watch` in a monitored terminal within an AI-assisted development environment (like Cursor), the AI can observe test failures in real-time.
2.  **JSON Report Analysis**: If tests fail, the AI can be instructed to read and analyze the `playwright-report/report.json` file. This file provides detailed, structured information about:
    - Which tests failed.
    - The specific error messages and stack traces.
    - (Potentially) Diffs for visual regressions or assertion failures.
3.  **Automated Fixes**: Based on the analysis, the AI can:
    - Suggest code changes to fix the failing tests or the underlying application code.
    - Automatically apply these patches.
4.  **Iterative Loop**: The AI can then re-run the tests (or rely on watch mode) to verify the fix. This creates a loop: Test -> Fail -> Analyze -> Patch -> Re-test, aiming for "self-healing" tests and a more efficient development workflow.

## Future Enhancements

- **Model Context Protocol (MCP)**: As mentioned in the initial setup, an MCP server could be implemented to feed structured test data directly into the AI's context for even tighter integration and automation.
- **Visual Regression Testing**: Implement visual regression tests to catch unintended UI changes.
- **CI Integration**: Integrate E2E tests into a CI/CD pipeline to ensure no regressions are introduced.

By following this strategy, we aim to build a robust and reliable application, with an E2E testing process that is both effective and efficient, leveraging AI to accelerate debugging and fixing.
