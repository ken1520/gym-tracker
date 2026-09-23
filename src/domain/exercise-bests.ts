import { qualifierFor, repeatedNames } from "@/domain/exercise-label";
import { UNGROUPED, groupByMuscle } from "@/domain/muscle-groups";
import type { MuscleGroupKey } from "@/domain/muscle-groups";
import { nextTarget } from "@/domain/overload";
import type { NextTarget } from "@/domain/overload";
import type { PersonalBest } from "@/domain/metrics";
import type { Exercise, WorkoutSet } from "@/domain/types";

export type ExerciseBest = {
  exerciseId: string;
  name: string;
  // Shown beside the name: always the brand for a machine, plus the equipment
  // when the name alone would not say which exercise this row is
  qualifier?: string;
  set: WorkoutSet;
  oneRepMax: number;
  // What to aim for next, from the same set the estimate came from
  next: NextTarget;
};

export type BestsGroup = {
  key: MuscleGroupKey;
  bests: ExerciseBest[];
};

// Strongest first, then by name so equal estimates keep a stable order.
// The locale is pinned for the same reason the formatters pin theirs
function byStrengthThenName(a: ExerciseBest, b: ExerciseBest): number {
  return b.oneRepMax - a.oneRepMax || a.name.localeCompare(b.name, "en-GB");
}

// Joins personal bests to the exercise library to recover the muscle group,
// machine brand and equipment, none of which workouts store
export function groupBestsByMuscle(
  bests: ReadonlyMap<string, PersonalBest>,
  exercises: readonly Exercise[],
): BestsGroup[] {
  const library = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  // Repetition is judged against the whole library, so the same exercise is
  // qualified here and in the workout form's dropdown or in neither
  const repeated = repeatedNames(exercises);

  const rows = [...bests].map(([exerciseId, best]) => {
    const exercise = library.get(exerciseId);
    const qualifier = qualifierFor(exercise, repeated);

    const row: ExerciseBest = {
      exerciseId,
      // The library name wins so a rename shows here immediately, while the
      // denormalized name keeps a deleted exercise readable
      name: exercise?.name ?? best.exerciseName,
      ...(qualifier ? { qualifier } : {}),
      set: best.set,
      oneRepMax: best.oneRepMax,
      next: nextTarget(best.set, exercise?.equipment),
    };

    return [exercise?.muscleGroup ?? UNGROUPED, row] as const;
  });

  return groupByMuscle(rows).map((group) => ({
    key: group.key,
    bests: [...group.rows].sort(byStrengthThenName),
  }));
}
