import { notFound } from "next/navigation";

import { ConnectionError, PageHeader } from "@/components/ui";
import { WorkoutForm } from "@/components/workout-form";
import { formatDate } from "@/domain/format";
import { listExercises } from "@/server/repositories/exercises";
import { findWorkout } from "@/server/repositories/workouts";
import type { Exercise, Workout } from "@/domain/types";

export default async function EditWorkoutPage({ params }: PageProps<"/workouts/[id]/edit">) {
  const { id } = await params;

  let workout: Workout | null;
  let exercises: Exercise[];
  try {
    [workout, exercises] = await Promise.all([findWorkout(id), listExercises()]);
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
