import { describe, expect, it } from "vitest";
import { addNutritionCalendarTotals, buildNutritionMonthCells, nutritionWeekDates } from "../lib/nutrition-calendar";

describe("לוח תזונה", () => {
  it("מחזיר שבוע מלא מיום ראשון עד שבת", () => {
    expect(nutritionWeekDates("2026-08-20")).toEqual(["2026-08-16", "2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22"]);
  });

  it("בונה את אוגוסט 2026 עם שבת בעמודה הראשונה", () => {
    const cells = buildNutritionMonthCells("2026-08");
    expect(cells[6]).toBe("2026-08-01");
    expect(cells[27]).toBe("2026-08-22");
  });

  it("מסכם קלוריות ומאקרו בין ימים", () => {
    expect(addNutritionCalendarTotals({ calories: 100, protein: 10, carbohydrates: 5, fats: 2 }, { calories: 200, protein: 20, carbohydrates: 15, fats: 8 })).toEqual({ calories: 300, protein: 30, carbohydrates: 20, fats: 10 });
  });
});
