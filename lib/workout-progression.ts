import type { SetLog } from "./workout-store";

export type AutoProgression = {
  value: string;
  mode: "weight" | "reps";
};

/**
 * Raises the previous load by 5%.
 * Weight takes precedence when available and is rounded to the nearest 0.5 kg.
 * Otherwise repetitions are increased and rounded up to a whole repetition.
 */
export function calculateFivePercentProgress(previous?: Pick<SetLog, "weight" | "reps">): AutoProgression | null {
  if (!previous) return null;
  const weight = Number(previous.weight);
  if (Number.isFinite(weight) && weight > 0) {
    return { value: String(Math.round(weight * 1.05 * 2) / 2), mode: "weight" };
  }
  const reps = Number(previous.reps);
  if (Number.isFinite(reps) && reps > 0) {
    return { value: String(Math.ceil(reps * 1.05)), mode: "reps" };
  }
  return null;
}
