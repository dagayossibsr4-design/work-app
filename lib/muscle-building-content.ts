import type { WorkoutId } from "./workout-data";

export const muscleBuildingFolderIds = ["ppl", "ab", "abc", "abcd", "full-body"] as const;

export type MuscleBuildingFolderId = typeof muscleBuildingFolderIds[number];

/**
 * מקור האמת לתוכן שמופיע בעת פתיחת תיקיות „אימונים לבניית מסת שריר”.
 * PPL כולל את שתי הרוטציות המלאות ואת Arms/Pump; כל חלוקה אחרת מציגה
 * רק את ימי האימון השייכים לה.
 */
export const muscleBuildingFolderTemplateIds: Record<MuscleBuildingFolderId, WorkoutId[]> = {
  ppl: ["push1", "pull1", "legs1", "push2", "pull2", "legs2", "arms"],
  ab: ["ab-upper", "ab-lower"],
  abc: ["abc-a", "abc-b", "abc-c"],
  abcd: ["abcd-a", "abcd-b", "abcd-c", "abcd-d"],
  "full-body": ["full-body"],
};
