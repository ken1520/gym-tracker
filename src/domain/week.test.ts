import { describe, expect, it } from "vitest";

import { startOfWeek, weekOverWeek, weeklyTotals } from "@/domain/week";
import type { Workout, WorkoutSet } from "@/domain/types";

const set = (weightKg: number, reps: number, isWarmup = false): WorkoutSet => ({
  weightKg,
  reps,
  isWarmup,
});

const workout = (id: string, performedAt: string, entries: Workout["entries"] = []): Workout => ({
  id,
  // Metrics never look at the owner — every workout reaching them is already
  // scoped by the repository — but the type requires one
  userId: "u1",
  performedAt,
  title: "Session",
  entries,
});

const squat = (sets: WorkoutSet[]) => ({
  exerciseId: "a",
  exerciseName: "Squat",
  sets,
});

const bench = (sets: WorkoutSet[]) => ({
  exerciseId: "b",
  exerciseName: "Bench",
  sets,
});

describe("startOfWeek", () => {
  it("rewinds to the Sunday that opens the week", () => {
    // 2026-08-11 is a Tuesday
    expect(startOfWeek(new Date("2026-08-11T12:00:00.000Z")).toISOString()).toBe(
      "2026-08-09T00:00:00.000Z",
    );
  });

  it("keeps a Sunday as its own week start", () => {
    expect(startOfWeek(new Date("2026-08-09T23:59:59.000Z")).toISOString()).toBe(
      "2026-08-09T00:00:00.000Z",
    );
  });

  it("crosses a month boundary backwards", () => {
    // 2026-08-01 is a Saturday, so its week opens in July
    expect(startOfWeek(new Date("2026-08-01T06:00:00.000Z")).toISOString()).toBe(
      "2026-07-26T00:00:00.000Z",
    );
  });

  it("uses UTC days, not the runtime timezone", () => {
    // 00:30 UTC Sunday is still Saturday anywhere behind UTC, which would
    // otherwise rewind a whole extra week
    expect(startOfWeek(new Date("2026-08-09T00:30:00.000Z")).toISOString()).toBe(
      "2026-08-09T00:00:00.000Z",
    );
  });
});

describe("weeklyTotals", () => {
  const now = new Date("2026-08-11T12:00:00.000Z");

  it("counts only the workouts logged in each week", () => {
    const totals = weeklyTotals(
      [
        workout("this-1", "2026-08-09T00:00:00.000Z"),
        workout("this-2", "2026-08-11T00:00:00.000Z"),
        workout("last-1", "2026-08-05T00:00:00.000Z"),
      ],
      now,
    );

    expect(totals.current.workoutCount).toBe(2);
    expect(totals.previous.workoutCount).toBe(1);
  });

  it("excludes anything older than the previous week", () => {
    const totals = weeklyTotals([workout("old", "2026-07-20T00:00:00.000Z")], now);

    expect(totals.current.workoutCount).toBe(0);
    expect(totals.previous.workoutCount).toBe(0);
  });

  it("puts the last instant of a week in that week, not the next", () => {
    const totals = weeklyTotals(
      [
        workout("edge", "2026-08-08T23:59:59.999Z"),
        workout("open", "2026-08-09T00:00:00.000Z"),
      ],
      now,
    );

    expect(totals.previous.workoutCount).toBe(1);
    expect(totals.current.workoutCount).toBe(1);
  });

  it("sums volume per week and ignores warmups", () => {
    const totals = weeklyTotals(
      [
        workout("this", "2026-08-10T00:00:00.000Z", [squat([set(100, 5), set(60, 10, true)])]),
        workout("last", "2026-08-03T00:00:00.000Z", [squat([set(80, 5)])]),
      ],
      now,
    );

    expect(totals.current.volume).toBe(500);
    expect(totals.previous.volume).toBe(400);
  });

  it("counts each exercise once however many times it was trained", () => {
    const totals = weeklyTotals(
      [
        workout("mon", "2026-08-10T00:00:00.000Z", [squat([set(100, 5)]), bench([set(80, 5)])]),
        workout("tue", "2026-08-11T00:00:00.000Z", [squat([set(105, 5)])]),
      ],
      now,
    );

    expect(totals.current.exerciseCount).toBe(2);
  });

  it("does not count an exercise that was only warmed up", () => {
    const totals = weeklyTotals(
      [
        workout("this", "2026-08-10T00:00:00.000Z", [
          squat([set(100, 5)]),
          bench([set(40, 10, true)]),
        ]),
      ],
      now,
    );

    expect(totals.current.exerciseCount).toBe(1);
  });

  it("reports zeros rather than failing when nothing was logged", () => {
    const totals = weeklyTotals([], now);

    expect(totals.current).toEqual({ workoutCount: 0, volume: 0, exerciseCount: 0 });
    expect(totals.previous).toEqual({ workoutCount: 0, volume: 0, exerciseCount: 0 });
  });
});

describe("weekOverWeek", () => {
  it("reports growth against last week", () => {
    expect(weekOverWeek(120, 100)).toEqual({ direction: "up", percent: 20 });
  });

  it("reports a drop against last week", () => {
    expect(weekOverWeek(75, 100)).toEqual({ direction: "down", percent: -25 });
  });

  it("reports no movement when the weeks match", () => {
    expect(weekOverWeek(100, 100)).toEqual({ direction: "flat", percent: 0 });
  });

  it("has no percentage to report when last week was empty", () => {
    // A change from nothing has no ratio, so the arrow stands on its own
    expect(weekOverWeek(3, 0)).toEqual({ direction: "up", percent: null });
  });

  it("treats two empty weeks as flat, not as growth", () => {
    expect(weekOverWeek(0, 0)).toEqual({ direction: "flat", percent: null });
  });

  it("reports a drop to zero as a full loss", () => {
    expect(weekOverWeek(0, 100)).toEqual({ direction: "down", percent: -100 });
  });
});
