import { cloneMeals } from "./meal-plan-versions";
import { mealTotals, type Meal } from "./meal-plan";

export type SavedMeal = {
  id: string;
  name: string;
  meal: Meal;
  totals: ReturnType<typeof mealTotals>;
  savedAt: string;
};

export function cloneMeal(meal: Meal): Meal {
  return cloneMeals([meal])[0];
}

export function createSavedMeal(
  meal: Meal,
  options: { id: string; savedAt: string; name?: string },
): SavedMeal {
  const name = options.name?.trim() || meal.title.trim() || "ארוחה ללא שם";
  const savedMeal = { ...cloneMeal(meal), title: name };

  return {
    id: options.id,
    name,
    meal: savedMeal,
    totals: mealTotals(savedMeal),
    savedAt: options.savedAt,
  };
}

/** Keeps a single current copy for each saved-meal name, with the latest one first. */
export function upsertSavedMeal(savedMeals: SavedMeal[], savedMeal: SavedMeal) {
  const normalizedName = savedMeal.name.trim().toLocaleLowerCase("he");
  return [
    savedMeal,
    ...savedMeals.filter(
      (item) => item.name.trim().toLocaleLowerCase("he") !== normalizedName,
    ),
  ];
}

/** Applies a saved meal without changing the ID of the target card or its daily completion state. */
export function applySavedMealToSlot(savedMeal: SavedMeal, targetMealId: string): Meal {
  return {
    ...cloneMeal(savedMeal.meal),
    id: targetMealId,
    title: savedMeal.name,
  };
}

/** Rebuilds stored totals from the food list, so edited quantities never leave stale calorie values. */
export function normalizeSavedMeals(value: unknown): SavedMeal[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Partial<SavedMeal>;
    if (!candidate.meal || !Array.isArray(candidate.meal.foods)) return [];
    const name =
      typeof candidate.name === "string" && candidate.name.trim()
        ? candidate.name.trim()
        : candidate.meal.title?.trim() || "ארוחה ללא שם";
    const meal = { ...cloneMeal(candidate.meal), title: name };
    return [
      {
        id: typeof candidate.id === "string" ? candidate.id : `saved-meal-${index}`,
        name,
        meal,
        totals: mealTotals(meal),
        savedAt:
          typeof candidate.savedAt === "string"
            ? candidate.savedAt
            : new Date(0).toISOString(),
      },
    ];
  });
}
