import { describe, it, expect } from "vitest";

import {
  areVec3sEqual,
  blendColor,
  roundVec3,
  seededRandom,
  VEC3_EPSILON,
} from "./utils";

describe("roundVec3", () => {
  it("rounds each component to two decimal places", () => {
    expect(roundVec3([1.234, 5.678, 9.001])).toEqual([1.23, 5.68, 9]);
  });

  it("leaves already-rounded values unchanged", () => {
    expect(roundVec3([0, -2.5, 3.14])).toEqual([0, -2.5, 3.14]);
  });
});

describe("areVec3sEqual", () => {
  it("treats vectors within VEC3_EPSILON as equal", () => {
    expect(areVec3sEqual([1, 2, 3], [1, 2, 3 + VEC3_EPSILON / 2])).toBe(true);
  });

  it("treats vectors differing by more than VEC3_EPSILON as not equal", () => {
    expect(areVec3sEqual([1, 2, 3], [1, 2, 3.01])).toBe(false);
  });

  it("returns false when the first vector is undefined", () => {
    expect(areVec3sEqual(undefined, [1, 2, 3])).toBe(false);
  });

  it("treats NaN components in the same slot as equal", () => {
    expect(areVec3sEqual([NaN, 2, 3], [NaN, 2, 3])).toBe(true);
  });

  it("treats NaN versus a number as not equal", () => {
    expect(areVec3sEqual([NaN, 2, 3], [1, 2, 3])).toBe(false);
  });
});

describe("seededRandom", () => {
  it("is deterministic for a given seed", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("produces values in the [0, 1) range", () => {
    const next = seededRandom(7);
    for (let i = 0; i < 100; i++) {
      const v = next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("produces different sequences for different seeds", () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });
});

describe("blendColor", () => {
  it("returns the source colour when blending a colour with itself", () => {
    expect(blendColor("black", "black", 0.5)).toBe("rgb(0,0,0)");
    expect(blendColor("white", "white", 0.3)).toBe("rgb(255,255,255)");
  });

  it("returns an rgb() string", () => {
    expect(blendColor("red", "blue", 0.5)).toMatch(/^rgb\(/);
  });
});
