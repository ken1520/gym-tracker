import { MUSCLE_GROUPS } from "@/domain/constants";
import type { MachineBrand, MuscleGroup } from "@/domain/constants";
import type { PersonalBest } from "@/domain/metrics";
import type { Exercise, WorkoutSet } from "@/domain/types";

// A workout entry keeps only a denormalized exercise name, so a best set whose
// exercise has since been deleted has no muscle group left to file it under
export const UNGROUPED = "ungrouped";

export type BestsGroupKey = MuscleGroup | typeof UNGROUPED;

export type ExerciseBest = {
  exerciseId: string;
  name: string;
  // Only ever present for machines, and shown beside the name
  machineBrand?: MachineBrand;
  set: WorkoutSet;
  oneRepMax: number;
};

export type BestsGroup = {
  key: BestsGroupKey;
  bests: ExerciseBest[];
};

// Muscle groups keep their declared order, which reads better than alphabetical;
// anything unmatched lands at the end
const GROUP_ORDER: readonly BestsGroupKey[] = [...MUSCLE_GROUPS, UNGROUPED];

// Strongest first, then by name so equal estimates keep a stable order.
// The locale is pinned for the same reason the formatters pin theirs
function byStrengthThenName(a: ExerciseBest, b: ExerciseBest): number {
  return b.oneRepMax - a.oneRepMax || a.name.localeCompare(b.name, "en-GB");
}

// Joins personal bests to the exercise library to recover the muscle group and
// machine brand, which workouts do not store
export function groupBestsByMuscle(
  bests: ReadonlyMap<string, PersonalBest>,
  exercises: readonly Exercise[],
): BestsGroup[] {
  const library = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const grouped = new Map<BestsGroupKey, ExerciseBest[]>();

  for (const [exerciseId, best] of bests) {
    const exercise = library.get(exerciseId);

    const row: ExerciseBest = {
      exerciseId,
      // The library name wins so a rename shows here immediately, while the
      // denormalized name keeps a deleted exercise readable
      name: exercise?.name ?? best.exerciseName,
      ...(exercise?.machineBrand ? { machineBrand: exercise.machineBrand } : {}),
      set: best.set,
      oneRepMax: best.oneRepMax,
    };

    const key = exercise?.muscleGroup ?? UNGROUPED;
    const rows = grouped.get(key);
    if (rows) rows.push(row);
    else grouped.set(key, [row]);
  }

  return GROUP_ORDER.flatMap((key) => {
    const rows = grouped.get(key);
    return rows ? [{ key, bests: [...rows].sort(byStrengthThenName) }] : [];
  });
}
