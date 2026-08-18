import { describe, expect, it } from "vitest";
import { calculateMacroDistribution } from "../lib/macro-distribution";

describe("macro distribution", () => {
  it("calculates calorie percentages from grams", () => {
    const result = calculateMacroDistribution({ protein: 240, carbohydrates: 400, fats: 160 });
    expect(result.totalCalories).toBe(4000);
    expect(result.proteinPercent).toBe(24);
    expect(result.carbohydratesPercent).toBe(40);
    expect(result.fatsPercent).toBe(36);
  });

  it("returns a safe empty distribution when no macros exist", () => {
    const result = calculateMacroDistribution({ protein: 0, carbohydrates: 0, fats: 0 });
    expect(result.totalCalories).toBe(0);
    expect(result.proteinPercent).toBe(0);
    expect(result.carbohydratesPercent).toBe(0);
    expect(result.fatsPercent).toBe(0);
  });
});
