import { describe, expect, it } from "vitest";
import { buildLoadTrends, loadExplanation } from "../lib/workout-analysis";
import type { WorkoutSession } from "../lib/workout-store";

const session = (id: string, date: string, weight: string): WorkoutSession => ({
  id,
  templateId: "legs1",
  startedAt: date,
  finishedAt: date,
  sets: [{ id: `${id}-set`, exerciseId: "squat", setNumber: 1, weight, reps: "10", completed: true }],
});

describe("ניתוח עומס משוקלל", () => {
  it("מחשב עומס גולמי ומשווה לאימון קודם", () => {
    const trends = buildLoadTrends([session("a", "2026-08-01", "100"), session("b", "2026-08-08", "110")]);
    expect(trends).toHaveLength(2);
    expect(trends[0].rawLoad).toBeGreaterThan(0);
    expect(trends[1].adjustedLoad).toBeGreaterThan(trends[0].adjustedLoad);
    expect(trends[1].status).toBe("up");
  });

  it("מעלה את העומס המותאם כאשר ההתאוששות נמוכה", () => {
    const trends = buildLoadTrends([session("a", "2026-08-01", "100")], [{ id: "r", date: "2026-08-01", sleepHours: "5", sleepQuality: 2, fatigue: 5, soreness: 5, restingHeartRate: "", note: "" }]);
    expect(trends[0].recoveryScore).not.toBeNull();
    expect(trends[0].adjustedLoad).toBeGreaterThan(trends[0].rawLoad);
    expect(loadExplanation(trends[0])).toContain("התאוששות נמוכה");
  });
});


import { buildSmartLoadSnapshots } from "../lib/workout-analysis";

describe("ניתוח עומס חכם", () => {
  it("מחשב ממוצע קצר ובסיס ארוך ומסווג התאוששות", () => {
    const trends = buildLoadTrends([
      session("a", "2026-08-01", "100"),
      session("b", "2026-08-04", "105"),
      session("c", "2026-08-08", "110"),
    ], [{ id: "r", date: "2026-08-08", sleepHours: "8", sleepQuality: 5, fatigue: 1, soreness: 1, restingHeartRate: "", note: "" }]);
    const snapshots = buildSmartLoadSnapshots(trends);
    expect(snapshots).toHaveLength(3);
    expect(snapshots[2].acuteLoad7d).toBeGreaterThan(0);
    expect(snapshots[2].baselineLoad28d).toBeGreaterThanOrEqual(snapshots[2].acuteLoad7d);
    expect(snapshots[2].recoveryStatus).toBe("high");
    expect(snapshots[2].recommendation).toContain("מאוזן");
  });

  it("מציג המלצה על נתוני התאוששות חסרים", () => {
    const snapshots = buildSmartLoadSnapshots(buildLoadTrends([session("a", "2026-08-01", "100")]));
    expect(snapshots[0].recoveryStatus).toBe("missing");
    expect(snapshots[0].recommendation).toContain("אין מדידת התאוששות");
  });
});
