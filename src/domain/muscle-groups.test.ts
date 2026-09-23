import { describe, expect, it } from "vitest";

import { UNGROUPED, groupByMuscle, muscleGroupLabel } from "@/domain/muscle-groups";

describe("groupByMuscle", () => {
  it("collects rows under their group in the declared order", () => {
    const groups = groupByMuscle([
      ["biceps", "Curl"],
      ["chest", "Bench Press"],
      ["biceps", "Hammer Curl"],
    ]);

    expect(groups).toEqual([
      { key: "chest", rows: ["Bench Press"] },
      { key: "biceps", rows: ["Curl", "Hammer Curl"] },
    ]);
  });

  it("puts anything ungrouped at the end", () => {
    const groups = groupByMuscle([
      [UNGROUPED, "Retired"],
      ["chest", "Bench Press"],
    ]);

    expect(groups.map((group) => group.key)).toEqual(["chest", UNGROUPED]);
  });

  it("drops groups nothing landed in", () => {
    expect(groupByMuscle([["chest", "Bench Press"]])).toHaveLength(1);
    expect(groupByMuscle([])).toEqual([]);
  });
});

describe("muscleGroupLabel", () => {
  it("spells out the ungrouped key and sentence-cases every label", () => {
    expect(muscleGroupLabel(UNGROUPED)).toBe("No longer in the library");
    expect(muscleGroupLabel("chest")).toBe("Chest");
    expect(muscleGroupLabel("full-body")).toBe("Full-body");
  });
});
