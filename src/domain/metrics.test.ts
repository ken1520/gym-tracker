import { describe, expect, it } from "vitest";

import {
  bestSet,
  entryVolume,
  estimatedOneRepMax,
  personalBests,
  totalVolume,
  workingSetCount,
  workoutVolume,
} from "@/domain/metrics";
import type { Workout, WorkoutSet } from "@/domain/types";

const set = (weightKg: number, reps: number, isWarmup = false): WorkoutSet => ({
  weightKg,
  reps,
  isWarmup,
});

const workout = (id: string, entries: Workout["entries"]): Workout => ({
  id,
  performedAt: "2026-08-01T00:00:00.000Z",
  title: "Session",
  entries,
});

describe("estimatedOneRepMax", () => {
  it("returns the weight itself for a single rep", () => {
    expect(estimatedOneRepMax(set(100, 1))).toBe(100);
  });

  it("applies the Epley formula above one rep", () => {
    expect(estimatedOneRepMax(set(100, 10))).toBeCloseTo(133.33, 2);
  });

  it("returns zero for non-productive sets", () => {
    expect(estimatedOneRepMax(set(0, 10))).toBe(0);
    expect(estimatedOneRepMax(set(100, 0))).toBe(0);
  });
});

describe("volume", () => {
  it("multiplies weight by reps across working sets", () => {
    const entry = {
      exerciseId: "a",
      exerciseName: "Squat",
      sets: [set(100, 5), set(100, 5)],
    };
    expect(entryVolume(entry)).toBe(1000);
  });

  it("excludes warmup sets", () => {
    const entry = {
      exerciseId: "a",
      exerciseName: "Squat",
      sets: [set(60, 10, true), set(100, 5)],
    };
    expect(entryVolume(entry)).toBe(500);
  });

  it("sums every entry in a workout", () => {
    const session = workout("w1", [
      { exerciseId: "a", exerciseName: "Squat", sets: [set(100, 5)] },
      { exerciseId: "b", exerciseName: "Bench", sets: [set(80, 5)] },
    ]);
    expect(workoutVolume(session)).toBe(900);
    expect(totalVolume([session, session])).toBe(1800);
  });

  it("counts only working sets", () => {
    const session = workout("w1", [
      { exerciseId: "a", exerciseName: "Squat", sets: [set(60, 10, true), set(100, 5)] },
    ]);
    expect(workingSetCount(session)).toBe(1);
  });
});

describe("bestSet", () => {
  it("picks the set with the highest estimated 1RM, not the heaviest", () => {
    const best = bestSet([set(100, 1), set(90, 8)]);
    expect(best).toEqual(set(90, 8));
  });

  it("ignores warmups", () => {
    expect(bestSet([set(200, 5, true), set(100, 1)])).toEqual(set(100, 1));
  });

  it("keeps the earlier set when later ones are weaker", () => {
    expect(bestSet([set(90, 8), set(100, 1), set(60, 5)])).toEqual(set(90, 8));
  });

  it("returns null when there are no working sets", () => {
    expect(bestSet([set(60, 10, true)])).toBeNull();
    expect(bestSet([])).toBeNull();
  });
});

describe("personalBests", () => {
  it("keeps the highest estimated 1RM per exercise across workouts", () => {
    const bests = personalBests([
      workout("w1", [{ exerciseId: "a", exerciseName: "Squat", sets: [set(100, 5)] }]),
      workout("w2", [{ exerciseId: "a", exerciseName: "Squat", sets: [set(120, 5)] }]),
      workout("w3", [{ exerciseId: "a", exerciseName: "Squat", sets: [set(110, 5)] }]),
    ]);

    expect(bests.get("a")?.oneRepMax).toBeCloseTo(140, 5);
  });

  it("keeps the set the estimate came from", () => {
    const bests = personalBests([
      workout("w1", [
        { exerciseId: "a", exerciseName: "Squat", sets: [set(130, 1), set(120, 5)] },
      ]),
    ]);

    // 120 x 5 estimates to 140, so the heaviest set on the day is not the best one
    expect(bests.get("a")?.set).toEqual(set(120, 5));
  });

  it("tracks exercises independently and skips warmup-only entries", () => {
    const bests = personalBests([
      workout("w1", [
        { exerciseId: "a", exerciseName: "Squat", sets: [set(100, 5)] },
        { exerciseId: "b", exerciseName: "Bench", sets: [set(80, 3, true)] },
      ]),
    ]);

    expect(bests.has("a")).toBe(true);
    expect(bests.has("b")).toBe(false);
  });
});
