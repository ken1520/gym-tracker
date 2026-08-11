import { Card, ConnectionError, EmptyState, PageHeader } from "@/components/ui";
import { ExerciseForm } from "@/components/exercise-form";
import { ExerciseRow } from "@/components/exercise-row";
import { listExercises } from "@/server/repositories/exercises";
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
              <ExerciseRow key={exercise.id} exercise={exercise} />
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
