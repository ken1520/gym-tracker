import { describe, expect, it } from "vitest";

import { entriesToCopy, lastSessionByMuscleGroup, muscleGroupsOf } from "@/domain/last-session";
import type { Exercise, Workout, WorkoutEntry } from "@/domain/types";

const exercise = (id: string, muscleGroup: Exercise["muscleGroup"]): Exercise => ({
  id,
  name: id,
  muscleGroup,
  equipment: "barbell",
});

const LIBRARY = [
  exercise("bench", "chest"),
  exercise("fly", "chest"),
  exercise("pushdown", "triceps"),
  exercise("squat", "legs"),
];

const entry = (exerciseId: string, weightKg = 50): WorkoutEntry => ({
  exerciseId,
  exerciseName: exerciseId,
  sets: [{ weightKg, reps: 8, isWarmup: false }],
});

const workout = (id: string, performedAt: string, entries: WorkoutEntry[]): Workout => ({
  id,
  userId: "u1",
  performedAt,
  title: "Session",
  entries,
});

describe("muscleGroupsOf", () => {
  it("lists trained groups once each, in declared order", () => {
    expect(muscleGroupsOf([entry("squat"), entry("pushdown"), entry("bench")], LIBRARY)).toEqual([
      "chest",
      "triceps",
      "legs",
    ]);
  });

  it("ignores an exercise no longer in the library", () => {
    expect(muscleGroupsOf([entry("deleted")], LIBRARY)).toEqual([]);
  });
});

describe("lastSessionByMuscleGroup", () => {
  // Newest first, as the repository returns them
  const history = [
    workout("w3", "2026-10-05T00:00:00.000Z", [entry("pushdown", 30)]),
    workout("w2", "2026-10-03T00:00:00.000Z", [entry("bench", 80), entry("squat"), entry("fly")]),
    workout("w1", "2026-10-01T00:00:00.000Z", [entry("bench", 70), entry("pushdown", 25)]),
  ];

  it("takes each group from the most recent workout that trained it", () => {
    const sessions = lastSessionByMuscleGroup(history, LIBRARY);

    expect(sessions.triceps).toEqual({
      performedAt: "2026-10-05T00:00:00.000Z",
      entries: [entry("pushdown", 30)],
    });
    expect(sessions.chest?.entries).toEqual([entry("bench", 80), entry("fly")]);
    expect(sessions.legs?.performedAt).toBe("2026-10-03T00:00:00.000Z");
  });

  it("has no key for a group never trained or only on deleted exercises", () => {
    const sessions = lastSessionByMuscleGroup(
      [workout("w1", "2026-10-01T00:00:00.000Z", [entry("deleted")])],
      LIBRARY,
    );
    expect(sessions).toEqual({});
  });
});

describe("entriesToCopy", () => {
  const sessions = {
    chest: { performedAt: "2026-10-03T00:00:00.000Z", entries: [entry("bench")] },
    triceps: { performedAt: "2026-10-05T00:00:00.000Z", entries: [entry("pushdown")] },
  };

  it("concatenates the picked groups in declared order", () => {
    expect(entriesToCopy(sessions, ["triceps", "chest"])).toEqual([
      entry("bench"),
      entry("pushdown"),
    ]);
  });

  it("skips a picked group with no previous session", () => {
    expect(entriesToCopy(sessions, ["legs"])).toEqual([]);
  });
});
