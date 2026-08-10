import Link from "next/link";

import { Card, ConnectionError, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, formatVolume } from "@/domain/format";
import { workingSetCount, workoutVolume } from "@/domain/metrics";
import { listWorkouts } from "@/server/repositories/workouts";
import { deleteWorkoutAction } from "@/server/actions/workouts";
import type { Workout } from "@/domain/types";

export default async function WorkoutsPage() {
  let workouts: Workout[];
  try {
    workouts = await listWorkouts();
  } catch {
    return (
      <>
        <PageHeader title="History" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="History"
        description={`${workouts.length} logged ${workouts.length === 1 ? "session" : "sessions"}`}
        action={
          <Link
            href="/workouts/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-300"
          >
            Log workout
          </Link>
        }
      />

      {workouts.length === 0 ? (
        <EmptyState title="Nothing logged yet" hint="Your sessions will appear here." />
      ) : (
        <ul className="space-y-2">
          {workouts.map((workout) => (
            <li key={workout.id}>
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <Link href={`/workouts/${workout.id}`} className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-medium">{workout.title}</span>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {formatDate(workout.performedAt)}
                      </span>
                    </div>
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
      )}
    </>
  );
}
