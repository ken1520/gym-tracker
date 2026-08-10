import "server-only";

import { connection } from "next/server";

import { connectToDatabase } from "@/lib/mongoose";
import { WorkoutModel } from "@/models/workout";
import type { Workout } from "@/domain/types";
import type { WorkoutInput } from "@/domain/schemas";

// Lean docs are plain objects but still carry ObjectId/Date, so map them explicitly
type LeanWorkout = {
  _id: unknown;
  performedAt: Date;
  title: string;
  notes?: string | null;
  entries: {
    exerciseId: unknown;
    exerciseName: string;
    sets: {
      weightKg: number;
      reps: number;
      rpe?: number | null;
      isWarmup?: boolean | null;
    }[];
  }[];
};

function toWorkout(doc: LeanWorkout): Workout {
  return {
    id: String(doc._id),
    performedAt: doc.performedAt.toISOString(),
    title: doc.title,
    ...(doc.notes ? { notes: doc.notes } : {}),
    entries: doc.entries.map((entry) => ({
      exerciseId: String(entry.exerciseId),
      exerciseName: entry.exerciseName,
      sets: entry.sets.map((set) => ({
        weightKg: set.weightKg,
        reps: set.reps,
        ...(typeof set.rpe === "number" ? { rpe: set.rpe } : {}),
        isWarmup: Boolean(set.isWarmup),
      })),
    })),
  };
}

export async function listWorkouts(limit = 50): Promise<Workout[]> {
  // Database reads must never be baked into a prerender
  await connection();
  await connectToDatabase();
  const docs = await WorkoutModel.find()
    .sort({ performedAt: -1 })
    .limit(limit)
    .lean<LeanWorkout[]>()
    .exec();

  return docs.map(toWorkout);
}

// Half-open UTC range so the calendar only pulls the month it renders
export async function listWorkoutsInMonth(monthKey: string): Promise<Workout[]> {
  await connection();
  await connectToDatabase();

  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const docs = await WorkoutModel.find({ performedAt: { $gte: start, $lt: end } })
    .sort({ performedAt: -1 })
    .lean<LeanWorkout[]>()
    .exec();

  return docs.map(toWorkout);
}

export async function findWorkout(id: string): Promise<Workout | null> {
  await connection();
  await connectToDatabase();
  const doc = await WorkoutModel.findById(id).lean<LeanWorkout | null>().exec();
  return doc ? toWorkout(doc) : null;
}

export async function createWorkout(input: WorkoutInput): Promise<Workout> {
  await connectToDatabase();
  const created = await WorkoutModel.create(input);
  return toWorkout(created.toObject() as LeanWorkout);
}

export async function deleteWorkout(id: string): Promise<boolean> {
  await connectToDatabase();
  const result = await WorkoutModel.findByIdAndDelete(id).exec();
  return result !== null;
}
