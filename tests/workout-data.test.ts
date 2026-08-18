import { describe, expect, it } from "vitest";
import { getTemplate, workoutTemplates } from "../lib/workout-data";
import { calculateVolume, type WorkoutSession } from "../lib/workout-store";

describe("Workout templates", () => {
  it("includes the six core PDF workouts and optional arms session", () => {
    const ids = workoutTemplates.map((template) => template.id);
    expect(ids.slice(0, 21)).toEqual(["push1", "pull1", "legs1", "push2", "pull2", "legs2", "arms", "abc-a", "abc-b", "abc-c", "abcd-a", "abcd-b", "abcd-c", "abcd-d", "ab-upper", "ab-lower", "full-body", "cardio", "cycling", "elliptical", "stairs"]);
    expect(ids).toEqual(expect.arrayContaining(["treadmill", "outdoor-run", "walking", "rowing", "swimming", "hiit"]));
  });

  it("matches the Legs 1 photo structure with eight exercises and twenty sets", () => {
    const legs = getTemplate("legs1");
    expect(legs.exercises.map((exercise) => exercise.name)).toEqual([
      "סקוואט חופשי",
      "לג פרס",
      "כפיפת ברכיים בשכיבה",
      "כפיפת ברכיים בעמידה",
      "פשיטת ברכיים במכונה",
      "מקרבי ירך במכונה",
      "מרחיקי ירך במכונה",
      "תאומים בישיבה",
    ]);
    expect(legs.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)).toBe(20);
    expect(legs.exercises.some((exercise) => exercise.note?.includes("Rest Pause"))).toBe(true);
  });
});

describe("Workout calculations", () => {
  it("calculates volume only from numeric completed or entered values", () => {
    const session: WorkoutSession = {
      id: "test",
      templateId: "push1",
      startedAt: new Date().toISOString(),
      sets: [
        { id: "1", exerciseId: "a", setNumber: 1, weight: "50", reps: "10", completed: true },
        { id: "2", exerciseId: "a", setNumber: 2, weight: "", reps: "12", completed: false },
        { id: "3", exerciseId: "b", setNumber: 1, weight: "20.5", reps: "8", completed: true },
      ],
    };
    expect(calculateVolume(session)).toBe(664);
  });
});
