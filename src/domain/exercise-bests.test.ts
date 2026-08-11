import { describe, expect, it } from "vitest";

import { UNGROUPED, groupBestsByMuscle } from "@/domain/exercise-bests";
import type { PersonalBest } from "@/domain/metrics";
import type { Exercise } from "@/domain/types";

const best = (exerciseName: string, oneRepMax: number): PersonalBest => ({
  exerciseName,
  set: { weightKg: 100, reps: 5, isWarmup: false },
  oneRepMax,
});

const exercise = (id: string, name: string, overrides: Partial<Exercise> = {}): Exercise => ({
  id,
  name,
  muscleGroup: "chest",
  equipment: "barbell",
  ...overrides,
});

describe("groupBestsByMuscle", () => {
  it("files each best under its exercise's muscle group", () => {
    const groups = groupBestsByMuscle(
      new Map([
        ["a", best("Bench Press", 120)],
        ["b", best("Squat", 180)],
      ]),
      [exercise("a", "Bench Press"), exercise("b", "Squat", { muscleGroup: "legs" })],
    );

    expect(groups.map((group) => group.key)).toEqual(["chest", "legs"]);
    expect(groups[0].bests.map((row) => row.name)).toEqual(["Bench Press"]);
    expect(groups[1].bests.map((row) => row.name)).toEqual(["Squat"]);
  });

  it("orders groups by the declared muscle group order, not insertion order", () => {
    const groups = groupBestsByMuscle(
      new Map([
        ["a", best("Curl", 40)],
        ["b", best("Bench Press", 120)],
      ]),
      [exercise("a", "Curl", { muscleGroup: "biceps" }), exercise("b", "Bench Press")],
    );

    expect(groups.map((group) => group.key)).toEqual(["chest", "biceps"]);
  });

  it("omits muscle groups with nothing logged", () => {
    const groups = groupBestsByMuscle(
      new Map([["a", best("Bench Press", 120)]]),
      [exercise("a", "Bench Press"), exercise("b", "Squat", { muscleGroup: "legs" })],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("chest");
  });

  it("sorts the strongest lift first within a group", () => {
    const groups = groupBestsByMuscle(
      new Map([
        ["a", best("Incline Press", 90)],
        ["b", best("Bench Press", 120)],
      ]),
      [exercise("a", "Incline Press"), exercise("b", "Bench Press")],
    );

    expect(groups[0].bests.map((row) => row.name)).toEqual(["Bench Press", "Incline Press"]);
  });

  it("breaks ties on name so equal estimates keep a stable order", () => {
    const groups = groupBestsByMuscle(
      new Map([
        ["a", best("Zercher Press", 100)],
        ["b", best("Alpha Press", 100)],
      ]),
      [exercise("a", "Zercher Press"), exercise("b", "Alpha Press")],
    );

    expect(groups[0].bests.map((row) => row.name)).toEqual(["Alpha Press", "Zercher Press"]);
  });

  it("carries the machine brand through for machines", () => {
    const groups = groupBestsByMuscle(
      new Map([["a", best("Pec Dec Fly", 60)]]),
      [
        exercise("a", "Pec Dec Fly", {
          equipment: "machine",
          machineBrand: "Technogym",
        }),
      ],
    );

    expect(groups[0].bests[0].machineBrand).toBe("Technogym");
  });

  it("leaves the brand off anything that is not a machine", () => {
    const groups = groupBestsByMuscle(new Map([["a", best("Bench Press", 120)]]), [
      exercise("a", "Bench Press"),
    ]);

    expect(groups[0].bests[0].machineBrand).toBeUndefined();
  });

  it("prefers the library name so a rename shows immediately", () => {
    const groups = groupBestsByMuscle(
      new Map([["a", best("Bench Press", 120)]]),
      [exercise("a", "Barbell Bench Press")],
    );

    expect(groups[0].bests[0].name).toBe("Barbell Bench Press");
  });

  it("keeps a best whose exercise was deleted, under its own group and stored name", () => {
    const groups = groupBestsByMuscle(
      new Map([
        ["gone", best("Retired Machine Row", 90)],
        ["a", best("Bench Press", 120)],
      ]),
      [exercise("a", "Bench Press")],
    );

    expect(groups.map((group) => group.key)).toEqual(["chest", UNGROUPED]);
    expect(groups[1].bests[0].name).toBe("Retired Machine Row");
  });

  it("returns nothing when no workouts have been logged", () => {
    expect(groupBestsByMuscle(new Map(), [exercise("a", "Bench Press")])).toEqual([]);
  });
});
