import { ConnectionError, PageHeader } from "@/components/ui";
import { WorkoutForm } from "@/components/workout-form";
import { requireViewer } from "@/server/auth/dal";
import { lastSessionByMuscleGroup } from "@/domain/last-session";
import { ownScope } from "@/domain/scope";
import { planSetsByExercise } from "@/domain/set-plan";
import { listExercises } from "@/server/repositories/exercises";
import { listWorkouts } from "@/server/repositories/workouts";
import type { LastSessions } from "@/domain/last-session";
import type { SetPlans } from "@/domain/set-plan";
import type { Exercise } from "@/domain/types";

// Look back this many workouts for last sessions and the sets to prefill
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
  let setPlans: SetPlans;
  try {
    const [library, recent] = await Promise.all([
      listExercises(),
      listWorkouts(ownScope(viewer.user.id), RECENT_WORKOUT_LIMIT),
    ]);
    exercises = library;
    lastSessions = lastSessionByMuscleGroup(recent, library);
    setPlans = planSetsByExercise(recent, library);
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
      <WorkoutForm exercises={exercises} lastSessions={lastSessions} setPlans={setPlans} />
    </>
  );
}
