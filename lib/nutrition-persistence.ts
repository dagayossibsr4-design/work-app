/**
 * All nutrition records that must travel with the authenticated user.
 * Values are kept in AsyncStorage for offline use and copied to account_state
 * by AccountSync whenever the user is signed in to Supabase.
 */
export const NUTRITION_PROFILE_STORAGE_KEY = "workout-tracker-nutrition-v1";

export const NUTRITION_PERSISTENCE_KEYS = [
  NUTRITION_PROFILE_STORAGE_KEY,
  "meal-plan-state",
  "meal-plan-eaten-history",
  "meal-plan-day-history",
  "meal-plan-favorite",
  "meal-plan-profiles",
  "meal-plan-versions",
  "meal-plan-saved-meals",
  "meal-plan-supplements",
  "meal-plan-supplements-history",
  "meal-plan-custom-supplements",
  "meal-plan-pinned-supplements-v1",
  "supplement-daily-targets-v1",
  "supplement-daily-intake-v1",
  "supplement-cycles-v1",
  "supplement-reminder-settings-v1",
  "supplement-reminder-history-v1",
  "meal-plan-defaults-v100",
  "conversion-favorites",
  "nutrition-water-history",
  "nutrition-water-events",
  "nutrition-daily-history",
] as const;

export type NutritionStorage = Record<string, string>;

type MealPlanStorageState = {
  meals?: unknown[];
  savedAt?: string;
};

function readMealPlanState(storage: NutritionStorage): MealPlanStorageState | null {
  try {
    const parsed = JSON.parse(storage["meal-plan-state"] ?? "{}") as MealPlanStorageState;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function hasStoredMeals(storage: NutritionStorage) {
  const state = readMealPlanState(storage);
  if (Array.isArray(state?.meals) && state.meals.length > 0) return true;
  try {
    const history = JSON.parse(storage["meal-plan-day-history"] ?? "{}") as Record<string, { meals?: unknown[] }>;
    return Object.values(history).some((snapshot) => Array.isArray(snapshot?.meals) && snapshot.meals.length > 0);
  } catch {
    return false;
  }
}

function savedAt(storage: NutritionStorage) {
  const value = readMealPlanState(storage)?.savedAt;
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

/**
 * בוחר אילו נתוני תזונה בטוחים לשחזר מהענן.
 * נתון מקומי מלא לעולם אינו נדרס על ידי ענן חסר, פגום או ישן יותר.
 */
export function nutritionStorageSafeToRestore(
  localStorage: NutritionStorage,
  cloudStorage: NutritionStorage,
): NutritionStorage {
  const cloudHasMeals = hasStoredMeals(cloudStorage);
  const localHasMeals = hasStoredMeals(localStorage);

  // If local storage has not been initialized yet, restore every cloud key.
  if (!localHasMeals) return cloudStorage;

  const cloudSavedAt = savedAt(cloudStorage);
  const localSavedAt = savedAt(localStorage);
  if (cloudHasMeals && cloudSavedAt !== null && localSavedAt !== null && cloudSavedAt > localSavedAt) {
    return cloudStorage;
  }

  // Keep a newer/local meal plan, but still restore cloud-only records such as
  // water history, supplement selections and reminder history. This prevents a
  // partial account snapshot from silently deleting data on the next login.
  return Object.fromEntries(
    Object.entries(cloudStorage).filter(([key]) => localStorage[key] === undefined),
  );
}

let nutritionStorageRestoreReady = false;
const nutritionStorageReadyListeners = new Set<(ready: boolean) => void>();

export function setNutritionStorageRestoreReady(ready: boolean) {
  nutritionStorageRestoreReady = ready;
  nutritionStorageReadyListeners.forEach((listener) => listener(ready));
}

export function isNutritionStorageRestoreReady() {
  return nutritionStorageRestoreReady;
}

export function subscribeNutritionStorageRestoreReady(listener: (ready: boolean) => void) {
  nutritionStorageReadyListeners.add(listener);
  listener(nutritionStorageRestoreReady);
  return () => { nutritionStorageReadyListeners.delete(listener); };
}

const nutritionCloudSaveListeners = new Set<() => void>();
const nutritionStorageRestoreListeners = new Set<() => void>();
const nutritionStorageChangedListeners = new Set<() => void>();
export type NutritionCloudSaveStatus = "idle" | "saving" | "saved" | "failed";
let nutritionCloudSaveStatus: NutritionCloudSaveStatus = "idle";
const nutritionCloudStatusListeners = new Set<
  (status: NutritionCloudSaveStatus) => void
>();

/** Requests an immediate cloud backup after all local meal records were written. */
export function requestNutritionCloudSave() {
  nutritionCloudSaveListeners.forEach((listener) => listener());
}

/** Used by the account synchronizer to receive completed meal-save events. */
export function subscribeNutritionCloudSave(listener: () => void) {
  nutritionCloudSaveListeners.add(listener);
  return () => {
    nutritionCloudSaveListeners.delete(listener);
  };
}

/** מודיע למסך התזונה שהגיבוי ששוחזר מהענן כבר נכתב מקומית ויש לטעון אותו מחדש. */
export function notifyNutritionStorageRestored() {
  nutritionStorageRestoreListeners.forEach((listener) => listener());
}

export function subscribeNutritionStorageRestored(listener: () => void) {
  nutritionStorageRestoreListeners.add(listener);
  return () => {
    nutritionStorageRestoreListeners.delete(listener);
  };
}

/** מודיע למסכים פתוחים ש-AsyncStorage השתנה מקומית ויש לרענן נתונים. */
export function notifyNutritionStorageChanged() {
  nutritionStorageChangedListeners.forEach((listener) => listener());
}

export function subscribeNutritionStorageChanged(listener: () => void) {
  nutritionStorageChangedListeners.add(listener);
  return () => {
    nutritionStorageChangedListeners.delete(listener);
  };
}

/** Exposes the real result of cloud persistence to the nutrition screen. */
export function setNutritionCloudSaveStatus(status: NutritionCloudSaveStatus) {
  nutritionCloudSaveStatus = status;
  nutritionCloudStatusListeners.forEach((listener) => listener(status));
}

export function getNutritionCloudSaveStatus() {
  return nutritionCloudSaveStatus;
}

export function subscribeNutritionCloudSaveStatus(
  listener: (status: NutritionCloudSaveStatus) => void,
) {
  nutritionCloudStatusListeners.add(listener);
  listener(nutritionCloudSaveStatus);
  return () => {
    nutritionCloudStatusListeners.delete(listener);
  };
}

import type { NutritionProfile } from "./workout-store";

export function mergeHydratedNutritionProfile(
  current: NutritionProfile,
  saved: NutritionProfile,
  pending: NutritionProfile | null,
): NutritionProfile {
  if (!pending) return { ...current, ...saved, customFoods: saved.customFoods ?? [] };
  return {
    ...current,
    ...saved,
    ...pending,
    customFoods: pending.customFoods ?? saved.customFoods ?? [],
  };
}

/**
 * מגן על מוצרי תזונה מקומיים כאשר סנכרון ענן מאוחר מחזיר פרופיל ישן או חלקי.
 * פרופיל ענן עם מוצרים אמיתיים מתקבל; מערך ריק/חסר אינו מוחק מוצר מקומי שכבר קיים.
 */
export function mergeAccountNutritionProfile(
  current: NutritionProfile,
  remote: NutritionProfile,
): NutritionProfile {
  const localFoods = Array.isArray(current.customFoods) ? current.customFoods : [];
  const remoteFoods = Array.isArray(remote.customFoods) ? remote.customFoods : [];
  const localUpdatedAt = Number(current.customFoodsUpdatedAt) || 0;
  const remoteUpdatedAt = Number(remote.customFoodsUpdatedAt) || 0;
  const useRemoteFoods = remoteUpdatedAt > localUpdatedAt && remoteFoods.length > 0;
  const useLocalFoods = localUpdatedAt > remoteUpdatedAt || (remoteFoods.length === 0 && localFoods.length > 0);
  const customFoods = useRemoteFoods ? remoteFoods : useLocalFoods ? localFoods : remoteFoods.length || !localFoods.length ? remoteFoods : localFoods;
  const customFoodsUpdatedAt = useRemoteFoods ? remoteUpdatedAt : useLocalFoods ? localUpdatedAt : Math.max(localUpdatedAt, remoteUpdatedAt) || undefined;
  return {
    ...current,
    ...remote,
    customFoods,
    ...(customFoodsUpdatedAt ? { customFoodsUpdatedAt } : {}),
  };
}
