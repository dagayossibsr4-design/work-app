import { describe, expect, it } from "vitest";
import { alternativesFor, conversionFoods, recommendSwap } from "../lib/food-conversions";

describe("food conversions", () => {
  it("keeps protein close when converting chicken to tilapia", () => {
    const chicken = conversionFoods.find((food) => food.id === "chicken-cooked")!;
    const tilapia = conversionFoods.find((food) => food.id === "tilapia-cooked")!;
    const result = recommendSwap(chicken, tilapia, 200);
    expect(result.preserved).toBe("חלבון");
    expect(result.grams).toBe(238);
    expect(result.protein).toBeGreaterThan(60);
  });
  it("keeps fat close when converting tahini to olive oil", () => {
    const tahini = conversionFoods.find((food) => food.id === "tahini")!;
    const oliveOil = conversionFoods.find((food) => food.id === "olive-oil")!;
    const result = recommendSwap(tahini, oliveOil, 20);
    expect(result.preserved).toBe("שומן");
    expect(result.grams).toBe(11);
    expect(result.fats).toBe(10.6);
  });
  it("returns alternatives from the same food group", () => {
    const avocado = conversionFoods.find((food) => food.id === "avocado")!;
    expect(alternativesFor(avocado).every((food) => food.group === "שומן")).toBe(true);
    expect(alternativesFor(avocado).some((food) => food.name === "טחינה")).toBe(true);
  });
});
