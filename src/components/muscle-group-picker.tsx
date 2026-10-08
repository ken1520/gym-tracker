// Not a "use client" entry — only imported by workout-form.tsx, so it joins that
// bundle and can take a plain onChange callback
import { useEffect, useRef } from "react";

import { inputClass } from "@/components/form-ui";
import { MUSCLE_GROUPS } from "@/domain/constants";
import { muscleGroupLabel, workoutTitle } from "@/domain/muscle-groups";
import type { MuscleGroup } from "@/domain/constants";

// Pick several muscle groups from a dropdown of checkboxes
export function MuscleGroupPicker({
  selected,
  onChange,
  error,
}: {
  selected: readonly MuscleGroup[];
  onChange: (groups: MuscleGroup[]) => void;
  error?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  // A <details> only closes from its own summary, so close it on a click outside
  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      const details = ref.current;
      if (details?.open && !details.contains(event.target as Node)) details.open = false;
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const toggle = (group: MuscleGroup, checked: boolean) =>
    onChange(
      MUSCLE_GROUPS.filter((candidate) =>
        candidate === group ? checked : selected.includes(candidate),
      ),
    );

  return (
    <div>
      <span id="muscle-groups-label" className="mb-1 block text-xs font-medium">
        Target muscle groups
      </span>
      <details ref={ref} className="relative">
        <summary
          aria-labelledby="muscle-groups-label"
          className={`${inputClass} flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden`}
        >
          <span className={selected.length > 0 ? "truncate" : "text-neutral-400"}>
            {selected.length > 0 ? workoutTitle(selected) : "Select one or more"}
          </span>
          <span aria-hidden className="text-neutral-400">
            ▾
          </span>
        </summary>
        <div className="absolute z-10 mt-1 grid w-full grid-cols-2 gap-1 rounded-md border border-neutral-300 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-950">
          {MUSCLE_GROUPS.map((group) => (
            <label
              key={group}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <input
                type="checkbox"
                name="muscleGroups"
                value={group}
                checked={selected.includes(group)}
                onChange={(event) => toggle(group, event.target.checked)}
              />
              {muscleGroupLabel(group)}
            </label>
          ))}
        </div>
      </details>
      {error ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
