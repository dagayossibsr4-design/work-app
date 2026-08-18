import type { NutritionGoal, NutritionProfile } from "./workout-store";

export type MacroTargets = { calories: number; protein: number; carbohydrates: number; fats: number; note: string };

export function calculateMacroTargets(profile: NutritionProfile): MacroTargets | null {
  const weight = Number(profile.weightKg);
  const height = Number(profile.heightCm);
  const age = Number(profile.age);
  if (!weight || !height || !age) return null;
  const base = profile.sex === "זכר" ? 10 * weight + 6.25 * height - 5 * age + 5 : 10 * weight + 6.25 * height - 5 * age - 161;
  const activityFactor = profile.activity === "נמוכה" ? 1.35 : profile.activity === "גבוהה" ? 1.65 : 1.5;
  const adjustment = profile.goal === "מסה" ? 250 : profile.goal === "חיטוב" ? -300 : 0;
  const calories = Math.round(base * activityFactor + adjustment);
  const protein = Math.round(weight * Number(profile.proteinPerKg || 1.8));
  const fats = Math.round(weight * Number(profile.fatPerKg || 0.8));
  const carbohydrates = Math.max(0, Math.round((calories - protein * 4 - fats * 9) / 4));
  const note = profile.goal === "מסה" ? "יעד עם עודף מתון; עקוב אחרי משקל והיקפים והתאם בהדרגה." : profile.goal === "חיטוב" ? "יעד עם גירעון מתון; שמור על ביצועים וחלבון וערוך התאמות לפי התקדמות." : "יעד שמירה; עדכן לפי מגמת משקל, רעב וביצועים.";
  return { calories, protein, carbohydrates, fats, note };
}

export function goalLabel(goal: NutritionGoal) { return goal === "מסה" ? "מסה" : goal === "חיטוב" ? "חיטוב" : "ניטרלי"; }
