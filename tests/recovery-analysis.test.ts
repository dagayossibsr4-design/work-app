import { describe, expect, it } from "vitest";
import { calculateRecoveryScore, recoveryLabel, recoveryTrend } from "../lib/recovery-analysis";

const log = (overrides: Partial<{ sleepHours: string; sleepQuality: number; fatigue: number; soreness: number }> = {}) => ({ id: "1", date: "2026-08-16", sleepHours: "8", sleepQuality: 5, fatigue: 1, soreness: 1, restingHeartRate: "55", note: "", ...overrides });

describe("recovery analysis", () => {
  it("calculates a high score for a full night and low fatigue", () => {
    expect(calculateRecoveryScore(log())).toBe(100);
    expect(recoveryLabel(100)).toContain("מוכן");
  });
  it("reduces the score for poor sleep and high fatigue", () => {
    expect(calculateRecoveryScore(log({ sleepHours: "4", sleepQuality: 1, fatigue: 5, soreness: 5 }))).toBe(32);
    expect(recoveryLabel(32)).toContain("התאוששות");
  });
  it("detects direction between recent logs", () => {
    expect(recoveryTrend([log(), log({ sleepHours: "4", sleepQuality: 1, fatigue: 5, soreness: 5 })])).toBe("up");
    expect(recoveryTrend([log({ sleepHours: "4", sleepQuality: 1, fatigue: 5, soreness: 5 }), log()])).toBe("down");
    expect(recoveryTrend([log(), log({ sleepHours: "8", sleepQuality: 5, fatigue: 1, soreness: 1 })])).toBe("stable");
  });
});
