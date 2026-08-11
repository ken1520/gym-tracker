"use client";

import { useActionState, useState } from "react";

import { ExerciseFields } from "@/components/exercise-fields";
import { createExerciseAction } from "@/server/actions/exercises";
import { initialActionState } from "@/server/actions/state";

export function ExerciseForm() {
  const [state, action, pending] = useActionState(createExerciseAction, initialActionState);

  // Remounting the fields on success is what clears them. Their state is
  // internal, so a key bump resets every input in one move
  const [resetKey, setResetKey] = useState(0);
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.status === "idle" && state !== initialActionState) {
      setResetKey((current) => current + 1);
    }
  }

  return (
    <form
      action={action}
      className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <ExerciseFields
        key={resetKey}
        fieldErrors={state.fieldErrors}
        pending={pending}
        submitLabel="Add exercise"
        pendingLabel="Adding…"
      />

      {state.status === "error" && state.message ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{state.message}</p>
      ) : null}
    </form>
  );
}
