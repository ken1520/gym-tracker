import { describe, expect, it } from "vitest";

import { BLANK_PLAN, planSetsByExercise } from "@/domain/set-plan";
import type { Exercise, Workout, WorkoutEntry, WorkoutSet } from "@/domain/types";

const LIBRARY: Exercise[] = [
  { id: "bench", name: "Bench Press", muscleGroup: "chest", equipment: "barbell" },
  { id: "press", name: "Chest Press", muscleGroup: "chest", equipment: "machine" },
];

const warmup = (weightKg: number, reps: number): WorkoutSet => ({ weightKg, reps, isWarmup: true });
const working = (weightKg: number, reps: number): WorkoutSet => ({
  weightKg,
  reps,
  isWarmup: false,
});

const entry = (exerciseId: string, sets: WorkoutSet[]): WorkoutEntry => ({
  exerciseId,
  exerciseName: exerciseId,
  sets,
});

const workout = (id: string, performedAt: string, entries: WorkoutEntry[]): Workout => ({
  id,
  userId: "u1",
  performedAt,
  title: "Session",
  entries,
});

describe("planSetsByExercise", () => {
  it("plans one warmup, two working sets at the latest load and one at the next target", () => {
    const history = [
      workout("w1", "2026-10-01T00:00:00.000Z", [
        entry("bench", [warmup(40, 10), working(80, 5), working(80, 5)]),
      ]),
    ];

    expect(planSetsByExercise(history, LIBRARY).bench).toEqual([
      { weightKg: 40, reps: 10, isWarmup: true },
      { weightKg: 80, reps: 5, isWarmup: false },
      { weightKg: 80, reps: 5, isWarmup: false },
      { weightKg: 82.5, reps: 5, isWarmup: false },
    ]);
  });

  it("takes the warmup and working load from the most recent session", () => {
    // Newest first, as the repository returns them
    const history = [
      workout("w2", "2026-10-03T00:00:00.000Z", [
        entry("bench", [warmup(50, 8), working(85, 5)]),
      ]),
      workout("w1", "2026-10-01T00:00:00.000Z", [
        entry("bench", [warmup(40, 10), working(80, 5)]),
      ]),
    ];

    const [first, second] = planSetsByExercise(history, LIBRARY).bench;
    expect(first.weightKg).toBe(50);
    expect(second.weightKg).toBe(85);
  });

  it("takes the last warmup when a session logged several", () => {
    const history = [
      workout("w1", "2026-10-01T00:00:00.000Z", [
        entry("bench", [warmup(20, 10), warmup(60, 5), working(80, 5)]),
      ]),
    ];

    expect(planSetsByExercise(history, LIBRARY).bench[0].weightKg).toBe(60);
  });

  it("aims the last set at the personal best's next target, as the dashboard does", () => {
    // An older, stronger session sets the target even after a lighter one
    const history = [
      workout("w2", "2026-10-03T00:00:00.000Z", [entry("bench", [working(70, 5)])]),
      workout("w1", "2026-10-01T00:00:00.000Z", [entry("bench", [working(100, 5)])]),
    ];

    const plan = planSetsByExercise(history, LIBRARY).bench;
    expect(plan[1].weightKg).toBe(70);
    expect(plan[3]).toEqual({ weightKg: 102.5, reps: 5, isWarmup: false });
  });

  it("snaps the target to the equipment's step", () => {
    const history = [
      workout("w1", "2026-10-01T00:00:00.000Z", [entry("press", [working(50, 10)])]),
    ];

    expect(planSetsByExercise(history, LIBRARY).press[3].weightKg).toBe(55);
  });

  it("leaves the warmup blank when the last session had none", () => {
    const history = [
      workout("w1", "2026-10-01T00:00:00.000Z", [entry("bench", [working(80, 5)])]),
    ];

    expect(planSetsByExercise(history, LIBRARY).bench[0]).toEqual({ isWarmup: true });
  });

  it("has no plan for an exercise never logged", () => {
    expect(planSetsByExercise([], LIBRARY)).toEqual({});
  });
});

describe("BLANK_PLAN", () => {
  it("is one warmup and three working sets with nothing filled in", () => {
    expect(BLANK_PLAN).toEqual([
      { isWarmup: true },
      { isWarmup: false },
      { isWarmup: false },
      { isWarmup: false },
    ]);
  });
});
