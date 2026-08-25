import {
  isCardioWorkoutTemplate,
  splitSessionsForWorkoutDate,
  type WorkoutSession,
} from "./workout-store";

type ScheduleSessionKind = "workout" | "cardio" | "rest";

/** בוחר את הסשן הרלוונטי ביותר ליום בלוח: כוח ביום כוח, אירובי ביום אירובי. */
export function completedSessionForScheduleDay(
  sessions: WorkoutSession[],
  date: string,
  kind: ScheduleSessionKind,
) {
  const split = splitSessionsForWorkoutDate(sessions, date);
  const candidates =
    kind === "cardio"
      ? split.cardio
      : kind === "workout"
        ? split.strength
        : split.all;

  return candidates
    .filter((session) =>
      kind === "rest" ? true : kind === "cardio" ? isCardioWorkoutTemplate(session.templateId) : true,
    )
    .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt))[0];
}
