"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { MuscleGroupPicker } from "@/components/muscle-group-picker";
import { useToast } from "@/components/toast";
import { useActionToast } from "@/components/use-action-toast";
import { buildExerciseOptions, flattenOptions } from "@/domain/exercise-options";
import { entriesToCopy, muscleGroupsOf } from "@/domain/last-session";
import type { LastSessions } from "@/domain/last-session";
import { muscleGroupLabel } from "@/domain/muscle-groups";
import { createWorkoutAction, updateWorkoutAction } from "@/server/actions/workouts";
import { initialActionState } from "@/server/actions/state";
import { toDateInputValue } from "@/domain/format";
import type { MuscleGroup } from "@/domain/constants";
import type { Exercise, Workout, WorkoutEntry } from "@/domain/types";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100";

// Rows carry a stable key so React does not reorder inputs when one is removed
type SetRow = {
  key: string;
  weightKg: string;
  reps: string;
  isWarmup: boolean;
  // Not editable here, but carried through so saving an edit cannot drop it
  rpe?: string;
};
type EntryRow = { key: string; exerciseId: string; sets: SetRow[] };

let rowCounter = 0;
const nextKey = () => `row-${rowCounter++}`;

const emptySet = (): SetRow => ({ key: nextKey(), weightKg: "", reps: "", isWarmup: false });
const emptyEntry = (exerciseId: string): EntryRow => ({
  key: nextKey(),
  exerciseId,
  sets: [emptySet()],
});

// Map entries to form rows; a copy drops rpe since no field would show it
function toRows(entries: readonly WorkoutEntry[], { carryRpe }: { carryRpe: boolean }): EntryRow[] {
  return entries.map((entry) => ({
    key: nextKey(),
    exerciseId: entry.exerciseId,
    sets: entry.sets.map((set) => ({
      key: nextKey(),
      weightKg: String(set.weightKg),
      reps: String(set.reps),
      isWarmup: set.isWarmup,
      ...(carryRpe && set.rpe !== undefined ? { rpe: String(set.rpe) } : {}),
    })),
  }));
}

// Spot a row nothing has been typed into yet
const isUntouched = (entry: EntryRow) =>
  entry.sets.every((set) => set.weightKg === "" && set.reps === "");

export function WorkoutForm({
  exercises,
  workout,
  lastSessions,
}: {
  exercises: Exercise[];
  workout?: Workout;
  // Only the new-workout form offers copying
  lastSessions?: LastSessions;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  // Grouped for the dropdown, flattened for the lookups that only need an id
  const optionGroups = buildExerciseOptions(exercises, workout?.entries);
  const options = flattenOptions(optionGroups);
  const [state, action, pending] = useActionState(
    workout ? updateWorkoutAction : createWorkoutAction,
    initialActionState,
  );

  // The action returns the destination instead of redirecting, so the toast is
  // raised before the navigation that unmounts this form
  useActionToast(state, () => {
    if (state.redirectTo) router.push(state.redirectTo);
  });

  const [entries, setEntries] = useState<EntryRow[]>(() => {
    if (workout) return toRows(workout.entries, { carryRpe: true });
    return options.length > 0 ? [emptyEntry(options[0].id)] : [];
  });

  // Derive groups from the entries when the workout has none stored
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>(
    () => workout?.muscleGroups ?? muscleGroupsOf(workout?.entries ?? [], exercises),
  );

  const copyFromLastWorkout = () => {
    if (!lastSessions) return;

    // Replace untouched rows and skip exercises already in the form
    const kept = entries.filter((entry) => !isUntouched(entry));
    const present = new Set(kept.map((entry) => entry.exerciseId));
    const copied = entriesToCopy(lastSessions, muscleGroups).filter(
      (entry) => !present.has(entry.exerciseId),
    );

    if (copied.length === 0) {
      showToast("Nothing new to copy for these muscle groups", "error");
      return;
    }

    setEntries([...kept, ...toRows(copied, { carryRpe: false })]);
    showToast(`Copied ${copied.length} exercise${copied.length === 1 ? "" : "s"}`);
  };

  const addEntry = () => {
    if (options.length === 0) return;
    setEntries((current) => [...current, emptyEntry(options[0].id)]);
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

  if (options.length === 0) {
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
      {workout ? <input type="hidden" name="id" value={workout.id} /> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <MuscleGroupPicker
            selected={muscleGroups}
            onChange={setMuscleGroups}
            error={state.fieldErrors?.muscleGroups}
          />
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
            defaultValue={toDateInputValue(workout?.performedAt ?? new Date().toISOString())}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-4">
        {entries.map((entry, entryIndex) => {
          const selected = options.find((option) => option.id === entry.exerciseId);

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
                  {optionGroups.map((group) => (
                    <optgroup key={group.key} label={muscleGroupLabel(group.key)}>
                      {group.options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </optgroup>
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
                    {set.rpe === undefined ? null : (
                      <input
                        type="hidden"
                        name={`entries.${entryIndex}.sets.${setIndex}.rpe`}
                        value={set.rpe}
                      />
                    )}
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
        {lastSessions ? (
          <button
            type="button"
            onClick={copyFromLastWorkout}
            disabled={muscleGroups.length === 0}
            title={muscleGroups.length === 0 ? "Select a target muscle group first" : undefined}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Copy exercises from last workout
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending || entries.length === 0 || muscleGroups.length === 0}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-300"
        >
          {pending ? "Saving…" : workout ? "Save changes" : "Save workout"}
        </button>
        {workout ? (
          <Link
            href={`/workouts/${workout.id}`}
            className="text-sm text-neutral-500 underline-offset-4 hover:underline dark:text-neutral-400"
          >
            Cancel
          </Link>
        ) : null}
      </div>

      <div>
        <label htmlFor="notes" className="mb-1 block text-xs font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={workout?.notes ?? ""}
          className={inputClass}
        />
      </div>

      {state.status === "error" && state.message ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
      ) : null}
    </form>
  );
}
