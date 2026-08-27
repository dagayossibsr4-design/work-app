import { Redirect, useLocalSearchParams } from "expo-router";

import { completedWorkoutHistoryRoute } from "@/lib/completed-workout-route";

/**
 * נתיב תאימות לקישורים ישנים.
 * כל קישור לפירוט אימון מתועד נשלח לעמוד history המלא, שבו קיימים הסטים,
 * העריכה ושתי אפשרויות ההשוואה. כך לא נפתח מסך קטן ונפרד.
 */
export default function WorkoutSessionScreen() {
  const { sessionId, edit, editDate, demoCompleted } = useLocalSearchParams<{
    sessionId?: string;
    edit?: string;
    editDate?: string;
    demoCompleted?: string;
  }>();

  if (!sessionId) {
    return <Redirect href={"/(tabs)/history" as never} />;
  }

  return (
    <Redirect
      href={
        completedWorkoutHistoryRoute(sessionId, {
          edit,
          editDate,
          demoCompleted,
        }) as never
      }
    />
  );
}
