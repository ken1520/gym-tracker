import { notFound } from "next/navigation";

import { ConnectionError, PageHeader } from "@/components/ui";
import { WorkoutForm } from "@/components/workout-form";
import { formatDate } from "@/domain/format";
import { listExercises } from "@/server/repositories/exercises";
import { ownScope } from "@/domain/scope";
import { requireViewer } from "@/server/auth/dal";
import { findWorkout } from "@/server/repositories/workouts";
import type { Exercise, Workout } from "@/domain/types";

export default async function EditWorkoutPage({ params }: PageProps<"/workouts/[id]/edit">) {
  const viewer = await requireViewer();
  if (viewer.status === "unavailable") {
    return (
      <>
        <PageHeader title="Edit workout" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  const { id } = await params;

  let workout: Workout | null;
  let exercises: Exercise[];
  try {
    [workout, exercises] = await Promise.all([
      // ownScope, not the viewer's read scope: an admin can open another
      // account's workout but the save would be rejected, so the editor is
      // never offered for one
      findWorkout(ownScope(viewer.user.id), id),
      listExercises(),
    ]);
  } catch {
    return (
      <>
        <PageHeader title="Edit workout" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  if (!workout) notFound();

  return (
    <>
      <PageHeader
        title="Edit workout"
        description={`Logged ${formatDate(workout.performedAt)}`}
      />
      <WorkoutForm exercises={exercises} workout={workout} />
    </>
  );
}
