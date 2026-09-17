import type { Equipment, MachineBrand, MuscleGroup } from "@/domain/constants";
import type { Role } from "@/domain/roles";

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
  // The account that logged it. Present on the client so an admin viewing every
  // account's history can label rows and hide edit controls on other people's
  userId: string;
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

// Never carries passwordHash — this is the shape that crosses into the UI
export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
};

// The subset kept in the session cookie and handed to client components
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};
