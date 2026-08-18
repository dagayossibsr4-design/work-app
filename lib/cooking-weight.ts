export type WeightMode = "raw" | "cooked";

export const weightModeLabels: Record<WeightMode, string> = {
  raw: "לפני בישול",
  cooked: "אחרי בישול",
};

// יחס משקל אחרי בישול למשקל לפני בישול. אלה אומדני תשואה לפי קבוצת מזון;
// בפועל התוצאה תלויה בשיטת הבישול, ולכן הממשק מציג אותם כהמרה משוערת.
const cookingYields: Record<string, number> = {
  chicken: 0.75,
  turkey: 0.75,
  salmon: 0.8,
  baramundi: 0.8,
  tilapia: 0.8,
  rice: 2.5,
  pasta: 2.4,
  potato: 0.8,
  "sweet-potato": 0.8,
};

function baseFoodId(foodId: string) {
  return Object.keys(cookingYields).find(
    (id) => foodId === id || foodId.startsWith(`${id}-`),
  );
}

export function cookingYieldForFood(foodId: string) {
  return cookingYields[baseFoodId(foodId) ?? ""] ?? 1;
}

export function cookingConversionInfo(foodId: string, mode: WeightMode) {
  const yieldFactor = cookingYieldForFood(foodId);
  if (yieldFactor === 1) {
    return {
      known: false,
      factorText: "אין מקדם בישול ייעודי במאגר",
      calculationText: "הכמות נשארת זהה במצב לפני ואחרי בישול",
    };
  }
  const rawToCooked = `1 גרם לפני בישול → ${yieldFactor.toFixed(2)} גרם אחרי בישול`;
  const cookedToRaw = `1 גרם אחרי בישול → ${(1 / yieldFactor).toFixed(2)} גרם לפני בישול`;
  return {
    known: true,
    factorText: `מקדם תשואה: ${yieldFactor.toFixed(2)}`,
    calculationText: mode === "raw" ? cookedToRaw : rawToCooked,
  };
}

export function convertWeightGrams(
  grams: number,
  foodId: string,
  from: WeightMode,
  to: WeightMode,
) {
  if (!Number.isFinite(grams) || from === to) return Math.max(0, grams);
  const yieldFactor = cookingYieldForFood(foodId);
  if (from === "raw" && to === "cooked")
    return Math.max(0, grams * yieldFactor);
  return Math.max(0, grams / yieldFactor);
}

function roundGrams(value: number) {
  return Math.round(value * 10) / 10;
}

function currentGrams(quantity: string) {
  const match = quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : null;
}

function macroTotalsAtCurrentQuantity(food: {
  quantity: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
}) {
  const grams = currentGrams(food.quantity);
  const baseMatch = food.quantity.match(/([0-9]+(?:\.[0-9]+)?)\s*גרם/);
  const baseGrams = baseMatch ? Number(baseMatch[1]) : null;
  const factor = grams && baseGrams ? grams / baseGrams : 1;
  return {
    calories: food.calories * factor,
    protein: food.protein * factor,
    carbohydrates: food.carbohydrates * factor,
    fats: food.fats * factor,
  };
}

export function convertMealFoodWeight<
  T extends {
    id: string;
    quantity: string;
    calories: number;
    protein: number;
    carbohydrates: number;
    fats: number;
    weightMode?: WeightMode;
  },
>(food: T, nextMode: WeightMode): T {
  const fromMode = food.weightMode ?? "cooked";
  const grams = currentGrams(food.quantity);
  if (grams === null || fromMode === nextMode) {
    return { ...food, weightMode: nextMode };
  }
  const nextGrams = convertWeightGrams(grams, food.id, fromMode, nextMode);
  if (nextGrams <= 0)
    return { ...food, quantity: "0 גרם", weightMode: nextMode };
  const totals = macroTotalsAtCurrentQuantity(food);
  return {
    ...food,
    quantity: `${roundGrams(nextGrams)} גרם`,
    weightMode: nextMode,
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbohydrates: Math.round(totals.carbohydrates * 10) / 10,
    fats: Math.round(totals.fats * 10) / 10,
  };
}
