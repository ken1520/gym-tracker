import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  createUserSchema,
  loginSchema,
  MIN_PASSWORD_LENGTH,
  updateUserSchema,
} from "@/domain/auth-schemas";

const VALID_PASSWORD = "correct horse battery";

describe("loginSchema", () => {
  it("lowercases and trims the email so casing cannot fork an account", () => {
    const parsed = loginSchema.parse({ email: "  Ken@Example.COM ", password: "x" });
    expect(parsed.email).toBe("ken@example.com");
  });

  // An existing account must still be able to sign in if the strength rules
  // tighten later, so login checks presence only
  it("accepts a password shorter than the create rules allow", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(true);
  });

  it.each([["not-an-email"], ["a@"], ["@b.co"], [""]])("rejects %p", (email) => {
    expect(loginSchema.safeParse({ email, password: "x" }).success).toBe(false);
  });
});

describe("createUserSchema", () => {
  const base = {
    name: "Ken",
    email: "ken@example.com",
    password: VALID_PASSWORD,
    role: "user",
  };

  it("accepts a complete account", () => {
    expect(createUserSchema.parse(base)).toEqual(base);
  });

  it(`rejects a password under ${MIN_PASSWORD_LENGTH} characters`, () => {
    const result = createUserSchema.safeParse({
      ...base,
      password: "a".repeat(MIN_PASSWORD_LENGTH - 1),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a password of exactly the minimum length", () => {
    const result = createUserSchema.safeParse({
      ...base,
      password: "a".repeat(MIN_PASSWORD_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  // Guards against a crafted POST inventing a role the app does not check for
  it.each([["owner"], ["superuser"], [""], ["Admin"]])("rejects the role %p", (role) => {
    expect(createUserSchema.safeParse({ ...base, role }).success).toBe(false);
  });

  it("requires a name", () => {
    expect(createUserSchema.safeParse({ ...base, name: "   " }).success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  // Password lives on its own action, so a rename cannot quietly reset it
  it("carries no password field", () => {
    const parsed = updateUserSchema.parse({
      name: "Ken",
      email: "ken@example.com",
      role: "admin",
      password: "ignored-entirely",
    });
    expect(parsed).not.toHaveProperty("password");
  });
});

describe("changePasswordSchema", () => {
  it("accepts a matching pair", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old",
      password: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
    });
    expect(result.success).toBe(true);
  });

  it("reports a mismatch against the confirm field", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old",
      password: VALID_PASSWORD,
      confirmPassword: "something else",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });

  it("requires the current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      password: VALID_PASSWORD,
      confirmPassword: VALID_PASSWORD,
    });
    expect(result.success).toBe(false);
  });
});
