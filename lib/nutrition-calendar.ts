export type NutritionCalendarTotals = { calories: number; protein: number; carbohydrates: number; fats: number };

export const emptyNutritionCalendarTotals: NutritionCalendarTotals = { calories: 0, protein: 0, carbohydrates: 0, fats: 0 };

export function addNutritionCalendarTotals(left: NutritionCalendarTotals, right: NutritionCalendarTotals): NutritionCalendarTotals {
  return { calories: left.calories + right.calories, protein: left.protein + right.protein, carbohydrates: left.carbohydrates + right.carbohydrates, fats: left.fats + right.fats };
}

export function nutritionDateFromKey(key: string) { return new Date(`${key}T12:00:00`); }

export function nutritionDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }

export function nutritionShiftDate(key: string, days: number) { const date = nutritionDateFromKey(key); date.setDate(date.getDate() + days); return nutritionDateKey(date); }

export function nutritionWeekDates(key: string) { const date = nutritionDateFromKey(key); date.setDate(date.getDate() - date.getDay()); return Array.from({ length: 7 }, (_, index) => nutritionShiftDate(nutritionDateKey(date), index)); }

export function buildNutritionMonthCells(monthKey: string) { const [year, month] = monthKey.split("-").map(Number); const first = new Date(year, month - 1, 1, 12); const count = new Date(year, month, 0, 12).getDate(); return [...Array.from({ length: first.getDay() }, () => null), ...Array.from({ length: count }, (_, index) => `${monthKey}-${String(index + 1).padStart(2, "0")}`)]; }
