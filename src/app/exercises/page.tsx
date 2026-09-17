import { Card, ConnectionError, EmptyState, PageHeader } from "@/components/ui";
import { ExerciseForm } from "@/components/exercise-form";
import { ExerciseRow } from "@/components/exercise-row";
import { canManageExercises } from "@/domain/roles";
import { requireViewer } from "@/server/auth/dal";
import { listExercises } from "@/server/repositories/exercises";
import type { Exercise } from "@/domain/types";

export default async function ExercisesPage() {
  const viewer = await requireViewer();
  if (viewer.status === "unavailable") {
    return (
      <>
        <PageHeader title="Exercises" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  // One shared library, so everyone reads it but only an admin changes it
  const canEdit = canManageExercises(viewer.user.role);

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
        description={
          canEdit
            ? "The shared library everyone picks from when logging a workout"
            : "The shared library you pick from when logging a workout"
        }
      />

      {canEdit ? (
        <div className="mb-8">
          <ExerciseForm />
        </div>
      ) : (
        <p className="mb-8 rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
          Ask an admin to add or change an exercise.
        </p>
      )}

      {exercises.length === 0 ? (
        <EmptyState
          title="Your library is empty"
          hint={
            canEdit
              ? "Add an exercise above, or run npm run seed for a starter set."
              : "An admin has not added any exercises yet."
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {exercises.map((exercise) => (
              <ExerciseRow key={exercise.id} exercise={exercise} canEdit={canEdit} />
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
