import { describe, expect, it } from "vitest";

import {
  buildMonthGrid,
  groupWorkoutsByDay,
  isValidMonthKey,
  monthLabel,
  resolveMonthKey,
  shiftMonth,
  summarizeDays,
  toDayKey,
  toMonthKey,
} from "@/domain/calendar";
import type { Workout } from "@/domain/types";

const workout = (id: string, performedAt: string, weightKg = 100): Workout => ({
  id,
  // Metrics never look at the owner — every workout reaching them is already
  // scoped by the repository — but the type requires one
  userId: "u1",
  performedAt,
  title: "Session",
  entries: [
    {
      exerciseId: "a",
      exerciseName: "Squat",
      sets: [{ weightKg, reps: 5, isWarmup: false }],
    },
  ],
});

describe("toDayKey", () => {
  it("uses UTC parts, not local time", () => {
    expect(toDayKey("2026-08-10T00:00:00.000Z")).toBe("2026-08-10");
    expect(toDayKey("2026-08-10T23:59:59.000Z")).toBe("2026-08-10");
  });

  it("derives the month key from the same basis", () => {
    expect(toMonthKey("2026-08-10T00:00:00.000Z")).toBe("2026-08");
  });
});

describe("isValidMonthKey", () => {
  it("accepts a well-formed key", () => {
    expect(isValidMonthKey("2026-08")).toBe(true);
  });

  it("rejects malformed or out-of-range months", () => {
    expect(isValidMonthKey("2026-13")).toBe(false);
    expect(isValidMonthKey("2026-00")).toBe(false);
    expect(isValidMonthKey("2026-8")).toBe(false);
    expect(isValidMonthKey("nonsense")).toBe(false);
  });
});

describe("resolveMonthKey", () => {
  const now = new Date("2026-08-10T00:00:00.000Z");

  it("passes through a valid key", () => {
    expect(resolveMonthKey("2026-03", now)).toBe("2026-03");
  });

  it("falls back to the current month for missing or junk input", () => {
    expect(resolveMonthKey(undefined, now)).toBe("2026-08");
    expect(resolveMonthKey("../etc/passwd", now)).toBe("2026-08");
    expect(resolveMonthKey("2026-99", now)).toBe("2026-08");
  });
});

describe("shiftMonth", () => {
  it("moves within a year", () => {
    expect(shiftMonth("2026-08", 1)).toBe("2026-09");
    expect(shiftMonth("2026-08", -1)).toBe("2026-07");
  });

  it("rolls across year boundaries", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("monthLabel", () => {
  it("renders a readable month and year", () => {
    expect(monthLabel("2026-08")).toBe("August 2026");
    expect(monthLabel("2027-01")).toBe("January 2027");
  });
});

describe("buildMonthGrid", () => {
  it("always returns six weeks of seven days", () => {
    const grid = buildMonthGrid("2026-08");
    expect(grid).toHaveLength(6);
    expect(grid.every((week) => week.length === 7)).toBe(true);
  });

  it("starts every week on a Sunday", () => {
    for (const monthKey of ["2026-01", "2026-08", "2027-05"]) {
      for (const week of buildMonthGrid(monthKey)) {
        expect(new Date(`${week[0].dayKey}T00:00:00.000Z`).getUTCDay()).toBe(0);
      }
    }
  });

  it("pads with adjacent-month days marked out of month", () => {
    // 1 Aug 2026 is a Saturday, so the Sunday-first row starts on 26 Jul
    const [firstWeek] = buildMonthGrid("2026-08");
    expect(firstWeek[0]).toEqual({
      dayKey: "2026-07-26",
      dayOfMonth: 26,
      inMonth: false,
    });
    expect(firstWeek[6]).toEqual({
      dayKey: "2026-08-01",
      dayOfMonth: 1,
      inMonth: true,
    });
  });

  it("starts flush when the month begins on a Sunday", () => {
    // 1 Feb 2026 is a Sunday
    const [firstWeek] = buildMonthGrid("2026-02");
    expect(firstWeek[0]).toEqual({
      dayKey: "2026-02-01",
      dayOfMonth: 1,
      inMonth: true,
    });
  });

  it("pads a full leading week when the month begins on a Monday", () => {
    // 1 Jun 2026 is a Monday, so Sunday 31 May leads the grid
    const [firstWeek] = buildMonthGrid("2026-06");
    expect(firstWeek[0]).toEqual({
      dayKey: "2026-05-31",
      dayOfMonth: 31,
      inMonth: false,
    });
    expect(firstWeek[1].dayKey).toBe("2026-06-01");
  });

  it("covers every day of a leap February", () => {
    const inMonth = buildMonthGrid("2028-02")
      .flat()
      .filter((day) => day.inMonth);
    expect(inMonth).toHaveLength(29);
    expect(inMonth.at(-1)?.dayKey).toBe("2028-02-29");
  });

  it("covers every day of a non-leap February", () => {
    const inMonth = buildMonthGrid("2026-02")
      .flat()
      .filter((day) => day.inMonth);
    expect(inMonth).toHaveLength(28);
  });
});

describe("groupWorkoutsByDay", () => {
  it("buckets several workouts onto one day", () => {
    const groups = groupWorkoutsByDay([
      workout("a", "2026-08-10T06:00:00.000Z"),
      workout("b", "2026-08-10T18:00:00.000Z"),
      workout("c", "2026-08-11T06:00:00.000Z"),
    ]);

    expect(groups.get("2026-08-10")).toHaveLength(2);
    expect(groups.get("2026-08-11")).toHaveLength(1);
  });

  it("returns an empty map for no workouts", () => {
    expect(groupWorkoutsByDay([]).size).toBe(0);
  });
});

describe("summarizeDays", () => {
  it("counts workouts and sums volume per day", () => {
    const summary = summarizeDays(
      groupWorkoutsByDay([
        workout("a", "2026-08-10T06:00:00.000Z", 100),
        workout("b", "2026-08-10T18:00:00.000Z", 100),
      ]),
    );

    expect(summary.get("2026-08-10")).toMatchObject({
      workoutCount: 2,
      volume: 1000,
    });
  });

  it("scales intensity against the busiest day", () => {
    const summary = summarizeDays(
      groupWorkoutsByDay([
        workout("light", "2026-08-01T00:00:00.000Z", 20),
        workout("medium", "2026-08-02T00:00:00.000Z", 60),
        workout("heavy", "2026-08-03T00:00:00.000Z", 100),
      ]),
    );

    expect(summary.get("2026-08-01")?.intensity).toBe(1);
    expect(summary.get("2026-08-02")?.intensity).toBe(2);
    expect(summary.get("2026-08-03")?.intensity).toBe(3);
  });

  it("still marks a logged day when every set was a warmup", () => {
    const warmupOnly: Workout = {
      id: "w",
      userId: "u1",
      performedAt: "2026-08-10T00:00:00.000Z",
      title: "Deload",
      entries: [
        {
          exerciseId: "a",
          exerciseName: "Squat",
          sets: [{ weightKg: 60, reps: 10, isWarmup: true }],
        },
      ],
    };

    const summary = summarizeDays(groupWorkoutsByDay([warmupOnly]));
    expect(summary.get("2026-08-10")).toMatchObject({ volume: 0, intensity: 1 });
  });
});
