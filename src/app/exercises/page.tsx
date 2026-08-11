import { Card, ConnectionError, EmptyState, PageHeader } from "@/components/ui";
import { ExerciseForm } from "@/components/exercise-form";
import { listExercises } from "@/server/repositories/exercises";
import { deleteExerciseAction } from "@/server/actions/exercises";
import type { Exercise } from "@/domain/types";

export default async function ExercisesPage() {
  let exercises: Exercise[];
  try {
    exercises = await listExercises();
  } catch {
    return (
      <>
        <PageHeader title="Exercises" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Exercises"
        description="The library you pick from when logging a workout"
      />

      <div className="mb-8">
        <ExerciseForm />
      </div>

      {exercises.length === 0 ? (
        <EmptyState
          title="Your library is empty"
          hint="Add an exercise above, or run npm run seed for a starter set."
        />
      ) : (
        <Card>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {exercises.map((exercise) => (
              <li
                key={exercise.id}
                className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{exercise.name}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {exercise.muscleGroup} · {exercise.equipment}
                    {exercise.machineBrand ? ` · ${exercise.machineBrand}` : ""}
                  </p>
                </div>
                <form action={deleteExerciseAction}>
                  <input type="hidden" name="id" value={exercise.id} />
                  <button
                    type="submit"
                    className="rounded-md px-2 py-1 text-sm text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
