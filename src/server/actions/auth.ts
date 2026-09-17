"use server";

import { loginSchema } from "@/domain/auth-schemas";
import { toFieldErrors } from "@/domain/schemas";
import { findUserByEmail } from "@/server/repositories/users";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/server/auth/password";
import { endSession, startSession } from "@/server/auth/session";
import type { ActionState } from "@/server/actions/state";

// Deliberately identical for "no such account" and "wrong password", so the
// form cannot be used to find out which emails have accounts
const INVALID_CREDENTIALS = "Email or password is incorrect";

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const user = await findUserByEmail(parsed.data.email);

    // No early return on a missing account: hashing anyway keeps the response
    // time roughly the same either way, so timing does not leak which emails exist
    const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const matches = await verifyPassword(parsed.data.password, hash);

    if (!user || !matches) {
      return { status: "error", message: INVALID_CREDENTIALS };
    }

    await startSession({
      userId: user.id,
      role: user.role,
      sessionVersion: user.sessionVersion,
    });
  } catch (error) {
    console.error("loginAction failed", error);
    return { status: "error", message: "Could not sign in. Is MongoDB running?" };
  }

  // The client navigates rather than the action redirecting, so the toast
  // survives — the same contract the workout form relies on
  return { status: "success", message: "Signed in", redirectTo: "/" };
}

export async function logoutAction(): Promise<ActionState> {
  await endSession();
  return { status: "success", message: "Signed out", redirectTo: "/login" };
}
