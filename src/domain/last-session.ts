import { MUSCLE_GROUPS } from "@/domain/constants";
import type { MuscleGroup } from "@/domain/constants";
import type { Exercise, Workout, WorkoutEntry } from "@/domain/types";

export type LastSession = { performedAt: string; entries: WorkoutEntry[] };

// Only groups that have ever been trained have a key
export type LastSessions = Partial<Record<MuscleGroup, LastSession>>;

function muscleGroupLookup(exercises: readonly Exercise[]): Map<string, MuscleGroup> {
  return new Map(exercises.map((exercise) => [exercise.id, exercise.muscleGroup]));
}

// List the groups the entries train, in declared order; deleted exercises have none
export function muscleGroupsOf(
  entries: readonly WorkoutEntry[],
  exercises: readonly Exercise[],
): MuscleGroup[] {
  const groupOf = muscleGroupLookup(exercises);
  const trained = new Set(entries.map((entry) => groupOf.get(entry.exerciseId)));
  return MUSCLE_GROUPS.filter((group) => trained.has(group));
}

// Find each muscle group's entries from its most recent workout
// Expects workouts newest first, as every repository read returns them
export function lastSessionByMuscleGroup(
  workouts: readonly Workout[],
  exercises: readonly Exercise[],
): LastSessions {
  const groupOf = muscleGroupLookup(exercises);

  return workouts.reduce<LastSessions>((found, workout) => {
    const additions = MUSCLE_GROUPS.flatMap((group) => {
      if (found[group]) return [];
      const entries = workout.entries.filter((entry) => groupOf.get(entry.exerciseId) === group);
      return entries.length > 0 ? [[group, { performedAt: workout.performedAt, entries }]] : [];
    });

    return additions.length > 0 ? { ...found, ...Object.fromEntries(additions) } : found;
  }, {});
}

// Collect the entries to copy for the picked groups, in declared order
export function entriesToCopy(
  sessions: LastSessions,
  groups: readonly MuscleGroup[],
): WorkoutEntry[] {
  return MUSCLE_GROUPS.filter((group) => groups.includes(group)).flatMap(
    (group) => sessions[group]?.entries ?? [],
  );
}
