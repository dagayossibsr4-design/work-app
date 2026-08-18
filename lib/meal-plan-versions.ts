import type { MenuProfile } from "./menu-profiles";
import type { Meal } from "./meal-plan";

export type MealPlanVersion = { id: string; name: string; goal: MenuProfile["goal"]; profile: MenuProfile; meals: Meal[]; savedAt: string; favorite?: boolean };
export type MealPlanVersions = Record<MenuProfile["goal"], MealPlanVersion[]>;

export const emptyMealPlanVersions = (): MealPlanVersions => ({ מסה: [], חיטוב: [], ניטרלי: [] });

export function cloneMeals(meals: Meal[]): Meal[] { return JSON.parse(JSON.stringify(meals)) as Meal[]; }
