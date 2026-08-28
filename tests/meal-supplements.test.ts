import { describe, expect, it } from "vitest";

import {
  createCustomSupplementDefinition,
  createMealSupplementEntry,
  filterSupplementsForDay,
  mealMenuSupplements,
  mergePinnedSupplementNames,
  normalizeCustomSupplementNames,
  normalizeMealSupplementSelections,
  normalizePinnedSupplementNames,
} from "../lib/meal-supplements";
import {
  DEFAULT_SUPPLEMENT_REMINDER_SETTINGS,
  normalizeSupplementReminderSettings,
} from "../lib/supplement-reminder-types";

describe("meal supplement menu", () => {
  it("includes the requested tracking items and the reference supplement list", () => {
    const names = mealMenuSupplements.map((supplement) => supplement.name);

    expect(names).toEqual(expect.arrayContaining([
      "קריאטין מונוהידראט",
      "ויטמין D",
      "אבקת חלבון",
      "GH",
      "טודקה (TUDCA)",
      "מולטי־ויטמין",
      "BCAA",
      "סיטרוס ברגמוט",
      "NUC",
      "ברבמין",
      "CoQ10",
      "אוביטרל",
      "ארמדיקס",
    ]));
    expect(mealMenuSupplements.filter((supplement) => supplement.trackingOnly)).toHaveLength(10);
  });

  it("filters the daily view to selected supplements and can show all items", () => {
    const visible = filterSupplementsForDay(mealMenuSupplements, ["GH", "אוביטרל"], false);
    expect(visible.map((supplement) => supplement.name)).toEqual(["GH", "אוביטרל"]);
    expect(filterSupplementsForDay(mealMenuSupplements, ["GH"], true)).toHaveLength(mealMenuSupplements.length);
    expect(filterSupplementsForDay(mealMenuSupplements, [], false)).toEqual([]);
  });

  it("keeps pinned supplements visible even when they have not been taken today", () => {
    const visible = filterSupplementsForDay(
      mealMenuSupplements,
      [],
      false,
      ["GH", "אוביטרל"],
    );
    expect(visible.map((supplement) => supplement.name)).toEqual(["GH", "אוביטרל"]);
    expect(normalizePinnedSupplementNames([" GH ", "GH", "", 7, "NUC"])).toEqual([
      "GH",
      "NUC",
    ]);
    expect(mergePinnedSupplementNames(["GH"], ["NUC", "GH", "  CoQ10 "]))
      .toEqual(["GH", "NUC", "CoQ10"]);
  });

  it("normalizes personal supplement names and creates tracking-only definitions", () => {
    expect(normalizeCustomSupplementNames(["  תוסף אישי  ", "תוסף אישי", "", 4, "שם נוסף"]))
      .toEqual(["תוסף אישי", "שם נוסף"]);
    expect(createCustomSupplementDefinition(" תוסף אישי ")).toMatchObject({
      name: "תוסף אישי",
      trackingOnly: true,
    });
  });

  it("keeps detailed tracking fields and upgrades the legacy string format", () => {
    const detailed = createMealSupplementEntry("CoQ10", {
      takenAt: "08:30",
      quantity: "1",
      unit: "כמוסה",
    });
    expect(detailed).toEqual({
      name: "CoQ10",
      taken: true,
      takenAt: "08:30",
      quantity: "1",
      unit: "כמוסה",
    });

    expect(normalizeMealSupplementSelections({
      "meal-1": ["BCAA", detailed],
    })).toEqual({
      "meal-1": [
        { name: "BCAA", taken: true, takenAt: "", quantity: "", unit: "מנה" },
        detailed,
      ],
    });
  });

  it("normalizes reminder times and preserves the three daily slots", () => {
    expect(normalizeSupplementReminderSettings({
      enabled: true,
      times: { בוקר: "07:30", צהריים: "25:90", ערב: "21:15" },
    })).toEqual({
      enabled: true,
      times: { בוקר: "07:30", צהריים: DEFAULT_SUPPLEMENT_REMINDER_SETTINGS.times.צהריים, ערב: "21:15" },
    });
  });
});
