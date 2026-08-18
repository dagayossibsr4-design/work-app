import { describe, expect, it } from "vitest";
import { calculateMacroSplit, completeMacroValues } from "../lib/macro-calculator";

describe("macro calculator", () => {
  it("splits cutting calories into valid macros", () => {
    const result = calculateMacroSplit({ calories: 2400, goal: "חיטוב" });
    expect(result?.proteinGrams).toBe(210);
    expect(result?.carbohydratesGrams).toBe(240);
    expect(result?.fatsGrams).toBe(66.7);
  });
  it("uses custom protein and fat percentages", () => {
    const result = calculateMacroSplit({ calories: 3000, goal: "מסה", proteinPercent: 30, fatsPercent: 30 });
    expect(result?.carbohydratesPercent).toBe(40);
    expect(result?.proteinGrams).toBe(225);
    expect(result?.fatsGrams).toBe(100);
  });
  it("rejects invalid calorie or macro input", () => {
    expect(calculateMacroSplit({ calories: 0, goal: "ניטרלי" })).toBeNull();
    expect(calculateMacroSplit({ calories: 2000, goal: "ניטרלי", proteinPercent: 70, fatsPercent: 40 })).toBeNull();
  });
  it("completes fat from calories, protein, and carbs", () => {
    const result = completeMacroValues({ calories: 2500, proteinGrams: 240, carbohydratesGrams: 150, autoField: "fats" });
    expect(result?.fatsGrams).toBe(104.4);
  });
  it("completes carbs from calories, protein, and fat", () => {
    const result = completeMacroValues({ calories: 2500, proteinGrams: 240, fatsGrams: 50, autoField: "carbohydrates" });
    expect(result?.carbohydratesGrams).toBe(272.5);
  });
  it("completes protein from calories, carbs, and fat", () => {
    const result = completeMacroValues({ calories: 2500, carbohydratesGrams: 250, fatsGrams: 50, autoField: "protein" });
    expect(result?.proteinGrams).toBe(262.5);
  });
  it("rejects a macro combination that exceeds the calorie target", () => {
    expect(completeMacroValues({ calories: 2000, proteinGrams: 400, carbohydratesGrams: 200, autoField: "fats" })).toBeNull();
  });
});
