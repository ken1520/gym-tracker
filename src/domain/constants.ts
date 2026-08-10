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

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type Equipment = (typeof EQUIPMENT)[number];

// Guards against typos and absurd entries at the system boundary
export const LIMITS = {
  maxWeightKg: 1000,
  maxReps: 1000,
  minRpe: 1,
  maxRpe: 10,
  maxSetsPerEntry: 50,
  maxEntriesPerWorkout: 50,
} as const;
