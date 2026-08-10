import { describe, expect, it } from "vitest";

import { formatDate, formatVolume, formatWeight, toDateInputValue } from "@/domain/format";

describe("formatWeight", () => {
  it("drops the decimal for whole numbers", () => {
    expect(formatWeight(100)).toBe("100 kg");
  });

  it("keeps one decimal for fractional plates", () => {
    expect(formatWeight(102.5)).toBe("102.5 kg");
  });

  it("rounds to one decimal", () => {
    expect(formatWeight(116.6666)).toBe("116.7 kg");
  });

  it("handles zero", () => {
    expect(formatWeight(0)).toBe("0 kg");
  });

  it("groups thousands at the weight limit", () => {
    expect(formatWeight(1000)).toBe("1,000 kg");
  });
});

describe("formatVolume", () => {
  it("reports kilograms below one thousand", () => {
    expect(formatVolume(500)).toBe("500 kg");
    expect(formatVolume(999)).toBe("999 kg");
  });

  it("stays in kilograms above one thousand rather than switching to tonnes", () => {
    expect(formatVolume(1000)).toBe("1,000 kg");
    expect(formatVolume(2115)).toBe("2,115 kg");
    expect(formatVolume(48250)).toBe("48,250 kg");
  });

  it("rounds to whole kilograms", () => {
    expect(formatVolume(2115.4)).toBe("2,115 kg");
  });
});

describe("formatDate", () => {
  it("renders a short readable date", () => {
    expect(formatDate("2026-08-10T00:00:00.000Z")).toBe("10 Aug 2026");
  });

  it("stays on the UTC day regardless of the runtime timezone", () => {
    // Would render as 9 Aug in any timezone behind UTC if rendered locally
    expect(formatDate("2026-08-10T00:30:00.000Z")).toBe("10 Aug 2026");
    expect(formatDate("2026-08-10T23:30:00.000Z")).toBe("10 Aug 2026");
  });
});

describe("toDateInputValue", () => {
  it("produces a value a date input accepts", () => {
    expect(toDateInputValue("2026-08-10T13:45:00.000Z")).toBe("2026-08-10");
  });
});
