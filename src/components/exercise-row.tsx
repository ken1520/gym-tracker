"use client";

import { useActionState, useState } from "react";

import { DeleteButton } from "@/components/delete-button";
import { ExerciseFields } from "@/components/exercise-fields";
import { useActionToast } from "@/components/use-action-toast";
import { deleteExerciseAction, updateExerciseAction } from "@/server/actions/exercises";
import { initialActionState } from "@/server/actions/state";
import type { Exercise } from "@/domain/types";

// canEdit only decides whether the controls render — the actions behind them
// check the role themselves, since a Server Action is a public POST endpoint
export function ExerciseRow({
  exercise,
  canEdit,
}: {
  exercise: Exercise;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateExerciseAction, initialActionState);

  // Close the editor once the save actually lands, alongside its toast
  useActionToast(state, () => setEditing(false));

  if (!editing || !canEdit) {
    return (
      <li className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <p className="text-sm font-medium">{exercise.name}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {exercise.muscleGroup} · {exercise.equipment}
            {exercise.machineBrand ? ` · ${exercise.machineBrand}` : ""}
          </p>
        </div>
        {canEdit ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md px-2 py-1 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
            >
              Edit
            </button>
            <DeleteButton id={exercise.id} action={deleteExerciseAction} label="Remove" />
          </div>
        ) : null}
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
