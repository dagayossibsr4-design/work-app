import type { NutritionProfile, WorkoutSession } from "./workout-store";
import { calculateVolume } from "./workout-store";

export type NutritionRecommendation = {
  id: string;
  title: string;
  detail: string;
  tone: "amber" | "blue" | "white";
};

export function buildNutritionRecommendations(
  sessions: WorkoutSession[],
  profile: NutritionProfile,
  now = Date.now(),
): NutritionRecommendation[] {
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const recent = sessions.filter((session) => {
    const timestamp = new Date(session.finishedAt ?? session.startedAt).getTime();
    return Boolean(session.finishedAt) && now - timestamp >= 0 && now - timestamp <= sevenDays;
  });
  const totalVolume = recent.reduce((sum, session) => sum + calculateVolume(session), 0);
  const completedSets = recent.reduce((sum, session) => sum + session.sets.filter((set) => set.completed).length, 0);
  const targetCalories = Number(profile.calorieTarget) || 0;
  const targetProtein = Number(profile.proteinTarget) || 0;
  const proteinPerKg = Number(profile.proteinPerKg) || 0;
  const weightKg = Number(profile.weightKg) || 0;
  const baselineProtein = targetProtein || (weightKg && proteinPerKg ? weightKg * proteinPerKg : 0);
  const recommendations: NutritionRecommendation[] = [];

  if (!recent.length) {
    return [{ id: "no-workouts", title: "תעד אימון כדי לקבל המלצה אישית", detail: "לא נמצאו אימונים שהושלמו בשבעת הימים האחרונים. לאחר תיעוד אימון יופיע כאן ניתוח עומס והכוונה תזונתית.", tone: "blue" }];
  }

  if (recent.length >= 4 || totalVolume >= 12000 || completedSets >= 45) {
    const calorieDelta = targetCalories ? Math.round(targetCalories * 0.08 / 50) * 50 : 200;
    recommendations.push({ id: "high-load", title: "שבוע עומס גבוה", detail: `${recent.length} אימונים, ${Math.round(totalVolume).toLocaleString("he-IL")} ק״ג נפח ו־${completedSets} סטים שהושלמו. שקול להוסיף כ־${calorieDelta} קק״ל סביב ימי האימון, בעיקר מפחמימות, ולשמור על שתייה מספקת.`, tone: "amber" });
  } else if (recent.length >= 2) {
    recommendations.push({ id: "steady-load", title: "שמור על צריכה יציבה", detail: `נרשמו ${recent.length} אימונים ו־${completedSets} סטים בשבעת הימים האחרונים. שמור על יעד הקלוריות הנוכחי ובחן את המגמה במשך שבוע נוסף לפני שינוי.`, tone: "blue" });
  } else {
    recommendations.push({ id: "build-routine", title: "בנה רצף תיעוד", detail: "נמצא אימון אחד שהושלם לאחרונה. המשך לתעד כדי שהמלצות הקלוריות והמאקרו יתבססו על עומס אישי ולא על הערכה כללית.", tone: "blue" });
  }

  if (baselineProtein) {
    recommendations.push({ id: "protein", title: "עדיפות לחלבון", detail: `יעד החלבון המחושב שלך הוא כ־${Math.round(baselineProtein)} ג׳ ליום. פזר אותו על פני 4–5 ארוחות, במיוחד בימי אימון, במקום לרכז את כולו בארוחה אחת.`, tone: "white" });
  } else {
    recommendations.push({ id: "protein-profile", title: "השלם יעד חלבון", detail: "הגדר משקל גוף ויעד חלבון במסך התזונה כדי לקבל המלצה מספרית אישית יותר.", tone: "white" });
  }

  if (recent.length >= 3) {
    recommendations.push({ id: "recovery", title: "תזמון והתאוששות", detail: "בימים עם יותר מאימון אחד או נפח גבוה, העדף ארוחה עם פחמימה וחלבון בתוך כמה שעות מהאימון, והימנע מקיצוץ חד בקלוריות ביום שלאחריו.", tone: "amber" });
  }

  return recommendations.slice(0, 3);
}
