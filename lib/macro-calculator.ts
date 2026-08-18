export type MacroGoal = "חיטוב" | "מסה" | "ניטרלי";
export type MacroSplit = { proteinPercent: number; carbohydratesPercent: number; fatsPercent: number };
export type MacroCalculatorInput = { calories: number; goal: MacroGoal; proteinPercent?: number; fatsPercent?: number };
export type MacroField = "protein" | "carbohydrates" | "fats";
export type MacroCompletionInput = { calories: number; proteinGrams?: number; carbohydratesGrams?: number; fatsGrams?: number; autoField: MacroField };
export type MacroCalculatorResult = MacroSplit & { calories: number; proteinGrams: number; carbohydratesGrams: number; fatsGrams: number; note: string };

const defaults: Record<MacroGoal, MacroSplit> = {
  חיטוב: { proteinPercent: 35, carbohydratesPercent: 40, fatsPercent: 25 },
  מסה: { proteinPercent: 30, carbohydratesPercent: 45, fatsPercent: 25 },
  ניטרלי: { proteinPercent: 30, carbohydratesPercent: 40, fatsPercent: 30 },
};

export function calculateMacroSplit(input: MacroCalculatorInput): MacroCalculatorResult | null {
  if (!Number.isFinite(input.calories) || input.calories <= 0) return null;
  const base = defaults[input.goal];
  const proteinPercent = input.proteinPercent ?? base.proteinPercent;
  const fatsPercent = input.fatsPercent ?? base.fatsPercent;
  const carbohydratesPercent = 100 - proteinPercent - fatsPercent;
  if (proteinPercent < 0 || fatsPercent < 0 || carbohydratesPercent < 0) return null;
  return {
    calories: Math.round(input.calories),
    proteinPercent,
    carbohydratesPercent,
    fatsPercent,
    proteinGrams: Math.round((input.calories * proteinPercent / 100 / 4) * 10) / 10,
    carbohydratesGrams: Math.round((input.calories * carbohydratesPercent / 100 / 4) * 10) / 10,
    fatsGrams: Math.round((input.calories * fatsPercent / 100 / 9) * 10) / 10,
    note: "החלוקה היא נקודת פתיחה כללית וניתנת להתאמה. הצרכים האישיים מושפעים ממשקל, פעילות, העדפות ומצב רפואי.",
  };
}

export function completeMacroValues(input: MacroCompletionInput): MacroCalculatorResult | null {
  if (!Number.isFinite(input.calories) || input.calories <= 0) return null;
  const protein = input.proteinGrams;
  const carbohydrates = input.carbohydratesGrams;
  const fats = input.fatsGrams;
  const knownCalories = (protein ?? 0) * 4 + (carbohydrates ?? 0) * 4 + (fats ?? 0) * 9;
  let proteinValue = protein;
  let carbohydratesValue = carbohydrates;
  let fatsValue = fats;
  if (input.autoField === "fats") fatsValue = (input.calories - (protein ?? 0) * 4 - (carbohydrates ?? 0) * 4) / 9;
  if (input.autoField === "carbohydrates") carbohydratesValue = (input.calories - (protein ?? 0) * 4 - (fats ?? 0) * 9) / 4;
  if (input.autoField === "protein") proteinValue = (input.calories - (carbohydrates ?? 0) * 4 - (fats ?? 0) * 9) / 4;
  if ([proteinValue, carbohydratesValue, fatsValue].some((value) => value === undefined || !Number.isFinite(value) || value < 0)) return null;
  const proteinPercent = proteinValue! * 4 / input.calories * 100;
  const carbohydratesPercent = carbohydratesValue! * 4 / input.calories * 100;
  const fatsPercent = fatsValue! * 9 / input.calories * 100;
  return { calories: Math.round(input.calories), proteinPercent: Math.round(proteinPercent * 10) / 10, carbohydratesPercent: Math.round(carbohydratesPercent * 10) / 10, fatsPercent: Math.round(fatsPercent * 10) / 10, proteinGrams: Math.round(proteinValue! * 10) / 10, carbohydratesGrams: Math.round(carbohydratesValue! * 10) / 10, fatsGrams: Math.round(fatsValue! * 10) / 10, note: `המערכת השלימה אוטומטית את ${input.autoField === "protein" ? "החלבון" : input.autoField === "carbohydrates" ? "הפחמימות" : "השומן"} לפי יתרת הקלוריות.` };
}

export function goalDescription(goal: MacroGoal) {
  return goal === "חיטוב" ? "דגש יחסי על חלבון לשמירה על מסת שריר" : goal === "מסה" ? "דגש יחסי על פחמימות לתמיכה באנרגיה ובנפח אימון" : "חלוקה מאוזנת וגמישה לשמירה";
}
