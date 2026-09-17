import Link from "next/link";

import { DeleteButton } from "@/components/delete-button";
import { Card, ConnectionError, EmptyState, PageHeader } from "@/components/ui";
import { WorkoutCalendar } from "@/components/workout-calendar";
import {
  groupWorkoutsByDay,
  resolveMonthKey,
  summarizeDays,
  toDayKey,
} from "@/domain/calendar";
import { formatDate, formatVolume } from "@/domain/format";
import { workingSetCount, workoutVolume } from "@/domain/metrics";
import { canReadAllWorkouts } from "@/domain/roles";
import { resolveWorkoutScope } from "@/domain/scope";
import { requireViewer } from "@/server/auth/dal";
import { listWorkoutsInMonth } from "@/server/repositories/workouts";
import { listUsers } from "@/server/repositories/users";
import { deleteWorkoutAction } from "@/server/actions/workouts";
import type { Workout } from "@/domain/types";

export default async function WorkoutsPage({ searchParams }: PageProps<"/workouts">) {
  const viewer = await requireViewer();
  if (viewer.status === "unavailable") {
    return (
      <>
        <PageHeader title="History" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  const { user } = viewer;
  const params = await searchParams;
  const monthKey = resolveMonthKey(readParam(params.month));

  // Never trusted: resolveWorkoutScope hands a non-admin their own workouts
  // whatever the URL asks for
  const scope = resolveWorkoutScope(user.role, user.id, readParam(params.scope));
  const showingAll = scope.kind === "all";

  let workouts: Workout[];
  let ownerNames = new Map<string, string>();
  try {
    workouts = await listWorkoutsInMonth(scope, monthKey);
    // Only needed to label rows that are not the viewer's own
    if (showingAll) {
      const users = await listUsers();
      ownerNames = new Map(users.map((owner) => [owner.id, owner.name]));
    }
  } catch {
    return (
      <>
        <PageHeader title="History" />
        <ConnectionError message="Could not reach the database." />
      </>
    );
  }

  const byDay = groupWorkoutsByDay(workouts);
  const summaries = summarizeDays(byDay);

  // An unknown or empty day falls back to the month's most recent logged day
  const requestedDay = readParam(params.day);
  const selectedDay =
    requestedDay && byDay.has(requestedDay)
      ? requestedDay
      : [...byDay.keys()].sort().at(-1);

  const selectedWorkouts = selectedDay ? (byDay.get(selectedDay) ?? []) : [];
  const monthVolume = workouts.reduce((total, w) => total + workoutVolume(w), 0);

  return (
    <>
      <PageHeader
        title="History"
        description={
          workouts.length === 0
            ? "No sessions this month"
            : `${workouts.length} ${workouts.length === 1 ? "session" : "sessions"} · ${formatVolume(monthVolume)} this month`
        }
        action={
          <Link
            href="/workouts/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-300"
          >
            Log workout
          </Link>
        }
      />

      {/* The toggle is a pair of links, not a control, so the whole page stays a
          Server Component and a filtered month is still a shareable URL */}
      {canReadAllWorkouts(user.role) ? (
        <div className="mb-4 flex items-center gap-1 text-sm">
          <ScopeLink monthKey={monthKey} scope="mine" active={!showingAll} label="My workouts" />
          <ScopeLink monthKey={monthKey} scope="all" active={showingAll} label="Everyone" />
        </div>
      ) : null}

      <WorkoutCalendar
        monthKey={monthKey}
        summaries={summaries}
        selectedDay={selectedDay}
        todayKey={toDayKey(new Date().toISOString())}
        scope={showingAll ? "all" : undefined}
      />

      <section className="mt-6">
        {selectedDay ? (
          <>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {formatDate(`${selectedDay}T00:00:00.000Z`)}
            </h2>
            <ul className="space-y-2">
              {selectedWorkouts.map((workout) => {
                // Admins read every log but edit only their own, so the controls
                // follow ownership rather than role
                const isOwn = workout.userId === user.id;

                return (
                  <li key={workout.id}>
                    <Card>
                      <div className="flex items-start justify-between gap-4">
                        <Link href={`/workouts/${workout.id}`} className="min-w-0 flex-1">
                          <span className="font-medium">{workout.title}</span>
                          {showingAll && !isOwn ? (
                            <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                              {ownerNames.get(workout.userId) ?? "unknown"}
                            </span>
                          ) : null}
                          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                            {workout.entries.length} exercises · {workingSetCount(workout)} sets ·{" "}
                            {formatVolume(workoutVolume(workout))}
                          </p>
                        </Link>
                        {isOwn ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <Link
                              href={`/workouts/${workout.id}/edit`}
                              className="rounded-md px-2 py-1 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
                            >
                              Edit
                            </Link>
                            <DeleteButton
                              id={workout.id}
                              action={deleteWorkoutAction}
                              label="Delete"
                            />
                          </div>
                        ) : null}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <EmptyState
            title={showingAll ? "Nobody logged anything this month" : "Nothing logged this month"}
            hint="Pick another month above, or log a session to fill in the calendar."
          />
        )}
      </section>
    </>
  );
}

function ScopeLink({
  monthKey,
  scope,
  active,
  label,
}: {
  monthKey: string;
  scope: "mine" | "all";
  active: boolean;
  label: string;
}) {
  // The day is dropped on purpose — it rarely survives a scope change, and the
  // page falls back to the month's latest logged day anyway
  const query = scope === "all" ? `?month=${monthKey}&scope=all` : `?month=${monthKey}`;

  return (
    <Link
      href={`/workouts${query}`}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-md bg-neutral-900 px-3 py-1 font-medium text-white dark:bg-neutral-50 dark:text-neutral-950"
          : "rounded-md px-3 py-1 text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
      }
    >
      {label}
    </Link>
  );
}

// searchParams values are string | string[] | undefined
function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
