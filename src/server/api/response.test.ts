import { describe, expect, it } from "vitest";

import { apiError, apiSuccess } from "@/server/api/response";
import { isDuplicateKeyError } from "@/server/api/errors";

describe("apiSuccess", () => {
  it("wraps the payload with a null error", () => {
    expect(apiSuccess({ id: "1" })).toEqual({
      success: true,
      data: { id: "1" },
      error: null,
    });
  });
});

describe("apiError", () => {
  it("returns a null payload alongside the message", () => {
    expect(apiError("Boom")).toEqual({ success: false, data: null, error: "Boom" });
  });

  it("omits fieldErrors entirely when none are given", () => {
    expect("fieldErrors" in apiError("Boom")).toBe(false);
  });

  it("includes fieldErrors when supplied", () => {
    expect(apiError("Invalid", { name: "Required" }).fieldErrors).toEqual({
      name: "Required",
    });
  });
});

describe("isDuplicateKeyError", () => {
  it("recognises Mongo error code 11000", () => {
    expect(isDuplicateKeyError({ code: 11000 })).toBe(true);
  });

  it("rejects other errors and non-objects", () => {
    expect(isDuplicateKeyError({ code: 121 })).toBe(false);
    expect(isDuplicateKeyError(new Error("nope"))).toBe(false);
    expect(isDuplicateKeyError(null)).toBe(false);
    expect(isDuplicateKeyError("11000")).toBe(false);
  });
});
