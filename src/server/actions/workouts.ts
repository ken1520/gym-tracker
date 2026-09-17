"use server";

import { revalidatePath } from "next/cache";

import { toFieldErrors, workoutInputSchema } from "@/domain/schemas";
import { createWorkout, deleteWorkout, updateWorkout } from "@/server/repositories/workouts";
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
  return { status: "success", message: "Workout logged", redirectTo: "/workouts" };
}

export async function updateWorkoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Missing workout id" };

  const parsed = workoutInputSchema.safeParse(parseWorkoutForm(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  try {
    const updated = await updateWorkout(id, parsed.data);
    if (!updated) {
      return { status: "error", message: "That workout no longer exists" };
    }
  } catch (error) {
    console.error("updateWorkoutAction failed", error);
    return { status: "error", message: "Could not save the workout. Is MongoDB running?" };
  }

  revalidatePath("/");
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${id}`);
  return { status: "success", message: "Workout updated", redirectTo: `/workouts/${id}` };
}

export async function deleteWorkoutAction(formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Missing workout id" };

  try {
    const deleted = await deleteWorkout(id);
    if (!deleted) return { status: "error", message: "That workout no longer exists" };
  } catch (error) {
    console.error("deleteWorkoutAction failed", error);
    return { status: "error", message: "Could not delete the workout. Is MongoDB running?" };
  }

  revalidatePath("/");
  revalidatePath("/workouts");
  return { status: "success", message: "Workout deleted" };
}
