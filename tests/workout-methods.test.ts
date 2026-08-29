import { describe, expect, it } from "vitest";
import { restoreActiveWorkout } from "../lib/workout-store";

describe("שיטת אימון ברמת סט", () => {
  it("שומר וטוען method אופציונלי בלי לפגוע בנתוני הסט", () => {
    const restored = restoreActiveWorkout(JSON.stringify({ id: "active-1", templateId: "push1", startedAt: "2026-08-29T10:00:00.000Z", sets: [{ id: "set-1", exerciseId: "לחיצת חזה", setNumber: 1, weight: "40", reps: "10", completed: true, method: "Rest-Pause" }] }));
    expect(restored?.sets[0]).toMatchObject({ weight: "40", reps: "10", completed: true, method: "Rest-Pause" });
  });
});
