import Link from "next/link";

import { buildMonthGrid, monthLabel, shiftMonth } from "@/domain/calendar";
import type { DaySummary } from "@/domain/calendar";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// Darker shade means a heavier day relative to the busiest day that month
const INTENSITY_CLASS: Record<1 | 2 | 3, string> = {
  1: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900",
  2: "bg-emerald-300 text-emerald-950 hover:bg-emerald-400 dark:bg-emerald-800 dark:text-emerald-50 dark:hover:bg-emerald-700",
  3: "bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500",
};

// Declared separately rather than derived from INTENSITY_CLASS so the legend
// keeps its dark-mode variants
const LEGEND_SWATCH: Record<1 | 2 | 3, string> = {
  1: "bg-emerald-100 dark:bg-emerald-950",
  2: "bg-emerald-300 dark:bg-emerald-800",
  3: "bg-emerald-500 dark:bg-emerald-600",
};

export function WorkoutCalendar({
  monthKey,
  summaries,
  selectedDay,
  todayKey,
  scope,
}: {
  monthKey: string;
  summaries: ReadonlyMap<string, DaySummary>;
  selectedDay?: string;
  todayKey: string;
  // Only ever "all", and only for an admin. Every link below has to carry it or
  // paging to the next month silently drops back to the viewer's own workouts
  scope?: "all";
}) {
  const grid = buildMonthGrid(monthKey);
  const scopeParam = scope ? `&scope=${scope}` : "";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/workouts?month=${shiftMonth(monthKey, -1)}${scopeParam}`}
          aria-label="Previous month"
          className="rounded-md px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
        >
          ‹
        </Link>
        <h2 className="text-sm font-semibold">{monthLabel(monthKey)}</h2>
        <Link
          href={`/workouts?month=${shiftMonth(monthKey, 1)}${scopeParam}`}
          aria-label="Next month"
          className="rounded-md px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
        >
          ›
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="pb-1 text-center text-xs font-medium text-neutral-400 dark:text-neutral-500"
          >
            {weekday}
          </div>
        ))}

        {grid.flat().map((day) => {
          const summary = day.inMonth ? summaries.get(day.dayKey) : undefined;
          const isSelected = day.dayKey === selectedDay;
          const isToday = day.dayKey === todayKey;

          const base =
            "relative flex aspect-square flex-col items-center justify-center rounded-md text-sm tabular-nums transition-colors";
          const ring = isSelected
            ? " ring-2 ring-neutral-900 dark:ring-neutral-100"
            : isToday
              ? " ring-1 ring-neutral-300 dark:ring-neutral-700"
              : "";

          if (!day.inMonth) {
            return (
              <div
                key={day.dayKey}
                className={`${base} text-neutral-300 dark:text-neutral-700`}
              >
                {day.dayOfMonth}
              </div>
            );
          }

          if (!summary) {
            return (
              <div
                key={day.dayKey}
                className={`${base} text-neutral-500 dark:text-neutral-400${ring}`}
              >
                {day.dayOfMonth}
              </div>
            );
          }

          return (
            <Link
              key={day.dayKey}
              href={`/workouts?month=${monthKey}&day=${day.dayKey}${scopeParam}`}
              aria-label={`${day.dayOfMonth}: ${summary.workoutCount} ${summary.workoutCount === 1 ? "workout" : "workouts"}`}
              className={`${base} font-medium ${INTENSITY_CLASS[summary.intensity]}${ring}`}
            >
              {day.dayOfMonth}
              <span
                aria-hidden
                className="mt-0.5 flex gap-0.5"
              >
                {Array.from({ length: Math.min(summary.workoutCount, 3) }, (_, dot) => (
                  <span key={dot} className="h-1 w-1 rounded-full bg-current opacity-70" />
                ))}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <span>Lighter</span>
        {([1, 2, 3] as const).map((level) => (
          <span
            key={level}
            className={`h-3 w-3 rounded-sm ${LEGEND_SWATCH[level]}`}
          />
        ))}
        <span>Heavier</span>
      </div>
    </div>
  );
}
