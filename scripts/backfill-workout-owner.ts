// Assigns every ownerless workout to one account. Needed once, when accounts
// were added: workouts written before that have no userId, and every read is
// now scoped by one — so without this they exist but are invisible to everybody.
//
//   npm run db:backfill-owner -- --email you@example.com --dry-run   # look
//   npm run db:backfill-owner -- --email you@example.com             # write
//
// Safe to re-run: it only touches documents that still have no owner, so a
// second run reports nothing to do rather than moving anyone's history.
import mongoose from "mongoose";

import { readEnv } from "../src/lib/env";
import { UserModel } from "../src/models/user";
import { WorkoutModel } from "../src/models/workout";

// How many workouts to name in the preview before summarising the rest
const PREVIEW_LIMIT = 10;

// Matches both a missing userId and an explicitly null one. Mongo treats those
// as the same for { userId: null }, but spelling it out beats relying on that
const OWNERLESS = { $or: [{ userId: { $exists: false } }, { userId: null }] };

// An Atlas URI carries a password, and this message goes to a terminal
function redactUri(uri: string): string {
  return uri.replace(/\/\/[^@/]*@/, "//***@");
}

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

type OwnerlessWorkout = { title: string; performedAt: Date };

function describe(workout: OwnerlessWorkout): string {
  // Dates are stored as UTC instants and the calendar reads them in UTC, so
  // print them the same way rather than in the operator's local zone
  const day = workout.performedAt.toISOString().slice(0, 10);
  return `  ${day}  ${workout.title}`;
}

async function backfill(): Promise<void> {
  const email = readFlag("email")?.trim().toLowerCase();
  const dryRun = process.argv.includes("--dry-run");

  if (!email) {
    throw new Error(
      "Usage: npm run db:backfill-owner -- --email you@example.com [--dry-run]",
    );
  }

  const env = readEnv();
  // Adds a field to existing documents but deletes nothing, so unlike the seed
  // a remote target is allowed without --force — production is exactly where
  // this is needed. The URI is still printed so a wrong target is obvious
  console.log(`Target:  ${redactUri(env.MONGODB_URI)}`);
  console.log(`Database: ${env.MONGODB_DB}`);
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB });

  const owner = await UserModel.findOne({ email }).exec();
  if (!owner) {
    const known = await UserModel.find().select("email").lean<{ email: string }[]>().exec();
    throw new Error(
      `No account with email ${email}. ` +
        (known.length === 0
          ? "This database has no accounts yet — create one with npm run user:create."
          : `Known accounts: ${known.map((user) => user.email).join(", ")}`),
    );
  }

  const total = await WorkoutModel.countDocuments().exec();
  const ownerless = await WorkoutModel.find(OWNERLESS)
    .sort({ performedAt: 1 })
    .lean<OwnerlessWorkout[]>()
    .exec();

  console.log(`\n${total} workouts total, ${ownerless.length} with no owner`);

  if (ownerless.length === 0) {
    console.log("Nothing to do — every workout already belongs to an account");
    await mongoose.disconnect();
    return;
  }

  // Printed before the write so a wrong --email is caught while it is still
  // cheap to fix, rather than after the history has moved
  console.log(`\nWould assign to ${owner.email} (${owner.name}):`);
  for (const workout of ownerless.slice(0, PREVIEW_LIMIT)) {
    console.log(describe(workout));
  }
  if (ownerless.length > PREVIEW_LIMIT) {
    console.log(`  … and ${ownerless.length - PREVIEW_LIMIT} more`);
  }

  if (dryRun) {
    console.log("\nDry run — nothing was written. Re-run without --dry-run to apply.");
    await mongoose.disconnect();
    return;
  }

  const result = await WorkoutModel.updateMany(OWNERLESS, {
    $set: { userId: owner._id },
  }).exec();

  console.log(`\nAssigned ${result.modifiedCount} workouts to ${owner.email}`);

  // Reads are scoped by owner, so anything still ownerless stays invisible.
  // Report it rather than exiting clean on a partial write
  const remaining = await WorkoutModel.countDocuments(OWNERLESS).exec();
  if (remaining > 0) {
    console.warn(`Warning: ${remaining} workouts are still ownerless. Re-run to finish.`);
  }

  await mongoose.disconnect();
}

backfill().catch((error) => {
  console.error("\nBackfill failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
