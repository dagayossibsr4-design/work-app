import { describe, expect, it } from "vitest";
import { formatRestSeconds, techniqueTipForExercise } from "../lib/workout-session-insights";

describe("פרטי סטים: מנוחה וטכניקה", () => {
  it("מציג זמן מנוחה מדויק וערך חסר בצורה ברורה", () => {
    expect(formatRestSeconds(92)).toBe("מנוחה 1:32");
    expect(formatRestSeconds()).toBe("מנוחה לא תועדה");
  });

  it("מחזיר הנחיית טכניקה לתרגילי PULL 1", () => {
    expect(techniqueTipForExercise("כתף אחורית במכונה ייעודית")).toContain("צוואר ניטרלי");
    expect(techniqueTipForExercise("יד קדמית פולי תחתון עם כבל")).toContain("מרפקים");
  });
});
