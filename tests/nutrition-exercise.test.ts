import { describe, expect, it } from "vitest";
import { calculateMacroTargets } from "../lib/nutrition";
import { libraryForWorkout } from "../lib/exercise-library";

describe("nutrition and exercise library", () => {
  it("calculates editable macro targets for cutting", () => {
    const result = calculateMacroTargets({ goal: "חיטוב", weightKg: "80", heightCm: "180", age: "30", sex: "זכר", activity: "בינונית", proteinPerKg: "1.8", fatPerKg: "0.8" });
    expect(result).not.toBeNull();
    expect(result?.protein).toBe(144);
    expect(result?.fats).toBe(64);
    expect(result?.calories).toBeGreaterThan(1800);
  });
  it("returns no target until the required body data is entered", () => {
    expect(calculateMacroTargets({ goal: "ניטרלי", weightKg: "", heightCm: "180", age: "30", sex: "זכר", activity: "בינונית", proteinPerKg: "1.8", fatPerKg: "0.8" })).toBeNull();
  });
  it("offers triceps for push and biceps for pull", () => {
    expect(libraryForWorkout("Push 1").some((item) => item.category === "יד אחורית")).toBe(true);
    expect(libraryForWorkout("Pull 1").some((item) => item.category === "יד קדמית")).toBe(true);
  });
});
