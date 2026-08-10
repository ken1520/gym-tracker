import { describe, expect, it } from "vitest";

import { parseWorkoutForm } from "@/server/forms/workout-form";
import { workoutInputSchema } from "@/domain/schemas";

const OBJECT_ID = "507f1f77bcf86cd799439011";

function formFrom(pairs: [string, string][]): FormData {
  return pairs.reduce((form, [key, value]) => {
    form.append(key, value);
    return form;
  }, new FormData());
}

describe("parseWorkoutForm", () => {
  it("rebuilds nested entries from flat indexed field names", () => {
    const parsed = parseWorkoutForm(
      formFrom([
        ["title", "Push day"],
        ["performedAt", "2026-08-10"],
        ["entries.0.exerciseId", OBJECT_ID],
        ["entries.0.exerciseName", "Bench Press"],
        ["entries.0.sets.0.weightKg", "80"],
        ["entries.0.sets.0.reps", "5"],
        ["entries.0.sets.1.weightKg", "85"],
        ["entries.0.sets.1.reps", "3"],
      ]),
    );

    expect(parsed.title).toBe("Push day");
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].sets).toHaveLength(2);
    expect(parsed.entries[0].sets[1]).toEqual({
      weightKg: "85",
      reps: "3",
      isWarmup: false,
    });
  });

  it("treats a present checkbox as a warmup and an absent one as a working set", () => {
    const parsed = parseWorkoutForm(
      formFrom([
        ["entries.0.exerciseId", OBJECT_ID],
        ["entries.0.exerciseName", "Squat"],
        ["entries.0.sets.0.weightKg", "60"],
        ["entries.0.sets.0.reps", "10"],
        ["entries.0.sets.0.isWarmup", "on"],
        ["entries.0.sets.1.weightKg", "100"],
        ["entries.0.sets.1.reps", "5"],
      ]),
    );

    expect(parsed.entries[0].sets[0].isWarmup).toBe(true);
    expect(parsed.entries[0].sets[1].isWarmup).toBe(false);
  });

  it("closes gaps left by client-side row removal", () => {
    const parsed = parseWorkoutForm(
      formFrom([
        ["entries.0.exerciseId", OBJECT_ID],
        ["entries.0.exerciseName", "Squat"],
        ["entries.0.sets.0.weightKg", "100"],
        ["entries.0.sets.0.reps", "5"],
        ["entries.2.exerciseId", OBJECT_ID],
        ["entries.2.exerciseName", "Row"],
        ["entries.2.sets.3.weightKg", "70"],
        ["entries.2.sets.3.reps", "8"],
      ]),
    );

    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[1].exerciseName).toBe("Row");
    expect(parsed.entries[1].sets).toEqual([{ weightKg: "70", reps: "8", isWarmup: false }]);
  });

  it("drops entries with no exercise selected", () => {
    const parsed = parseWorkoutForm(
      formFrom([
        ["entries.0.exerciseId", ""],
        ["entries.0.exerciseName", ""],
        ["entries.0.sets.0.weightKg", "100"],
        ["entries.0.sets.0.reps", "5"],
      ]),
    );

    expect(parsed.entries).toHaveLength(0);
  });

  it("omits blank notes rather than storing an empty string", () => {
    const parsed = parseWorkoutForm(formFrom([["notes", "   "]]));
    expect(parsed.notes).toBeUndefined();
  });
});

describe("parseWorkoutForm feeding workoutInputSchema", () => {
  it("produces a payload the schema accepts and coerces", () => {
    const result = workoutInputSchema.safeParse(
      parseWorkoutForm(
        formFrom([
          ["title", "Push day"],
          ["performedAt", "2026-08-10"],
          ["entries.0.exerciseId", OBJECT_ID],
          ["entries.0.exerciseName", "Bench Press"],
          ["entries.0.sets.0.weightKg", "80.5"],
          ["entries.0.sets.0.reps", "5"],
        ]),
      ),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.entries[0].sets[0].weightKg).toBe(80.5);
    expect(result.data.performedAt).toBeInstanceOf(Date);
  });

  it("rejects a workout with no entries", () => {
    const result = workoutInputSchema.safeParse(
      parseWorkoutForm(
        formFrom([
          ["title", "Empty"],
          ["performedAt", "2026-08-10"],
        ]),
      ),
    );

    expect(result.success).toBe(false);
  });
});
