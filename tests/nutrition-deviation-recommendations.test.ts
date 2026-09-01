import { describe, expect, it } from "vitest";
import { buildNutritionDeviationSuggestions, groupDeviationSuggestions } from "../lib/nutrition-deviation-recommendations";
import { eatenMealTotals, mealTotals, type Meal } from "../lib/meal-plan";

const meals: Meal[] = [
  {
    id: "meal-1",
    title: "ארוחת בוקר",
    foods: [
      { id: "egg", name: "ביצים", quantity: "100 גרם", reference: "", calories: 150, protein: 13, carbohydrates: 1, fats: 10 },
      { id: "bread", name: "לחם", quantity: "100 גרם", reference: "", calories: 250, protein: 9, carbohydrates: 45, fats: 3 },
    ],
  },
  {
    id: "meal-2",
    title: "ארוחת צהריים",
    foods: [
      { id: "chicken", name: "חזה עוף", quantity: "200 גרם", reference: "", calories: 330, protein: 62, carbohydrates: 0, fats: 7 },
    ],
  },
];

describe("nutrition deviation recommendations", () => {
  it("identifies the exceeded macros from eaten foods and recommends a menu reduction", () => {
    const suggestions = buildNutritionDeviationSuggestions(
      meals,
      { egg: true, bread: true, chicken: true },
      { calories: 730, protein: 84, carbohydrates: 46, fats: 20 },
      { calories: 600, protein: 70, carbohydrates: 30, fats: 15 },
    );
    const groups = groupDeviationSuggestions(suggestions);
    expect(groups.map((group) => group.key)).toEqual(["calories", "protein", "carbohydrates", "fats"]);
    expect(groups.find((group) => group.key === "carbohydrates")?.items[0].foodName).toBe("לחם");
    expect(groups.find((group) => group.key === "carbohydrates")?.items[0].reduceGrams).toBeGreaterThan(0);
    expect(groups.find((group) => group.key === "fats")?.items[0].foodName).toBe("ביצים");
  });

  it("ignores targets that are not exceeded and does not mutate the meal plan", () => {
    const snapshot = JSON.stringify(meals);
    const suggestions = buildNutritionDeviationSuggestions(
      meals,
      { egg: true, bread: false, chicken: false },
      { calories: 150, protein: 13, carbohydrates: 1, fats: 10 },
      { calories: 200, protein: 15, carbohydrates: 5, fats: 10 },
    );
    expect(suggestions).toEqual([]);
    expect(JSON.stringify(meals)).toBe(snapshot);
  });

  it("supports legacy whole-meal eaten markers when restoring analysis data", () => {
    const totals = eatenMealTotals(meals, { "meal-1": true });
    expect(totals).toEqual(mealTotals(meals[0]));
    expect(totals.carbohydrates).toBe(mealTotals(meals[0]).carbohydrates);
    const suggestions = buildNutritionDeviationSuggestions(
      meals,
      { "meal-1": true },
      { calories: 400, protein: 22, carbohydrates: 46, fats: 13 },
      { calories: 300, protein: 20, carbohydrates: 30, fats: 10 },
    );
    expect(suggestions.length).toBeGreaterThan(0);
  });
});
