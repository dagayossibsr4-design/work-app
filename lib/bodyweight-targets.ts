import type { MenuProfile } from "./menu-profiles";

export type BodyweightTargetResult = { calories: number; protein: number; carbohydrates: number; fats: number; proteinFactor: number; fatFactor: number; warning?: string };

export function buildBodyweightTargets(weightKg: number, calories: number, goal: MenuProfile["goal"]): BodyweightTargetResult | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(calories) || calories <= 0) return null;
  const factors = goal === "מסה" ? { protein: 2.5, fats: 1.7 } : goal === "חיטוב" ? { protein: 2.4, fats: 0.8 } : { protein: 2, fats: 1 };
  const protein = Math.round(weightKg * factors.protein / 5) * 5;
  const fats = Math.round(weightKg * factors.fats / 5) * 5;
  const remaining = calories - protein * 4 - fats * 9;
  const carbohydrates = Math.max(0, Math.round(remaining / 4));
  return { calories: Math.round(calories), protein, carbohydrates, fats, proteinFactor: factors.protein, fatFactor: factors.fats, warning: remaining < 0 ? "הקלוריות שהוגדרו נמוכות מדי כדי להכיל את יעד החלבון והשומן; הפחמימות אופסו ויש לבדוק את היעד." : undefined };
}
