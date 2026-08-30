import { describe, expect, it } from "vitest";
import {
  getNutritionCloudSaveStatus,
  NUTRITION_PERSISTENCE_KEYS,
  nutritionStorageSafeToRestore,
  notifyNutritionStorageRestored,
  requestNutritionCloudSave,
  setNutritionCloudSaveStatus,
  subscribeNutritionCloudSave,
  subscribeNutritionCloudSaveStatus,
  subscribeNutritionStorageRestored,
} from "../lib/nutrition-persistence";

describe("nutrition cloud persistence", () => {
  it("includes the complete meal plan and dated-history keys", () => {
    expect(NUTRITION_PERSISTENCE_KEYS).toEqual(expect.arrayContaining([
      "workout-tracker-nutrition-v1",
      "meal-plan-state",
      "meal-plan-day-history",
      "meal-plan-eaten-history",
      "meal-plan-saved-meals",
      "nutrition-daily-history",
      "nutrition-water-history",
      "nutrition-water-events",
    ]));
  });

  it("notifies the cloud synchronizer as soon as a meal save completes", () => {
    let calls = 0;
    const unsubscribe = subscribeNutritionCloudSave(() => {
      calls += 1;
    });
    requestNutritionCloudSave();
    unsubscribe();
    requestNutritionCloudSave();
    expect(calls).toBe(1);
  });

  it("notifies the meal screen after a cloud snapshot was restored locally", () => {
    let calls = 0;
    const unsubscribe = subscribeNutritionStorageRestored(() => {
      calls += 1;
    });
    notifyNutritionStorageRestored();
    unsubscribe();
    expect(calls).toBe(1);
  });

  it("publishes the real cloud backup status for the meal screen", () => {
    const states: string[] = [];
    const unsubscribe = subscribeNutritionCloudSaveStatus((status) => {
      states.push(status);
    });
    setNutritionCloudSaveStatus("saving");
    setNutritionCloudSaveStatus("saved");
    unsubscribe();

    expect(states.slice(-2)).toEqual(["saving", "saved"]);
    expect(getNutritionCloudSaveStatus()).toBe("saved");
  });

  it("does not replace a complete local meal plan with an older cloud copy", () => {
    const local = {
      "meal-plan-state": JSON.stringify({ meals: [{ id: "meal-1" }], savedAt: "2026-08-26T10:30:00.000Z" }),
      "meal-plan-day-history": JSON.stringify({ "2026-08-26": { meals: [{ id: "meal-1" }] } }),
    };
    const cloud = {
      "meal-plan-state": JSON.stringify({ meals: [{ id: "meal-1" }], savedAt: "2026-08-26T10:00:00.000Z" }),
      "meal-plan-day-history": JSON.stringify({ "2026-08-26": { meals: [{ id: "meal-1" }] } }),
    };

    expect(nutritionStorageSafeToRestore(local, cloud)).toEqual({});
  });

  it("does not replace local meals when the cloud payload has no complete meal plan", () => {
    const local = {
      "meal-plan-state": JSON.stringify({ meals: [{ id: "meal-1" }], savedAt: "2026-08-26T10:30:00.000Z" }),
    };
    const cloud = { "meal-plan-state": JSON.stringify({ meals: [] }) };

    expect(nutritionStorageSafeToRestore(local, cloud)).toEqual({});
  });

  it("restores cloud-only water and supplement keys without replacing local meals", () => {
    const local = {
      "meal-plan-state": JSON.stringify({ meals: [{ id: "meal-local" }], savedAt: "2026-08-26T10:30:00.000Z" }),
    };
    const cloud = {
      "meal-plan-state": JSON.stringify({ meals: [] }),
      "nutrition-water-history": JSON.stringify({ "2026-08-26": { consumed: 1500, goal: 2000 } }),
      "meal-plan-supplements": JSON.stringify({ "meal-1": [{ name: "GH", taken: true }] }),
    };

    expect(nutritionStorageSafeToRestore(local, cloud)).toEqual({
      "nutrition-water-history": cloud["nutrition-water-history"],
      "meal-plan-supplements": cloud["meal-plan-supplements"],
    });
  });

  it("restores a newer complete cloud meal plan only when no local plan exists", () => {
    const cloud = {
      "meal-plan-state": JSON.stringify({ meals: [{ id: "meal-cloud" }], savedAt: "2026-08-26T10:30:00.000Z" }),
      "meal-plan-day-history": JSON.stringify({ "2026-08-26": { meals: [{ id: "meal-cloud" }] } }),
    };

    expect(nutritionStorageSafeToRestore({}, cloud)).toEqual(cloud);
  });
});
