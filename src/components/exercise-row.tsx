"use client";

import { useActionState, useState } from "react";

import { ExerciseFields } from "@/components/exercise-fields";
import { deleteExerciseAction, updateExerciseAction } from "@/server/actions/exercises";
import { initialActionState } from "@/server/actions/state";
import type { Exercise } from "@/domain/types";

export function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateExerciseAction, initialActionState);

  // Close the editor once the save actually lands, the same way the create form
  // detects success: an idle state that is no longer the initial one
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.status === "idle" && state !== initialActionState) setEditing(false);
  }

  if (!editing) {
    return (
      <li className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <p className="text-sm font-medium">{exercise.name}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {exercise.muscleGroup} · {exercise.equipment}
            {exercise.machineBrand ? ` · ${exercise.machineBrand}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md px-2 py-1 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
          >
            Edit
          </button>
          <form action={deleteExerciseAction}>
            <input type="hidden" name="id" value={exercise.id} />
            <button
              type="submit"
              className="rounded-md px-2 py-1 text-sm text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
            >
              Remove
            </button>
          </form>
        </div>
      </li>
    );
  }

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <form action={action}>
        <input type="hidden" name="id" value={exercise.id} />
        <ExerciseFields
          exercise={exercise}
          fieldErrors={state.fieldErrors}
          pending={pending}
          submitLabel="Save"
          pendingLabel="Saving…"
          onCancel={() => setEditing(false)}
        />

        {state.status === "error" && state.message ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{state.message}</p>
        ) : null}
      </form>
    </li>
  );
}
