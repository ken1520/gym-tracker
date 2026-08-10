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
