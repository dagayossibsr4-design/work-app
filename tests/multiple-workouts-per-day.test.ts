import { describe, expect, it } from "vitest";

import { isCardioWorkoutTemplate, sessionsForWorkoutDate, splitSessionsForWorkoutDate, type WorkoutSession } from "../lib/workout-store";

const session = (id: string, templateId: string, startedAt: string): WorkoutSession => ({
  id,
  templateId,
  startedAt,
  sets: [],
});

describe("מספר אימונים באותו יום", () => {
  const sessions: WorkoutSession[] = [
    session("cardio-evening", "treadmill", "2026-08-22T19:30:00.000Z"),
    session("strength-morning", "pull1", "2026-08-22T08:00:00.000Z"),
    session("other-day", "push1", "2026-08-23T08:00:00.000Z"),
  ];

  it("שומר ומחזיר שני אימונים נפרדים לאותו תאריך לפי שעת ההתחלה", () => {
    expect(sessionsForWorkoutDate(sessions, "2026-08-22").map((item) => item.id)).toEqual(["strength-morning", "cardio-evening"]);
  });

  it("מפריד אימון כוח ואירובי באותו יום בלי לדרוס אף אחד מהם", () => {
    const result = splitSessionsForWorkoutDate(sessions, "2026-08-22");
    expect(result.all).toHaveLength(2);
    expect(result.strength.map((item) => item.id)).toEqual(["strength-morning"]);
    expect(result.cardio.map((item) => item.id)).toEqual(["cardio-evening"]);
  });

  it("מזהה את כל תבניות האירובי המשולבות בתוכנית", () => {
    expect(isCardioWorkoutTemplate("treadmill")).toBe(true);
    expect(isCardioWorkoutTemplate("cycling")).toBe(true);
    expect(isCardioWorkoutTemplate("pull1")).toBe(false);
  });
});
