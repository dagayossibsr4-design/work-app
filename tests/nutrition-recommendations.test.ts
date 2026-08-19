import { describe, expect, it } from "vitest";
import { buildNutritionRecommendations } from "../lib/nutrition-recommendations";
import type { NutritionProfile, WorkoutSession } from "../lib/workout-store";

const profile: NutritionProfile = { goal: "ניטרלי", weightKg: "80", heightCm: "180", age: "30", sex: "זכר", activity: "גבוהה", proteinPerKg: "1.8", fatPerKg: "0.8", calorieTarget: "2500", proteinTarget: "144", carbohydratesTarget: "280", fatsTarget: "70" };
const session = (id: string, dayOffset: number): WorkoutSession => ({ id, templateId: "legs1", startedAt: new Date(Date.UTC(2026, 7, 20 - dayOffset, 18)).toISOString(), finishedAt: new Date(Date.UTC(2026, 7, 20 - dayOffset, 19)).toISOString(), sets: Array.from({ length: 12 }, (_, index) => ({ id: `${id}-${index}`, exerciseId: "squat", setNumber: index + 1, weight: "100", reps: "10", completed: true })) });

describe("Nutrition recommendations", () => {
  it("returns a high-load recommendation after frequent high-volume training", () => {
    const result = buildNutritionRecommendations([session("a", 1), session("b", 2), session("c", 3), session("d", 4)], profile, Date.UTC(2026, 7, 20, 20));
    expect(result[0].id).toBe("high-load");
    expect(result[0].detail).toContain("להוסיף");
    expect(result.some((item) => item.id === "protein")).toBe(true);
  });

  it("explains when there is no completed recent workout", () => {
    const result = buildNutritionRecommendations([], profile, Date.UTC(2026, 7, 20, 20));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("no-workouts");
  });
});
