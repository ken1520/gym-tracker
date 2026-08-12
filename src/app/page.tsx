import Link from "next/link";

import { Card, ConnectionError, EmptyState, PageHeader, Stat } from "@/components/ui";
import { PersonalBests } from "@/components/personal-bests";
import { formatDate, formatVolume } from "@/domain/format";
import { groupBestsByMuscle } from "@/domain/exercise-bests";
import { personalBests, workoutVolume } from "@/domain/metrics";
import { weekOverWeek, weeklyTotals } from "@/domain/week";
import { listExercises } from "@/server/repositories/exercises";
import { listWorkouts } from "@/server/repositories/workouts";
import type { Exercise, Workout } from "@/domain/types";

export default async function DashboardPage() {
  let workouts: Workout[];
  let exercises: Exercise[];
  try {
    // The library supplies the muscle group and brand that workouts do not store
    [workouts, exercises] = await Promise.all([listWorkouts(), listExercises()]);
  } catch {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  const groups = groupBestsByMuscle(personalBests(workouts), exercises);
  // Rendered at request time, so "this week" moves with the calendar
  const { current, previous } = weeklyTotals(workouts);

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
            <Stat
              label="Workouts this week"
              value={String(current.workoutCount)}
              trend={weekOverWeek(current.workoutCount, previous.workoutCount)}
            />
            <Stat
              label="Volume this week"
              value={formatVolume(current.volume)}
              trend={weekOverWeek(current.volume, previous.volume)}
            />
            <Stat
              label="Exercises this week"
              value={String(current.exerciseCount)}
              trend={weekOverWeek(current.exerciseCount, previous.exerciseCount)}
            />
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

          {groups.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Personal bests
              </h2>
              <PersonalBests groups={groups} />
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
