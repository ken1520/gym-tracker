import { formatSet, formatWeight } from "@/domain/format";
import { UNGROUPED } from "@/domain/exercise-bests";
import type { BestsGroup, BestsGroupKey } from "@/domain/exercise-bests";

function groupLabel(key: BestsGroupKey): string {
  return key === UNGROUPED ? "no longer in the library" : key;
}

// Groups collapse with <details>, which keeps this page free of client JS the
// same way /workouts keeps its state in the URL
export function PersonalBests({ groups }: { groups: BestsGroup[] }) {
  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <details
          key={group.key}
          open
          className="group rounded-lg border border-neutral-200 dark:border-neutral-800"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <svg
              viewBox="0 0 8 8"
              aria-hidden="true"
              className="size-2 shrink-0 fill-neutral-400 transition-transform group-open:rotate-90"
            >
              <path d="M0 0l8 4-8 4z" />
            </svg>
            <span className="first-letter:uppercase">{groupLabel(group.key)}</span>
            <span className="ml-auto text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
              {group.bests.length}
            </span>
          </summary>

          <div className="overflow-x-auto border-t border-neutral-200 px-4 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  <th scope="col" className="py-2 text-left font-medium">
                    Exercise
                  </th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">
                    Personal best
                  </th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">
                    Est. 1RM
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.bests.map((best) => (
                  <tr
                    key={best.exerciseId}
                    className="border-t border-neutral-200 last:border-b-0 dark:border-neutral-800"
                  >
                    <td className="py-2">
                      {best.name}
                      {best.machineBrand ? (
                        <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                          {best.machineBrand}
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap py-2 pl-3 text-right tabular-nums">
                      {formatSet(best.set.weightKg, best.set.reps)}
                    </td>
                    <td className="whitespace-nowrap py-2 pl-3 text-right font-medium tabular-nums">
                      {formatWeight(best.oneRepMax)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  );
}
