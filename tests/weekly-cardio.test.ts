import { describe, expect, it } from "vitest";
import { buildWeeklyCardioTrends } from "../lib/workout-analysis";
import type { CardioLog } from "../lib/workout-store";

const log = (overrides: Partial<CardioLog>): CardioLog => ({
  id: "cardio-test",
  date: "2026-08-17T10:00:00.000Z",
  type: "ריצה",
  durationMinutes: "30",
  distanceKm: "5",
  caloriesBurned: "350",
  intensity: "בינונית",
  note: "",
  ...overrides,
});

describe("Weekly cardio trends", () => {
  it("aggregates calories, distance and sessions by Monday-based week", () => {
    const trends = buildWeeklyCardioTrends([
      log({ id: "a", date: "2026-08-17T10:00:00.000Z", distanceKm: "5", caloriesBurned: "350" }),
      log({ id: "b", date: "2026-08-20T10:00:00.000Z", distanceKm: "3.5", caloriesBurned: "240" }),
      log({ id: "c", date: "2026-08-24T10:00:00.000Z", distanceKm: "2", caloriesBurned: "160" }),
    ]);
    expect(trends).toHaveLength(2);
    expect(trends[0]).toMatchObject({ distanceKm: 8.5, calories: 590, sessions: 2 });
    expect(trends[1]).toMatchObject({ distanceKm: 2, calories: 160, sessions: 1 });
  });

  it("keeps old logs without calories or distance valid", () => {
    const trends = buildWeeklyCardioTrends([log({ distanceKm: "", caloriesBurned: undefined })]);
    expect(trends[0]).toMatchObject({ distanceKm: 0, calories: 0, sessions: 1 });
  });
});
