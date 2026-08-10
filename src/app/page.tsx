import Link from "next/link";

import { Card, ConnectionError, EmptyState, PageHeader, Stat } from "@/components/ui";
import { formatDate, formatVolume, formatWeight } from "@/domain/format";
import { personalBests, totalVolume, workoutVolume } from "@/domain/metrics";
import { listWorkouts } from "@/server/repositories/workouts";
import type { Workout } from "@/domain/types";

export default async function DashboardPage() {
  let workouts: Workout[];
  try {
    workouts = await listWorkouts();
  } catch {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  const bests = [...personalBests(workouts).values()].sort(
    (a, b) => b.oneRepMax - a.oneRepMax,
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your training at a glance"
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
        <EmptyState
          title="No workouts yet"
          hint="Log your first session to start tracking volume and personal bests."
        />
      ) : (
        <div className="space-y-8">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Workouts" value={String(workouts.length)} />
            <Stat label="Total volume" value={formatVolume(totalVolume(workouts))} />
            <Stat label="Exercises tracked" value={String(bests.length)} />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Recent workouts
            </h2>
            <ul className="space-y-2">
              {workouts.slice(0, 5).map((workout) => (
                <li key={workout.id}>
                  <Link href={`/workouts/${workout.id}`} className="block">
                    <Card>
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="font-medium">{workout.title}</span>
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">
                          {formatDate(workout.performedAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        {workout.entries.length} exercises ·{" "}
                        {formatVolume(workoutVolume(workout))} volume
                      </p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {bests.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Estimated 1RM
              </h2>
              <Card>
                <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {bests.slice(0, 8).map((best) => (
                    <li
                      key={best.exerciseName}
                      className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0"
                    >
                      <span>{best.exerciseName}</span>
                      <span className="font-medium tabular-nums">
                        {formatWeight(best.oneRepMax)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
