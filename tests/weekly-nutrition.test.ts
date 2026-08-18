import { describe, expect, it } from "vitest";
import { summarizeWeek, todayKey, upsertSnapshot, type NutritionSnapshot } from "../lib/weekly-nutrition";
describe("weekly nutrition", () => {
  it("replaces the same date when saving a daily snapshot", () => {
    const first: NutritionSnapshot = { date: "2026-08-16", calories: 1000, protein: 80, carbohydrates: 100, fats: 30 };
    const next = upsertSnapshot([first], { ...first, calories: 1500 });
    expect(next).toHaveLength(1);
    expect(next[0].calories).toBe(1500);
  });
  it("calculates totals and averages for recorded days", () => {
    const history: NutritionSnapshot[] = [
      { date: "2026-08-15", calories: 2000, protein: 180, carbohydrates: 200, fats: 60 },
      { date: "2026-08-16", calories: 2400, protein: 220, carbohydrates: 240, fats: 80 },
    ];
    const result = summarizeWeek(history, new Date("2026-08-16T12:00:00"));
    expect(result.daysWithData).toBe(2);
    expect(result.totals.calories).toBe(4400);
    expect(result.averages.protein).toBe(200);
  });
  it("returns an ISO-like local date key", () => {
    expect(todayKey(new Date("2026-08-16T12:00:00"))).toBe("2026-08-16");
  });
});
