import { describe, it, expect } from "vitest";

import { EYE_STALE_MS, type EyeUpdateType } from "./event";
import {
  applyEvent,
  encodeEventFrame,
  isStaleEye,
  pruneStaleEyes,
} from "./eventsCore";

const eye = (id: string, t: number): EyeUpdateType => ({
  type: "eyeUpdate",
  id,
  p: [0, 0, 0],
  t,
});

describe("isStaleEye", () => {
  it("is true once older than EYE_STALE_MS, false within it", () => {
    const now = 1_000_000;
    expect(isStaleEye(eye("a", now - EYE_STALE_MS - 1), now)).toBe(true);
    expect(isStaleEye(eye("a", now - EYE_STALE_MS + 1), now)).toBe(false);
  });
});

describe("pruneStaleEyes", () => {
  it("removes only the stale eyes", () => {
    const now = 1_000_000;
    const eyes = new Map<string, EyeUpdateType>([
      ["fresh", eye("fresh", now)],
      ["stale", eye("stale", now - EYE_STALE_MS - 1)],
    ]);
    pruneStaleEyes(eyes, now);
    expect([...eyes.keys()]).toEqual(["fresh"]);
  });
});

describe("applyEvent", () => {
  it("stores an eyeUpdate with a server-stamped t and returns it", () => {
    const eyes = new Map<string, EyeUpdateType>();
    const now = 5_000;
    const out = applyEvent(
      eyes,
      { type: "eyeUpdate", id: "x", p: [1, 2, 3], t: 1 },
      now,
    );
    // the client's t (1) is ignored in favour of `now`
    expect(out).toEqual({ type: "eyeUpdate", id: "x", p: [1, 2, 3], t: now });
    expect(eyes.get("x")?.t).toBe(now);
  });

  it("passes a symbol through without storing it", () => {
    const eyes = new Map<string, EyeUpdateType>();
    const symbol = { type: "symbol", id: "x", key: "h" } as const;
    expect(applyEvent(eyes, symbol, 5_000)).toBe(symbol);
    expect(eyes.size).toBe(0);
  });
});

describe("encodeEventFrame", () => {
  it("encodes an SSE data frame", () => {
    const frame = new TextDecoder().decode(
      encodeEventFrame({ type: "symbol", id: "x", key: "h" }),
    );
    expect(frame).toBe('data:{"type":"symbol","id":"x","key":"h"}\n\n');
  });
});
