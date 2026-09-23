import { exerciseQualifier } from "@/domain/exercise-label";
import { UNGROUPED, groupByMuscle } from "@/domain/muscle-groups";
import type { MuscleGroupKey } from "@/domain/muscle-groups";
import type { Exercise, WorkoutEntry } from "@/domain/types";

// label is what the dropdown shows; name is what gets stored, and the two differ
// for a deleted exercise so the marker never writes itself into the record
export type ExerciseOption = {
  id: string;
  name: string;
  label: string;
};

export type ExerciseOptionGroup = {
  key: MuscleGroupKey;
  options: ExerciseOption[];
};

// Every option carries its machine brand or equipment, so picking a lift never
// depends on remembering which "Chest Press" is which. A deleted exercise has
// neither left to show and keeps its own marker instead
function toOption(exercise: Exercise): ExerciseOption {
  return {
    id: exercise.id,
    name: exercise.name,
    label: `${exercise.name} (${exerciseQualifier(exercise)})`,
  };
}

// The library grouped by the muscle each exercise targets, in the declared group
// order. An edited workout can reference an exercise that has since been
// deleted; exerciseName is denormalized for exactly that case, so those ids stay
// selectable under a trailing group instead of being silently rewritten
export function buildExerciseOptions(
  exercises: readonly Exercise[],
  entries: readonly WorkoutEntry[] = [],
): ExerciseOptionGroup[] {
  const library = new Set(exercises.map((exercise) => exercise.id));
  const seen = new Set<string>();

  const rows = exercises.map(
    (exercise) => [exercise.muscleGroup, toOption(exercise)] as const,
  );

  // An exercise can appear on several entries of the same workout
  const removed = entries.flatMap((entry) => {
    if (library.has(entry.exerciseId) || seen.has(entry.exerciseId)) return [];
    seen.add(entry.exerciseId);

    return [
      [
        UNGROUPED,
        {
          id: entry.exerciseId,
          name: entry.exerciseName,
          label: `${entry.exerciseName} (removed)`,
        },
      ] as const,
    ];
  });

  return groupByMuscle([...rows, ...removed]).map((group) => ({
    key: group.key,
    options: group.rows,
  }));
}

export function flattenOptions(groups: readonly ExerciseOptionGroup[]): ExerciseOption[] {
  return groups.flatMap((group) => group.options);
}
