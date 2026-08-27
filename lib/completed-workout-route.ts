export type CompletedWorkoutRouteOptions = {
  edit?: string;
  editDate?: string;
  demoCompleted?: string;
};

/** מחזיר את נתיב הפירוט המלא של אימון שבוצע, ללא מעבר למסך התצוגה הישן. */
export function completedWorkoutHistoryRoute(
  sessionId: string,
  options: CompletedWorkoutRouteOptions = {},
) {
  return {
    pathname: "/(tabs)/history",
    params: {
      sessionId,
      ...(options.edit === "1" ? { edit: "1" } : {}),
      ...(options.editDate === "1" ? { editDate: "1" } : {}),
      ...(options.demoCompleted === "1" ? { demoCompleted: "1" } : {}),
    },
  } as const;
}
