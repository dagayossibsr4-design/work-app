import { describe, expect, it } from "vitest";
import {
  buildArmsInsight,
  buildComparisons,
  buildExerciseTrends,
  buildLoadTrends,
  buildPlanMetrics,
  buildSessionTrends,
  buildWeeklyRestTrends,
  compareSetPerformance,
} from "../lib/workout-analysis";
import type { WorkoutSession } from "../lib/workout-store";

describe("Hebrew workout comparisons", () => {
  it("builds the three PDF comparison pairs without workout history", () => {
    const comparisons = buildComparisons([]);
    expect(comparisons.map((item) => item.title)).toEqual([
      "Push — השוואת שני ימי הדחיפה",
      "Pull — השוואת שני ימי המשיכה",
      "Legs — השוואת שני ימי הרגליים",
    ]);
    expect(comparisons[0].insight).toContain("עדיין אין נתוני ביצוע");
  });

  it("calculates planned structure from the PDF templates", () => {
    const metrics = buildPlanMetrics([]);
    const push1 = metrics.find((item) => item.id === "push1");
    const legs2 = metrics.find((item) => item.id === "legs2");
    expect(push1?.exercises).toBe(10);
    expect(push1?.plannedSets).toBeGreaterThan(15);
    expect(legs2?.restPauseExercises).toBeGreaterThan(0);
  });

  it("compares a live set with the previous workout", () => {
    expect(compareSetPerformance("55", "10", "50", "10")).toMatchObject({ deltaWeight: 5, deltaReps: 0, deltaVolume: 50, status: "up" });
    expect(compareSetPerformance("45", "9", "50", "8")).toMatchObject({ deltaWeight: -5, deltaReps: 1, deltaVolume: 5, status: "up" });
    expect(compareSetPerformance("", "", "50", "8").status).toBe("empty");
  });

  it("explains optional arms training when there is no history", () => {
    expect(buildArmsInsight([])).toContain("Arms/Pump מתוכנן");
  });
});

describe("Comprehensive workout comparison", () => {
  const makeSession = (id: string, date: string, weight: string): WorkoutSession => ({
    id,
    templateId: "legs1",
    startedAt: `${date}T18:00:00.000Z`,
    finishedAt: `${date}T19:00:00.000Z`,
    sets: [{ id: `${id}-set`, exerciseId: "סקוואט חופשי", setNumber: 1, weight, reps: "8", completed: true }],
  });

  it("builds chronological session trends with volume deltas", () => {
    const trends = buildSessionTrends([makeSession("new", "2026-08-16", "120"), makeSession("old", "2026-08-12", "100")]);
    expect(trends).toHaveLength(2);
    expect(trends[1].volume).toBe(960);
    expect(trends[1].deltaVolume).toBe(160);
    expect(trends[1].status).toBe("up");
  });

  it("compares latest and previous performance by exercise", () => {
    const rows = buildExerciseTrends([makeSession("new", "2026-08-16", "90"), makeSession("old", "2026-08-12", "100")]);
    expect(rows[0].latestVolume).toBe(720);
    expect(rows[0].previousVolume).toBe(800);
    expect(rows[0].deltaPercent).toBe(-10);
    expect(rows[0].status).toBe("down");
  });

  it("סופר אירובי שנשמר בנפרד באותו יום כדקות אירובי ולא כנפח כוח", () => {
    const strength = makeSession("strength", "2026-08-22", "100");
    const cardio: WorkoutSession = {
      id: "cardio",
      templateId: "treadmill",
      startedAt: "2026-08-22T20:00:00.000Z",
      finishedAt: "2026-08-22T20:30:00.000Z",
      sets: [{ id: "cardio-set", exerciseId: "הליכון", setNumber: 1, weight: "3", reps: "30", completed: true }],
    };
    const trends = buildLoadTrends([strength, cardio]);
    const strengthTrend = trends.find((trend) => trend.sessionId === "strength");
    const cardioTrend = trends.find((trend) => trend.sessionId === "cardio");
    expect(strengthTrend).toMatchObject({ resistanceVolume: 800, cardioMinutes: 30 });
    expect(cardioTrend).toMatchObject({ resistanceVolume: 0, completedSets: 0, cardioMinutes: 30 });
  });

  it("מחשב ממוצע מנוחה לפי שבוע מתוך סטים מתועדים בלבד", () => {
    const first: WorkoutSession = {
      ...makeSession("rest-one", "2026-08-16", "100"),
      sets: [
        { id: "a", exerciseId: "סקוואט", setNumber: 1, weight: "100", reps: "8", completed: true, restSeconds: 60 },
        { id: "b", exerciseId: "סקוואט", setNumber: 2, weight: "90", reps: "10", completed: true, restSeconds: 120 },
      ],
    };
    const next: WorkoutSession = {
      ...makeSession("rest-two", "2026-08-23", "100"),
      sets: [{ id: "c", exerciseId: "סקוואט", setNumber: 1, weight: "100", reps: "8", completed: true, restSeconds: 90 }],
    };
    const noRest = makeSession("no-rest", "2026-08-24", "100");
    expect(buildWeeklyRestTrends([first, noRest, next])).toEqual([
      expect.objectContaining({ weekStart: "2026-08-16", averageRestSeconds: 90, measuredSets: 2 }),
      expect.objectContaining({ weekStart: "2026-08-23", averageRestSeconds: 90, measuredSets: 1 }),
    ]);
  });
});
