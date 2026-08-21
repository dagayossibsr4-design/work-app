import { dailyMealTotals, mealFoodTotals, type Meal } from "./meal-plan";
import { sourceForFood, type ConversionGroup } from "./food-conversions";

export type MealPlanTargets = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
};

type MacroVector = { protein: number; carbohydrates: number; fats: number };

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
  return {
    ...food,
    quantity: nextQuantity,
  };
}

export function scaleMealsToCalories(
  meals: Meal[],
  targetCalories: number,
): Meal[] {
  if (!targetCalories || targetCalories <= 0) return meals;
  const currentCalories = dailyMealTotals(meals).calories;
  if (!currentCalories) return meals;
  return meals.map((meal) => ({
    ...meal,
    foods: meal.foods.map((food) =>
      scaleFood(food, targetCalories / currentCalories),
    ),
  }));
}

function solveMacroFactors(matrix: number[][], target: number[]): number[] {
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
          Math.max(0.05, factors[column] - gradient / denominator),
        );
      }
    }
  }
  return factors;
}

export function scaleMealsToTargets(
  meals: Meal[],
  targets: MealPlanTargets,
): Meal[] {
  const groups: ConversionGroup[] = ["חלבון", "פחמימה", "שומן"];
  const matrix = groups.map((macro) => groups.map(() => 0));
  meals.forEach((meal) => {
    meal.foods.forEach((food) => {
      const totals = mealFoodTotals(food);
      const column = groups.indexOf(groupForFood(food));
      matrix[0][column] += totals.protein;
      matrix[1][column] += totals.carbohydrates;
      matrix[2][column] += totals.fats;
    });
  });
  const current: MacroVector = dailyMealTotals(meals);
  const target = [
    targets.protein > 0 ? targets.protein : current.protein,
    targets.carbohydrates > 0 ? targets.carbohydrates : current.carbohydrates,
    targets.fats > 0 ? targets.fats : current.fats,
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
      scaleFood(food, factorByGroup[groupForFood(food)]),
    ),
  }));
}

export function mealPlanGoalLabel(goal: string): string {
  if (goal === "חיטוב") return "חיטוב";
  if (goal === "מסה") return "מסה";
  return "ניטרלי";
}
