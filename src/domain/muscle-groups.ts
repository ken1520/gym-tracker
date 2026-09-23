import { MUSCLE_GROUPS } from "@/domain/constants";
import type { MuscleGroup } from "@/domain/constants";

// A workout entry keeps only a denormalized exercise name, so anything whose
// exercise has since been deleted has no muscle group left to file it under
export const UNGROUPED = "ungrouped";

export type MuscleGroupKey = MuscleGroup | typeof UNGROUPED;

export type MuscleGrouped<Row> = {
  key: MuscleGroupKey;
  rows: Row[];
};

// Muscle groups keep their declared order, which reads better than alphabetical;
// anything unmatched lands at the end
const GROUP_ORDER: readonly MuscleGroupKey[] = [...MUSCLE_GROUPS, UNGROUPED];

// Sentence-cased at source rather than in CSS, because a browser renders an
// <optgroup> label with the platform's own styling and ignores text-transform
export function muscleGroupLabel(key: MuscleGroupKey): string {
  const text = key === UNGROUPED ? "no longer in the library" : key;
  return text.charAt(0).toLocaleUpperCase("en-GB") + text.slice(1);
}

// Collects rows under their muscle group, keeping the declared group order and
// dropping groups nothing landed in. Rows keep the order they arrived in, so a
// caller that hands over a sorted list gets sorted groups back
export function groupByMuscle<Row>(
  entries: Iterable<readonly [MuscleGroupKey, Row]>,
): MuscleGrouped<Row>[] {
  const grouped = new Map<MuscleGroupKey, Row[]>();

  for (const [key, row] of entries) {
    const rows = grouped.get(key);
    if (rows) rows.push(row);
    else grouped.set(key, [row]);
  }

  return GROUP_ORDER.flatMap((key) => {
    const rows = grouped.get(key);
    return rows ? [{ key, rows }] : [];
  });
}
