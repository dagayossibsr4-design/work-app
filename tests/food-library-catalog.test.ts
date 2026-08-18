import { describe, expect, it } from "vitest";
import { foodItems, macrosForGrams } from "../lib/food-nutrition";

describe("מאגר המזון הישראלי", () => {
  it("כולל קטגוריות ישראליות ומוצרים מסחריים נפוצים", () => {
    expect(foodItems.some((food) => food.name === "קוטג׳ 5%")).toBe(true);
    expect(foodItems.some((food) => food.name === "מעדן חלבון")).toBe(true);
    expect(foodItems.some((food) => food.name === "טחינה גולמית")).toBe(true);
    expect(foodItems.some((food) => food.sourceType === "מסחרי")).toBe(true);
  });

  it("מחשב תמיד את הערכים ביחס ל־100 גרם", () => {
    const rice = foodItems.find((food) => food.id === "rice");
    expect(rice).toBeDefined();
    expect(macrosForGrams(rice!, 100)).toEqual({ calories: 130, protein: 2.7, carbohydrates: 28.2, fats: 0.3 });
    expect(macrosForGrams(rice!, 200).calories).toBe(260);
  });

  it("מכיל כינויים שמאפשרים חיפוש בעברית", () => {
    const potato = foodItems.find((food) => food.id === "potato");
    const proteinPowder = foodItems.find((food) => food.id === "protein-powder");
    expect(potato?.aliases).toContain("תפוא");
    expect(proteinPowder?.aliases).toContain("אבקת חלבון");
  });
});
