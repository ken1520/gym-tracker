import { describe, expect, it } from "vitest";

import { moveItem } from "@/domain/reorder";

describe("moveItem", () => {
  const items = ["a", "b", "c", "d"] as const;

  it("moves an item down", () => {
    expect(moveItem(items, 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("moves an item up", () => {
    expect(moveItem(items, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("moves an item to either end", () => {
    expect(moveItem(items, 1, 3)).toEqual(["a", "c", "d", "b"]);
    expect(moveItem(items, 2, 0)).toEqual(["c", "a", "b", "d"]);
  });

  it("returns an unchanged copy for the same or an out-of-range index", () => {
    expect(moveItem(items, 1, 1)).toEqual(items);
    expect(moveItem(items, -1, 2)).toEqual(items);
    expect(moveItem(items, 0, 4)).toEqual(items);
    expect(moveItem(items, 0.5, 2)).toEqual(items);
  });

  it("never mutates the input", () => {
    const original = ["a", "b", "c"];
    const moved = moveItem(original, 0, 2);
    expect(original).toEqual(["a", "b", "c"]);
    expect(moved).not.toBe(original);
  });
});
