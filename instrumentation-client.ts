// Client-side error tracking (Sentry browser SDK).
//
// Next 16 runs this file on the client only (it is aliased to
// `private-next-instrumentation-client`), so it is safe in a static export
// (`output: 'export'`) - there is no server runtime and nothing here touches
// server APIs. We use the browser SDK and initialise errors-only: NO
// performance tracing, NO session replay, to keep the bundle and cost low.
//
// This is a complete no-op until `NEXT_PUBLIC_SENTRY_DSN` is provided. For a
// static export the value is inlined at build time, so without it Sentry is
// never initialised and the SDK stays dormant.
import * as Sentry from "@sentry/react";

const dsn = process.env["NEXT_PUBLIC_SENTRY_DSN"];

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env["NEXT_PUBLIC_SENTRY_ENVIRONMENT"] ?? process.env.NODE_ENV,
    release: process.env["NEXT_PUBLIC_SENTRY_RELEASE"],
    sendDefaultPii: false,
    // Static client-side app: keep tracing off until usage justifies it.
    tracesSampleRate: 0,
    // Bound error volume: report half of captured errors.
    sampleRate: 0.5,
    // Drop common, actionable-by-nobody browser/extension noise.
    ignoreErrors: [
      /ResizeObserver loop/,
      /Non-Error promise rejection captured/,
      "Network request failed",
      "Failed to fetch",
      "Load failed",
      "AbortError",
      // Browser extensions / injected scripts.
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
    ],
  });
}
