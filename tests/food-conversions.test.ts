import { describe, expect, it } from "vitest";
import { alternativesFor, conversionFoods, gramsForMacroTarget, recommendSwap } from "../lib/food-conversions";

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
    expect(result.grams).toBe(13);
    expect(result.fats).toBe(12.6);
  });
  it("calculates chicken quantity from the original protein target", () => {
    const chicken = conversionFoods.find((food) => food.id === "chicken-cooked")!;
    expect(gramsForMacroTarget(chicken, "protein", 30)).toBe(97);
    expect(gramsForMacroTarget(chicken, "protein", 31)).toBe(100);
  });
  it("uses the actual macro amount when converting a commercial portion", () => {
    const powder = conversionFoods.find((food) => food.id === "protein-powder")!;
    const chicken = conversionFoods.find((food) => food.id === "chicken-cooked")!;
    expect(recommendSwap(powder, chicken, 30, 30).grams).toBe(97);
  });
  it("includes walnuts in the fat group", () => {
    const walnuts = conversionFoods.find((food) => food.id === "walnuts");
    expect(walnuts?.group).toBe("שומן");
    expect(walnuts?.fats).toBe(65.2);
  });
  it("returns alternatives from the same food group", () => {
    const avocado = conversionFoods.find((food) => food.id === "avocado")!;
    expect(alternativesFor(avocado).every((food) => food.group === "שומן")).toBe(true);
    expect(alternativesFor(avocado).some((food) => food.name.includes("טחינה"))).toBe(true);
  });
});
