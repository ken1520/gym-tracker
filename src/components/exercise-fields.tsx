// Deliberately not a "use client" entry: it is only ever imported from client
// components, so it joins their bundle and can take a plain onCancel callback.
// Marking it an entry would force every prop to be serializable.
import { useId, useState } from "react";

import {
  BRANDED_EQUIPMENT,
  EQUIPMENT,
  EXERCISE_NAME_MESSAGE,
  EXERCISE_NAME_PATTERN,
  MACHINE_BRANDS,
  MUSCLE_GROUPS,
} from "@/domain/constants";
import type { Equipment } from "@/domain/constants";
import type { Exercise } from "@/domain/types";

export const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100";

// Shared by the create form and the inline row editor so both enforce the same
// name rule and the same "brand only for machines" behaviour
export function ExerciseFields({
  exercise,
  fieldErrors,
  pending,
  submitLabel,
  pendingLabel,
  onCancel,
}: {
  exercise?: Exercise;
  fieldErrors?: Record<string, string>;
  pending: boolean;
  submitLabel: string;
  pendingLabel: string;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(exercise?.name ?? "");
  // Controlled so the brand dropdown can appear only for machines
  const [equipment, setEquipment] = useState<Equipment>(exercise?.equipment ?? "barbell");
  const nameErrorId = useId();

  // A server error only applies to the value that was submitted; editing the
  // field clears it rather than leaving a stale complaint on screen
  const [prevErrors, setPrevErrors] = useState(fieldErrors);
  const [rejectedName, setRejectedName] = useState("");
  if (fieldErrors !== prevErrors) {
    setPrevErrors(fieldErrors);
    if (fieldErrors?.name) setRejectedName(name);
  }

  const clientNameError =
    name.length > 0 && !EXERCISE_NAME_PATTERN.test(name) ? EXERCISE_NAME_MESSAGE : null;
  const serverNameError = name === rejectedName ? (fieldErrors?.name ?? null) : null;
  const nameError = clientNameError ?? serverNameError;
  const isNameInvalid = name.trim().length === 0 || clientNameError !== null;
  const showBrand = equipment === BRANDED_EQUIPMENT;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* Notes are not editable anywhere in the UI, so carry the stored value
          through rather than letting a save clear it */}
      {exercise?.notes ? <input type="hidden" name="notes" value={exercise.notes} /> : null}

      <div className="sm:col-span-3">
        <label htmlFor={`${nameErrorId}-name`} className="mb-1 block text-xs font-medium">
          Name
        </label>
        <input
          id={`${nameErrorId}-name`}
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
        <label htmlFor={`${nameErrorId}-muscleGroup`} className="mb-1 block text-xs font-medium">
          Muscle group
        </label>
        <select
          id={`${nameErrorId}-muscleGroup`}
          name="muscleGroup"
          className={inputClass}
          defaultValue={exercise?.muscleGroup ?? "chest"}
        >
          {MUSCLE_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${nameErrorId}-equipment`} className="mb-1 block text-xs font-medium">
          Equipment
        </label>
        <select
          id={`${nameErrorId}-equipment`}
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
          <label htmlFor={`${nameErrorId}-machineBrand`} className="mb-1 block text-xs font-medium">
            Machine brand{" "}
            <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span>
          </label>
          {/* Unmounting on equipment change also drops the value from the submission */}
          <select
            id={`${nameErrorId}-machineBrand`}
            name="machineBrand"
            className={inputClass}
            defaultValue={exercise?.machineBrand ?? ""}
          >
            <option value="">Not specified</option>
            {MACHINE_BRANDS.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
          {fieldErrors?.machineBrand ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {fieldErrors.machineBrand}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={`flex items-end gap-2${showBrand ? " sm:col-span-3" : ""}`}>
        <button
          type="submit"
          disabled={pending || isNameInvalid}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-300"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
