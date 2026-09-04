import { describe, expect, it } from "vitest";
import { sanitizeNonNegativeDecimalInput } from "../lib/numeric-input";

describe("sanitizeNonNegativeDecimalInput", () => {
  it("passes through a plain integer", () => {
    expect(sanitizeNonNegativeDecimalInput("12")).toBe("12");
  });

  it("strips letters out of reps/weight input", () => {
    expect(sanitizeNonNegativeDecimalInput("12kg")).toBe("12");
    expect(sanitizeNonNegativeDecimalInput("abc")).toBe("");
  });

  it("strips minus signs so weight can never go negative", () => {
    expect(sanitizeNonNegativeDecimalInput("-5")).toBe("5");
    expect(sanitizeNonNegativeDecimalInput("5-2")).toBe("52");
  });

  it("converts a locale decimal comma to a dot", () => {
    expect(sanitizeNonNegativeDecimalInput("12,5")).toBe("12.5");
  });

  it("keeps only the first decimal point", () => {
    expect(sanitizeNonNegativeDecimalInput("1.2.3")).toBe("1.23");
  });

  it("allows an empty string while the user is still typing", () => {
    expect(sanitizeNonNegativeDecimalInput("")).toBe("");
  });
});
