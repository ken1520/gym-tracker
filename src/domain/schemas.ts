import { z } from "zod";

import { EQUIPMENT, LIMITS, MUSCLE_GROUPS } from "@/domain/constants";

const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Must be a valid MongoDB ObjectId");

export const setInputSchema = z.object({
  weightKg: z.coerce
    .number()
    .min(0, "Weight cannot be negative")
    .max(LIMITS.maxWeightKg),
  reps: z.coerce.number().int().min(1, "Reps must be at least 1").max(LIMITS.maxReps),
  rpe: z.coerce.number().min(LIMITS.minRpe).max(LIMITS.maxRpe).optional(),
  isWarmup: z.coerce.boolean().default(false),
});

export const entryInputSchema = z.object({
  exerciseId: objectId,
  exerciseName: z.string().trim().min(1).max(120),
  sets: z.array(setInputSchema).min(1, "Add at least one set").max(LIMITS.maxSetsPerEntry),
});

export const workoutInputSchema = z.object({
  performedAt: z.coerce.date(),
  title: z.string().trim().min(1, "Title is required").max(120),
  notes: z.string().trim().max(2000).optional(),
  entries: z
    .array(entryInputSchema)
    .min(1, "Log at least one exercise")
    .max(LIMITS.maxEntriesPerWorkout),
});

export const exerciseInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  muscleGroup: z.enum(MUSCLE_GROUPS),
  equipment: z.enum(EQUIPMENT),
  notes: z.string().trim().max(1000).optional(),
});

export type SetInput = z.infer<typeof setInputSchema>;
export type EntryInput = z.infer<typeof entryInputSchema>;
export type WorkoutInput = z.infer<typeof workoutInputSchema>;
export type ExerciseInput = z.infer<typeof exerciseInputSchema>;

// Collapses Zod issues into a field -> message map the forms can render
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  return error.issues.reduce<Record<string, string>>((acc, issue) => {
    const key = issue.path.join(".") || "_form";
    return key in acc ? acc : { ...acc, [key]: issue.message };
  }, {});
}
