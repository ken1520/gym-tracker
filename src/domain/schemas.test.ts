import { describe, expect, it } from "vitest";

import {
  exerciseInputSchema,
  setInputSchema,
  toFieldErrors,
  workoutInputSchema,
} from "@/domain/schemas";
import { LIMITS } from "@/domain/constants";

const OBJECT_ID = "507f1f77bcf86cd799439011";

describe("setInputSchema", () => {
  it("coerces numeric strings from form posts", () => {
    const parsed = setInputSchema.parse({ weightKg: "100", reps: "5" });
    expect(parsed).toMatchObject({ weightKg: 100, reps: 5, isWarmup: false });
  });

  it("rejects zero reps and negative weight", () => {
    expect(setInputSchema.safeParse({ weightKg: "100", reps: "0" }).success).toBe(false);
    expect(setInputSchema.safeParse({ weightKg: "-1", reps: "5" }).success).toBe(false);
  });

  it("rejects implausible values above the configured limits", () => {
    expect(
      setInputSchema.safeParse({ weightKg: String(LIMITS.maxWeightKg + 1), reps: "5" }).success,
    ).toBe(false);
  });

  it("accepts RPE only within 1-10", () => {
    expect(setInputSchema.safeParse({ weightKg: "100", reps: "5", rpe: "8.5" }).success).toBe(true);
    expect(setInputSchema.safeParse({ weightKg: "100", reps: "5", rpe: "11" }).success).toBe(false);
  });

  it("allows bodyweight sets at zero load", () => {
    expect(setInputSchema.safeParse({ weightKg: "0", reps: "12" }).success).toBe(true);
  });
});

describe("exerciseInputSchema", () => {
  it("trims the name and validates the enums", () => {
    const parsed = exerciseInputSchema.parse({
      name: "  Bench Press  ",
      muscleGroup: "chest",
      equipment: "barbell",
    });
    expect(parsed.name).toBe("Bench Press");
  });

  it("rejects unknown muscle groups", () => {
    const result = exerciseInputSchema.safeParse({
      name: "Bench",
      muscleGroup: "elbows",
      equipment: "barbell",
    });
    expect(result.success).toBe(false);
  });

  it.each([
    "Bench Press",
    "Close-Grip Bench Press",
    "Farmer's Walk",
    "Pull-Up / Chin-Up",
    "45° Back Extension",
    "Squat & Press",
    "3/4 Sit-Up",
    "Bench Press (Incline)",
    "Développé Couché",
  ])("accepts a real exercise name: %s", (name) => {
    const result = exerciseInputSchema.safeParse({
      name,
      muscleGroup: "chest",
      equipment: "barbell",
    });
    expect(result.success).toBe(true);
  });

  it.each([
    "*&^%",
    "---",
    "()",
    "",
    "   ",
    "<script>alert(1)</script>",
    "-Squat",
  ])("rejects a garbage or malformed name: %s", (name) => {
    const result = exerciseInputSchema.safeParse({
      name,
      muscleGroup: "chest",
      equipment: "barbell",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a machine with a brand", () => {
    const parsed = exerciseInputSchema.parse({
      name: "Chest Press",
      muscleGroup: "chest",
      equipment: "machine",
      machineBrand: "Technogym",
    });
    expect(parsed.machineBrand).toBe("Technogym");
  });

  it("treats a machine with no brand as valid, since the brand is optional", () => {
    const parsed = exerciseInputSchema.parse({
      name: "Chest Press",
      muscleGroup: "chest",
      equipment: "machine",
    });
    expect(parsed.machineBrand).toBeUndefined();
  });

  it("reads an unselected dropdown's empty string as no brand", () => {
    const parsed = exerciseInputSchema.parse({
      name: "Chest Press",
      muscleGroup: "chest",
      equipment: "machine",
      machineBrand: "",
    });
    expect(parsed.machineBrand).toBeUndefined();
  });

  it("rejects an unknown brand", () => {
    const result = exerciseInputSchema.safeParse({
      name: "Chest Press",
      muscleGroup: "chest",
      equipment: "machine",
      machineBrand: "Definitely Not A Brand",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a brand on non-machine equipment", () => {
    const result = exerciseInputSchema.safeParse({
      name: "Bench Press",
      muscleGroup: "chest",
      equipment: "barbell",
      machineBrand: "Technogym",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(toFieldErrors(result.error).machineBrand).toBeDefined();
  });

  it("allows an empty brand on non-machine equipment", () => {
    const result = exerciseInputSchema.safeParse({
      name: "Bench Press",
      muscleGroup: "chest",
      equipment: "barbell",
      machineBrand: "",
    });
    expect(result.success).toBe(true);
  });

  it("collapses runs of internal whitespace to a single space", () => {
    const parsed = exerciseInputSchema.parse({
      name: "Bench    Press",
      muscleGroup: "chest",
      equipment: "barbell",
    });
    expect(parsed.name).toBe("Bench Press");
  });
});

describe("workoutInputSchema", () => {
  it("rejects an exerciseId that is not an ObjectId", () => {
    const result = workoutInputSchema.safeParse({
      performedAt: "2026-08-10",
      title: "Push",
      entries: [
        { exerciseId: "not-an-id", exerciseName: "Bench", sets: [{ weightKg: 80, reps: 5 }] },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an entry with no sets", () => {
    const result = workoutInputSchema.safeParse({
      performedAt: "2026-08-10",
      title: "Push",
      entries: [{ exerciseId: OBJECT_ID, exerciseName: "Bench", sets: [] }],
    });
    expect(result.success).toBe(false);
  });
});

describe("toFieldErrors", () => {
  it("maps dotted paths to the first message for each field", () => {
    const result = workoutInputSchema.safeParse({
      performedAt: "2026-08-10",
      title: "",
      entries: [],
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const errors = toFieldErrors(result.error);
    expect(errors.title).toBeDefined();
    expect(errors.entries).toBeDefined();
  });

  it("keeps the first message when a field has several issues", () => {
    const result = setInputSchema.safeParse({ weightKg: "-5", reps: "0" });
    expect(result.success).toBe(false);
    if (result.success) return;

    const errors = toFieldErrors(result.error);
    expect(errors.weightKg).toBe("Weight cannot be negative");
    expect(errors.reps).toBe("Reps must be at least 1");
  });

  it("files root-level issues under _form", () => {
    const result = workoutInputSchema.safeParse("not an object");
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(toFieldErrors(result.error)._form).toBeDefined();
  });
});
