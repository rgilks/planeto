import { describe, it, expect } from "vitest";

import { SYMBOLS, SymbolInputSchema } from "./symbol";

describe("SYMBOLS", () => {
  it("contains no duplicate glyphs", () => {
    expect(new Set(SYMBOLS).size).toBe(SYMBOLS.length);
  });

  it("is a non-empty list of single-character glyphs", () => {
    expect(SYMBOLS.length).toBeGreaterThan(0);
    for (const glyph of SYMBOLS) {
      expect(Array.from(glyph).length).toBe(1);
    }
  });
});

describe("SymbolInputSchema", () => {
  it("accepts a non-empty key", () => {
    expect(SymbolInputSchema.safeParse({ key: "x" }).success).toBe(true);
  });

  it("rejects an empty key", () => {
    expect(SymbolInputSchema.safeParse({ key: "" }).success).toBe(false);
  });
});
