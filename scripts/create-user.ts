// Creates an account from the command line. This is the only way to make the
// first admin — there is no public sign-up, so without it a fresh database has
// nobody who can reach /users to create anyone else.
//
// Run with: npm run user:create -- --email ken@example.com --name Ken --role admin
// The password is read from stdin so it never lands in shell history.
import { createInterface } from "node:readline/promises";
import mongoose from "mongoose";

import { readEnv } from "../src/lib/env";
import { UserModel } from "../src/models/user";
import { hashPassword } from "../src/server/auth/password";
import { createUserSchema } from "../src/domain/auth-schemas";
import { isRole } from "../src/domain/roles";

// An Atlas URI carries a password, and this message goes to a terminal
function redactUri(uri: string): string {
  return uri.replace(/\/\/[^@/]*@/, "//***@");
}

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function promptPassword(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    // Not hidden: Node has no portable way to mute stdin echo, and a visible
    // prompt is still better than a password sitting in shell history
    return (await rl.question("Password (visible as you type): ")).trim();
  } finally {
    rl.close();
  }
}

async function createUser(): Promise<void> {
  const email = readFlag("email");
  const name = readFlag("name");
  const role = readFlag("role") ?? "user";

  if (!email || !name) {
    throw new Error(
      "Usage: npm run user:create -- --email you@example.com --name 'Your Name' [--role admin]",
    );
  }

  if (!isRole(role)) {
    throw new Error(`--role must be "admin" or "user", got "${role}"`);
  }

  const password = await promptPassword();

  // The same schema the admin UI uses, so the CLI cannot create an account the
  // app would consider invalid
  const parsed = createUserSchema.safeParse({ name, email, password, role });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
    );
  }

  const env = readEnv();
  // Unlike seeding this only inserts, so a remote target needs no --force
  console.log(`Creating ${parsed.data.email} on ${redactUri(env.MONGODB_URI)}`);
  await mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB });

  // Without this the unique email index may not exist yet on a fresh database,
  // and two runs would both succeed
  await UserModel.syncIndexes();

  const { password: raw, ...rest } = parsed.data;
  await UserModel.create({ ...rest, passwordHash: await hashPassword(raw) });

  console.log(`Created ${parsed.data.role} ${parsed.data.email}`);
  await mongoose.disconnect();
}

createUser().catch((error) => {
  console.error("Could not create the account:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
