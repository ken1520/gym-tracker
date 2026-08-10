// The log form posts flat, indexed field names because the set count is dynamic
// e.g. entries.0.sets.2.reps — this rebuilds the nested shape Zod expects
type RawSet = {
  weightKg: string;
  reps: string;
  rpe?: string;
  isWarmup: boolean;
};

type RawEntry = {
  exerciseId: string;
  exerciseName: string;
  sets: RawSet[];
};

const ENTRY_FIELD = /^entries\.(\d+)\.(exerciseId|exerciseName)$/;
const SET_FIELD = /^entries\.(\d+)\.sets\.(\d+)\.(weightKg|reps|rpe|isWarmup)$/;

export function parseWorkoutForm(formData: FormData): {
  performedAt: string;
  title: string;
  notes?: string;
  entries: RawEntry[];
} {
  const entries = new Map<number, RawEntry>();

  const entryAt = (index: number): RawEntry => {
    const existing = entries.get(index);
    if (existing) return existing;
    const created: RawEntry = { exerciseId: "", exerciseName: "", sets: [] };
    entries.set(index, created);
    return created;
  };

  const setAt = (entryIndex: number, setIndex: number): RawSet => {
    const entry = entryAt(entryIndex);
    const existing = entry.sets[setIndex];
    if (existing) return existing;
    const created: RawSet = { weightKg: "", reps: "", isWarmup: false };
    entry.sets[setIndex] = created;
    return created;
  };

  for (const [key, rawValue] of formData.entries()) {
    const value = String(rawValue);

    const entryMatch = ENTRY_FIELD.exec(key);
    if (entryMatch) {
      const entry = entryAt(Number(entryMatch[1]));
      if (entryMatch[2] === "exerciseId") entry.exerciseId = value;
      else entry.exerciseName = value;
      continue;
    }

    const setMatch = SET_FIELD.exec(key);
    if (!setMatch) continue;

    const set = setAt(Number(setMatch[1]), Number(setMatch[2]));
    const field = setMatch[3];
    if (field === "isWarmup") set.isWarmup = true;
    else if (field === "rpe") set.rpe = value === "" ? undefined : value;
    else if (field === "weightKg") set.weightKg = value;
    else set.reps = value;
  }

  const notes = String(formData.get("notes") ?? "").trim();

  return {
    performedAt: String(formData.get("performedAt") ?? ""),
    title: String(formData.get("title") ?? "").trim(),
    ...(notes ? { notes } : {}),
    // Sparse indices are possible when a row is removed client-side
    entries: [...entries.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, entry]) => ({ ...entry, sets: entry.sets.filter(Boolean) }))
      .filter((entry) => entry.exerciseId !== "" && entry.sets.length > 0),
  };
}
