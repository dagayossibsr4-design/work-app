import type { RecoveryLog } from "@/lib/workout-store";

export function calculateRecoveryScore(log: Pick<RecoveryLog, "sleepHours" | "sleepQuality" | "fatigue" | "soreness">): number {
  const sleep = Number(String(log.sleepHours).replace(",", "."));
  const sleepScore = Number.isFinite(sleep) && sleep > 0 ? Math.min(sleep / 8, 1) * 40 : 0;
  return Math.round(sleepScore + (log.sleepQuality / 5) * 25 + ((6 - log.fatigue) / 5) * 20 + ((6 - log.soreness) / 5) * 15);
}

export function recoveryLabel(score: number): string {
  if (score >= 75) return "מוכן לעומס רגיל";
  if (score >= 50) return "כדאי לשמור על עומס מתון";
  return "מומלץ לתת עדיפות להתאוששות";
}

export function recoveryTrend(logs: RecoveryLog[]): "up" | "down" | "stable" | "first" {
  if (logs.length < 2) return "first";
  const current = calculateRecoveryScore(logs[0]);
  const previous = calculateRecoveryScore(logs[1]);
  if (current >= previous + 5) return "up";
  if (current <= previous - 5) return "down";
  return "stable";
}
