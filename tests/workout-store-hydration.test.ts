import { describe, expect, it } from "vitest";
import { hydrateWorkoutTemplates } from "../lib/workout-store";
import { workoutTemplates } from "../lib/workout-data";

describe("workout template hydration", () => {
  it("adds canonical guide templates when storage contains an older template list", () => {
    const legacy = workoutTemplates
      .filter((template) => ["push1", "pull1", "legs1"].includes(template.id))
      .map((template) => ({ ...template, exercises: template.exercises.slice(0, 1) }));

    const hydrated = hydrateWorkoutTemplates(legacy);

    expect(hydrated.length).toBe(workoutTemplates.length);
    expect(hydrated.find((template) => template.id === "glute-shape")?.exercises.length).toBeGreaterThan(0);
    expect(hydrated.find((template) => template.id === "powerlifting-big-3")?.exercises.length).toBeGreaterThan(0);
    expect(hydrated.find((template) => template.id === "trx-training")?.exercises.length).toBeGreaterThan(0);
  });

  it("keeps custom templates while appending all canonical templates", () => {
    const custom = {
      id: "custom-example",
      name: "תוכנית אישית",
      focus: "בדיקה",
      accent: "#F5B72C",
      exercises: [{ id: "custom-exercise-1", name: "סקוואט", sets: [{ target: "8–12" }] }],
    };

    const hydrated = hydrateWorkoutTemplates([custom]);

    expect(hydrated.some((template) => template.id === custom.id)).toBe(true);
    expect(hydrated.some((template) => template.id === "push1")).toBe(true);
    expect(hydrated.some((template) => template.id === "glute-shape")).toBe(true);
  });
});
