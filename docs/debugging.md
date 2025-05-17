# Enhanced Debugging with Client-Side Error Logging

To improve the ability of AI assistants and developers to diagnose issues occurring in the browser, this project implements a mechanism to capture client-side errors and log them to the server-side console (stdout).

## How it Works

1.  **Client-Side Capture (`src/components/ClientErrorLogger.tsx`):**

    - A React component (`ClientErrorLogger`) is rendered at a high level in the application.
    - This component uses a `useEffect` hook to:
      - Override the global `console.error()` function. Any calls to `console.error()` in the browser will still execute the original function (so errors appear in the browser console as usual) but will also send the error details to a server-side API endpoint.
      - Add an event listener for `unhandledrejection` events (for unhandled promise rejections).
      - Assign a handler to `window.onerror` for other uncaught JavaScript errors.
    - When an error is captured, it serializes the error information (message, stack, type) and sends it via a `POST` request to `/api/log-error`.

2.  **Server-Side Logging (`src/app/api/log-error/route.ts`):**
    - A Next.js API route handles `POST` requests to `/api/log-error`.
    - It receives the JSON payload containing the error details from the client.
    - It then prints this information to the server's standard output (`stdout`) using `console.error("[CLIENT-SIDE ERROR]:", ...)`.

## Benefits for AI-Assisted Development

When the development server (`npm run dev`) is run in a monitored terminal (e.g., within Cursor or a similar AI-assisted environment), any client-side errors captured by this mechanism will appear directly in the terminal output that the AI assistant can see.

This allows the AI to:

- Get immediate visibility into errors that would otherwise only be visible in the browser's developer console.
- Diagnose issues related to client-side rendering, shader compilation failures (which often log to `console.error`), or other runtime JavaScript problems more effectively.
- Propose fixes based on the actual error messages from the browser.

## Usage

The `ClientErrorLogger` component is included in `src/app/page.tsx` and is active by default during development.

## Security Considerations

- **Local Development Focus:** This setup is primarily intended for local development. The `/api/log-error` endpoint is open and does not implement authentication or rate limiting. In a production environment, such an endpoint would need to be secured or removed.
- **Data Scrubbing:** Error messages or stack traces might occasionally contain sensitive information. While primarily a local tool, be mindful if logs are ever shared. The original document on AI-assisted debugging also advises scrubbing secrets from any data streamed to model vendors; this principle applies if these logs were to be shared externally.
