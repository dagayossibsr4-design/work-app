import { describe, expect, it } from "vitest";
import { duplicateCustomFood, filterAndSortNutritionFoods, removeCustomFood, upsertCustomFood } from "../lib/nutrition-catalog";
import { foodItems, foodSubgroupFor } from "../lib/food-nutrition";
import type { FoodItem } from "../lib/food-nutrition";

const makeFood = (overrides: Partial<FoodItem>): FoodItem => ({
  id: "food",
  name: "מוצר בדיקה",
  group: "חלבון",
  subgroup: "עופות",
  reference: "ל־100 גרם",
  servingGrams: 100,
  calories: 150,
  protein: 20,
  carbohydrates: 2,
  fats: 4,
  ...overrides,
});

describe("ניהול קטלוג תזונה", () => {
  const foods = [
    makeFood({ id: "chicken-high", name: "עוף שומני", calories: 210 }),
    makeFood({ id: "fish", name: "דג רזה", group: "חלבון", subgroup: "דגים", calories: 90 }),
    makeFood({ id: "chicken-low", name: "חזה עוף רזה", calories: 120 }),
  ];

  it("כולל תפוח אדמה מבושל בקטגוריית הפחמימות עם ערכים ל־100 גרם", () => {
    const boiledPotato = foodItems.find((food) => food.id === "boiled-potato");
    expect(foodSubgroupFor(boiledPotato!)).toBe("פחמימות");
    expect(boiledPotato).toMatchObject({
      name: "תפוח אדמה מבושל",
      group: "פחמימה",
      calories: 87,
      protein: 1.87,
      carbohydrates: 20.1,
      fats: 0.1,
      servingGrams: 250,
    });
    expect(boiledPotato?.aliases).toContain("תפוא מבושל");
  });

  it("מסנן לפי קטגוריה ותת־קטגוריה וממיין לפי קלוריות", () => {
    const result = filterAndSortNutritionFoods(foods, { group: "חלבון", subgroup: "עופות" });
    expect(result.map((food) => food.id)).toEqual(["chicken-low", "chicken-high"]);
  });

  it("מחפש בתוך תת־קטגוריה בלי להחזיר מוצרים מקבוצות אחרות", () => {
    const result = filterAndSortNutritionFoods(foods, { query: "רזה", group: "חלבון", subgroup: "דגים" });
    expect(result.map((food) => food.name)).toEqual(["דג רזה"]);
  });

  it("מעדכן מוצר קיים ושומר את מיקומו ברשימת המוצרים", () => {
    const edited = makeFood({ id: "chicken-low", name: "חזה הודו רזה", group: "חלבון", subgroup: "עופות", calories: 110 });
    const result = upsertCustomFood(foods, edited, "chicken-low");
    expect(result).toHaveLength(3);
    expect(result.find((food) => food.id === "chicken-low")).toMatchObject({ name: "חזה הודו רזה", calories: 110 });
  });

  it("מאפשר שינוי שיוך בעת עדכון מוצר קיים", () => {
    const reassigned = makeFood({ id: "chicken-low", name: "טופו אישי", group: "חלבון", subgroup: "קטניות ותחליפים" });
    const result = upsertCustomFood(foods, reassigned, "chicken-low");
    expect(result.find((food) => food.id === "chicken-low")).toMatchObject({ group: "חלבון", subgroup: "קטניות ותחליפים" });
  });

  it("מוסיף מוצר חדש בראש הרשימה", () => {
    const created = makeFood({ id: "custom-new", name: "משקה חלבון אישי" });
    expect(upsertCustomFood(foods, created)).toHaveLength(4);
    expect(upsertCustomFood(foods, created)[0].id).toBe("custom-new");
  });

  it("משכפל מוצר עם מזהה חדש ומסמן אותו כמוצר אישי", () => {
    const copy = duplicateCustomFood(makeFood({ id: "source", name: "חלב" }), "copy");
    expect(copy).toMatchObject({ id: "copy", name: "חלב — עותק", sourceType: "אישי" });
    expect(copy.changeHistory).toBeUndefined();
  });

  it("מסיר רק את המוצר האישי שנבחר", () => {
    const result = removeCustomFood(foods, "chicken-low");
    expect(result.map((food) => food.id)).toEqual(["chicken-high", "fish"]);
  });
});
