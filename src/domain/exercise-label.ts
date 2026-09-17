import type { Equipment, MachineBrand } from "@/domain/constants";

// The parts of an exercise that make it distinct from another of the same name
export type Distinguishable = {
  name: string;
  equipment: Equipment;
  machineBrand?: MachineBrand;
};

// The unique index is case-insensitive on name, so "chest press" and
// "Chest Press" count as the same name when deciding what needs qualifying
const normalize = (name: string) => name.toLocaleLowerCase("en-GB");

// What tells two same-named exercises apart: the brand for a branded machine,
// otherwise the equipment. Names are unique per (name, equipment, brand), so
// this is always unique among exercises sharing a name
export function exerciseQualifier(exercise: Omit<Distinguishable, "name">): string {
  return exercise.machineBrand ?? exercise.equipment;
}

// The names carried by more than one exercise in the given list, normalized
export function repeatedNames(exercises: readonly { name: string }[]): ReadonlySet<string> {
  const seen = new Set<string>();
  const repeated = new Set<string>();

  for (const { name } of exercises) {
    const key = normalize(name);
    if (seen.has(key)) repeated.add(key);
    else seen.add(key);
  }

  return repeated;
}

// Whether a name is one of the repeated ones, normalized the same way
function isRepeatedName(name: string, repeated: ReadonlySet<string>): boolean {
  return repeated.has(normalize(name));
}

// The text to show beside a name in a list that is not a picker: the brand is
// always worth showing for a machine, the equipment only when the name repeats.
// An exercise missing from the library has nothing left to qualify it with
export function qualifierFor(
  exercise: Distinguishable | undefined,
  repeated: ReadonlySet<string>,
): string | undefined {
  if (!exercise) return undefined;

  return exercise.machineBrand || isRepeatedName(exercise.name, repeated)
    ? exerciseQualifier(exercise)
    : undefined;
}
