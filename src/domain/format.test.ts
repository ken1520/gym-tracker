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
});

describe("formatVolume", () => {
  it("uses kilograms below one tonne", () => {
    expect(formatVolume(500)).toBe("500 kg");
    expect(formatVolume(999)).toBe("999 kg");
  });

  it("switches to tonnes at one thousand", () => {
    expect(formatVolume(1000)).toBe("1.0t");
    expect(formatVolume(2115)).toBe("2.1t");
  });
});

describe("formatDate", () => {
  it("renders a short readable date", () => {
    expect(formatDate("2026-08-10T00:00:00.000Z")).toBe("10 Aug 2026");
  });
});

describe("toDateInputValue", () => {
  it("produces a value a date input accepts", () => {
    expect(toDateInputValue("2026-08-10T13:45:00.000Z")).toBe("2026-08-10");
  });
});
