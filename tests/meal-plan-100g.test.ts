import { describe, expect, it } from "vitest";
import { foodItems, macrosForGrams } from "../lib/food-nutrition";
import { eatenMealTotals, hydrateMealPlan, mealFoodTotals, normalizeMealsTo100Grams, restoreMissingDefaultMealSlots, type Meal } from "../lib/meal-plan";
import { convertMealFoodWeight } from "../lib/cooking-weight";

describe("meal plan stored quantities", () => {
  it("preserves saved grams and recalculates their macros from the canonical food", () => {
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

    expect(food.quantity).toBe("200 גרם");
    expect(food.calories).toBe(330);
    expect(food.protein).toBe(62);
    expect(food.fats).toBe(7.2);
    expect(food.servingGrams).toBe(200);
    expect(food.weightMode).toBe("cooked");
  });

  it("preserves an explicit quantity field across hydration", () => {
    const saved: Meal[] = [{
      id: "meal-tahini",
      title: "ארוחה",
      foods: [{ id: "tahini-1", name: "טחינה גולמית", quantity: "23 גרם", quantityGrams: 20, reference: "ישן", calories: 161, protein: 4.7, carbohydrates: 3.1, fats: 14.4 }],
    }];
    const [hydrated] = hydrateMealPlan(saved);
    expect(hydrated.foods[0].quantity).toBe("20 גרם");
    expect(hydrated.foods[0].quantityGrams).toBe(20);
    expect(mealFoodTotals(hydrated.foods[0])).toEqual(macrosForGrams(foodItems.find((item) => item.id === "tahini")!, 20));
  });

  it("preserves an explicit commercial protein portion and its macro target", () => {
    const saved: Meal[] = [{
      id: "meal-2",
      title: "ארוחה 2",
      foods: [{
        id: "protein-powder-2",
        name: "אבקת חלבון",
        quantity: "46 גרם",
        reference: "תווית Dymatize + מדידה אישית",
        calories: 179,
        protein: 30,
        carbohydrates: 3.9,
        fats: 3.9,
      }],
    }];
    const [normalized] = normalizeMealsTo100Grams(saved);
    expect(normalized.foods[0].quantity).toBe("46 גרם");
    expect(normalized.foods[0].protein).toBe(30);
    expect(normalized.foods[0].servingGrams).toBe(46);
  });

  it("keeps grams and protein synchronized against the stable serving basis", () => {
    const food = { id: "protein-powder-2", name: "אבקת חלבון", quantity: "46 גרם", reference: "מדידה אישית", calories: 179, protein: 30, carbohydrates: 3.9, fats: 3.9, servingGrams: 46 };
    expect(mealFoodTotals(food).protein).toBe(30);
    expect(mealFoodTotals({ ...food, quantity: "36 גרם" }).protein).toBe(23.5);
  });

  it("repairs a saved pudding row whose id and macros were copied from chicken", () => {
    const [normalized] = normalizeMealsTo100Grams([{
      id: "legacy-meal",
      title: "ארוחה ישנה",
      foods: [{ id: "legacy-food", name: "מעדן חלבון", quantity: "200 גרם", reference: "נתון ישן", calories: 330, protein: 62, carbohydrates: 0, fats: 7.2 }],
    }]);
    expect(normalized.foods[0]).toMatchObject({ name: "מעדן חלבון", quantity: "200 גרם", calories: 140, protein: 20, carbohydrates: 6.8, fats: 3 });
  });

  it("prefers the pudding name over a legacy chicken id from device storage", () => {
    const [normalized] = normalizeMealsTo100Grams([{
      id: "meal-from-device",
      title: "ארוחה 1",
      foods: [{ id: "chicken-3", name: "מעדן חלבון", quantity: "200 גרם", reference: "ערך מאקרו ישן", calories: 330, protein: 62, carbohydrates: 0, fats: 7.2 }],
    }]);
    expect(mealFoodTotals(normalized.foods[0])).toEqual({ calories: 140, protein: 20, carbohydrates: 6.8, fats: 3 });
  });

  it("uses the exact 198 gram protein pudding cup label", () => {
    const pudding = foodItems.find((food) => food.id === "protein-pudding");
    expect(pudding?.servingGrams).toBe(198);
    expect(macrosForGrams(pudding!, 198)).toEqual({ calories: 139, protein: 19.8, carbohydrates: 6.7, fats: 3 });
  });

  it("renders each commercial food card from its own label values", () => {
    expect(mealFoodTotals({
      id: "protein-pudding",
      name: "מעדן חלבון",
      quantity: "200 גרם",
      reference: "ערך מצטבר ישן",
      calories: 434,
      protein: 62,
      carbohydrates: 21,
      fats: 9.4,
    })).toEqual({ calories: 140, protein: 20, carbohydrates: 6.8, fats: 3 });
  });

  it("rebuilds commercial portions from canonical labels instead of stale saved macros", () => {
    const normalized = normalizeMealsTo100Grams([{
      id: "label-check",
      title: "בדיקת תוויות",
      foods: [
        { id: "protein-pudding", name: "מעדן חלבון", quantity: "200 גרם", reference: "ערך ישן", calories: 363, protein: 51.7, carbohydrates: 17.6, fats: 7.7 },
        { id: "protein-powder-legacy", name: "אבקת חלבון", quantity: "36 גרם", reference: "ערך ישן", calories: 200, protein: 60, carbohydrates: 8, fats: 8 },
      ],
    }]);
    expect(mealFoodTotals(normalized[0].foods[0]).protein).toBe(20);
    expect(mealFoodTotals(normalized[0].foods[0]).calories).toBe(140);
    expect(mealFoodTotals(normalized[0].foods[1]).protein).toBe(23.5);
  });

  it.each([
    [100, 70, 10, 3.4, 1.5],
    [150, 105, 15, 5.1, 2.3],
    [198, 139, 19.8, 6.7, 3],
    [200, 140, 20, 6.8, 3],
  ])("calculates pudding values exactly for %s grams", (grams, calories, protein, carbohydrates, fats) => {
    const pudding = foodItems.find((food) => food.id === "protein-pudding")!;
    expect(macrosForGrams(pudding, grams)).toEqual({ calories, protein, carbohydrates, fats });
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

  it("keeps manually corrected card values and scales them with the quantity", () => {
    const manual = {
      id: "protein-pudding",
      name: "מעדן חלבון",
      quantity: "200 גרם",
      reference: "ערך ידני · 200 גרם",
      calories: 150,
      protein: 21,
      carbohydrates: 8,
      fats: 3.5,
      servingGrams: 200,
      manualNutrition: true,
    };
    expect(mealFoodTotals(manual)).toEqual({ calories: 150, protein: 21, carbohydrates: 8, fats: 3.5 });
    expect(mealFoodTotals({ ...manual, quantity: "100 גרם" })).toEqual({ calories: 75, protein: 10.5, carbohydrates: 4, fats: 1.8 });
    expect(normalizeMealsTo100Grams([{ id: "manual", title: "ידני", foods: [manual] }])[0].foods[0]).toMatchObject({ manualNutrition: true, calories: 150, protein: 21 });
  });

  it("preserves manual nutrition totals while converting the food weight", () => {
    const manual = { id: "chicken-3", name: "חזה עוף מבושל", quantity: "150 גרם", reference: "ערך ידני", calories: 250, protein: 45, carbohydrates: 0, fats: 5, servingGrams: 150, manualNutrition: true, weightMode: "cooked" as const };
    const converted = convertMealFoodWeight(manual, "raw");
    const convertedWithServing = { ...converted, servingGrams: Number(converted.quantity.match(/^\s*([0-9.]+)/)?.[1]) };
    expect(mealFoodTotals(convertedWithServing)).toEqual({ calories: 250, protein: 45, carbohydrates: 0, fats: 5 });
  });

  it("restores components only for default meal slots that were saved empty", () => {
    const restored = hydrateMealPlan([
      { id: "meal-1", title: "ארוחה 1", foods: [{ id: "custom", name: "מזון אישי", quantity: "50 גרם", reference: "אישי", calories: 50, protein: 5, carbohydrates: 3, fats: 2 }] },
      { id: "meal-2", title: "ארוחה 2", foods: [] },
      { id: "meal-custom", title: "ארוחה אישית", foods: [] },
    ]);
    expect(restored.find((meal) => meal.id === "meal-1")?.foods).toHaveLength(1);
    expect(restored.find((meal) => meal.id === "meal-2")?.foods.map((food) => food.name)).toEqual(["אבקת חלבון Dymatize Elite Whey", "שיבולת שועל / קוואקר", "אגוזי מלך"]);
    expect(restored.find((meal) => meal.id === "meal-custom")?.foods).toEqual([]);
  });

  it("restores missing default meal slots from a legacy partial save without removing a custom meal", () => {
    const restored = restoreMissingDefaultMealSlots([
      { id: "meal-1", title: "ארוחה 1 מותאמת", foods: [{ id: "custom-food", name: "מזון אישי", quantity: "50 גרם", reference: "אישי", calories: 50, protein: 5, carbohydrates: 3, fats: 2 }] },
      { id: "meal-extra", title: "ארוחה נוספת", foods: [] },
    ]);
    expect(restored.slice(0, 5).map((meal) => meal.id)).toEqual(["meal-1", "meal-2", "meal-3", "meal-4", "meal-5"]);
    expect(restored.find((meal) => meal.id === "meal-1")?.title).toBe("ארוחה 1 מותאמת");
    expect(restored.at(-1)?.id).toBe("meal-extra");
  });

  it("calculates only marked foods for the eaten-today summary without removing planned foods", () => {
    const meals: Meal[] = [{
      id: "meal-1",
      title: "בדיקה",
      foods: [
        { id: "eaten", name: "נאכל", quantity: "100 גרם", reference: "בדיקה", calories: 100, protein: 10, carbohydrates: 5, fats: 2 },
        { id: "planned", name: "מתוכנן", quantity: "100 גרם", reference: "בדיקה", calories: 200, protein: 20, carbohydrates: 10, fats: 4 },
      ],
    }];
    expect(eatenMealTotals(meals, { eaten: true })).toEqual({ calories: 100, protein: 10, carbohydrates: 5, fats: 2 });
    expect(meals[0].foods).toHaveLength(2);
  });
});


describe("meal quantity migration safety", () => {
  it("keeps an explicitly saved gram quantity stable for every meal slot", () => {
    const meals = Array.from({ length: 5 }, (_, index) => ({
      id: `meal-${index + 1}`,
      title: `ארוחה ${index + 1}`,
      foods: [{
        id: `custom-${index + 1}`,
        name: "מזון אישי",
        quantity: "20 גרם",
        reference: "הזנה אישית",
        calories: 100,
        protein: 10,
        carbohydrates: 5,
        fats: 2,
        quantityGrams: 20,
      }],
    }));
    const hydrated = hydrateMealPlan(meals);
    expect(hydrated.flatMap((meal) => meal.foods).map((food) => food.quantityGrams)).toEqual([20, 20, 20, 20, 20]);
    expect(hydrated.flatMap((meal) => meal.foods).map((food) => food.quantity)).toEqual(["20 גרם", "20 גרם", "20 גרם", "20 גרם", "20 גרם"]);
  });

  it("does not convert non-gram units or stale macro values into a fake gram quantity", () => {
    const [hydrated] = hydrateMealPlan([{
      id: "meal-5",
      title: "ארוחה 5",
      foods: [{ id: "capsule", name: "כמוסות אומגה 3", quantity: "3 כמוסות", reference: "תווית", calories: 34, protein: 0, carbohydrates: 0, fats: 3.8 }],
    }]);
    expect(hydrated.foods[0]).toMatchObject({ quantity: "3 כמוסות", calories: 34, fats: 3.8 });
    expect(hydrated.foods[0].quantityGrams).toBeUndefined();
  });

  it("does not rescale an unknown saved food with an invalid huge quantity", () => {
    const [hydrated] = normalizeMealsTo100Grams([{
      id: "meal-4",
      title: "ארוחה 4",
      foods: [{ id: "custom-huge", name: "מזון אישי", quantity: "מנה", reference: "אישי", calories: 200, protein: 20, carbohydrates: 10, fats: 5, quantityGrams: 25609600.3 }],
    }]);
    expect(hydrated.foods[0]).toMatchObject({ quantity: "מנה", calories: 200, protein: 20, carbohydrates: 10, fats: 5 });
    expect(hydrated.foods[0].quantityGrams).toBe(25609600.3);
  });
});
