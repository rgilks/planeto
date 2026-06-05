import { describe, it, expect } from "vitest";

import { EventSchema, Vec3Schema, VEC3_COORD_BOUND } from "./event";

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

describe("Vec3Schema", () => {
  it("accepts a valid coordinate triple", () => {
    expect(Vec3Schema.safeParse([1.5, -2.5, 3.5]).success).toBe(true);
  });

  it("accepts a normal small value", () => {
    expect(Vec3Schema.safeParse([10, 20, 30]).success).toBe(true);
  });

  it("rejects NaN", () => {
    expect(Vec3Schema.safeParse([NaN, 0, 0]).success).toBe(false);
  });

  it("rejects Infinity", () => {
    expect(Vec3Schema.safeParse([0, Infinity, 0]).success).toBe(false);
    expect(Vec3Schema.safeParse([0, 0, -Infinity]).success).toBe(false);
  });

  it("rejects an out-of-bound value", () => {
    expect(Vec3Schema.safeParse([0, 0, VEC3_COORD_BOUND + 1]).success).toBe(
      false,
    );
    expect(Vec3Schema.safeParse([-VEC3_COORD_BOUND - 1, 0, 0]).success).toBe(
      false,
    );
  });
});
