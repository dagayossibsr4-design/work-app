import { describe, expect, it } from "vitest";
import { defaultMeals, dailyMealTotals } from "../lib/meal-plan";
import {
  mealPlanGoalLabel,
  scaleMealsToCalories,
  scaleMealsToTargets,
} from "../lib/meal-plan-targets";
describe("meal plan targets", () => {
  it("scales the planned meal quantities to the selected calorie target", () => {
    const current = dailyMealTotals(defaultMeals).calories;
    const target = 3000;
    const scaled = scaleMealsToCalories(defaultMeals, target);
    expect(dailyMealTotals(scaled).calories).toBeGreaterThanOrEqual(
      target - 30,
    );
    expect(dailyMealTotals(scaled).calories).toBeLessThanOrEqual(target + 30);
    expect(scaled[0].foods[0].quantity).not.toBe(
      defaultMeals[0].foods[0].quantity,
    );
    expect(current).not.toBe(target);
  });
  it("keeps meals unchanged when no valid target exists", () => {
    expect(scaleMealsToCalories(defaultMeals, 0)).toEqual(defaultMeals);
  });
  it("aligns the planned menu with protein, carbohydrate, and fat targets", () => {
    const scaled = scaleMealsToTargets(defaultMeals, {
      calories: 2300,
      protein: 240,
      carbohydrates: 151,
      fats: 81.8,
    });
    const totals = dailyMealTotals(scaled);
    expect(totals.protein).toBeGreaterThanOrEqual(238);
    expect(totals.protein).toBeLessThanOrEqual(242);
    expect(totals.carbohydrates).toBeGreaterThanOrEqual(149);
    expect(totals.carbohydrates).toBeLessThanOrEqual(153);
    expect(totals.fats).toBeGreaterThanOrEqual(80);
    expect(totals.fats).toBeLessThanOrEqual(83);
  });
  it("labels the selected nutrition goal", () => {
    expect(mealPlanGoalLabel("חיטוב")).toBe("חיטוב");
    expect(mealPlanGoalLabel("מסה")).toBe("מסה");
    expect(mealPlanGoalLabel("ניטרלי")).toBe("ניטרלי");
  });
});
