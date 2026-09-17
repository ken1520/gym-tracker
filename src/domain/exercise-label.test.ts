import { describe, expect, it } from "vitest";

import { exerciseQualifier, qualifierFor, repeatedNames } from "@/domain/exercise-label";
import type { Distinguishable } from "@/domain/exercise-label";

const ex = (name: string, overrides: Partial<Distinguishable> = {}): Distinguishable => ({
  name,
  equipment: "barbell",
  ...overrides,
});

describe("exerciseQualifier", () => {
  it("uses the machine brand when there is one", () => {
    expect(exerciseQualifier({ equipment: "machine", machineBrand: "Technogym" })).toBe(
      "Technogym",
    );
  });

  it("falls back to the equipment", () => {
    expect(exerciseQualifier({ equipment: "dumbbell" })).toBe("dumbbell");
  });

  it("falls back to the equipment for an unbranded machine", () => {
    expect(exerciseQualifier({ equipment: "machine" })).toBe("machine");
  });
});

describe("repeatedNames", () => {
  it("returns nothing when every name is unique", () => {
    expect(repeatedNames([ex("Bench Press"), ex("Squat")]).size).toBe(0);
  });

  it("collects a name used more than once", () => {
    const repeated = repeatedNames([ex("Chest Press"), ex("Chest Press"), ex("Squat")]);
    expect([...repeated]).toEqual(["chest press"]);
  });

  // The unique index is case-insensitive, so these read as the same name
  it("matches names case-insensitively", () => {
    expect(repeatedNames([ex("Chest Press"), ex("chest press")]).size).toBe(1);
  });
});



describe("qualifierFor", () => {
  const none: ReadonlySet<string> = new Set();

  it("always shows a machine brand, even for a unique name", () => {
    const machine = ex("Pec Dec Fly", { equipment: "machine", machineBrand: "Cybex" });
    expect(qualifierFor(machine, none)).toBe("Cybex");
  });

  it("stays quiet for a unique free-weight name", () => {
    expect(qualifierFor(ex("Squat"), none)).toBeUndefined();
  });

  it("shows the equipment once the name repeats", () => {
    const list = [ex("Chest Press"), ex("Chest Press", { equipment: "dumbbell" })];
    expect(qualifierFor(list[1], repeatedNames(list))).toBe("dumbbell");
  });

  it("has nothing to say about an exercise missing from the library", () => {
    expect(qualifierFor(undefined, none)).toBeUndefined();
  });
});
