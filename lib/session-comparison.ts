import type { WorkoutSession } from "./workout-store";

export const CARDIO_TEMPLATE_IDS = new Set(["cardio", "cycling", "elliptical", "stairs", "treadmill", "outdoor-run", "walking", "rowing", "swimming", "hiit"]);

export type WorkoutCategory = "push" | "pull" | "legs" | "arms" | "abc" | "abcd" | "full-body" | "cardio" | "other";

export function categoryForTemplate(templateId: string): WorkoutCategory {
  const id = templateId.toLowerCase();
  if (CARDIO_TEMPLATE_IDS.has(id)) return "cardio";
  if (id.startsWith("push")) return "push";
  if (id.startsWith("pull")) return "pull";
  if (id.startsWith("legs")) return "legs";
  if (id.startsWith("arms")) return "arms";
  if (id.startsWith("abcd")) return "abcd";
  if (id.startsWith("abc")) return "abc";
  if (id.includes("full") || id.includes("body")) return "full-body";
  return "other";
}

export function categoryLabel(category: WorkoutCategory) {
  return ({ push: "Push", pull: "Pull", legs: "Legs", arms: "ידיים", abc: "ABC", abcd: "ABCD", "full-body": "Full Body", cardio: "אירובי", other: "אחר" } as const)[category];
}

export type ExerciseSessionComparison = {
  exerciseId: string;
  baselineVolume: number;
  currentVolume: number;
  baselineBestWeight: number;
  currentBestWeight: number;
  baselineReps: number;
  currentReps: number;
};

export type WorkoutSessionComparison = {
  isCardio: boolean;
  baselineVolume: number;
  currentVolume: number;
  baselineMinutes: number;
  currentMinutes: number;
  baselineDistance: number;
  currentDistance: number;
  rows: ExerciseSessionComparison[];
};

const number = (value: string) => Number(value) || 0;

export function sessionsForTemplate(sessions: WorkoutSession[], templateId: string) {
  return sessions.filter((session) => session.templateId === templateId).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
}

export function compareWorkoutSessions(baseline: WorkoutSession, current: WorkoutSession): WorkoutSessionComparison {
  const isCardio = CARDIO_TEMPLATE_IDS.has(current.templateId);
  const baselineVolume = baseline.sets.reduce((sum, set) => sum + number(set.weight) * number(set.reps), 0);
  const currentVolume = current.sets.reduce((sum, set) => sum + number(set.weight) * number(set.reps), 0);
  const baselineMinutes = baseline.sets.reduce((sum, set) => sum + number(set.reps), 0);
  const currentMinutes = current.sets.reduce((sum, set) => sum + number(set.reps), 0);
  const baselineDistance = baseline.sets.reduce((sum, set) => sum + number(set.weight), 0);
  const currentDistance = current.sets.reduce((sum, set) => sum + number(set.weight), 0);
  const exerciseIds = Array.from(new Set([...baseline.sets, ...current.sets].map((set) => set.exerciseId)));
  const rows = exerciseIds.map((exerciseId) => {
    const baselineSets = baseline.sets.filter((set) => set.exerciseId === exerciseId);
    const currentSets = current.sets.filter((set) => set.exerciseId === exerciseId);
    return {
      exerciseId,
      baselineVolume: baselineSets.reduce((sum, set) => sum + number(set.weight) * number(set.reps), 0),
      currentVolume: currentSets.reduce((sum, set) => sum + number(set.weight) * number(set.reps), 0),
      baselineBestWeight: Math.max(0, ...baselineSets.map((set) => number(set.weight))),
      currentBestWeight: Math.max(0, ...currentSets.map((set) => number(set.weight))),
      baselineReps: baselineSets.reduce((sum, set) => sum + number(set.reps), 0),
      currentReps: currentSets.reduce((sum, set) => sum + number(set.reps), 0),
    };
  });
  return { isCardio, baselineVolume, currentVolume, baselineMinutes, currentMinutes, baselineDistance, currentDistance, rows };
}

export function changePercent(from: number, to: number) {
  if (!from) return to ? 100 : 0;
  return ((to - from) / from) * 100;
}
