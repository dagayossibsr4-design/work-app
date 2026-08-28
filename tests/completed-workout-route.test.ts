import { describe, expect, it } from "vitest";

import { completedWorkoutHistoryRoute } from "../lib/completed-workout-route";

describe("completed workout route", () => {
  it("opens the completed workout in the full history detail route", () => {
    expect(completedWorkoutHistoryRoute("session-push-2")).toEqual({
      pathname: "/(tabs)/history",
      params: { sessionId: "session-push-2" },
    });
  });

  it("preserves supported opening options when a legacy link redirects", () => {
    expect(
      completedWorkoutHistoryRoute("session-push-2", {
        edit: "1",
        editDate: "1",
        demoCompleted: "1",
      }),
    ).toEqual({
      pathname: "/(tabs)/history",
      params: {
        sessionId: "session-push-2",
        edit: "1",
        editDate: "1",
        demoCompleted: "1",
      },
    });
  });
});
