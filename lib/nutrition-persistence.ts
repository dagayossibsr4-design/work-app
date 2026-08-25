/**
 * All nutrition records that must travel with the authenticated user.
 * Values are kept in AsyncStorage for offline use and copied to account_state
 * by AccountSync whenever the user is signed in to Supabase.
 */
export const NUTRITION_PERSISTENCE_KEYS = [
  "meal-plan-state",
  "meal-plan-eaten-history",
  "meal-plan-day-history",
  "meal-plan-favorite",
  "meal-plan-profiles",
  "meal-plan-versions",
  "meal-plan-saved-meals",
  "meal-plan-defaults-v100",
  "conversion-favorites",
  "nutrition-water-history",
  "nutrition-water-events",
  "nutrition-daily-history",
] as const;

const nutritionCloudSaveListeners = new Set<() => void>();
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
