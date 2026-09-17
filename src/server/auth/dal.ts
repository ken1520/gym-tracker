import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { readSessionCookie } from "@/server/auth/session";
import { findUserById } from "@/server/repositories/users";
import type { User } from "@/domain/types";

// The cookie is signed by us, so its role is trustworthy as of the moment it was
// issued — but not after. Every request re-reads the account, which is what
// makes a demotion or a deleted account take effect immediately instead of when
// the cookie happens to expire.
//
// cache() collapses that to one query per render pass, however many components
// or repositories ask
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await readSessionCookie();
  if (!session) return null;

  const record = await findUserById(session.userId);
  if (!record) return null;

  // Stale by a password change somewhere else
  if (record.sessionVersion !== session.sessionVersion) return null;

  // Rebuilt field by field rather than spread-minus-secrets, so a new column on
  // UserRecord cannot reach the client by being forgotten here
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
    createdAt: record.createdAt,
  };
});

// Pages need to tell "signed out" apart from "the database is down": the first
// is a redirect, the second is the ConnectionError banner every other page
// already renders. Collapsing them would turn a stopped container into an
// endless bounce through /login
export type Viewer = { status: "authenticated"; user: User } | { status: "unavailable" };

// Redirects when there is no usable session, so it only ever returns for a
// signed-in viewer or an unreachable database.
//
// Call this OUTSIDE a page's try/catch — redirect() works by throwing, and a
// bare `catch {}` around it would swallow the redirect and render the page
export async function requireViewer(): Promise<Viewer> {
  let user: User | null;
  try {
    user = await getCurrentUser();
  } catch {
    return { status: "unavailable" };
  }

  if (!user) redirect("/login");
  return { status: "authenticated", user };
}
