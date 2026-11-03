import { bestSet, personalBests } from "@/domain/metrics";
import { nextTarget } from "@/domain/overload";
import type { Exercise, Workout, WorkoutEntry, WorkoutSet } from "@/domain/types";

// A set to prefill; a missing load or rep count leaves that field blank
export type PlannedSet = { weightKg?: number; reps?: number; isWarmup: boolean };

// Only exercises the lifter has logged have a key
export type SetPlans = Record<string, PlannedSet[]>;

const WORKING_SETS_AT_LATEST_LOAD = 2;

// One warmup then three working sets, used when there is no history to fill from
export const BLANK_PLAN: readonly PlannedSet[] = [
  { isWarmup: true },
  ...Array.from({ length: WORKING_SETS_AT_LATEST_LOAD + 1 }, () => ({ isWarmup: false })),
];

const plannedSet = (set: WorkoutSet | null | undefined, isWarmup: boolean): PlannedSet =>
  set ? { weightKg: set.weightKg, reps: set.reps, isWarmup } : { isWarmup };

// Keep each exercise's entry from its most recent workout
// Expects workouts newest first, as every repository read returns them
function latestEntries(workouts: readonly Workout[]): Map<string, WorkoutEntry> {
  const latest = new Map<string, WorkoutEntry>();
  for (const entry of workouts.flatMap((workout) => workout.entries)) {
    if (!latest.has(entry.exerciseId)) latest.set(entry.exerciseId, entry);
  }
  return latest;
}

// Warm up and repeat the latest load twice, then reach for the dashboard's next target
export function planSetsByExercise(
  workouts: readonly Workout[],
  exercises: readonly Exercise[],
): SetPlans {
  const equipmentOf = new Map(exercises.map((exercise) => [exercise.id, exercise.equipment]));
  const bests = personalBests(workouts);

  const plans = [...latestEntries(workouts)].map(([exerciseId, entry]) => {
    const lastWarmup = entry.sets.findLast((set) => set.isWarmup);
    const latestWorking = plannedSet(bestSet(entry.sets), false);
    const best = bests.get(exerciseId);
    const target = best
      ? { ...nextTarget(best.set, equipmentOf.get(exerciseId)), isWarmup: false }
      : { isWarmup: false };

    const plan: PlannedSet[] = [
      plannedSet(lastWarmup, true),
      ...Array.from({ length: WORKING_SETS_AT_LATEST_LOAD }, () => latestWorking),
      target,
    ];
    return [exerciseId, plan] as const;
  });

  return Object.fromEntries(plans);
}
