import { EventType, EyeUpdateType, EYE_STALE_MS } from "./event";

// The pure state-transition core behind the EventsChannel Durable Object.
// Keeping it free of the Workers runtime lets it be unit-tested directly
// (worker/eventsChannel.ts is then just the SSE plumbing around these).

const encoder = new TextEncoder();

// One SSE `data:` frame for an event.
export const encodeEventFrame = (event: EventType): Uint8Array =>
  encoder.encode(`data:${JSON.stringify(event)}\n\n`);

// An eye counts as stale once it has not been refreshed within EYE_STALE_MS.
export const isStaleEye = (eye: EyeUpdateType, now: number): boolean =>
  now - eye.t > EYE_STALE_MS;

// Drop stale eyes from the shared state (mutates in place).
export const pruneStaleEyes = (
  eyes: Map<string, EyeUpdateType>,
  now: number,
): void => {
  for (const [id, eye] of eyes) {
    if (isStaleEye(eye, now)) eyes.delete(id);
  }
};

// Apply an inbound event to the shared eye state and return the message to fan
// out. An eyeUpdate is stored with a server-stamped timestamp (the client's `t`
// is not trusted); a symbol is passed through — broadcast only, never stored.
export const applyEvent = (
  eyes: Map<string, EyeUpdateType>,
  event: EventType,
  now: number,
): EventType => {
  if (event.type === "eyeUpdate") {
    const stored: EyeUpdateType = {
      type: "eyeUpdate",
      id: event.id,
      p: event.p,
      t: now,
    };
    eyes.set(event.id, stored);
    return stored;
  }
  return event;
};
