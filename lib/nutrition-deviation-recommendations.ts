import { gramsFromMealQuantity, mealFoodTotals, type Meal } from "./meal-plan";

export type DeviationMacro = "calories" | "protein" | "carbohydrates" | "fats";

type NutritionVector = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
};

export type DeviationSuggestion = {
  macro: DeviationMacro;
  label: string;
  unit: "קק״ל" | "ג׳";
  excess: number;
  mealId: string;
  mealTitle: string;
  foodId: string;
  foodName: string;
  currentGrams: number;
  reduceGrams: number;
  contribution: number;
};

const definitions: Array<{ key: DeviationMacro; label: string; unit: "קק״ל" | "ג׳" }> = [
  { key: "calories", label: "קלוריות", unit: "קק״ל" },
  { key: "protein", label: "חלבון", unit: "ג׳" },
  { key: "carbohydrates", label: "פחמימות", unit: "ג׳" },
  { key: "fats", label: "שומן", unit: "ג׳" },
];

function roundOne(value: number) {
  return Math.ceil(value * 10) / 10;
}

function foodGrams(food: { quantity: string; quantityGrams?: number }) {
  if (Number.isFinite(food.quantityGrams)) return Math.max(0, Number(food.quantityGrams));
  return gramsFromMealQuantity(food.quantity, 0);
}

export type AdjustableMacro = "protein" | "carbohydrates" | "fats";

const adjustableMacroLabels: Record<AdjustableMacro, string> = {
  protein: "חלבון",
  carbohydrates: "פחמימות",
  fats: "שומן",
};

export type ProportionalMacroReductionItem = {
  mealId: string;
  mealTitle: string;
  foodId: string;
  foodName: string;
  currentGrams: number;
  nextGrams: number;
  macroToReduce: number;
};

export type ProportionalMacroReductionPlan = {
  macro: AdjustableMacro;
  label: string;
  requestedAmount: number;
  plannedAmount: number;
  remainingAmount: number;
  items: ProportionalMacroReductionItem[];
};

export type CarbohydrateReductionItem = ProportionalMacroReductionItem;
export type CarbohydrateReductionPlan = ProportionalMacroReductionPlan;

/**
 * Distributes a required carb reduction proportionally across every carbohydrate
 * source in meals that have not yet been marked as eaten. This is a future-menu
 * adjustment; it never changes the meal history that produced the deviation.
 */
export function buildProportionalMacroReduction(
  meals: Meal[],
  eaten: Record<string, boolean>,
  macro: AdjustableMacro,
  requestedAmount: number,
): ProportionalMacroReductionPlan | null {
  const requested = Math.max(0, Number(requestedAmount) || 0);
  if (requested <= 0) return null;

  const candidates = meals.flatMap((meal) =>
    meal.foods
      .filter((food) => !eaten[meal.id] && !eaten[food.id])
      .map((food) => {
        const grams = foodGrams(food);
        const macroAmount = mealFoodTotals(food)[macro];
        return { meal, food, grams, macroAmount };
      })
      .filter((candidate) => candidate.grams > 0 && candidate.macroAmount > 0.01),
  );
  const available = candidates.reduce((total, candidate) => total + candidate.macroAmount, 0);
  if (available <= 0.01) return null;

  const planned = Math.min(requested, available);
  let remaining = planned;
  const items = candidates.map((candidate, index) => {
    const isLast = index === candidates.length - 1;
    const macroToReduce = Math.min(
      candidate.macroAmount,
      Math.max(0, isLast ? remaining : planned * (candidate.macroAmount / available)),
    );
    remaining -= macroToReduce;
    const macroPerGram = candidate.macroAmount / candidate.grams;
    const gramsToReduce = macroPerGram > 0 ? macroToReduce / macroPerGram : 0;
    const nextGrams = Math.max(0, Math.round((candidate.grams - gramsToReduce) * 10) / 10);
    return {
      mealId: candidate.meal.id,
      mealTitle: candidate.meal.title,
      foodId: candidate.food.id,
      foodName: candidate.food.name,
      currentGrams: Math.round(candidate.grams * 10) / 10,
      nextGrams,
      macroToReduce: Math.round(macroToReduce * 10) / 10,
    } satisfies ProportionalMacroReductionItem;
  }).filter((item) => item.nextGrams < item.currentGrams);

  return {
    macro,
    label: adjustableMacroLabels[macro],
    requestedAmount: Math.round(requested * 10) / 10,
    plannedAmount: Math.round((planned - Math.max(0, remaining)) * 10) / 10,
    remainingAmount: Math.round(Math.max(0, requested - planned) * 10) / 10,
    items,
  };
}

export function buildProportionalCarbohydrateReduction(
  meals: Meal[],
  eaten: Record<string, boolean>,
  requestedCarbohydrates: number,
) {
  return buildProportionalMacroReduction(meals, eaten, "carbohydrates", requestedCarbohydrates);
}

/** Applies a previously reviewed plan without changing any food other than its quantity. */
export function applyProportionalMacroReduction(
  meals: Meal[],
  plan: ProportionalMacroReductionPlan,
): Meal[] {
  const nextGramsByFood = new Map(plan.items.map((item) => [`${item.mealId}:${item.foodId}`, item.nextGrams]));
  return meals.map((meal) => ({
    ...meal,
    foods: meal.foods.map((food) => {
      const nextGrams = nextGramsByFood.get(`${meal.id}:${food.id}`);
      if (nextGrams === undefined) return food;
      return {
        ...food,
        quantity: `${nextGrams} גרם`,
        quantityGrams: nextGrams,
        servingGrams: food.servingGrams ?? (nextGrams > 0 ? nextGrams : 100),
        dailyQuantityCleared: false,
      };
    }),
  }));
}

export const applyProportionalCarbohydrateReduction = applyProportionalMacroReduction;

/**
 * Builds explainable, same-day menu recommendations without mutating meals or persistence.
 * The suggested reduction is calculated from the foods that were actually eaten;
 * it is a planning recommendation for the next menu/meal, not a retroactive correction.
 */
export function buildNutritionDeviationSuggestions(
  meals: Meal[],
  eaten: Record<string, boolean>,
  consumed: NutritionVector,
  targets: NutritionVector,
): DeviationSuggestion[] {
  const candidates = meals.flatMap((meal) =>
    meal.foods
      .map((food) => {
        const totals = mealFoodTotals(food);
        const grams = foodGrams(food);
        return { meal, food, totals, grams };
      })
      .filter((item) => (eaten[item.food.id] || eaten[item.meal.id]) && item.grams > 0),
  );

  return definitions.flatMap(({ key, label, unit }) => {
    const excess = consumed[key] - targets[key];
    if (targets[key] <= 0 || excess <= 0.5) return [];

    return candidates
      .map(({ meal, food, totals, grams }) => {
        const contribution = totals[key];
        const perGram = contribution / grams;
        if (!Number.isFinite(perGram) || perGram <= 0) return null;
        return {
          macro: key,
          label,
          unit,
          excess: roundOne(excess),
          mealId: meal.id,
          mealTitle: meal.title,
          foodId: food.id,
          foodName: food.name,
          currentGrams: roundOne(grams),
          reduceGrams: Math.min(roundOne(grams), Math.max(0.1, roundOne(excess / perGram))),
          contribution: roundOne(contribution),
        } satisfies DeviationSuggestion;
      })
      .filter((item): item is DeviationSuggestion => item !== null)
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3);
  });
}

export function groupDeviationSuggestions(suggestions: DeviationSuggestion[]) {
  return definitions
    .map((definition) => ({
      ...definition,
      items: suggestions.filter((suggestion) => suggestion.macro === definition.key),
    }))
    .filter((group) => group.items.length > 0);
}
