import { cloneMeals } from "./meal-plan-versions";
import type { Meal } from "./meal-plan";

export type DailyMealSnapshot = {
  meals: Meal[];
  eaten: Record<string, boolean>;
};

type ImmediateMealSaveInput = {
  meals: Meal[];
  eaten: Record<string, boolean>;
  selectedDate: string;
  today: string;
  eatenHistory: Record<string, Record<string, boolean>>;
  mealHistoryByDate: Record<string, DailyMealSnapshot>;
  appliedTarget: string;
};

/** בונה כתיבה מיידית ועקבית של התפריט והיסטוריית היום הנבחר. */
export function buildImmediateMealSave(input: ImmediateMealSaveInput) {
  const nextEatenHistory = {
    ...input.eatenHistory,
    [input.selectedDate]: input.eaten,
  };
  const nextMealHistoryByDate = {
    ...input.mealHistoryByDate,
    [input.selectedDate]: {
      meals: cloneMeals(input.meals),
      eaten: input.eaten,
    },
  };
  const stateEaten =
    input.selectedDate === input.today
      ? input.eaten
      : (nextEatenHistory[input.today] ?? {});

  return {
    nextEatenHistory,
    nextMealHistoryByDate,
    entries: [
      [
        "meal-plan-state",
        JSON.stringify({
          meals: input.meals,
          eaten: stateEaten,
          appliedTarget: input.appliedTarget,
        }),
      ],
      ["meal-plan-eaten-history", JSON.stringify(nextEatenHistory)],
      ["meal-plan-day-history", JSON.stringify(nextMealHistoryByDate)],
    ] as [string, string][],
  };
}
