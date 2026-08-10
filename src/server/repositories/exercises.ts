import "server-only";

import { connection } from "next/server";

import { connectToDatabase } from "@/lib/mongoose";
import { ExerciseModel } from "@/models/exercise";
import type { Exercise } from "@/domain/types";
import type { ExerciseInput } from "@/domain/schemas";
import type { Equipment, MuscleGroup } from "@/domain/constants";

type LeanExercise = {
  _id: unknown;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  notes?: string | null;
};

function toExercise(doc: LeanExercise): Exercise {
  return {
    id: String(doc._id),
    name: doc.name,
    muscleGroup: doc.muscleGroup,
    equipment: doc.equipment,
    ...(doc.notes ? { notes: doc.notes } : {}),
  };
}

export async function listExercises(): Promise<Exercise[]> {
  // Database reads must never be baked into a prerender
  await connection();
  await connectToDatabase();
  const docs = await ExerciseModel.find()
    .sort({ name: 1 })
    .lean<LeanExercise[]>()
    .exec();

  return docs.map(toExercise);
}

export async function createExercise(input: ExerciseInput): Promise<Exercise> {
  await connectToDatabase();
  const created = await ExerciseModel.create(input);
  return toExercise(created.toObject() as LeanExercise);
}

export async function deleteExercise(id: string): Promise<boolean> {
  await connectToDatabase();
  const result = await ExerciseModel.findByIdAndDelete(id).exec();
  return result !== null;
}
