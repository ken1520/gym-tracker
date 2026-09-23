import Link from "next/link";

import { ConnectionError, EmptyState, PageHeader } from "@/components/ui";
import { PersonalBests } from "@/components/personal-bests";
import { groupBestsByMuscle } from "@/domain/exercise-bests";
import { personalBests } from "@/domain/metrics";
import { ownScope } from "@/domain/scope";
import { requireViewer } from "@/server/auth/dal";
import { listExercises } from "@/server/repositories/exercises";
import { listWorkouts } from "@/server/repositories/workouts";
import type { Exercise, Workout } from "@/domain/types";

export default async function DashboardPage() {
  // Outside the try below — requireViewer redirects by throwing, and the bare
  // catch there would swallow it
  const viewer = await requireViewer();
  if (viewer.status === "unavailable") {
    return (
      <>
        <PageHeader title="Personal bests" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  const { user } = viewer;

  let workouts: Workout[];
  let exercises: Exercise[];
  try {
    // Always the viewer's own, admin or not: these are "your bests", and mixing
    // accounts into them would be meaningless. The cross-account view an admin
    // gets lives on /workouts.
    // The library supplies the muscle group, brand and equipment that workouts
    // do not store
    [workouts, exercises] = await Promise.all([
      listWorkouts(ownScope(user.id)),
      listExercises(),
    ]);
  } catch {
    return (
      <>
        <PageHeader title="Personal bests" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  const groups = groupBestsByMuscle(personalBests(workouts), exercises);

  return (
    <>
      <PageHeader
        title="Personal bests"
        description="Your best working set per exercise, with the next target to beat it — the same reps, at the next load up"
        action={
          <Link
            href="/workouts/new"
            className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-300"
          >
            Log workout
          </Link>
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          title="No personal bests yet"
          hint="Log a session with at least one working set to start tracking bests."
        />
      ) : (
        <PersonalBests groups={groups} />
      )}
    </>
  );
}
