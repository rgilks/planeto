"use client";

import { useEffect } from "react";

const sendErrorToServer = (error: unknown, type: string) => {
  const errorDetails: {
    type: string;
    message?: string;
    stack?: string;
    name?: string;
    data?: unknown;
  } = { type };

  if (error instanceof Error) {
    errorDetails.message = error.message;
    if (error.stack !== undefined) {
      errorDetails.stack = error.stack;
    }
    errorDetails.name = error.name;
  } else if (typeof error === "string") {
    errorDetails.message = error;
  } else {
    try {
      errorDetails.data = JSON.parse(JSON.stringify(error)); // Best effort to serialize
    } catch {
      errorDetails.data = "Could not serialize error object";
    }
  }

  fetch("/api/log-error", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(errorDetails),
  }).catch(console.warn); // Log if sending the error itself fails
};

const ClientErrorLogger = () => {
  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      originalConsoleError.apply(console, args as any); // Keep 'as any' here as console.error can take various arg types
      sendErrorToServer(args.length === 1 ? args[0] : args, "console.error");
    };

    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      sendErrorToServer(event.reason, "unhandledrejection");
    };

    window.addEventListener("unhandledrejection", unhandledRejectionHandler);

    // Optional: Catch global window errors too
    const globalErrorHandler = (
      message: Event | string,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error,
    ) => {
      sendErrorToServer(
        { message, source, lineno, colno, errorStack: error?.stack },
        "window.onerror",
      );
    };
    window.onerror = globalErrorHandler;

    return () => {
      console.error = originalConsoleError; // Restore original console.error
      window.removeEventListener(
        "unhandledrejection",
        unhandledRejectionHandler,
      );
      window.onerror = null; // Restore original onerror
    };
  }, []);

  return null; // This component does not render anything
};

export default ClientErrorLogger;
