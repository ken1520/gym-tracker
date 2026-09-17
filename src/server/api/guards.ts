import "server-only";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/dal";
import { apiError } from "@/server/api/response";
import type { Role } from "@/domain/roles";
import type { User } from "@/domain/types";

// The REST API authenticates with the same session cookie as the UI, so a
// browser that is signed in can call it directly and there is no second
// credential to issue or revoke
export type ApiAuth = { ok: true; user: User } | { ok: false; response: NextResponse };

export async function authorizeRequest(
  permits: (role: Role) => boolean = () => true,
): Promise<ApiAuth> {
  let user: User | null;
  try {
    user = await getCurrentUser();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(apiError("Could not reach the database"), { status: 503 }),
    };
  }

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(apiError("Authentication required"), { status: 401 }),
    };
  }

  if (!permits(user.role)) {
    return {
      ok: false,
      // 403, not 404: the caller is authenticated, the role is simply wrong
      response: NextResponse.json(apiError("Admin role required"), { status: 403 }),
    };
  }

  return { ok: true, user };
}
