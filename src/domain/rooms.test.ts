import { describe, it, expect } from "vitest";

import { pickRoom, ROOM_CAP, MAX_ROOMS } from "./rooms";

describe("pickRoom", () => {
  it("returns room 0 when nothing is occupied", () => {
    expect(pickRoom({})).toBe(0);
  });

  it("keeps filling room 0 until it is full", () => {
    expect(pickRoom({ 0: ROOM_CAP - 1 })).toBe(0);
  });

  it("overflows into the next room when the current one is full", () => {
    expect(pickRoom({ 0: ROOM_CAP })).toBe(1);
    expect(pickRoom({ 0: ROOM_CAP, 1: ROOM_CAP })).toBe(2);
  });

  it("reuses a freed slot in the lowest non-full room first", () => {
    expect(pickRoom({ 0: ROOM_CAP, 1: 5 })).toBe(1);
    expect(pickRoom({ 0: ROOM_CAP - 1, 1: ROOM_CAP })).toBe(0);
  });

  it("respects a custom cap", () => {
    expect(pickRoom({ 0: 2 }, 2)).toBe(1);
  });

  it("returns the last room when every room is full", () => {
    expect(pickRoom({ 0: ROOM_CAP }, ROOM_CAP, 1)).toBe(0);
  });

  it("exposes sane defaults", () => {
    expect(ROOM_CAP).toBeGreaterThan(0);
    expect(MAX_ROOMS).toBeGreaterThan(1);
  });
});
