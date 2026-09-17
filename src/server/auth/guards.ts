import "server-only";

import { getCurrentUser } from "@/server/auth/dal";
import type { Role } from "@/domain/roles";
import type { User } from "@/domain/types";
import type { ActionState } from "@/server/actions/state";

// Actions cannot redirect the way pages do — a redirect unmounts the form
// before its state lands, the same reason mutations return redirectTo. So an
// unauthorized action returns an ActionState and the toast says why
export type ActionAuth = { ok: true; user: User } | { ok: false; state: ActionState };

// `permits` defaults to "any signed-in account". Pass canManageExercises or
// canManageUsers to narrow it
export async function authorizeAction(
  permits: (role: Role) => boolean = () => true,
): Promise<ActionAuth> {
  let user: User | null;
  try {
    user = await getCurrentUser();
  } catch {
    return {
      ok: false,
      state: { status: "error", message: "Could not reach the database. Is MongoDB running?" },
    };
  }

  if (!user) {
    return {
      ok: false,
      state: { status: "error", message: "Your session has expired. Sign in again." },
    };
  }

  if (!permits(user.role)) {
    return { ok: false, state: { status: "error", message: "Only an admin can do that" } };
  }

  return { ok: true, user };
}
