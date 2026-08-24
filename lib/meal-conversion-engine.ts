import {
  type ConversionFood,
  type ConversionGroup,
  sourceForFood,
} from "./food-conversions";
import { mealFoodTotals, type Meal, type MealFood } from "./meal-plan";
import type { WeightMode } from "./cooking-weight";

export type NutritionTotals = ReturnType<typeof mealFoodTotals>;

export type EquivalentSwap = NutritionTotals & {
  grams: number;
  preserved: "חלבון" | "פחמימות" | "שומן";
};

export type MealConversionRow = {
  group: ConversionGroup;
  sourceTotals: NutritionTotals;
  selected: ConversionFood | null;
  replacement: MealFood | null;
};

const macroForGroup = {
  חלבון: "protein",
  פחמימה: "carbohydrates",
  שומן: "fats",
} as const;

const preservedLabel = {
  חלבון: "חלבון",
  פחמימה: "פחמימות",
  שומן: "שומן",
} as const;

function roundToOne(value: number) {
  return Math.round(value * 10) / 10;
}

function roundCalories(value: number) {
  return Math.round(value);
}

export function groupForMealFood(food: MealFood): ConversionGroup {
  const source = sourceForFood(food.name);
  if (source) return source.group;

  const totals = mealFoodTotals(food);
  const values: [ConversionGroup, number][] = [
    ["חלבון", totals.protein],
    ["פחמימה", totals.carbohydrates],
    ["שומן", totals.fats],
  ];
  return values.sort((a, b) => b[1] - a[1])[0][0];
}

export function totalsForGroup(meal: Meal, group: ConversionGroup): NutritionTotals {
  return meal.foods
    .filter((food) => groupForMealFood(food) === group)
    .reduce<NutritionTotals>(
      (sum, food) => {
        const totals = mealFoodTotals(food);
        return {
          calories: sum.calories + totals.calories,
          protein: sum.protein + totals.protein,
          carbohydrates: sum.carbohydrates + totals.carbohydrates,
          fats: sum.fats + totals.fats,
        };
      },
      { calories: 0, protein: 0, carbohydrates: 0, fats: 0 },
    );
}

/**
 * Computes the exact quantity that keeps the selected group's macro stable.
 * Secondary macros and calories are calculated transparently from that quantity.
 */
export function recommendEquivalentSwap(
  sourceTotals: NutritionTotals,
  target: ConversionFood,
  group: ConversionGroup,
): EquivalentSwap | null {
  const macro = macroForGroup[group];
  const desiredMacro = sourceTotals[macro];
  const targetMacroPer100 = target[macro];
  if (desiredMacro <= 0 || targetMacroPer100 <= 0) return null;

  const grams = roundToOne((desiredMacro / targetMacroPer100) * 100);
  const factor = grams / 100;
  return {
    grams,
    calories: roundCalories(target.calories * factor),
    protein: roundToOne(target.protein * factor),
    carbohydrates: roundToOne(target.carbohydrates * factor),
    fats: roundToOne(target.fats * factor),
    preserved: preservedLabel[group],
  };
}

export function buildReplacementFood(
  target: ConversionFood,
  equivalent: EquivalentSwap,
  id: string,
): MealFood {
  return {
    id,
    name: target.name,
    quantity: `${equivalent.grams} גרם`,
    reference: `המרה מדויקת לפי ${equivalent.preserved} · ${equivalent.grams} גרם`,
    calories: equivalent.calories,
    protein: equivalent.protein,
    carbohydrates: equivalent.carbohydrates,
    fats: equivalent.fats,
    servingGrams: equivalent.grams,
    manualNutrition: true,
    weightMode: "cooked" as WeightMode,
  };
}

export function previewMealConversion(
  meal: Meal,
  choices: Record<string, ConversionFood | null>,
): MealConversionRow[] {
  return (["חלבון", "פחמימה", "שומן"] as ConversionGroup[]).map((group) => {
    const sourceTotals = totalsForGroup(meal, group);
    const selected = choices[group] ?? null;
    const equivalent = selected
      ? recommendEquivalentSwap(sourceTotals, selected, group)
      : null;

    return {
      group,
      sourceTotals,
      selected,
      replacement:
        selected && equivalent
          ? buildReplacementFood(
              selected,
              equivalent,
              `converted-${selected.id}-${meal.id}-${group}`,
            )
          : null,
    };
  });
}

export function totalMealFoodValues(foods: MealFood[]): NutritionTotals {
  return foods.reduce<NutritionTotals>(
    (sum, food) => {
      const totals = mealFoodTotals(food);
      return {
        calories: sum.calories + totals.calories,
        protein: sum.protein + totals.protein,
        carbohydrates: sum.carbohydrates + totals.carbohydrates,
        fats: sum.fats + totals.fats,
      };
    },
    { calories: 0, protein: 0, carbohydrates: 0, fats: 0 },
  );
}
