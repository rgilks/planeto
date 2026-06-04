import { describe, it, expect } from "vitest";

import { EventSchema } from "./event";

describe("EventSchema", () => {
  it("accepts a valid symbol event", () => {
    expect(
      EventSchema.safeParse({ type: "symbol", id: "abc", key: "h" }).success,
    ).toBe(true);
  });

  it("accepts a valid eyeUpdate event", () => {
    expect(
      EventSchema.safeParse({
        type: "eyeUpdate",
        id: "abc",
        p: [1, 2, 3],
        t: 123,
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown event type", () => {
    expect(EventSchema.safeParse({ type: "bogus" }).success).toBe(false);
  });

  it("rejects a symbol event with an empty key", () => {
    expect(
      EventSchema.safeParse({ type: "symbol", id: "abc", key: "" }).success,
    ).toBe(false);
  });

  it("rejects an eyeUpdate with the wrong position length", () => {
    expect(
      EventSchema.safeParse({
        type: "eyeUpdate",
        id: "abc",
        p: [1, 2],
        t: 123,
      }).success,
    ).toBe(false);
  });

  it("rejects an eyeUpdate with a non-numeric position component", () => {
    expect(
      EventSchema.safeParse({
        type: "eyeUpdate",
        id: "abc",
        p: [1, 2, "x"],
        t: 123,
      }).success,
    ).toBe(false);
  });

  it("rejects an eyeUpdate missing the timestamp", () => {
    expect(
      EventSchema.safeParse({
        type: "eyeUpdate",
        id: "abc",
        p: [1, 2, 3],
      }).success,
    ).toBe(false);
  });
});
