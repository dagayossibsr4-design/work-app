import { describe, expect, it } from "vitest";

import { getAllowedScheduleTemplates } from "../lib/workout-schedule";
import type { WorkoutTemplate } from "../lib/workout-data";

const template = (id: string): WorkoutTemplate => ({
  id,
  name: id,
  focus: "בדיקה",
  accent: "#F5B72C",
  exercises: [{ id: `${id}-exercise`, name: "תרגיל", sets: [{ target: "8–12" }] }],
});

describe("workout schedule filtering", () => {
  const templates = [template("push1"), template("pull2"), template("custom-1"), template("crossfit-wod"), template("cardio"), template("cycling")];
  const cardioIds = new Set(["cardio", "cycling"]);

  it("keeps only selected programs, the custom default, and every cardio template", () => {
    const result = getAllowedScheduleTemplates(templates, ["push1", "pull2"], "custom-1", cardioIds);
    expect(result.map((item) => item.id)).toEqual(["push1", "pull2", "custom-1", "cardio", "cycling"]);
    expect(result.map((item) => item.id)).not.toContain("crossfit-wod");
  });

  it("does not add unselected strength programs when there is no custom default", () => {
    const result = getAllowedScheduleTemplates(templates, [], null, cardioIds);
    expect(result.map((item) => item.id)).toEqual(["cardio", "cycling"]);
  });
});
