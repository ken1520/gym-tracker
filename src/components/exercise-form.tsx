"use client";

import { useActionState } from "react";

import { EQUIPMENT, MUSCLE_GROUPS } from "@/domain/constants";
import { createExerciseAction } from "@/server/actions/exercises";
import { initialActionState } from "@/server/actions/state";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100";

export function ExerciseForm() {
  const [state, action, pending] = useActionState(createExerciseAction, initialActionState);

  return (
    <form
      action={action}
      className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label htmlFor="name" className="mb-1 block text-xs font-medium">
            Name
          </label>
          <input id="name" name="name" required className={inputClass} placeholder="Bench Press" />
          {state.fieldErrors?.name ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {state.fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="muscleGroup" className="mb-1 block text-xs font-medium">
            Muscle group
          </label>
          <select id="muscleGroup" name="muscleGroup" className={inputClass} defaultValue="chest">
            {MUSCLE_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="equipment" className="mb-1 block text-xs font-medium">
            Equipment
          </label>
          <select id="equipment" name="equipment" className={inputClass} defaultValue="barbell">
            {EQUIPMENT.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-300"
          >
            {pending ? "Adding…" : "Add exercise"}
          </button>
        </div>
      </div>

      {state.status === "error" && state.message ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{state.message}</p>
      ) : null}
    </form>
  );
}
