import { ConnectionError, PageHeader } from "@/components/ui";
import { WorkoutForm } from "@/components/workout-form";
import { requireViewer } from "@/server/auth/dal";
import { listExercises } from "@/server/repositories/exercises";
import type { Exercise } from "@/domain/types";

export default async function NewWorkoutPage() {
  // Logging is open to every role; this just refuses a signed-out visitor
  const viewer = await requireViewer();
  if (viewer.status === "unavailable") {
    return (
      <>
        <PageHeader title="Log workout" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  let exercises: Exercise[];
  try {
    exercises = await listExercises();
  } catch {
    return (
      <>
        <PageHeader title="Log workout" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Log workout" description="Record the sets you hit today" />
      <WorkoutForm exercises={exercises} />
    </>
  );
}
