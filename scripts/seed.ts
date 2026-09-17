// Populates a starter exercise library, a demo admin, and one sample workout
// Run with: npm run seed
import mongoose from "mongoose";

import { isLocalMongoUri, readEnv } from "../src/lib/env";
import { ExerciseModel } from "../src/models/exercise";
import { WorkoutModel } from "../src/models/workout";
import { UserModel } from "../src/models/user";
import { hashPassword } from "../src/server/auth/password";
import type { Equipment, MuscleGroup } from "../src/domain/constants";

// A known-weak password on purpose: this only ever runs against a local
// database (the guard below refuses anything else without --force), and a
// memorable one beats copy-pasting a generated string into the login form.
// Change it from /account the moment this database stops being a scratch one
const DEMO_ADMIN = {
  email: "admin@example.com",
  name: "Admin",
  role: "admin" as const,
  password: "changeme123",
};

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

  // Seeding wipes all three collections, accounts included. Against Atlas that
  // is real training history, so a remote target has to be confirmed rather
  // than reached by a stray script
  if (!isLocalMongoUri(env.MONGODB_URI) && !process.argv.includes("--force")) {
    throw new Error(
      `Refusing to seed a non-local database (${redactUri(env.MONGODB_URI)}). ` +
        "Seeding deletes every exercise, workout and account. Re-run with --force if that is what you want.",
    );
  }

  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB });

  await ExerciseModel.deleteMany({});
  await WorkoutModel.deleteMany({});
  await UserModel.deleteMany({});

  // Indexes are built explicitly: on a fresh database the unique email index
  // may not exist yet, and a scoped workout query needs { userId, performedAt }
  await Promise.all([
    ExerciseModel.syncIndexes(),
    WorkoutModel.syncIndexes(),
    UserModel.syncIndexes(),
  ]);

  // Workouts are scoped to an owner, so the sample one needs an account to
  // belong to or nothing in the app would ever show it
  const admin = await UserModel.create({
    email: DEMO_ADMIN.email,
    name: DEMO_ADMIN.name,
    role: DEMO_ADMIN.role,
    passwordHash: await hashPassword(DEMO_ADMIN.password),
  });

  const exercises = await ExerciseModel.insertMany(STARTER_EXERCISES);
  const byName = new Map(exercises.map((exercise) => [exercise.name, exercise]));

  const squat = byName.get("Back Squat");
  const bench = byName.get("Bench Press");
  if (!squat || !bench) throw new Error("Seed exercises missing");

  await WorkoutModel.create({
    userId: admin._id,
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
  console.log(`Sign in as ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`);
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
