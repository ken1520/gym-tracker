"use client";

import { useActionState, useState } from "react";

import { createWorkoutAction } from "@/server/actions/workouts";
import { initialActionState } from "@/server/actions/state";
import { toDateInputValue } from "@/domain/format";
import type { Exercise } from "@/domain/types";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100";

// Rows carry a stable key so React does not reorder inputs when one is removed
type SetRow = { key: string; weightKg: string; reps: string; isWarmup: boolean };
type EntryRow = { key: string; exerciseId: string; sets: SetRow[] };

let rowCounter = 0;
const nextKey = () => `row-${rowCounter++}`;

const emptySet = (): SetRow => ({ key: nextKey(), weightKg: "", reps: "", isWarmup: false });
const emptyEntry = (exerciseId: string): EntryRow => ({
  key: nextKey(),
  exerciseId,
  sets: [emptySet()],
});

export function WorkoutForm({ exercises }: { exercises: Exercise[] }) {
  const [state, action, pending] = useActionState(createWorkoutAction, initialActionState);
  const [entries, setEntries] = useState<EntryRow[]>(() =>
    exercises.length > 0 ? [emptyEntry(exercises[0].id)] : [],
  );

  const addEntry = () => {
    if (exercises.length === 0) return;
    setEntries((current) => [...current, emptyEntry(exercises[0].id)]);
  };

  const removeEntry = (key: string) =>
    setEntries((current) => current.filter((entry) => entry.key !== key));

  const updateEntry = (key: string, exerciseId: string) =>
    setEntries((current) =>
      current.map((entry) => (entry.key === key ? { ...entry, exerciseId } : entry)),
    );

  const addSet = (entryKey: string) =>
    setEntries((current) =>
      current.map((entry) =>
        entry.key === entryKey ? { ...entry, sets: [...entry.sets, emptySet()] } : entry,
      ),
    );

  const removeSet = (entryKey: string, setKey: string) =>
    setEntries((current) =>
      current.map((entry) =>
        entry.key === entryKey
          ? { ...entry, sets: entry.sets.filter((set) => set.key !== setKey) }
          : entry,
      ),
    );

  const updateSet = (entryKey: string, setKey: string, patch: Partial<SetRow>) =>
    setEntries((current) =>
      current.map((entry) =>
        entry.key === entryKey
          ? {
              ...entry,
              sets: entry.sets.map((set) => (set.key === setKey ? { ...set, ...patch } : set)),
            }
          : entry,
      ),
    );

  if (exercises.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
        <p className="text-sm font-medium">Add an exercise first</p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          You need at least one exercise in your library before logging a workout.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="title" className="mb-1 block text-xs font-medium">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue="Training session"
            className={inputClass}
          />
          {state.fieldErrors?.title ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {state.fieldErrors.title}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="performedAt" className="mb-1 block text-xs font-medium">
            Date
          </label>
          <input
            id="performedAt"
            name="performedAt"
            type="date"
            required
            defaultValue={toDateInputValue(new Date().toISOString())}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-4">
        {entries.map((entry, entryIndex) => {
          const selected = exercises.find((exercise) => exercise.id === entry.exerciseId);

          return (
            <div
              key={entry.key}
              className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
            >
              <input
                type="hidden"
                name={`entries.${entryIndex}.exerciseId`}
                value={entry.exerciseId}
              />
              <input
                type="hidden"
                name={`entries.${entryIndex}.exerciseName`}
                value={selected?.name ?? ""}
              />

              <div className="mb-3 flex items-center gap-2">
                <select
                  aria-label="Exercise"
                  value={entry.exerciseId}
                  onChange={(event) => updateEntry(entry.key, event.target.value)}
                  className={inputClass}
                >
                  {exercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeEntry(entry.key)}
                  className="shrink-0 rounded-md px-2 py-2 text-sm text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                >
                  Remove
                </button>
              </div>

              <ul className="space-y-2">
                {entry.sets.map((set, setIndex) => (
                  <li key={set.key} className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-xs text-neutral-400">{setIndex + 1}</span>
                    <input
                      aria-label="Weight in kg"
                      name={`entries.${entryIndex}.sets.${setIndex}.weightKg`}
                      value={set.weightKg}
                      onChange={(event) =>
                        updateSet(entry.key, set.key, { weightKg: event.target.value })
                      }
                      inputMode="decimal"
                      placeholder="kg"
                      required
                      className={inputClass}
                    />
                    <input
                      aria-label="Reps"
                      name={`entries.${entryIndex}.sets.${setIndex}.reps`}
                      value={set.reps}
                      onChange={(event) =>
                        updateSet(entry.key, set.key, { reps: event.target.value })
                      }
                      inputMode="numeric"
                      placeholder="reps"
                      required
                      className={inputClass}
                    />
                    <label className="flex shrink-0 items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                      <input
                        type="checkbox"
                        name={`entries.${entryIndex}.sets.${setIndex}.isWarmup`}
                        checked={set.isWarmup}
                        onChange={(event) =>
                          updateSet(entry.key, set.key, { isWarmup: event.target.checked })
                        }
                      />
                      warmup
                    </label>
                    <button
                      type="button"
                      onClick={() => removeSet(entry.key, set.key)}
                      disabled={entry.sets.length === 1}
                      className="shrink-0 rounded-md px-2 py-1 text-sm text-neutral-400 transition-colors hover:text-red-600 disabled:opacity-30 dark:hover:text-red-400"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => addSet(entry.key)}
                className="mt-3 text-sm text-neutral-600 underline-offset-4 hover:underline dark:text-neutral-400"
              >
                Add set
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addEntry}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Add exercise
        </button>
        <button
          type="submit"
          disabled={pending || entries.length === 0}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-300"
        >
          {pending ? "Saving…" : "Save workout"}
        </button>
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-xs font-medium">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={3} className={inputClass} />
      </div>

      {state.status === "error" && state.message ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      ) : null}
    </form>
  );
}
