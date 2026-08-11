// Populates a starter exercise library and one sample workout
// Run with: npm run seed
import mongoose from "mongoose";

import { isLocalMongoUri, readEnv } from "../src/lib/env";
import { ExerciseModel } from "../src/models/exercise";
import { WorkoutModel } from "../src/models/workout";
import type { Equipment, MuscleGroup } from "../src/domain/constants";

const STARTER_EXERCISES: {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
}[] = [
  { name: "Back Squat", muscleGroup: "legs", equipment: "barbell" },
  { name: "Bench Press", muscleGroup: "chest", equipment: "barbell" },
  { name: "Deadlift", muscleGroup: "back", equipment: "barbell" },
  { name: "Overhead Press", muscleGroup: "shoulders", equipment: "barbell" },
  { name: "Barbell Row", muscleGroup: "back", equipment: "barbell" },
  { name: "Pull Up", muscleGroup: "back", equipment: "bodyweight" },
  { name: "Dumbbell Curl", muscleGroup: "biceps", equipment: "dumbbell" },
  { name: "Triceps Pushdown", muscleGroup: "triceps", equipment: "cable" },
  { name: "Romanian Deadlift", muscleGroup: "glutes", equipment: "barbell" },
  { name: "Plank", muscleGroup: "core", equipment: "bodyweight" },
];

// An Atlas URI carries a password, and this message goes to a terminal
function redactUri(uri: string): string {
  return uri.replace(/\/\/[^@/]*@/, "//***@");
}

async function seed(): Promise<void> {
  const env = readEnv();

  // Seeding wipes both collections. Against Atlas that is real training history,
  // so a remote target has to be confirmed rather than reached by a stray script
  if (!isLocalMongoUri(env.MONGODB_URI) && !process.argv.includes("--force")) {
    throw new Error(
      `Refusing to seed a non-local database (${redactUri(env.MONGODB_URI)}). ` +
        "Seeding deletes every exercise and workout. Re-run with --force if that is what you want.",
    );
  }

  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB });

  await ExerciseModel.deleteMany({});
  await WorkoutModel.deleteMany({});

  const exercises = await ExerciseModel.insertMany(STARTER_EXERCISES);
  const byName = new Map(exercises.map((exercise) => [exercise.name, exercise]));

  const squat = byName.get("Back Squat");
  const bench = byName.get("Bench Press");
  if (!squat || !bench) throw new Error("Seed exercises missing");

  await WorkoutModel.create({
    performedAt: new Date(),
    title: "Lower + Push",
    notes: "Felt strong, bar speed good on the last set",
    entries: [
      {
        exerciseId: squat._id,
        exerciseName: squat.name,
        sets: [
          { weightKg: 60, reps: 8, isWarmup: true },
          { weightKg: 100, reps: 5 },
          { weightKg: 100, reps: 5 },
          { weightKg: 105, reps: 3, rpe: 8 },
        ],
      },
      {
        exerciseId: bench._id,
        exerciseName: bench.name,
        sets: [
          { weightKg: 40, reps: 10, isWarmup: true },
          { weightKg: 80, reps: 5 },
          { weightKg: 80, reps: 5 },
        ],
      },
    ],
  });

  console.log(`Seeded ${exercises.length} exercises and 1 workout`);
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
