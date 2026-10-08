import { ConnectionError, PageHeader } from "@/components/ui";
import { WorkoutForm } from "@/components/workout-form";
import { requireViewer } from "@/server/auth/dal";
import { lastSessionByMuscleGroup } from "@/domain/last-session";
import { ownScope } from "@/domain/scope";
import { listExercises } from "@/server/repositories/exercises";
import { listWorkouts } from "@/server/repositories/workouts";
import type { LastSessions } from "@/domain/last-session";
import type { Exercise } from "@/domain/types";

// Look back this many workouts for each muscle group's last session
const RECENT_WORKOUT_LIMIT = 100;

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
  let lastSessions: LastSessions;
  try {
    const [library, recent] = await Promise.all([
      listExercises(),
      listWorkouts(ownScope(viewer.user.id), RECENT_WORKOUT_LIMIT),
    ]);
    exercises = library;
    lastSessions = lastSessionByMuscleGroup(recent, library);
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
      <WorkoutForm exercises={exercises} lastSessions={lastSessions} />
    </>
  );
}
