"use server";

import { revalidatePath } from "next/cache";

import { exerciseInputSchema, toFieldErrors } from "@/domain/schemas";
import { canManageExercises } from "@/domain/roles";
import { createExercise, deleteExercise, updateExercise } from "@/server/repositories/exercises";
import type { ActionState } from "@/server/actions/state";
import { authorizeAction } from "@/server/auth/guards";
import { isDuplicateKeyError } from "@/server/api/errors";

export async function createExerciseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // The library is shared by every account, so only an admin may touch it.
  // Hiding the UI is not the check — an action is a public POST endpoint
  const auth = await authorizeAction(canManageExercises);
  if (!auth.ok) return auth.state;

  const notes = String(formData.get("notes") ?? "").trim();
  const parsed = exerciseInputSchema.safeParse({
    name: formData.get("name"),
    muscleGroup: formData.get("muscleGroup"),
    equipment: formData.get("equipment"),
    // Absent when the form is not showing the brand dropdown
    machineBrand: formData.get("machineBrand"),
    ...(notes ? { notes } : {}),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    await createExercise(parsed.data);
  } catch (error) {
    // Duplicate key means this exact name/equipment/brand combination exists;
    // the same name on different equipment is allowed
    if (isDuplicateKeyError(error)) {
      return {
        status: "error",
        message: "That exercise already exists with the same equipment",
        fieldErrors: { name: "Already in your library with this equipment" },
      };
    }

    console.error("createExerciseAction failed", error);
    return { status: "error", message: "Could not save the exercise. Is MongoDB running?" };
  }

  revalidatePath("/exercises");
  revalidatePath("/workouts/new");
  return { status: "success", message: `Added ${parsed.data.name}` };
}

export async function updateExerciseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // The library is shared by every account, so only an admin may touch it.
  // Hiding the UI is not the check — an action is a public POST endpoint
  const auth = await authorizeAction(canManageExercises);
  if (!auth.ok) return auth.state;

  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Missing exercise id" };

  const notes = String(formData.get("notes") ?? "").trim();
  const parsed = exerciseInputSchema.safeParse({
    name: formData.get("name"),
    muscleGroup: formData.get("muscleGroup"),
    equipment: formData.get("equipment"),
    // Absent when the form is not showing the brand dropdown
    machineBrand: formData.get("machineBrand"),
    ...(notes ? { notes } : {}),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const updated = await updateExercise(id, parsed.data);
    if (!updated) {
      return { status: "error", message: "That exercise no longer exists" };
    }
  } catch (error) {
    // Keeping the row's own name is not a conflict; the unique index ignores the
    // document being updated, so this only fires against a different exercise
    if (isDuplicateKeyError(error)) {
      return {
        status: "error",
        message: "Another exercise already has that name and equipment",
        fieldErrors: { name: "Already in your library with this equipment" },
      };
    }

    console.error("updateExerciseAction failed", error);
    return { status: "error", message: "Could not save the exercise. Is MongoDB running?" };
  }

  revalidatePath("/exercises");
  revalidatePath("/workouts/new");
  return { status: "success", message: `Saved ${parsed.data.name}` };
}

export async function deleteExerciseAction(formData: FormData): Promise<ActionState> {
  // The library is shared by every account, so only an admin may touch it.
  // Hiding the UI is not the check — an action is a public POST endpoint
  const auth = await authorizeAction(canManageExercises);
  if (!auth.ok) return auth.state;

  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Missing exercise id" };

  try {
    const deleted = await deleteExercise(id);
    if (!deleted) return { status: "error", message: "That exercise no longer exists" };
  } catch (error) {
    console.error("deleteExerciseAction failed", error);
    return { status: "error", message: "Could not remove the exercise. Is MongoDB running?" };
  }

  revalidatePath("/exercises");
  revalidatePath("/workouts/new");
  return { status: "success", message: "Exercise removed" };
}
