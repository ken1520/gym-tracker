import { describe, expect, it } from "vitest";

import { ownScope, resolveWorkoutScope } from "@/domain/scope";

const USER_ID = "507f1f77bcf86cd799439011";

describe("ownScope", () => {
  it("names the owner", () => {
    expect(ownScope(USER_ID)).toEqual({ kind: "own", userId: USER_ID });
  });
});

describe("resolveWorkoutScope", () => {
  it("widens to every account when an admin asks", () => {
    expect(resolveWorkoutScope("admin", USER_ID, "all")).toEqual({ kind: "all" });
  });

  it("keeps an admin on their own workouts by default", () => {
    expect(resolveWorkoutScope("admin", USER_ID, undefined)).toEqual({
      kind: "own",
      userId: USER_ID,
    });
  });

  // The whole point of the function: the parameter comes from the URL, so a
  // plain user typing ?scope=all must not widen anything
  it("ignores ?scope=all for a plain user", () => {
    expect(resolveWorkoutScope("user", USER_ID, "all")).toEqual({
      kind: "own",
      userId: USER_ID,
    });
  });

  it.each([["ALL"], ["everyone"], ["true"], [""], ["mine"]])(
    "treats %p as the viewer's own even for an admin",
    (requested) => {
      expect(resolveWorkoutScope("admin", USER_ID, requested)).toEqual({
        kind: "own",
        userId: USER_ID,
      });
    },
  );
});
