// Pure, so it carries no mongoose or server-only import and stays unit testable
export type UpdateDoc = {
  $set: Record<string, unknown>;
  $unset?: Record<string, 1>;
};

// An update document that omits a key leaves the stored value alone, so a full
// replace has to name the fields the user cleared. Without this, switching an
// exercise off "machine" would keep its old brand, and emptying a note would
// keep the old note — both silently.
export function toUpdateDoc<T extends object>(
  input: T,
  clearableFields: readonly (keyof T & string)[],
): UpdateDoc {
  const set: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) set[key] = value;
  }

  const unset: Record<string, 1> = {};
  for (const field of clearableFields) {
    if (set[field] === undefined) unset[field] = 1;
  }

  // Mongo rejects an empty update operator, so $unset is only added when used
  return Object.keys(unset).length > 0 ? { $set: set, $unset: unset } : { $set: set };
}
