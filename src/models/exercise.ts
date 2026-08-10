import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { EQUIPMENT, MUSCLE_GROUPS } from "@/domain/constants";

const exerciseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    muscleGroup: { type: String, required: true, enum: MUSCLE_GROUPS },
    equipment: { type: String, required: true, enum: EQUIPMENT },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

// Prevents duplicate exercises in the library regardless of casing
exerciseSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

export type ExerciseDoc = InferSchemaType<typeof exerciseSchema>;

// Reuse the compiled model across hot reloads, otherwise Mongoose throws OverwriteModelError
export const ExerciseModel: Model<ExerciseDoc> =
  (mongoose.models.Exercise as Model<ExerciseDoc>) ??
  mongoose.model<ExerciseDoc>("Exercise", exerciseSchema);
