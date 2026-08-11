import type { Workout, WorkoutEntry, WorkoutSet } from "@/domain/types";

// Warmups are excluded everywhere so they never inflate volume or PRs
export function isWorkingSet(set: WorkoutSet): boolean {
  return !set.isWarmup;
}

export function setVolume(set: WorkoutSet): number {
  return set.weightKg * set.reps;
}

export function entryVolume(entry: WorkoutEntry): number {
  return entry.sets
    .filter(isWorkingSet)
    .reduce((total, set) => total + setVolume(set), 0);
}

export function workoutVolume(workout: Workout): number {
  return workout.entries.reduce((total, entry) => total + entryVolume(entry), 0);
}

export function workingSetCount(workout: Workout): number {
  return workout.entries.reduce(
    (total, entry) => total + entry.sets.filter(isWorkingSet).length,
    0,
  );
}

// Epley formula, the common gym-app default for estimated one-rep max
export function estimatedOneRepMax(set: WorkoutSet): number {
  if (set.reps <= 0 || set.weightKg <= 0) return 0;
  if (set.reps === 1) return set.weightKg;
  return set.weightKg * (1 + set.reps / 30);
}

export function bestSet(sets: readonly WorkoutSet[]): WorkoutSet | null {
  const working = sets.filter(isWorkingSet);
  if (working.length === 0) return null;

  return working.reduce((best, set) =>
    estimatedOneRepMax(set) > estimatedOneRepMax(best) ? set : best,
  );
}

export type PersonalBest = {
  exerciseName: string;
  // The set the estimate came from, so the UI can show the lift behind the number
  set: WorkoutSet;
  oneRepMax: number;
};

// Heaviest estimated 1RM ever recorded for one exercise, keyed by exercise id
export function personalBests(workouts: readonly Workout[]): Map<string, PersonalBest> {
  const bests = new Map<string, PersonalBest>();

  for (const workout of workouts) {
    for (const entry of workout.entries) {
      const best = bestSet(entry.sets);
      if (!best) continue;

      const oneRepMax = estimatedOneRepMax(best);
      const current = bests.get(entry.exerciseId);
      if (!current || oneRepMax > current.oneRepMax) {
        bests.set(entry.exerciseId, {
          exerciseName: entry.exerciseName,
          set: best,
          oneRepMax,
        });
      }
    }
  }

  return bests;
}

export function totalVolume(workouts: readonly Workout[]): number {
  return workouts.reduce((total, workout) => total + workoutVolume(workout), 0);
}
