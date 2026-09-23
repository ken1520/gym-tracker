import { describe, expect, it } from "vitest";

import { buildExerciseOptions, flattenOptions } from "@/domain/exercise-options";
import { UNGROUPED } from "@/domain/muscle-groups";
import type { Exercise, WorkoutEntry } from "@/domain/types";

const exercise = (id: string, name: string, overrides: Partial<Exercise> = {}): Exercise => ({
  id,
  name,
  muscleGroup: "chest",
  equipment: "barbell",
  ...overrides,
});

const entry = (exerciseId: string, exerciseName: string): WorkoutEntry => ({
  exerciseId,
  exerciseName,
  sets: [{ weightKg: 100, reps: 5, isWarmup: false }],
});

describe("buildExerciseOptions", () => {
  it("groups the library by muscle group in the declared order", () => {
    const groups = buildExerciseOptions([
      exercise("a", "Curl", { muscleGroup: "biceps" }),
      exercise("b", "Bench Press"),
      exercise("c", "Squat", { muscleGroup: "legs" }),
    ]);

    expect(groups.map((group) => group.key)).toEqual(["chest", "biceps", "legs"]);
    expect(groups[0].options.map((option) => option.name)).toEqual(["Bench Press"]);
  });

  it("keeps the order the library arrived in within a group", () => {
    const groups = buildExerciseOptions([
      exercise("a", "Bench Press"),
      exercise("b", "Cable Fly", { equipment: "cable" }),
    ]);

    expect(groups[0].options.map((option) => option.name)).toEqual(["Bench Press", "Cable Fly"]);
  });

  it("qualifies every option with its brand or equipment", () => {
    const groups = buildExerciseOptions([
      exercise("a", "Chest Press", { equipment: "machine", machineBrand: "Cybex" }),
      exercise("b", "Bench Press"),
    ]);

    expect(groups[0].options.map((option) => option.label)).toEqual([
      "Chest Press (Cybex)",
      "Bench Press (barbell)",
    ]);
  });

  it("keeps an exercise the workout references but the library no longer has", () => {
    const groups = buildExerciseOptions([exercise("a", "Bench Press")], [entry("gone", "Dips")]);

    expect(groups.map((group) => group.key)).toEqual(["chest", UNGROUPED]);
    expect(groups[1].options).toEqual([{ id: "gone", name: "Dips", label: "Dips (removed)" }]);
  });

  it("marks a deleted exercise in the label only, so the stored name stays clean", () => {
    const groups = buildExerciseOptions([], [entry("gone", "Dips")]);

    expect(groups[0].options[0].name).toBe("Dips");
  });

  it("lists a deleted exercise once however many entries reference it", () => {
    const groups = buildExerciseOptions([], [entry("gone", "Dips"), entry("gone", "Dips")]);

    expect(groups[0].options).toHaveLength(1);
  });

  it("does not duplicate an exercise the library still has", () => {
    const groups = buildExerciseOptions(
      [exercise("a", "Bench Press")],
      [entry("a", "Bench Press")],
    );

    expect(flattenOptions(groups)).toHaveLength(1);
  });

  it("returns no groups for an empty library", () => {
    expect(buildExerciseOptions([])).toEqual([]);
  });
});
