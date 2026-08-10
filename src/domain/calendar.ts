import { workoutVolume } from "@/domain/metrics";
import type { Workout } from "@/domain/types";

// All calendar math runs in UTC because performedAt is stored as a UTC instant
// and form submissions land on UTC midnight — using local time would shift days
const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

export type CalendarDay = {
  dayKey: string;
  dayOfMonth: number;
  inMonth: boolean;
};

export type DaySummary = {
  workoutCount: number;
  volume: number;
  // Three tiers relative to the busiest day on screen, for colour intensity
  intensity: 1 | 2 | 3;
};

const pad = (value: number): string => String(value).padStart(2, "0");

export function toDayKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function toMonthKey(dayOrIso: string): string {
  return toDayKey(dayOrIso).slice(0, 7);
}

export function isValidMonthKey(value: string): boolean {
  return MONTH_KEY.test(value);
}

// Falls back to the current month for missing or malformed input
export function resolveMonthKey(value: string | undefined, now: Date = new Date()): string {
  if (value && isValidMonthKey(value)) return value;
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`;
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}`;
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Six Sunday-first weeks so the grid height never jumps between months
export function buildMonthGrid(monthKey: string): CalendarDay[][] {
  const [year, month] = monthKey.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  // getUTCDay is already Sunday-indexed (0 = Sunday)
  const leadingDays = firstOfMonth.getUTCDay();

  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, 1 + index - leadingDays));
    const dayKey = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    return {
      dayKey,
      dayOfMonth: date.getUTCDate(),
      inMonth: dayKey.slice(0, 7) === monthKey,
    };
  });

  return Array.from({ length: 6 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

export function groupWorkoutsByDay(
  workouts: readonly Workout[],
): Map<string, Workout[]> {
  const groups = new Map<string, Workout[]>();

  for (const workout of workouts) {
    const key = toDayKey(workout.performedAt);
    groups.set(key, [...(groups.get(key) ?? []), workout]);
  }

  return groups;
}

export function summarizeDays(
  byDay: ReadonlyMap<string, Workout[]>,
): Map<string, DaySummary> {
  const volumes = new Map<string, { workoutCount: number; volume: number }>();

  for (const [dayKey, workouts] of byDay) {
    volumes.set(dayKey, {
      workoutCount: workouts.length,
      volume: workouts.reduce((total, workout) => total + workoutVolume(workout), 0),
    });
  }

  const maxVolume = Math.max(0, ...[...volumes.values()].map((entry) => entry.volume));

  return new Map(
    [...volumes].map(([dayKey, entry]) => [
      dayKey,
      { ...entry, intensity: intensityFor(entry.volume, maxVolume) },
    ]),
  );
}

function intensityFor(volume: number, maxVolume: number): 1 | 2 | 3 {
  // A logged day always shows at least the lightest shade, even at zero volume
  if (maxVolume <= 0) return 1;
  const ratio = volume / maxVolume;
  if (ratio <= 1 / 3) return 1;
  if (ratio <= 2 / 3) return 2;
  return 3;
}
