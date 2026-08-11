export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "glutes",
  "core",
  "full-body",
] as const;

export const EQUIPMENT = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "other",
] as const;

// Only meaningful when equipment is "machine", since plates and dumbbells are
// not tracked by manufacturer here
export const MACHINE_BRANDS = [
  "Life Fitness",
  "Technogym",
  "Hammer Strength",
  "Cybex",
  "Precor",
  "Matrix",
  "Nautilus",
  "Gym80",
  "Panatta",
  "Prime Fitness",
  "Other",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type Equipment = (typeof EQUIPMENT)[number];
export type MachineBrand = (typeof MACHINE_BRANDS)[number];

// The one equipment value that unlocks the brand field
export const BRANDED_EQUIPMENT: Equipment = "machine";

// Guards against typos and absurd entries at the system boundary
export const LIMITS = {
  maxWeightKg: 1000,
  maxReps: 1000,
  minRpe: 1,
  maxRpe: 10,
  maxSetsPerEntry: 50,
  maxEntriesPerWorkout: 50,
} as const;

// Single source of truth for exercise-name characters, shared by the Zod schema
// and the client form so both reject exactly the same input.
// Must open with a letter or digit, which also rules out punctuation-only names
// like "---". Allows the punctuation real exercise names use:
// "Close-Grip Bench Press", "Farmer's Walk", "Pull-Up / Chin-Up", "45° Back Extension"
export const EXERCISE_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} '()\-/.,+&°]*$/u;

export const EXERCISE_NAME_MESSAGE =
  "Start with a letter or number; only letters, numbers, spaces and ' ( ) - / . , + & ° are allowed";
