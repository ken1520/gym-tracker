import "server-only";

import { connection } from "next/server";
import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/mongoose";
import { WorkoutModel } from "@/models/workout";
import { toUpdateDoc } from "@/server/repositories/update-doc";
import type { Workout } from "@/domain/types";
import type { WorkoutInput } from "@/domain/schemas";
import type { WorkoutScope } from "@/domain/scope";

// Lean docs are plain objects but still carry ObjectId/Date, so map them explicitly
type LeanWorkout = {
  _id: unknown;
  userId: unknown;
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
    userId: String(doc.userId),
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

// The single place a scope becomes a query. Every read below starts from this,
// so there is one line to audit rather than one per function
function scopeFilter(scope: WorkoutScope): Record<string, unknown> {
  return scope.kind === "all" ? {} : { userId: scope.userId };
}

// A forged id would otherwise throw a CastError out of a page render
function toObjectId(id: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
}

export async function listWorkouts(scope: WorkoutScope, limit = 50): Promise<Workout[]> {
  // Database reads must never be baked into a prerender
  await connection();
  await connectToDatabase();
  const docs = await WorkoutModel.find(scopeFilter(scope))
    .sort({ performedAt: -1 })
    .limit(limit)
    .lean<LeanWorkout[]>()
    .exec();

  return docs.map(toWorkout);
}

// Half-open UTC range so the calendar only pulls the month it renders
export async function listWorkoutsInMonth(
  scope: WorkoutScope,
  monthKey: string,
): Promise<Workout[]> {
  await connection();
  await connectToDatabase();

  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const docs = await WorkoutModel.find({
    ...scopeFilter(scope),
    performedAt: { $gte: start, $lt: end },
  })
    .sort({ performedAt: -1 })
    .lean<LeanWorkout[]>()
    .exec();

  return docs.map(toWorkout);
}

export async function findWorkout(scope: WorkoutScope, id: string): Promise<Workout | null> {
  await connection();
  await connectToDatabase();

  const _id = toObjectId(id);
  if (!_id) return null;

  const doc = await WorkoutModel.findOne({ ...scopeFilter(scope), _id })
    .lean<LeanWorkout | null>()
    .exec();

  return doc ? toWorkout(doc) : null;
}

export async function createWorkout(userId: string, input: WorkoutInput): Promise<Workout> {
  await connectToDatabase();
  const created = await WorkoutModel.create({ ...input, userId });
  return toWorkout(created.toObject() as LeanWorkout);
}

// Writes take a userId rather than a scope: admins read across accounts but
// never edit another one's log, so there is no "all" variant to get wrong. A
// non-owner matches nothing and gets the same null as a deleted workout
export async function updateWorkout(
  userId: string,
  id: string,
  input: WorkoutInput,
): Promise<Workout | null> {
  await connectToDatabase();

  const _id = toObjectId(id);
  if (!_id) return null;

  const updated = await WorkoutModel.findOneAndUpdate(
    { _id, userId },
    // Entries are replaced wholesale, so a removed set or exercise really goes away
    toUpdateDoc(input, ["notes"]),
    { new: true, runValidators: true },
  )
    .lean<LeanWorkout | null>()
    .exec();

  return updated ? toWorkout(updated) : null;
}

export async function deleteWorkout(userId: string, id: string): Promise<boolean> {
  await connectToDatabase();

  const _id = toObjectId(id);
  if (!_id) return false;

  const result = await WorkoutModel.findOneAndDelete({ _id, userId }).exec();
  return result !== null;
}

// Used when an account is removed, so its history goes with it
export async function deleteWorkoutsForUser(userId: string): Promise<number> {
  await connectToDatabase();
  const result = await WorkoutModel.deleteMany({ userId }).exec();
  return result.deletedCount ?? 0;
}
