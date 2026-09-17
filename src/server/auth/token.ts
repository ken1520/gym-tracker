import { SignJWT, jwtVerify } from "jose";

import { isRole, type Role } from "@/domain/roles";
import { readSessionSecret } from "@/lib/env";

export const SESSION_COOKIE = "gym_session";

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const ALGORITHM = "HS256";

// Only what a request needs to identify the account. No email or name: those
// are read back from the database anyway, and a cookie is not the place for
// personal data anything with disk access can read
export type SessionPayload = {
  userId: string;
  role: Role;
  // Compared against the stored value so a password change kills older cookies
  sessionVersion: number;
};

// Kept free of next/headers so proxy.ts can verify a token without pulling in
// the cookie-writing half, and so this stays unit testable
function encodedSecret(): Uint8Array {
  return new TextEncoder().encode(readSessionSecret());
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, sessionVersion: payload.sessionVersion })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(encodedSecret());
}

// Returns null for anything that is not a currently valid token — expired,
// tampered with, signed under an old SESSION_SECRET, or simply absent
export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, encodedSecret(), { algorithms: [ALGORITHM] });

    if (typeof payload.sub !== "string" || !isRole(payload.role)) return null;
    if (typeof payload.sessionVersion !== "number") return null;

    return {
      userId: payload.sub,
      role: payload.role,
      sessionVersion: payload.sessionVersion,
    };
  } catch {
    // Every failure mode is the same to a caller: there is no session
    return null;
  }
}
