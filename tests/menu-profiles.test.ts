import { describe, expect, it } from "vitest";
import { completeMenuProfile, createMenuProfiles } from "../lib/menu-profiles";

describe("menu profiles", () => {
  it("creates separate calorie targets for mass, cut, and neutral", () => {
    const profiles = createMenuProfiles({ goal: "ניטרלי", calorieTarget: "2500", proteinTarget: "200", carbohydratesTarget: "200", fatsTarget: "60", autoMacroField: "fats" });
    expect(profiles.מסה.calories).toBe("2750");
    expect(profiles.חיטוב.calories).toBe("2200");
    expect(profiles.ניטרלי.calories).toBe("2500");
  });

  it("completes the selected macro from the remaining calories", () => {
    const completed = completeMenuProfile({ goal: "חיטוב", calories: "2400", protein: "240", carbohydrates: "150", fats: "", autoField: "fats" });
    expect(completed.fats).toBe("93.3");
  });

  it("keeps profiles independent when one profile is edited", () => {
    const profiles = createMenuProfiles({ goal: "ניטרלי", calorieTarget: "2500" });
    profiles.חיטוב.calories = "2100";
    expect(profiles.מסה.calories).toBe("2750");
    expect(profiles.ניטרלי.calories).toBe("2500");
  });
});
