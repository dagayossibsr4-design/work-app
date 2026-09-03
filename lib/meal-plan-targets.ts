import { dailyMealTotals, foodGroupForMealFood, mealFoodTotals, type Meal, type MealMacroTargets } from "./meal-plan";
import { sourceForFood, type ConversionGroup } from "./food-conversions";

export type MealPlanTargets = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
};

type MacroVector = { protein: number; carbohydrates: number; fats: number };
export type MealMacroKey = keyof MacroVector;
export type MealMacroAllocation = { mealId: string; targets: MacroVector };
export type MealMacroAlignmentPlan = {
  mealId: string;
  mealTitle: string;
  current: MacroVector;
  target: MacroVector;
  projected: MacroVector;
  alignedMeal: Meal;
  items: Array<{ foodId: string; foodName: string; currentGrams: number; nextGrams: number }>;
};

const macroKeys: MealMacroKey[] = ["protein", "carbohydrates", "fats"];

function roundMacro(value: number) {
  return Math.max(0, Math.round(value * 10) / 10);
}

function savedTarget(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? roundMacro(parsed) : undefined;
}

/**
 * Builds the per-meal targets from the daily targets. Unedited meals split the
 * remaining value equally; values manually set on earlier meals are preserved.
 */
export function buildMealMacroAllocations(
  meals: Meal[],
  dailyTargets: Pick<MealPlanTargets, MealMacroKey>,
): MealMacroAllocation[] {
  const allocations = meals.map((meal) => ({
    mealId: meal.id,
    targets: { protein: 0, carbohydrates: 0, fats: 0 },
  }));
  macroKeys.forEach((macro) => {
    const dailyTarget = Math.max(0, Number(dailyTargets[macro]) || 0);
    const explicit = meals.map((meal) => savedTarget(meal.targetMacros?.[macro]));
    const explicitTotal = explicit.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    const unassignedIndexes = explicit.flatMap((value, index) => value === undefined ? [index] : []);
    let remaining = Math.max(0, dailyTarget - explicitTotal);
    unassignedIndexes.forEach((index, offset) => {
      const slotsLeft = unassignedIndexes.length - offset;
      const target = slotsLeft === 1 ? remaining : roundMacro(remaining / slotsLeft);
      allocations[index].targets[macro] = target;
      remaining = roundMacro(remaining - target);
    });
    explicit.forEach((value, index) => {
      if (value !== undefined) allocations[index].targets[macro] = value;
    });
  });
  return allocations;
}

/**
 * Stores the edited meal target and freezes the values before it, so only the
 * current and later meals are rebalanced. This keeps a user's breakfast target
 * stable while the remaining daily target is divided across future meals.
 */
export function rebalanceMealMacroTargets(
  meals: Meal[],
  dailyTargets: Pick<MealPlanTargets, MealMacroKey>,
  mealId: string,
  values: MealMacroTargets,
): Meal[] {
  const editedIndex = meals.findIndex((meal) => meal.id === mealId);
  if (editedIndex < 0) return meals;
  const allocations = buildMealMacroAllocations(meals, dailyTargets);
  return meals.map((meal, index) => {
    const targetMacros = { ...(meal.targetMacros ?? {}) };
    if (index < editedIndex) {
      macroKeys.forEach((macro) => {
        if (targetMacros[macro] === undefined) targetMacros[macro] = allocations[index].targets[macro];
      });
    }
    if (meal.id === mealId) {
      macroKeys.forEach((macro) => {
        const next = savedTarget(values[macro]);
        targetMacros[macro] = next ?? allocations[index].targets[macro];
      });
    }
    return { ...meal, targetMacros };
  });
}

export function clearMealMacroTargets(meals: Meal[]): Meal[] {
  return meals.map(({ targetMacros: _targetMacros, ...meal }) => ({ ...meal }));
}

function groupForFood(
  food: Parameters<typeof mealFoodTotals>[0],
): ConversionGroup {
  const source = sourceForFood(food.name);
  if (source) return source.group;
  const values: [ConversionGroup, number][] = [
    ["חלבון", food.protein],
    ["פחמימה", food.carbohydrates],
    ["שומן", food.fats],
  ];
  return values.sort((a, b) => b[1] - a[1])[0][0];
}

function scaleFood(food: Parameters<typeof mealFoodTotals>[0], factor: number) {
  const current = mealFoodTotals(food);
  const numeric = food.quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)/);
  const nextQuantity = numeric
    ? food.quantity.replace(
        /^\s*[0-9]+(?:\.[0-9]+)?/,
        `${Math.round(Number(numeric[1]) * factor * 10) / 10}`,
      )
    : food.quantity;
  const nextGrams = numeric
    ? Math.round(Number(numeric[1]) * factor * 10) / 10
    : food.quantityGrams;
  return {
    ...food,
    quantity: nextQuantity,
    ...(typeof nextGrams === "number" && Number.isFinite(nextGrams)
      ? { quantityGrams: nextGrams }
      : {}),
  };
}

export function scaleMealsToCalories(
  meals: Meal[],
  targetCalories: number,
): Meal[] {
  if (!targetCalories || targetCalories <= 0) return meals;
  const currentCalories = dailyMealTotals(meals).calories;
  if (!currentCalories) return meals;
  const protectedCalories = meals.reduce(
    (sum, meal) => sum + meal.foods.reduce(
      (mealSum, food) => mealSum + (foodGroupForMealFood(food) === "ירק ופרי" ? mealFoodTotals(food).calories : 0),
      0,
    ),
    0,
  );
  const adjustableCalories = Math.max(0, currentCalories - protectedCalories);
  if (adjustableCalories <= 0) return meals;
  const factor = Math.max(0, (targetCalories - protectedCalories) / adjustableCalories);
  return meals.map((meal) => ({
    ...meal,
    foods: meal.foods.map((food) =>
      foodGroupForMealFood(food) === "ירק ופרי" ? food : scaleFood(food, factor),
    ),
  }));
}

function solveMacroFactors(matrix: number[][], target: number[], minFactor = 0.05): number[] {
  const factors = [1, 1, 1];
  for (let iteration = 0; iteration < 300; iteration += 1) {
    for (let column = 0; column < 3; column += 1) {
      let gradient = 0;
      let denominator = 0;
      for (let row = 0; row < 3; row += 1) {
        const predicted = matrix[row].reduce(
          (sum, value, otherColumn) => sum + value * factors[otherColumn],
          0,
        );
        const contribution = matrix[row][column];
        gradient += contribution * (predicted - target[row]);
        denominator += contribution * contribution;
      }
      if (denominator > 0) {
        factors[column] = Math.min(
          5,
          Math.max(minFactor, factors[column] - gradient / denominator),
        );
      }
    }
  }
  return factors;
}

function gramsForAlignment(food: Parameters<typeof mealFoodTotals>[0]) {
  const stored = Number(food.quantityGrams);
  if (Number.isFinite(stored) && stored >= 0) return stored;
  const numeric = food.quantity.match(/^\s*([0-9]+(?:[.,][0-9]+)?)/);
  const parsed = numeric ? Number(numeric[1].replace(",", ".")) : 0;
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function adjustableGroupForFood(food: Parameters<typeof mealFoodTotals>[0]): ConversionGroup | null {
  return foodGroupForMealFood(food) === "ירק ופרי" ? null : groupForFood(food);
}

/**
 * Creates a reviewable quantity update for a single meal. Vegetables and fruit
 * are intentionally fixed; only protein, carbohydrate and fat sources scale.
 */
export function buildMealMacroAlignment(
  meal: Meal,
  requestedTargets: Pick<MealPlanTargets, MealMacroKey>,
): MealMacroAlignmentPlan {
  const groups: ConversionGroup[] = ["חלבון", "פחמימה", "שומן"];
  const current = dailyMealTotals([meal]);
  const fixed = { protein: 0, carbohydrates: 0, fats: 0 };
  const matrix = groups.map(() => groups.map(() => 0));

  meal.foods.forEach((food) => {
    const totals = mealFoodTotals(food);
    const group = adjustableGroupForFood(food);
    if (!group) {
      fixed.protein += totals.protein;
      fixed.carbohydrates += totals.carbohydrates;
      fixed.fats += totals.fats;
      return;
    }
    const column = groups.indexOf(group);
    matrix[0][column] += totals.protein;
    matrix[1][column] += totals.carbohydrates;
    matrix[2][column] += totals.fats;
  });

  const target: MacroVector = {
    protein: requestedTargets.protein > 0 ? roundMacro(requestedTargets.protein) : roundMacro(current.protein),
    carbohydrates: requestedTargets.carbohydrates > 0 ? roundMacro(requestedTargets.carbohydrates) : roundMacro(current.carbohydrates),
    fats: requestedTargets.fats > 0 ? roundMacro(requestedTargets.fats) : roundMacro(current.fats),
  };
  const adjustableTarget = [
    Math.max(0, target.protein - fixed.protein),
    Math.max(0, target.carbohydrates - fixed.carbohydrates),
    Math.max(0, target.fats - fixed.fats),
  ];
  const factors = solveMacroFactors(matrix, adjustableTarget, 0);
  const factorByGroup: Record<ConversionGroup, number> = {
    חלבון: factors[0],
    פחמימה: factors[1],
    שומן: factors[2],
  };
  const items: MealMacroAlignmentPlan["items"] = [];
  const alignedMeal: Meal = {
    ...meal,
    foods: meal.foods.map((food) => {
      const group = adjustableGroupForFood(food);
      if (!group) return food;
      const next = scaleFood(food, factorByGroup[group]);
      const currentGrams = roundMacro(gramsForAlignment(food));
      const nextGrams = roundMacro(gramsForAlignment(next));
      if (Math.abs(nextGrams - currentGrams) >= 0.1) {
        items.push({ foodId: food.id, foodName: food.name, currentGrams, nextGrams });
      }
      return next;
    }),
  };

  const projected = dailyMealTotals([alignedMeal]);
  return { mealId: meal.id, mealTitle: meal.title, current, target, projected, alignedMeal, items };
}

export function scaleMealsToTargets(
  meals: Meal[],
  targets: MealPlanTargets,
): Meal[] {
  const groups: ConversionGroup[] = ["חלבון", "פחמימה", "שומן"];
  const matrix = groups.map((macro) => groups.map(() => 0));
  const fixed = { protein: 0, carbohydrates: 0, fats: 0 };
  meals.forEach((meal) => {
    meal.foods.forEach((food) => {
      const totals = mealFoodTotals(food);
      const group = adjustableGroupForFood(food);
      if (!group) {
        fixed.protein += totals.protein;
        fixed.carbohydrates += totals.carbohydrates;
        fixed.fats += totals.fats;
        return;
      }
      const column = groups.indexOf(group);
      matrix[0][column] += totals.protein;
      matrix[1][column] += totals.carbohydrates;
      matrix[2][column] += totals.fats;
    });
  });
  const current: MacroVector = dailyMealTotals(meals);
  const target = [
    Math.max(0, (targets.protein > 0 ? targets.protein : current.protein) - fixed.protein),
    Math.max(0, (targets.carbohydrates > 0 ? targets.carbohydrates : current.carbohydrates) - fixed.carbohydrates),
    Math.max(0, (targets.fats > 0 ? targets.fats : current.fats) - fixed.fats),
  ];
  const factors = solveMacroFactors(matrix, target);
  const factorByGroup: Record<ConversionGroup, number> = {
    חלבון: factors[0],
    פחמימה: factors[1],
    שומן: factors[2],
  };
  return meals.map((meal) => ({
    ...meal,
    foods: meal.foods.map((food) =>
      adjustableGroupForFood(food) ? scaleFood(food, factorByGroup[adjustableGroupForFood(food)!]) : food,
    ),
  }));
}

export function mealPlanGoalLabel(goal: string): string {
  if (goal === "חיטוב") return "חיטוב";
  if (goal === "מסה") return "מסה";
  return "ניטרלי";
}
