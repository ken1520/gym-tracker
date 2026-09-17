// Drops indexes the schemas no longer declare and builds the ones they do.
// Run with: npm run db:sync-indexes
//
// Needed because Mongoose's autoIndex only ever ADDS indexes. The unique index
// on exercises moved from { name } to { name, equipment, machineBrand }, and
// until the old one is dropped it keeps rejecting the duplicates the new one
// allows. Workouts gained { userId, performedAt } when accounts arrived, and
// users need their unique email index built before the first sign-up.
import mongoose from "mongoose";

import { readEnv } from "../src/lib/env";
import { ExerciseModel } from "../src/models/exercise";
import { WorkoutModel } from "../src/models/workout";
import { UserModel } from "../src/models/user";

// An Atlas URI carries a password, and this message goes to a terminal
function redactUri(uri: string): string {
  return uri.replace(/\/\/[^@/]*@/, "//***@");
}

async function syncIndexes(): Promise<void> {
  const env = readEnv();

  // Unlike seeding this touches no documents, so a remote target is allowed —
  // production needs the same index change as everywhere else
  console.log(`Syncing indexes on ${redactUri(env.MONGODB_URI)}`);
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB });

  for (const model of [ExerciseModel, WorkoutModel, UserModel]) {
    // syncIndexes returns the names it dropped, which is the interesting half
    const dropped = await model.syncIndexes();
    console.log(
      dropped.length > 0
        ? `${model.modelName}: dropped ${dropped.join(", ")}`
        : `${model.modelName}: already up to date`,
    );
  }

  await mongoose.disconnect();
}

syncIndexes().catch((error) => {
  console.error("Index sync failed:", error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
