import type { Equipment, MachineBrand, MuscleGroup } from "@/domain/constants";

// Plain serializable shapes passed from Server Components to the client
export type WorkoutSet = {
  weightKg: number;
  reps: number;
  rpe?: number;
  isWarmup: boolean;
};

export type WorkoutEntry = {
  exerciseId: string;
  // Denormalized so history stays readable if an exercise is renamed or deleted
  exerciseName: string;
  sets: WorkoutSet[];
};

export type Workout = {
  id: string;
  performedAt: string;
  title: string;
  notes?: string;
  entries: WorkoutEntry[];
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  // Optional, and only ever set when equipment is "machine"
  machineBrand?: MachineBrand;
  notes?: string;
};
