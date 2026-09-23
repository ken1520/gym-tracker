import { describe, expect, it } from "vitest";

import { LIMITS } from "@/domain/constants";
import { nextTarget } from "@/domain/overload";
import type { WorkoutSet } from "@/domain/types";

const set = (weightKg: number, reps: number): WorkoutSet => ({
  weightKg,
  reps,
  isWarmup: false,
});

describe("nextTarget", () => {
  it("keeps the reps of the best set and adds load", () => {
    expect(nextTarget(set(100, 5), "barbell")).toEqual({ weightKg: 102.5, reps: 5 });
  });

  it("keeps the reps whatever the rep scheme", () => {
    expect(nextTarget(set(40, 15), "dumbbell").reps).toBe(15);
    expect(nextTarget(set(180, 1), "barbell").reps).toBe(1);
  });

  it("rounds the jump up to a notch the equipment actually has", () => {
    // 2.5% of 100 is 2.5, which a 5 kg machine stack cannot do
    expect(nextTarget(set(100, 8), "machine").weightKg).toBe(105);
    expect(nextTarget(set(40, 8), "dumbbell").weightKg).toBe(42);
    expect(nextTarget(set(24, 8), "kettlebell").weightKg).toBe(28);
  });

  it("scales the jump with the load rather than adding a fixed amount", () => {
    expect(nextTarget(set(200, 8), "barbell").weightKg).toBe(205);
    expect(nextTarget(set(60, 8), "barbell").weightKg).toBe(62.5);
  });

  it("snaps a set logged off the grid back onto it", () => {
    // 26 + 2.5% is 26.65, and a 5 kg stack has 30 — not the 31 that keeping the
    // full step above 26 would name
    expect(nextTarget(set(26, 12), "machine").weightKg).toBe(30);
    expect(nextTarget(set(7.5, 12), "dumbbell").weightKg).toBe(8);
  });

  it("never suggests the same weight twice, even when the percentage rounds to nothing", () => {
    expect(nextTarget(set(0, 8), "bodyweight").weightKg).toBe(2.5);
  });

  it("falls back to the default step when the exercise is no longer in the library", () => {
    expect(nextTarget(set(100, 8), undefined).weightKg).toBe(102.5);
  });

  it("never suggests a weight the form would reject", () => {
    expect(nextTarget(set(LIMITS.maxWeightKg, 8), "barbell").weightKg).toBe(LIMITS.maxWeightKg);
  });
});
