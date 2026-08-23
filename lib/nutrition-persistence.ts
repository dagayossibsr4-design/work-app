import AsyncStorage from "@react-native-async-storage/async-storage";
import { type Meal } from "@/lib/meal-plan";

export const NUTRITION_STORAGE_KEY = "workout-tracker-nutrition-state-v2";
export const NUTRITION_BACKUP_KEY = "workout-tracker-nutrition-backup-v2";
export const WATER_STORAGE_KEY = "workout-tracker-water-state-v2";

export type PersistedNutritionState = {
  meals: Meal[];
  eaten: Record<string, boolean>;
  updatedAt: string;
};

export type PersistedWaterState = {
  consumed: number;
  goal: number;
  history: Record<string, number>;
};

export async function loadPersistedNutrition(): Promise<PersistedNutritionState | null> {
  try {
    const raw = await AsyncStorage.getItem(NUTRITION_STORAGE_KEY);
    if (!raw) {
      const backup = await AsyncStorage.getItem(NUTRITION_BACKUP_KEY);
      return backup ? JSON.parse(backup) : null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function savePersistedNutrition(meals: Meal[], eaten: Record<string, boolean> = {}): Promise<void> {
  try {
    const payload: PersistedNutritionState = {
      meals,
      eaten,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(NUTRITION_STORAGE_KEY, JSON.stringify(payload));
    await AsyncStorage.setItem(NUTRITION_BACKUP_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("Failed to save nutrition state:", error);
  }
}

export async function loadPersistedWater(dateKey: string): Promise<{ consumed: number; goal: number }> {
  try {
    const raw = await AsyncStorage.getItem(WATER_STORAGE_KEY);
    if (!raw) return { consumed: 0, goal: 2000 };
    const parsed: PersistedWaterState = JSON.parse(raw);
    return {
      consumed: parsed.history[dateKey] ?? 0,
      goal: parsed.goal || 2000,
    };
  } catch {
    return { consumed: 0, goal: 2000 };
  }
}

export async function savePersistedWater(dateKey: string, consumed: number, goal: number = 2000): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(WATER_STORAGE_KEY);
    const parsed: PersistedWaterState = raw ? JSON.parse(raw) : { consumed: 0, goal: 2000, history: {} };
    parsed.history[dateKey] = consumed;
    parsed.goal = goal;
    await AsyncStorage.setItem(WATER_STORAGE_KEY, JSON.stringify(parsed));
  } catch (error) {
    console.error("Failed to save water state:", error);
  }
}