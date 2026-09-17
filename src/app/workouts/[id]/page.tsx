import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, ConnectionError, PageHeader } from "@/components/ui";
import { formatDate, formatVolume, formatWeight } from "@/domain/format";
import { qualifierFor, repeatedNames } from "@/domain/exercise-label";
import { bestSet, entryVolume, estimatedOneRepMax, workoutVolume } from "@/domain/metrics";
import { resolveWorkoutScope } from "@/domain/scope";
import { requireViewer } from "@/server/auth/dal";
import { findWorkout } from "@/server/repositories/workouts";
import { listExercises } from "@/server/repositories/exercises";

export default async function WorkoutDetailPage({ params }: PageProps<"/workouts/[id]">) {
  const viewer = await requireViewer();
  if (viewer.status === "unavailable") {
    return (
      <>
        <PageHeader title="Workout" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  const { user } = viewer;
  const { id } = await params;

  // Admins may read any workout; everyone else only their own. A workout
  // outside the scope is a 404, not a 403 — a 403 would confirm it exists
  const scope = resolveWorkoutScope(user.role, user.id, "all");
  const workout = await findWorkout(scope, id).catch(() => null);

  if (!workout) notFound();

  // Reading someone else's log never comes with an edit button. The action
  // rejects it too, so this is only about not offering a dead control
  const isOwn = workout.userId === user.id;

  // Entries store only a denormalized name, which no longer identifies an
  // exercise on its own now that a name can repeat across equipment. The
  // library is joined back in purely to label them; a failed load just means
  // unqualified names rather than a broken page
  const exercises = await listExercises().catch(() => []);
  const library = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const repeated = repeatedNames(exercises);

  return (
    <>
      <PageHeader
        title={workout.title}
        description={`${formatDate(workout.performedAt)} · ${formatVolume(workoutVolume(workout))} total volume`}
        action={
          isOwn ? (
            <Link
              href={`/workouts/${workout.id}/edit`}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              Edit
            </Link>
          ) : null
        }
      />

      {workout.notes ? (
        <p className="mb-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-950">
          {workout.notes}
        </p>
      ) : null}

      <div className="space-y-4">
        {workout.entries.map((entry, index) => {
          const best = bestSet(entry.sets);
          const qualifier = qualifierFor(library.get(entry.exerciseId), repeated);

          return (
            <Card key={`${entry.exerciseId}-${index}`}>
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <h2 className="font-medium">
                  {entry.exerciseName}
                  {qualifier ? (
                    <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                      {qualifier}
                    </span>
                  ) : null}
                </h2>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {formatVolume(entryVolume(entry))}
                </span>
              </div>

              <ul className="space-y-1">
                {entry.sets.map((set, setIndex) => (
                  <li
                    key={setIndex}
                    className="flex items-center gap-3 text-sm tabular-nums"
                  >
                    <span className="w-6 text-neutral-400">{setIndex + 1}</span>
                    <span className="font-medium">{formatWeight(set.weightKg)}</span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      × {set.reps}
                    </span>
                    {set.rpe ? (
                      <span className="text-neutral-400">RPE {set.rpe}</span>
                    ) : null}
                    {set.isWarmup ? (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                        warmup
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>

              {best ? (
                <p className="mt-3 border-t border-neutral-200 pt-2 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  Best set {formatWeight(best.weightKg)} × {best.reps} · est. 1RM{" "}
                  {formatWeight(estimatedOneRepMax(best))}
                </p>
              ) : null}
            </Card>
          );
        })}
      </div>
    </>
  );
}
