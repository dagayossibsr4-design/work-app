import { describe, expect, it } from "vitest";
import { recommendNextWeight } from "../lib/workout-recommendation";

describe("Smart weight recommendation", () => {
  it("suggests a small increase after reaching the top of the rep range", () => {
    const result = recommendNextWeight({ previous: { id: "1", exerciseId: "x", setNumber: 1, weight: "100", reps: "9", completed: true }, target: "5–9" });
    expect(result.weight).toBe(102.5);
    expect(result.confidence).toBe("high");
  });

  it("keeps the same weight when the athlete is below the target", () => {
    const result = recommendNextWeight({ previous: { id: "1", exerciseId: "x", setNumber: 1, weight: "100", reps: "4", completed: true }, target: "5–9" });
    expect(result.weight).toBe(100);
    expect(result.reason).toContain("נשארים");
  });

  it("uses a more conservative increase for Rest Pause", () => {
    const result = recommendNextWeight({ previous: { id: "1", exerciseId: "x", setNumber: 1, weight: "100", reps: "15", completed: true }, target: "12–15", restPause: true });
    expect(result.weight).toBe(100);
    expect(result.confidence).toBe("medium");
  });
});
