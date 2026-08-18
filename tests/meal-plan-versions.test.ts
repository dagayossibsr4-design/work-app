import { describe, expect, it } from "vitest";
import { cloneMeals, emptyMealPlanVersions } from "../lib/meal-plan-versions";
import { defaultMeals } from "../lib/meal-plan";

describe("meal plan versions", () => {
  it("keeps independent version buckets for each goal", () => {
    const versions = emptyMealPlanVersions();
    versions.מסה.push({ id: "mass-1", name: "אימון בוקר", goal: "מסה", profile: { goal: "מסה", calories: "2800", protein: "200", carbohydrates: "300", fats: "80", autoField: "fats" }, meals: cloneMeals(defaultMeals), savedAt: "now" });
    expect(versions.מסה).toHaveLength(1);
    expect(versions.חיטוב).toHaveLength(0);
    expect(versions.ניטרלי).toHaveLength(0);
  });

  it("clones meals so loading a version does not mutate the stored copy", () => {
    const copy = cloneMeals(defaultMeals);
    copy[0].foods[0].quantity = "999 גרם";
    expect(defaultMeals[0].foods[0].quantity).not.toBe("999 גרם");
  });
});
