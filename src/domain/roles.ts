// Two roles only. "user" is the floor every account gets; "admin" adds the
// shared exercise library and the account list on top of it
export const ROLES = ["admin", "user"] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = "user";

// The exercise library is one shared list, not a per-user one, so editing it
// changes what every account sees when logging a workout
export function canManageExercises(role: Role): boolean {
  return role === "admin";
}

// Creating, renaming and removing accounts
export function canManageUsers(role: Role): boolean {
  return role === "admin";
}

// Read-only. Admins never edit another account's workouts — every mutation
// still matches on the owner, so a non-owner gets "no longer exists"
export function canReadAllWorkouts(role: Role): boolean {
  return role === "admin";
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
