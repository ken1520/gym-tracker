import { isWorkingSet, totalVolume } from "@/domain/metrics";
import type { Workout } from "@/domain/types";

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

export type WeekStats = {
  workoutCount: number;
  volume: number;
  exerciseCount: number;
};

export type WeeklyTotals = {
  current: WeekStats;
  previous: WeekStats;
};

export type TrendDirection = "up" | "down" | "flat";

export type Trend = {
  direction: TrendDirection;
  // Null when last week was empty, since a change from nothing has no ratio
  percent: number | null;
};

// Weeks open on Sunday in UTC, the same convention buildMonthGrid uses, so a
// workout never counts in a different week from the calendar cell it sits in.
// UTC has no DST, which is what makes the fixed-length arithmetic below exact
export function startOfWeek(now: Date): Date {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(midnight - now.getUTCDay() * DAY_MS);
}

// Half-open so a workout at the closing instant of a week stays in that week
function statsBetween(
  workouts: readonly Workout[],
  startMs: number,
  endMs: number,
): WeekStats {
  const inWeek = workouts.filter((workout) => {
    const performedMs = Date.parse(workout.performedAt);
    return performedMs >= startMs && performedMs < endMs;
  });

  // An exercise counts once per week however often it was trained, and only
  // when it was actually worked rather than just warmed up
  const exerciseIds = new Set<string>();
  for (const workout of inWeek) {
    for (const entry of workout.entries) {
      if (entry.sets.some(isWorkingSet)) exerciseIds.add(entry.exerciseId);
    }
  }

  return {
    workoutCount: inWeek.length,
    volume: totalVolume(inWeek),
    exerciseCount: exerciseIds.size,
  };
}

export function weeklyTotals(
  workouts: readonly Workout[],
  now: Date = new Date(),
): WeeklyTotals {
  const start = startOfWeek(now).getTime();

  return {
    current: statsBetween(workouts, start, start + WEEK_MS),
    previous: statsBetween(workouts, start - WEEK_MS, start),
  };
}

export function weekOverWeek(current: number, previous: number): Trend {
  const direction: TrendDirection =
    current > previous ? "up" : current < previous ? "down" : "flat";

  return {
    direction,
    percent: previous === 0 ? null : ((current - previous) / previous) * 100,
  };
}
