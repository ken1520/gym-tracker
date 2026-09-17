import { canReadAllWorkouts, type Role } from "@/domain/roles";

// Which workouts a read may see. A discriminated union rather than a nullable
// userId, so "every user's data" can only be reached by asking for it by name —
// a forgotten or undefined argument cannot silently widen a query
export type WorkoutScope = { kind: "own"; userId: string } | { kind: "all" };

export function ownScope(userId: string): WorkoutScope {
  return { kind: "own", userId };
}

// `requested` comes from the URL and is never trusted: a non-admin asking for
// "all" is quietly scoped back to their own workouts rather than refused
export function resolveWorkoutScope(
  role: Role,
  userId: string,
  requested: string | undefined,
): WorkoutScope {
  return requested === "all" && canReadAllWorkouts(role) ? { kind: "all" } : ownScope(userId);
}
