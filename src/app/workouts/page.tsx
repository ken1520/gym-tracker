import Link from "next/link";

import { Card, ConnectionError, EmptyState, PageHeader } from "@/components/ui";
import { WorkoutCalendar } from "@/components/workout-calendar";
import {
  groupWorkoutsByDay,
  resolveMonthKey,
  summarizeDays,
  toDayKey,
} from "@/domain/calendar";
import { formatDate, formatVolume } from "@/domain/format";
import { workingSetCount, workoutVolume } from "@/domain/metrics";
import { listWorkoutsInMonth } from "@/server/repositories/workouts";
import { deleteWorkoutAction } from "@/server/actions/workouts";
import type { Workout } from "@/domain/types";

export default async function WorkoutsPage({ searchParams }: PageProps<"/workouts">) {
  const params = await searchParams;
  const monthKey = resolveMonthKey(readParam(params.month));

  let workouts: Workout[];
  try {
    workouts = await listWorkoutsInMonth(monthKey);
  } catch {
    return (
      <>
        <PageHeader title="History" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  const byDay = groupWorkoutsByDay(workouts);
  const summaries = summarizeDays(byDay);

  // An unknown or empty day falls back to the month's most recent logged day
  const requestedDay = readParam(params.day);
  const selectedDay =
    requestedDay && byDay.has(requestedDay)
      ? requestedDay
      : [...byDay.keys()].sort().at(-1);

  const selectedWorkouts = selectedDay ? (byDay.get(selectedDay) ?? []) : [];
  const monthVolume = workouts.reduce((total, w) => total + workoutVolume(w), 0);

  return (
    <>
      <PageHeader
        title="History"
        description={
          workouts.length === 0
            ? "No sessions this month"
            : `${workouts.length} ${workouts.length === 1 ? "session" : "sessions"} · ${formatVolume(monthVolume)} this month`
        }
        action={
          <Link
            href="/workouts/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-300"
          >
            Log workout
          </Link>
        }
      />

      <WorkoutCalendar
        monthKey={monthKey}
        summaries={summaries}
        selectedDay={selectedDay}
        todayKey={toDayKey(new Date().toISOString())}
      />

      <section className="mt-6">
        {selectedDay ? (
          <>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {formatDate(`${selectedDay}T00:00:00.000Z`)}
            </h2>
            <ul className="space-y-2">
              {selectedWorkouts.map((workout) => (
                <li key={workout.id}>
                  <Card>
                    <div className="flex items-start justify-between gap-4">
                      <Link href={`/workouts/${workout.id}`} className="min-w-0 flex-1">
                        <span className="font-medium">{workout.title}</span>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                          {workout.entries.length} exercises · {workingSetCount(workout)} sets ·{" "}
                          {formatVolume(workoutVolume(workout))}
                        </p>
                      </Link>
                      <form action={deleteWorkoutAction}>
                        <input type="hidden" name="id" value={workout.id} />
                        <button
                          type="submit"
                          className="rounded-md px-2 py-1 text-sm text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState
            title="Nothing logged this month"
            hint="Pick another month above, or log a session to fill in the calendar."
          />
        )}
      </section>
    </>
  );
}

// searchParams values are string | string[] | undefined
function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
