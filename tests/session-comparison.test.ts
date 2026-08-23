import { describe, expect, it } from "vitest";
import { categoryForTemplate, compareWorkoutSessions, sessionsForTemplate } from "../lib/session-comparison";
import type { WorkoutSession } from "../lib/workout-store";

const workout = (id: string, templateId: WorkoutSession["templateId"], date: string, sets: WorkoutSession["sets"]): WorkoutSession => ({ id, templateId, startedAt: `${date}T18:00:00.000Z`, sets });

describe("השוואת שני אימונים מאותו סוג", () => {
  it("משווה כוח לפי נפח, משקל, חזרות ותרגיל", () => {
    const old = workout("old", "pull1", "2026-08-13", [{ id: "a", exerciseId: "חתירה", setNumber: 1, weight: "60", reps: "10", completed: true, restSeconds: 90 }]);
    const current = workout("new", "pull1", "2026-08-20", [{ id: "b", exerciseId: "חתירה", setNumber: 1, weight: "70", reps: "10", completed: true, restSeconds: 60 }]);
    const result = compareWorkoutSessions(old, current);
    expect(result.isCardio).toBe(false);
    expect(result.baselineVolume).toBe(600);
    expect(result.currentVolume).toBe(700);
    expect(result).toMatchObject({ baselineAverageRestSeconds: 90, currentAverageRestSeconds: 60 });
    expect(result.rows[0]).toMatchObject({ exerciseId: "חתירה", baselineBestWeight: 60, currentBestWeight: 70 });
  });

  it("משווה אירובי לפי זמן ומרחק", () => {
    const old = workout("old", "treadmill", "2026-08-13", [{ id: "a", exerciseId: "ריצה", setNumber: 1, weight: "3.5", reps: "30", completed: true }]);
    const current = workout("new", "treadmill", "2026-08-20", [{ id: "b", exerciseId: "ריצה", setNumber: 1, weight: "5", reps: "40", completed: true }]);
    const result = compareWorkoutSessions(old, current);
    expect(result.isCardio).toBe(true);
    expect(result).toMatchObject({ baselineMinutes: 30, currentMinutes: 40, baselineDistance: 3.5, currentDistance: 5 });
    expect(sessionsForTemplate([current, old], "treadmill").map((session) => session.id)).toEqual(["old", "new"]);
  });

  it("מקבץ סדרות לשם השוואה באותה קטגוריה", () => {
    expect(categoryForTemplate("push1")).toBe("push");
    expect(categoryForTemplate("push2")).toBe("push");
    expect(categoryForTemplate("pull2")).toBe("pull");
    expect(categoryForTemplate("treadmill")).toBe("cardio");
  });
});
