import { describe, expect, it } from "vitest";

import { muscleBuildingFolderIds, muscleBuildingFolderTemplateIds } from "../lib/muscle-building-content";
import { workoutTemplates } from "../lib/workout-data";

describe("Muscle-building folder content", () => {
  it("keeps the five muscle-building folders available", () => {
    expect(muscleBuildingFolderIds).toEqual(["ppl", "ab", "abc", "abcd", "full-body"]);
  });

  it("places both PPL rotations and Arms/Pump in PPL", () => {
    expect(muscleBuildingFolderTemplateIds.ppl).toEqual(["push1", "pull1", "legs1", "push2", "pull2", "legs2", "arms"]);
  });

  it("keeps AB, ABC, ABCD and Full Body in their own folders", () => {
    expect(muscleBuildingFolderTemplateIds.ab).toEqual(["ab-upper", "ab-lower"]);
    expect(muscleBuildingFolderTemplateIds.abc).toEqual(["abc-a", "abc-b", "abc-c"]);
    expect(muscleBuildingFolderTemplateIds.abcd).toEqual(["abcd-a", "abcd-b", "abcd-c", "abcd-d"]);
    expect(muscleBuildingFolderTemplateIds["full-body"]).toEqual(["full-body"]);
  });

  it("maps every displayed workout to an existing non-empty template", () => {
    const ids = Object.values(muscleBuildingFolderTemplateIds).flat();
    expect(ids.length).toBe(17);
    ids.forEach((id) => {
      const template = workoutTemplates.find((item) => item.id === id);
      expect(template, `חסרה תבנית עבור ${id}`).toBeDefined();
      expect(template?.exercises.length, `אין תרגילים עבור ${id}`).toBeGreaterThan(0);
    });
  });
});
