import { describe, expect, it } from "vitest";

import { mergeAccountNutritionProfile, mergeHydratedNutritionProfile } from "../lib/nutrition-persistence";
import type { NutritionProfile } from "../lib/workout-store";

const profile = (customFoods: NutritionProfile["customFoods"]): NutritionProfile => ({
  goal: "ניטרלי",
  weightKg: "",
  heightCm: "",
  age: "",
  sex: "זכר",
  activity: "בינונית",
  proteinPerKg: "1.8",
  fatPerKg: "0.8",
  calorieTarget: "2500",
  proteinTarget: "240",
  carbohydratesTarget: "150",
  fatsTarget: "",
  autoMacroField: "fats",
  customFoods,
});

describe("nutrition profile persistence", () => {
  it("preserves a product saved before hydration finishes", () => {
    const pendingFood = { id: "custom-1", name: "מוצר בדיקה" } as NonNullable<NutritionProfile["customFoods"]>[number];
    const merged = mergeHydratedNutritionProfile(profile([]), profile([]), profile([pendingFood]));
    expect(merged.customFoods?.map((food) => food.id)).toEqual(["custom-1"]);
  });

  it("loads saved custom foods when there is no pending update", () => {
    const savedFood = { id: "saved-1", name: "מוצר שמור" } as NonNullable<NutritionProfile["customFoods"]>[number];
    const merged = mergeHydratedNutritionProfile(profile([]), profile([savedFood]), null);
    expect(merged.customFoods?.map((food) => food.id)).toEqual(["saved-1"]);
  });

  it("keeps a local product when a late cloud profile is empty", () => {
    const localFood = { id: "local-1", name: "מוצר שנוסף עכשיו" } as NonNullable<NutritionProfile["customFoods"]>[number];
    const current = { ...profile([localFood]), customFoodsUpdatedAt: 200 };
    const remote = { ...profile([]), customFoodsUpdatedAt: 100 };
    const merged = mergeAccountNutritionProfile(current, remote);
    expect(merged.customFoods?.map((food) => food.id)).toEqual(["local-1"]);
    expect(merged.customFoodsUpdatedAt).toBe(200);
  });

  it("accepts a newer cloud product list when it contains products", () => {
    const remoteFood = { id: "cloud-1", name: "מוצר מהענן" } as NonNullable<NutritionProfile["customFoods"]>[number];
    const current = { ...profile([{ id: "local-1", name: "מוצר מקומי" } as NonNullable<NutritionProfile["customFoods"]>[number]]), customFoodsUpdatedAt: 100 };
    const remote = { ...profile([remoteFood]), customFoodsUpdatedAt: 200 };
    const merged = mergeAccountNutritionProfile(current, remote);
    expect(merged.customFoods?.map((food) => food.id)).toEqual(["cloud-1"]);
    expect(merged.customFoodsUpdatedAt).toBe(200);
  });
});
