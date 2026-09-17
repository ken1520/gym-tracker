import { describe, expect, it } from "vitest";

import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "@/server/auth/password";

// scrypt at the configured work factor takes a few hundred ms per call, so
// these get more than the default timeout
const TIMEOUT = 20_000;

describe("hashPassword", () => {
  it(
    "never stores the password itself",
    async () => {
      const hash = await hashPassword("correct horse battery");
      expect(hash).not.toContain("correct horse battery");
    },
    TIMEOUT,
  );

  it(
    "salts, so the same password hashes differently every time",
    async () => {
      const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
      expect(a).not.toBe(b);
    },
    TIMEOUT,
  );

  it(
    "records the parameters alongside the digest",
    async () => {
      // Raising the work factor later must not invalidate existing passwords,
      // which only works because each hash carries its own settings
      const [scheme, N, r, p] = (await hashPassword("x")).split("$");
      expect(scheme).toBe("scrypt");
      expect(Number(N)).toBeGreaterThan(0);
      expect(Number(r)).toBeGreaterThan(0);
      expect(Number(p)).toBeGreaterThan(0);
    },
    TIMEOUT,
  );
});

describe("verifyPassword", () => {
  it(
    "accepts the password it was made from",
    async () => {
      const hash = await hashPassword("correct horse battery");
      await expect(verifyPassword("correct horse battery", hash)).resolves.toBe(true);
    },
    TIMEOUT,
  );

  it(
    "rejects a wrong password",
    async () => {
      const hash = await hashPassword("correct horse battery");
      await expect(verifyPassword("Correct horse battery", hash)).resolves.toBe(false);
    },
    TIMEOUT,
  );

  it(
    "verifies a hash made with different parameters",
    async () => {
      // Hand-built at a low work factor, standing in for a hash written before
      // the cost was raised
      const legacy = "scrypt$16384$8$1$c2FsdHlzYWx0eXNhbHQ=$";
      const { scrypt } = await import("node:crypto");
      const key = await new Promise<Buffer>((resolve, reject) => {
        scrypt(
          "legacy password",
          Buffer.from("c2FsdHlzYWx0eXNhbHQ=", "base64"),
          64,
          { N: 16384, r: 8, p: 1 },
          (error, derived) => (error ? reject(error) : resolve(derived as Buffer)),
        );
      });

      const hash = legacy + key.toString("base64");
      await expect(verifyPassword("legacy password", hash)).resolves.toBe(true);
      await expect(verifyPassword("wrong", hash)).resolves.toBe(false);
    },
    TIMEOUT,
  );

  // Every one of these would otherwise throw out of the login action, and a
  // thrown error there reads as "database down" rather than "wrong password"
  it.each([
    ["an empty string", ""],
    ["a bcrypt hash", "$2b$12$abcdefghijklmnopqrstuv"],
    ["too few segments", "scrypt$32768$8$1$c2FsdA=="],
    ["a non-numeric work factor", "scrypt$lots$8$1$c2FsdA==$a2V5"],
    ["an empty salt", "scrypt$32768$8$1$$a2V5"],
    ["an empty digest", "scrypt$32768$8$1$c2FsdA==$"],
    ["an absurd work factor", "scrypt$1073741824$8$1$c2FsdA==$a2V5"],
  ])("returns false for %s rather than throwing", async (_label, stored) => {
    await expect(verifyPassword("anything", stored)).resolves.toBe(false);
  });

  it(
    "matches no password at all for the login timing placeholder",
    async () => {
      // The login action hashes against this when the email is unknown, so it
      // has to be a parseable hash that nothing can satisfy
      await expect(verifyPassword("", DUMMY_PASSWORD_HASH)).resolves.toBe(false);
      await expect(verifyPassword("password", DUMMY_PASSWORD_HASH)).resolves.toBe(false);
    },
    TIMEOUT,
  );
});
