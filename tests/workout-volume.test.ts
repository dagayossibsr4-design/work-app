import { describe, expect, it } from "vitest";
import { calculateProjectedVolume, expectedReps } from "../lib/workout-volume";
import { workoutTemplates } from "../lib/workout-data";
import type { WorkoutSession } from "../lib/workout-store";

describe("workout volume preview", () => {
  it("uses the midpoint of a repetition range", () => {
    expect(expectedReps("8–12")).toBe(10);
  });

  it("uses suggested weight and target repetitions for projected volume", () => {
    const template = { ...workoutTemplates[0], exercises: [{ ...workoutTemplates[0].exercises[0], sets: [{ target: "8–12", suggestedWeight: "105" }] }] };
    expect(calculateProjectedVolume(template)).toBe(1050);
  });

  it("falls back to previous set data when no suggestion exists", () => {
    const template = { ...workoutTemplates[0], exercises: [{ ...workoutTemplates[0].exercises[0], sets: [{ target: "מקסימום" }] }] };
    const previous: WorkoutSession = { id: "previous", templateId: "push1", startedAt: "2026-08-10T10:00:00.000Z", finishedAt: "2026-08-10T11:00:00.000Z", sets: [{ id: "set", exerciseId: template.exercises[0].id, setNumber: 1, weight: "50", reps: "10", completed: true }] };
    expect(calculateProjectedVolume(template, previous)).toBe(500);
  });
});
