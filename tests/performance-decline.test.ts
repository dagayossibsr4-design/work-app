import { describe, expect, it } from "vitest";
import { detectPerformanceDeclines } from "../lib/performance-decline";
import { workoutTemplates } from "../lib/workout-data";

const session = (id: string, date: string, volume: number) => ({
  id,
  templateId: "push1" as const,
  startedAt: date,
  sets: [{ id: `${id}-set`, exerciseId: workoutTemplates.find((item) => item.id === "push1")!.exercises[0].id, setNumber: 1, weight: String(volume / 10), reps: "10", completed: true }],
});

describe("Performance decline alerts", () => {
  it("alerts only after three consecutive declining sessions", () => {
    const template = workoutTemplates.find((item) => item.id === "push1")!;
    const alerts = detectPerformanceDeclines([
      session("latest", "2026-08-14", 800),
      session("middle", "2026-08-07", 900),
      session("oldest", "2026-07-31", 1000),
    ], template);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].suggestedWeight).toBe(75);
    expect(alerts[0].declinePercent).toBe(20);
  });

  it("does not alert for a single dip", () => {
    const template = workoutTemplates.find((item) => item.id === "push1")!;
    const alerts = detectPerformanceDeclines([
      session("latest", "2026-08-14", 800),
      session("middle", "2026-08-07", 1000),
      session("oldest", "2026-07-31", 900),
    ], template);
    expect(alerts).toHaveLength(0);
  });
});
