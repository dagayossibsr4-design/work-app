import { describe, expect, it } from "vitest";
import { buildBodyweightTargets } from "../lib/bodyweight-targets";
import { alternativesFor, sourceForFood } from "../lib/food-conversions";

describe("bodyweight menu targets", () => {
  it("builds the requested mass example for 95kg and 4000 calories", () => {
    const result = buildBodyweightTargets(95, 4000, "מסה");
    expect(result).toMatchObject({ calories: 4000, protein: 240, fats: 160, carbohydrates: 400 });
  });

  it("uses the selected goal to change protein and fat factors", () => {
    const cut = buildBodyweightTargets(95, 2400, "חיטוב");
    const neutral = buildBodyweightTargets(95, 2400, "ניטרלי");
    expect(cut!.protein).toBeGreaterThan(neutral!.protein);
    expect(cut!.fats).toBeLessThan(neutral!.fats);
  });

  it("maps default meal foods to conversion groups", () => {
    expect(sourceForFood("חזה עוף מבושל")?.group).toBe("חלבון");
    expect(sourceForFood("אורז לבן מבושל")?.group).toBe("פחמימה");
    expect(sourceForFood("טחינה גולמית")?.group).toBe("שומן");
    expect(alternativesFor(sourceForFood("שיבולת שועל")!)).toHaveLength(9);
  });
});
