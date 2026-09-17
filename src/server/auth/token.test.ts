import { beforeEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";

import { signSession, verifySession } from "@/server/auth/token";

const SECRET = "test-secret-at-least-thirty-two-characters-long";

const PAYLOAD = {
  userId: "507f1f77bcf86cd799439011",
  role: "admin" as const,
  sessionVersion: 3,
};

function encoded(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

beforeEach(() => {
  process.env.SESSION_SECRET = SECRET;
});

describe("signSession / verifySession", () => {
  it("round-trips the payload", async () => {
    const token = await signSession(PAYLOAD);
    await expect(verifySession(token)).resolves.toEqual(PAYLOAD);
  });

  it("returns null for a missing token", async () => {
    await expect(verifySession(undefined)).resolves.toBeNull();
    await expect(verifySession("")).resolves.toBeNull();
  });

  it("returns null for a token that is not a JWT", async () => {
    await expect(verifySession("not.a.token")).resolves.toBeNull();
  });

  // The signature is the whole security boundary — a forged cookie must not be
  // accepted just because its claims look right
  it("rejects a token signed with a different secret", async () => {
    const forged = await new SignJWT({ role: "admin", sessionVersion: 1 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(PAYLOAD.userId)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(encoded("a-completely-different-secret-value-here"));

    await expect(verifySession(forged)).resolves.toBeNull();
  });

  it("rejects a token that has expired", async () => {
    const expired = await new SignJWT({ role: "user", sessionVersion: 1 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(PAYLOAD.userId)
      .setIssuedAt(0)
      .setExpirationTime(1)
      .sign(encoded(SECRET));

    await expect(verifySession(expired)).resolves.toBeNull();
  });

  // An "alg": "none" token carries no signature at all, so accepting it would
  // let anyone mint any session
  it("rejects an unsigned token", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(
      JSON.stringify({ sub: PAYLOAD.userId, role: "admin", sessionVersion: 1 }),
    ).toString("base64url");

    await expect(verifySession(`${header}.${body}.`)).resolves.toBeNull();
  });

  it("rejects a validly signed token claiming a role the app does not have", async () => {
    const token = await new SignJWT({ role: "superuser", sessionVersion: 1 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(PAYLOAD.userId)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(encoded(SECRET));

    await expect(verifySession(token)).resolves.toBeNull();
  });

  it("rejects a validly signed token with no sessionVersion", async () => {
    const token = await new SignJWT({ role: "user" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(PAYLOAD.userId)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(encoded(SECRET));

    await expect(verifySession(token)).resolves.toBeNull();
  });

  // Rotating SESSION_SECRET is the break-glass way to sign everyone out
  it("stops accepting old tokens once the secret changes", async () => {
    const token = await signSession(PAYLOAD);
    process.env.SESSION_SECRET = "a-different-secret-also-over-thirty-two-chars";

    await expect(verifySession(token)).resolves.toBeNull();
  });

  it("throws rather than signing with a missing secret", async () => {
    delete process.env.SESSION_SECRET;
    await expect(signSession(PAYLOAD)).rejects.toThrow(/SESSION_SECRET/);
  });

  it("throws rather than signing with a too-short secret", async () => {
    process.env.SESSION_SECRET = "short";
    await expect(signSession(PAYLOAD)).rejects.toThrow(/SESSION_SECRET/);
  });
});
