import { completeMacroValues, type MacroField } from "./macro-calculator";
import type { NutritionGoal } from "./workout-store";

export type MenuProfile = { goal: NutritionGoal; calories: string; protein: string; carbohydrates: string; fats: string; autoField: MacroField };
export type MenuProfiles = Record<NutritionGoal, MenuProfile>;

export function createMenuProfiles(profile: { goal: NutritionGoal; calorieTarget?: string; proteinTarget?: string; carbohydratesTarget?: string; fatsTarget?: string; autoMacroField?: MacroField }): MenuProfiles {
  const calories = profile.calorieTarget || "2500";
  const protein = profile.proteinTarget || "240";
  const carbohydrates = profile.carbohydratesTarget || "150";
  const fats = profile.fatsTarget || "";
  const base: MenuProfile = { goal: profile.goal, calories, protein, carbohydrates, fats, autoField: profile.autoMacroField || "fats" };
  return {
    מסה: { ...base, goal: "מסה", calories: String(Number(calories) + 250) },
    חיטוב: { ...base, goal: "חיטוב", calories: String(Math.max(0, Number(calories) - 300)) },
    ניטרלי: { ...base, goal: "ניטרלי" },
  };
}

export function completeMenuProfile(profile: MenuProfile): MenuProfile {
  const result = completeMacroValues({ calories: Number(profile.calories), proteinGrams: Number(profile.protein) || undefined, carbohydratesGrams: Number(profile.carbohydrates) || undefined, fatsGrams: Number(profile.fats) || undefined, autoField: profile.autoField });
  if (!result) return profile;
  return { ...profile, calories: String(result.calories), protein: String(result.proteinGrams), carbohydrates: String(result.carbohydratesGrams), fats: String(result.fatsGrams) };
}

export function menuProfileLabel(goal: NutritionGoal): string { return goal; }
