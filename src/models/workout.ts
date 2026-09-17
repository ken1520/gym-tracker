import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { LIMITS } from "@/domain/constants";

const setSchema = new Schema(
  {
    weightKg: { type: Number, required: true, min: 0, max: LIMITS.maxWeightKg },
    reps: { type: Number, required: true, min: 1, max: LIMITS.maxReps },
    rpe: { type: Number, min: LIMITS.minRpe, max: LIMITS.maxRpe },
    isWarmup: { type: Boolean, default: false },
  },
  { _id: false },
);

const entrySchema = new Schema(
  {
    exerciseId: { type: Schema.Types.ObjectId, ref: "Exercise", required: true },
    // Denormalized so history survives an exercise rename or delete
    exerciseName: { type: String, required: true, trim: true },
    sets: { type: [setSchema], required: true },
  },
  { _id: false },
);

const workoutSchema = new Schema(
  {
    // Every workout belongs to exactly one account. Required, so a document
    // that would be invisible to every scoped query can never be written
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    performedAt: { type: Date, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    notes: { type: String, trim: true, maxlength: 2000 },
    entries: { type: [entrySchema], required: true },
  },
  { timestamps: true },
);

// Every read is scoped to an owner and sorted newest first, so the owner leads
// the compound key. The admin-only cross-user read sorts on performedAt alone
// and is served by the second index
// Changing these needs `npm run db:sync-indexes`
workoutSchema.index({ userId: 1, performedAt: -1 });
workoutSchema.index({ performedAt: -1 });

export type WorkoutDoc = InferSchemaType<typeof workoutSchema>;

export const WorkoutModel: Model<WorkoutDoc> =
  (mongoose.models.Workout as Model<WorkoutDoc>) ??
  mongoose.model<WorkoutDoc>("Workout", workoutSchema);
