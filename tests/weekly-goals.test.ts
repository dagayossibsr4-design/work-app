import { describe, expect, it } from "vitest";
import { DEFAULT_WEEKLY_GOALS, normalizeWeeklyGoals } from "../lib/weekly-goals";

describe("יעדים שבועיים לפרופיל", () => {
  it("מחזיר את ברירות המחדל כשאין נתונים", () => {
    expect(normalizeWeeklyGoals(undefined)).toEqual(DEFAULT_WEEKLY_GOALS);
  });

  it("שומר ערכים מותאמים ומחזיר ברירת מחדל לשדה חסר", () => {
    const result = normalizeWeeklyGoals({ workouts: 5, cardioDistance: 30 });
    expect(result.workouts).toBe(5);
    expect(result.cardioDistance).toBe(30);
    expect(result.load).toBe(DEFAULT_WEEKLY_GOALS.load);
  });

  it("מחליף ערכים שליליים בברירות המחדל", () => {
    expect(normalizeWeeklyGoals({ workouts: -2 }).workouts).toBe(DEFAULT_WEEKLY_GOALS.workouts);
  });
});
