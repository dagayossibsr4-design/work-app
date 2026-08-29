import { describe, expect, it } from "vitest";

import { cloneMeal, type Meal } from "../lib/meal-plan";

describe("cloneMeal", () => {
  it("copies the complete meal and gives the meal and foods new ids", () => {
    const original: Meal = {
      id: "meal-1",
      title: "ארוחת בוקר",
      foods: [
        {
          id: "food-1",
          name: "יוגורט",
          quantity: "200 גרם",
          reference: "תווית",
          calories: 140,
          protein: 20,
          carbohydrates: 8,
          fats: 2,
          weightMode: "cooked",
          servingGrams: 200,
          quantityGrams: 200,
          manualNutrition: true,
        },
      ],
    };

    const duplicate = cloneMeal(original, "test-1");

    expect(duplicate).toEqual({
      ...original,
      id: "meal-1-copy-test-1",
      title: "ארוחת בוקר — עותק",
      foods: [{ ...original.foods[0], id: "food-1-copy-test-1-1" }],
    });
    expect(duplicate).not.toBe(original);
    expect(duplicate.foods).not.toBe(original.foods);
    expect(duplicate.foods[0]).not.toBe(original.foods[0]);
  });

  it("does not mutate the original when the copy is edited", () => {
    const original: Meal = {
      id: "meal-2",
      title: "ארוחה",
      foods: [{ id: "food-2", name: "אורז", quantity: "180 גרם", reference: "מקור", calories: 230, protein: 5, carbohydrates: 50, fats: 1 }],
    };

    const duplicate = cloneMeal(original, "test-2");
    duplicate.title = "ארוחה מותאמת";
    duplicate.foods[0].quantity = "220 גרם";
    duplicate.foods[0].calories = 280;

    expect(original.title).toBe("ארוחה");
    expect(original.foods[0].quantity).toBe("180 גרם");
    expect(original.foods[0].calories).toBe(230);
  });
});
