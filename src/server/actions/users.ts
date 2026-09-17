"use server";

import { revalidatePath } from "next/cache";

import {
  changePasswordSchema,
  createUserSchema,
  setPasswordSchema,
  updateUserSchema,
} from "@/domain/auth-schemas";
import { toFieldErrors } from "@/domain/schemas";
import { canManageUsers } from "@/domain/roles";
import {
  countAdmins,
  createUser,
  deleteUser,
  findUserById,
  setUserPassword,
  updateUser,
} from "@/server/repositories/users";
import { deleteWorkoutsForUser } from "@/server/repositories/workouts";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { authorizeAction } from "@/server/auth/guards";
import { endSession, startSession } from "@/server/auth/session";
import { isDuplicateKeyError } from "@/server/api/errors";
import type { ActionState } from "@/server/actions/state";

const DUPLICATE_EMAIL = { email: "That email already has an account" };

export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorizeAction(canManageUsers);
  if (!auth.ok) return auth.state;

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { password, ...rest } = parsed.data;

  try {
    await createUser({ ...rest, passwordHash: await hashPassword(password) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { status: "error", message: "That email is taken", fieldErrors: DUPLICATE_EMAIL };
    }

    console.error("createUserAction failed", error);
    return { status: "error", message: "Could not create the account. Is MongoDB running?" };
  }

  revalidatePath("/users");
  return { status: "success", message: `Added ${parsed.data.name}` };
}

export async function updateUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorizeAction(canManageUsers);
  if (!auth.ok) return auth.state;

  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Missing account id" };

  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    // Demoting the last admin would leave the exercise library and this page
    // unreachable for everyone, with no way back in through the UI
    if (parsed.data.role !== "admin") {
      const target = await findUserById(id);
      if (target?.role === "admin" && (await countAdmins()) <= 1) {
        return {
          status: "error",
          message: "This is the only admin — promote someone else first",
          fieldErrors: { role: "At least one admin is required" },
        };
      }
    }

    const updated = await updateUser(id, parsed.data);
    if (!updated) return { status: "error", message: "That account no longer exists" };

    // Demoting yourself has to be reflected in your own cookie straight away,
    // or the nav keeps offering admin links until the next sign-in
    if (id === auth.user.id) {
      const refreshed = await findUserById(id);
      if (refreshed) {
        await startSession({
          userId: refreshed.id,
          role: refreshed.role,
          sessionVersion: refreshed.sessionVersion,
        });
      }
    }
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { status: "error", message: "That email is taken", fieldErrors: DUPLICATE_EMAIL };
    }

    console.error("updateUserAction failed", error);
    return { status: "error", message: "Could not save the account. Is MongoDB running?" };
  }

  revalidatePath("/users");
  return { status: "success", message: `Saved ${parsed.data.name}` };
}

// Admin-set password. Separate from changePasswordAction because it does not
// ask for the old one — the point is to let someone back in who has lost it
export async function setUserPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorizeAction(canManageUsers);
  if (!auth.ok) return auth.state;

  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Missing account id" };

  const parsed = setPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const hash = await hashPassword(parsed.data.password);
    const updated = await setUserPassword(id, hash);
    if (!updated) return { status: "error", message: "That account no longer exists" };

    // setUserPassword bumps sessionVersion, which invalidates every cookie for
    // that account — including this one if an admin reset their own password
    if (id === auth.user.id) await endSession();
  } catch (error) {
    console.error("setUserPasswordAction failed", error);
    return { status: "error", message: "Could not set the password. Is MongoDB running?" };
  }

  revalidatePath("/users");
  return {
    status: "success",
    message: "Password set",
    ...(id === auth.user.id ? { redirectTo: "/login" } : {}),
  };
}

export async function deleteUserAction(formData: FormData): Promise<ActionState> {
  const auth = await authorizeAction(canManageUsers);
  if (!auth.ok) return auth.state;

  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Missing account id" };

  // Deleting yourself mid-session leaves the app in a state where every request
  // 302s to /login with no explanation
  if (id === auth.user.id) {
    return { status: "error", message: "You cannot delete your own account" };
  }

  try {
    const target = await findUserById(id);
    if (!target) return { status: "error", message: "That account no longer exists" };

    if (target.role === "admin" && (await countAdmins()) <= 1) {
      return { status: "error", message: "This is the only admin — promote someone else first" };
    }

    // Workouts go first. The other order can orphan history no query reaches if
    // the second call fails, and a scoped read would never surface it again
    await deleteWorkoutsForUser(id);
    await deleteUser(id);
  } catch (error) {
    console.error("deleteUserAction failed", error);
    return { status: "error", message: "Could not remove the account. Is MongoDB running?" };
  }

  revalidatePath("/users");
  revalidatePath("/workouts");
  return { status: "success", message: "Account and its workouts removed" };
}

// Self-service, available to every role
export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.state;

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const record = await findUserById(auth.user.id);
    if (!record) return { status: "error", message: "That account no longer exists" };

    const matches = await verifyPassword(parsed.data.currentPassword, record.passwordHash);
    if (!matches) {
      return {
        status: "error",
        message: "Current password is incorrect",
        fieldErrors: { currentPassword: "Incorrect password" },
      };
    }

    await setUserPassword(auth.user.id, await hashPassword(parsed.data.password));
  } catch (error) {
    console.error("changePasswordAction failed", error);
    return { status: "error", message: "Could not change the password. Is MongoDB running?" };
  }

  // The bumped sessionVersion just invalidated this cookie along with every
  // other one, so signing back in is not optional
  await endSession();
  return {
    status: "success",
    message: "Password changed — sign in again",
    redirectTo: "/login",
  };
}
