import { describe, expect, it } from "vitest";

import { toUpdateDoc } from "@/server/repositories/update-doc";

describe("toUpdateDoc", () => {
  it("puts provided fields in $set", () => {
    const doc = toUpdateDoc({ name: "Bench Press", equipment: "barbell" }, []);
    expect(doc).toEqual({ $set: { name: "Bench Press", equipment: "barbell" } });
  });

  it("omits $unset entirely when nothing was cleared, since Mongo rejects an empty operator", () => {
    const doc = toUpdateDoc({ name: "Bench", notes: "keep me" }, ["notes"]);
    expect(doc.$unset).toBeUndefined();
  });

  it("unsets a clearable field the input left out", () => {
    const doc = toUpdateDoc<{ name: string; notes?: string }>({ name: "Bench" }, ["notes"]);
    expect(doc).toEqual({ $set: { name: "Bench" }, $unset: { notes: 1 } });
  });

  it("unsets a clearable field explicitly set to undefined", () => {
    const doc = toUpdateDoc({ name: "Bench", machineBrand: undefined }, ["machineBrand"]);
    expect(doc).toEqual({ $set: { name: "Bench" }, $unset: { machineBrand: 1 } });
  });

  it("never writes undefined into $set", () => {
    const doc = toUpdateDoc({ name: "Bench", notes: undefined }, []);
    expect("notes" in doc.$set).toBe(false);
  });

  it("clears several fields at once", () => {
    const doc = toUpdateDoc<{ name: string; notes?: string; machineBrand?: string }>(
      { name: "Bench" },
      ["notes", "machineBrand"],
    );
    expect(doc.$unset).toEqual({ notes: 1, machineBrand: 1 });
  });

  it("keeps falsy values that are not undefined", () => {
    const doc = toUpdateDoc({ weightKg: 0, isWarmup: false, notes: "" }, ["notes"]);
    expect(doc.$set).toEqual({ weightKg: 0, isWarmup: false, notes: "" });
    expect(doc.$unset).toBeUndefined();
  });
});
