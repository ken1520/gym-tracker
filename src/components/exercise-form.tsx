"use client";

import { useActionState, useId, useState } from "react";

import {
  BRANDED_EQUIPMENT,
  EQUIPMENT,
  EXERCISE_NAME_MESSAGE,
  EXERCISE_NAME_PATTERN,
  MACHINE_BRANDS,
  MUSCLE_GROUPS,
} from "@/domain/constants";
import type { Equipment } from "@/domain/constants";
import { createExerciseAction } from "@/server/actions/exercises";
import { initialActionState } from "@/server/actions/state";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100";

export function ExerciseForm() {
  const [state, action, pending] = useActionState(createExerciseAction, initialActionState);
  const [name, setName] = useState("");
  // Controlled so the brand dropdown can appear only for machines
  const [equipment, setEquipment] = useState<Equipment>("barbell");
  const nameErrorId = useId();

  // Reset the controlled name field once a submission actually succeeds.
  // Uncontrolled fields (selects) get this for free from React 19's
  // automatic form reset; a controlled input needs it adjusted during
  // render (see https://react.dev/learn/you-might-not-need-an-effect).
  const [prevState, setPrevState] = useState(state);
  // The name the server last rejected, so its error can be dropped once edited
  const [rejectedName, setRejectedName] = useState("");
  if (state !== prevState) {
    setPrevState(state);
    if (state.status === "idle" && state !== initialActionState) {
      setName("");
      setEquipment("barbell");
    } else if (state.status === "error") {
      setRejectedName(name);
    }
  }

  const clientNameError = name.length > 0 && !EXERCISE_NAME_PATTERN.test(name) ? EXERCISE_NAME_MESSAGE : null;
  // A server error (duplicate name) only applies to the value that was submitted;
  // editing the field clears it rather than leaving a stale complaint on screen
  const serverNameError = name === rejectedName ? (state.fieldErrors?.name ?? null) : null;
  const nameError = clientNameError ?? serverNameError;
  const isNameInvalid = name.trim().length === 0 || clientNameError !== null;
  const showBrand = equipment === BRANDED_EQUIPMENT;

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
          <input
            id="name"
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? nameErrorId : undefined}
            className={inputClass}
            placeholder="Bench Press"
          />
          {nameError ? (
            <p id={nameErrorId} className="mt-1 text-xs text-red-600 dark:text-red-400">
              {nameError}
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
          <select
            id="equipment"
            name="equipment"
            className={inputClass}
            value={equipment}
            onChange={(event) => setEquipment(event.target.value as Equipment)}
          >
            {EQUIPMENT.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {showBrand ? (
          <div>
            <label htmlFor="machineBrand" className="mb-1 block text-xs font-medium">
              Machine brand{" "}
              <span className="font-normal text-neutral-400 dark:text-neutral-500">
                (optional)
              </span>
            </label>
            {/* Unmounting on equipment change also drops the value from the submission */}
            <select
              id="machineBrand"
              name="machineBrand"
              className={inputClass}
              defaultValue=""
            >
              <option value="">Not specified</option>
              {MACHINE_BRANDS.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            {state.fieldErrors?.machineBrand ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {state.fieldErrors.machineBrand}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className={`flex items-end${showBrand ? " sm:col-span-3" : ""}`}>
          <button
            type="submit"
            disabled={pending || isNameInvalid}
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
