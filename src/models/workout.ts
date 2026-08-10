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
    performedAt: { type: Date, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    notes: { type: String, trim: true, maxlength: 2000 },
    entries: { type: [entrySchema], required: true },
  },
  { timestamps: true },
);

// History views always sort newest first
workoutSchema.index({ performedAt: -1 });

export type WorkoutDoc = InferSchemaType<typeof workoutSchema>;

export const WorkoutModel: Model<WorkoutDoc> =
  (mongoose.models.Workout as Model<WorkoutDoc>) ??
  mongoose.model<WorkoutDoc>("Workout", workoutSchema);
