import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { EQUIPMENT, MACHINE_BRANDS, MUSCLE_GROUPS } from "@/domain/constants";

const exerciseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    muscleGroup: { type: String, required: true, enum: MUSCLE_GROUPS },
    equipment: { type: String, required: true, enum: EQUIPMENT },
    // Optional and only set for machines; the pairing rule lives in the Zod schema
    machineBrand: { type: String, enum: MACHINE_BRANDS },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

// A name may repeat across equipment or machine brands — a barbell and a
// dumbbell "Chest Press" are different lifts — so the key is the whole triple
// rather than the name alone. Mongo indexes a missing machineBrand as null, so
// two unbranded barbell "Chest Press" entries still collide. Casing is ignored.
// Changing this index needs `npm run db:sync-indexes`; Mongoose adds the new
// index but never drops the old one
exerciseSchema.index(
  { name: 1, equipment: 1, machineBrand: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

export type ExerciseDoc = InferSchemaType<typeof exerciseSchema>;

// Reuse the compiled model across hot reloads, otherwise Mongoose throws OverwriteModelError
export const ExerciseModel: Model<ExerciseDoc> =
  (mongoose.models.Exercise as Model<ExerciseDoc>) ??
  mongoose.model<ExerciseDoc>("Exercise", exerciseSchema);
