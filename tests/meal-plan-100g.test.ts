import { describe, expect, it } from "vitest";
import { foodItems, macrosForGrams } from "../lib/food-nutrition";
import { normalizeMealsTo100Grams, type Meal } from "../lib/meal-plan";

describe("meal plan 100 gram base", () => {
  it("normalizes saved foods to 100 grams and recalculates macros", () => {
    const saved: Meal[] = [
      {
        id: "meal-old",
        title: "ארוחה ישנה",
        foods: [
          {
            id: "chicken-3",
            name: "חזה עוף מבושל",
            quantity: "200 גרם",
            reference: "ישן",
            calories: 330,
            protein: 62,
            carbohydrates: 0,
            fats: 7.2,
          },
        ],
      },
    ];

    const [normalized] = normalizeMealsTo100Grams(saved);
    const [food] = normalized.foods;
    const source = foodItems.find((item) => item.id === "chicken")!;

    expect(food.quantity).toBe("100 גרם");
    expect(food.calories).toBe(source.calories);
    expect(food.protein).toBe(source.protein);
    expect(food.fats).toBe(source.fats);
    expect(food.weightMode).toBe("cooked");
  });

  it("calculates the food library values from exactly 100 grams", () => {
    const rice = foodItems.find((item) => item.id === "rice")!;
    expect(macrosForGrams(rice, 100)).toEqual({
      calories: rice.calories,
      protein: rice.protein,
      carbohydrates: rice.carbohydrates,
      fats: rice.fats,
    });
  });
});
