"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { toFieldErrors, workoutInputSchema } from "@/domain/schemas";
import { createWorkout, deleteWorkout } from "@/server/repositories/workouts";
import { parseWorkoutForm } from "@/server/forms/workout-form";
import type { ActionState } from "@/server/actions/state";

export async function createWorkoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = workoutInputSchema.safeParse(parseWorkoutForm(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    await createWorkout(parsed.data);
  } catch (error) {
    console.error("createWorkoutAction failed", error);
    return { status: "error", message: "Could not save the workout. Is MongoDB running?" };
  }

  revalidatePath("/");
  revalidatePath("/workouts");
  redirect("/workouts");
}

export async function deleteWorkoutAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await deleteWorkout(id);
  } catch (error) {
    console.error("deleteWorkoutAction failed", error);
    return;
  }

  revalidatePath("/");
  revalidatePath("/workouts");
}
