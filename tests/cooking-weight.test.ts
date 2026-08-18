import { describe, expect, it } from "vitest";
import {
  convertMealFoodWeight,
  convertWeightGrams,
} from "../lib/cooking-weight";

describe("cooking weight conversion", () => {
  it("converts chicken from raw to cooked using the cooking yield", () => {
    expect(convertWeightGrams(100, "chicken-3", "raw", "cooked")).toBe(75);
    expect(convertWeightGrams(75, "chicken-3", "cooked", "raw")).toBe(100);
  });

  it("keeps the meal macros stable while changing the weighing mode", () => {
    const cooked = {
      id: "chicken-3",
      quantity: "100 גרם",
      calories: 165,
      protein: 31,
      carbohydrates: 0,
      fats: 3.6,
      weightMode: "cooked" as const,
    };
    const raw = convertMealFoodWeight(cooked, "raw");
    expect(raw.quantity).toBe("133.3 גרם");
    expect(raw.calories).toBe(165);
    expect(raw.protein).toBe(31);
    expect(raw.fats).toBe(3.6);
  });

  it("does not change quantities for foods without a known cooking yield", () => {
    const food = {
      id: "tahini-1",
      quantity: "100 גרם",
      calories: 595,
      protein: 17,
      carbohydrates: 21,
      fats: 53,
      weightMode: "cooked" as const,
    };
    expect(convertMealFoodWeight(food, "raw").quantity).toBe("100 גרם");
  });
});
