import "server-only";

import { connection } from "next/server";

import { connectToDatabase } from "@/lib/mongoose";
import { UserModel } from "@/models/user";
import type { Role } from "@/domain/roles";
import type { User } from "@/domain/types";
import type { CreateUserInput, UpdateUserInput } from "@/domain/auth-schemas";

type LeanUser = {
  _id: unknown;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  sessionVersion: number;
  createdAt: Date;
};

// Carries the two fields the UI must never see. Stays inside src/server/
export type UserRecord = User & { passwordHash: string; sessionVersion: number };

function toUser(doc: LeanUser): User {
  return {
    id: String(doc._id),
    email: doc.email,
    name: doc.name,
    role: doc.role,
    createdAt: doc.createdAt.toISOString(),
  };
}

function toRecord(doc: LeanUser): UserRecord {
  return { ...toUser(doc), passwordHash: doc.passwordHash, sessionVersion: doc.sessionVersion };
}

export async function listUsers(): Promise<User[]> {
  // Database reads must never be baked into a prerender
  await connection();
  await connectToDatabase();
  const docs = await UserModel.find().sort({ createdAt: 1 }).lean<LeanUser[]>().exec();
  return docs.map(toUser);
}

export async function countUsers(): Promise<number> {
  await connectToDatabase();
  return UserModel.estimatedDocumentCount().exec();
}

// Emails are stored lowercase, so an exact match is already case-insensitive
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  await connectToDatabase();
  const doc = await UserModel.findOne({ email: email.trim().toLowerCase() })
    .lean<LeanUser | null>()
    .exec();
  return doc ? toRecord(doc) : null;
}

// No connection() here: every caller has already read the session cookie, which
// opts the route out of static rendering on its own
export async function findUserById(id: string): Promise<UserRecord | null> {
  await connectToDatabase();

  let doc: LeanUser | null;
  try {
    doc = await UserModel.findById(id).lean<LeanUser | null>().exec();
  } catch {
    // A malformed id in a forged cookie casts badly rather than matching nothing
    return null;
  }

  return doc ? toRecord(doc) : null;
}

export async function createUser(
  input: Omit<CreateUserInput, "password"> & { passwordHash: string },
): Promise<User> {
  await connectToDatabase();
  const created = await UserModel.create(input);
  return toUser(created.toObject() as LeanUser);
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User | null> {
  await connectToDatabase();
  // Every field is required, so there is nothing to $unset the way exercises need
  const updated = await UserModel.findByIdAndUpdate(id, { $set: input }, {
    new: true,
    runValidators: true,
  })
    .lean<LeanUser | null>()
    .exec();

  return updated ? toUser(updated) : null;
}

// Bumping sessionVersion is what signs out every device holding an older cookie
export async function setUserPassword(id: string, passwordHash: string): Promise<boolean> {
  await connectToDatabase();
  const updated = await UserModel.findByIdAndUpdate(
    id,
    { $set: { passwordHash }, $inc: { sessionVersion: 1 } },
    { new: true },
  )
    .lean<LeanUser | null>()
    .exec();

  return updated !== null;
}

export async function deleteUser(id: string): Promise<boolean> {
  await connectToDatabase();
  const result = await UserModel.findByIdAndDelete(id).exec();
  return result !== null;
}

export async function countAdmins(): Promise<number> {
  await connectToDatabase();
  return UserModel.countDocuments({ role: "admin" }).exec();
}
