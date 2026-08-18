import type { WorkoutTemplate } from "./workout-data";
import type { WorkoutSession } from "./workout-store";

function numericValues(value: string) {
  return value.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
}

export function expectedReps(target: string, previousReps?: string) {
  const values = numericValues(target);
  if (values.length >= 2) return (values[0] + values[1]) / 2;
  if (values.length === 1) return values[0];
  const fallback = Number(previousReps);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
}

export function calculateProjectedVolume(template: WorkoutTemplate, previousSession?: WorkoutSession) {
  return template.exercises.reduce((exerciseTotal, exercise) => exerciseTotal + exercise.sets.reduce((setTotal, set, setIndex) => {
    const previous = previousSession?.sets.find((candidate) => candidate.exerciseId === exercise.id && candidate.setNumber === setIndex + 1);
    const weight = Number(set.suggestedWeight || previous?.weight);
    if (!Number.isFinite(weight) || weight <= 0) return setTotal;
    return setTotal + weight * expectedReps(set.target, previous?.reps);
  }, 0), 0);
}
