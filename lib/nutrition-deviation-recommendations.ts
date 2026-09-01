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
