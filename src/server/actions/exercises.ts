"use server";

import { revalidatePath } from "next/cache";

import { exerciseInputSchema, toFieldErrors } from "@/domain/schemas";
import { createExercise, deleteExercise } from "@/server/repositories/exercises";
import type { ActionState } from "@/server/actions/state";
import { isDuplicateKeyError } from "@/server/api/errors";

export async function createExerciseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const notes = String(formData.get("notes") ?? "").trim();
  const parsed = exerciseInputSchema.safeParse({
    name: formData.get("name"),
    muscleGroup: formData.get("muscleGroup"),
    equipment: formData.get("equipment"),
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
    // Duplicate key means the exercise name already exists in the library
    if (isDuplicateKeyError(error)) {
      return {
        status: "error",
        message: "An exercise with that name already exists",
        fieldErrors: { name: "Already in your library" },
      };
    }

    console.error("createExerciseAction failed", error);
    return { status: "error", message: "Could not save the exercise. Is MongoDB running?" };
  }

  revalidatePath("/exercises");
  revalidatePath("/workouts/new");
  return { status: "idle" };
}

export async function deleteExerciseAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await deleteExercise(id);
  } catch (error) {
    console.error("deleteExerciseAction failed", error);
    return;
  }

  revalidatePath("/exercises");
  revalidatePath("/workouts/new");
}
