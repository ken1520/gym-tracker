import { describe, expect, it } from "vitest";

import {
  canManageExercises,
  canManageUsers,
  canReadAllWorkouts,
  isRole,
  ROLES,
} from "@/domain/roles";

describe("roles", () => {
  it("only admins manage the shared exercise library", () => {
    expect(canManageExercises("admin")).toBe(true);
    expect(canManageExercises("user")).toBe(false);
  });

  it("only admins manage accounts", () => {
    expect(canManageUsers("admin")).toBe(true);
    expect(canManageUsers("user")).toBe(false);
  });

  it("only admins read across accounts", () => {
    expect(canReadAllWorkouts("admin")).toBe(true);
    expect(canReadAllWorkouts("user")).toBe(false);
  });

  it("every role can log its own workouts", () => {
    // There is no permission for this on purpose — signed in is the whole rule.
    // A new role would have to opt out explicitly rather than by omission
    expect(ROLES).toEqual(["admin", "user"]);
  });

  describe("isRole", () => {
    it("accepts the declared roles", () => {
      expect(isRole("admin")).toBe(true);
      expect(isRole("user")).toBe(true);
    });

    // Guards a forged cookie claiming a role the app does not have
    it.each([["owner"], ["ADMIN"], [""], [null], [undefined], [1], [{}]])(
      "rejects %p",
      (value) => {
        expect(isRole(value)).toBe(false);
      },
    );
  });
});
