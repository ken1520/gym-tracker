import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

import { DEFAULT_ROLE, ROLES } from "@/domain/roles";

const userSchema = new Schema(
  {
    // Lowercased on the way in by both the Zod schema and Mongoose, which is
    // what makes a plain unique index case-insensitive. No collation here,
    // unlike exercises — a collation index is only used by queries that repeat
    // the collation, and every lookup here is an exact lowercase match
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    // scrypt output, never the password itself
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ROLES, default: DEFAULT_ROLE },
    // Bumped whenever a password changes, which invalidates every cookie issued
    // before it. Without it a stolen session outlives the password it came from
    sessionVersion: { type: Number, required: true, default: 1 },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;

// Reuse the compiled model across hot reloads, otherwise Mongoose throws OverwriteModelError
export const UserModel: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ??
  mongoose.model<UserDoc>("User", userSchema);
