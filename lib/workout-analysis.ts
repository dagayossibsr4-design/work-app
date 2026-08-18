import { getTemplate, workoutTemplates, type WorkoutId, type WorkoutTemplate } from "./workout-data";
import { calculateVolume, type WorkoutSession } from "./workout-store";
import { calculateRecoveryScore } from "./recovery-analysis";

export type PlanMetrics = {
  id: WorkoutId;
  name: string;
  focus: string;
  exercises: number;
  plannedSets: number;
  restPauseExercises: number;
  repRangeSummary: string;
  sessions: number;
  completedSets: number;
  volume: number;
  bestWeight: number;
};

export type SetComparison = {
  previousWeight: number;
  previousReps: number;
  deltaWeight: number;
  deltaReps: number;
  deltaVolume: number;
  status: "up" | "down" | "same" | "empty";
};

export function compareSetPerformance(currentWeight: string, currentReps: string, previousWeight: string, previousReps: string): SetComparison {
  const currentVolume = (Number(currentWeight) || 0) * (Number(currentReps) || 0);
  const previousVolume = (Number(previousWeight) || 0) * (Number(previousReps) || 0);
  const deltaWeight = (Number(currentWeight) || 0) - (Number(previousWeight) || 0);
  const deltaReps = (Number(currentReps) || 0) - (Number(previousReps) || 0);
  if (!currentWeight && !currentReps) return { previousWeight: Number(previousWeight) || 0, previousReps: Number(previousReps) || 0, deltaWeight, deltaReps, deltaVolume: 0, status: "empty" };
  const deltaVolume = currentVolume - previousVolume;
  return { previousWeight: Number(previousWeight) || 0, previousReps: Number(previousReps) || 0, deltaWeight, deltaReps, deltaVolume, status: deltaVolume > 0 ? "up" : deltaVolume < 0 ? "down" : "same" };
}

export type Comparison = {
  title: string;
  left: PlanMetrics;
  right: PlanMetrics;
  insight: string;
};

const rangeSummary = (id: WorkoutId, templates: WorkoutTemplate[]) => {
  const template = templates.find((item) => item.id === id) ?? getTemplate(id);
  const ranges = template.exercises.flatMap((exercise) => exercise.sets.map((set) => set.target));
  return Array.from(new Set(ranges)).join(" · ");
};

export function buildPlanMetrics(sessions: WorkoutSession[], templates: WorkoutTemplate[] = workoutTemplates): PlanMetrics[] {
  return templates.map((template) => {
    const templateSessions = sessions.filter((session) => session.templateId === template.id);
    const loggedSets = templateSessions.flatMap((session) => session.sets.filter((set) => set.completed));
    return {
      id: template.id,
      name: template.name,
      focus: template.focus,
      exercises: template.exercises.length,
      plannedSets: template.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
      restPauseExercises: template.exercises.filter((exercise) => exercise.note?.includes("Rest Pause") || exercise.sets.some((set) => set.restPause)).length,
      repRangeSummary: rangeSummary(template.id, templates),
      sessions: templateSessions.length,
      completedSets: loggedSets.length,
      volume: templateSessions.reduce((sum, session) => sum + calculateVolume(session), 0),
      bestWeight: loggedSets.reduce((max, set) => Math.max(max, Number(set.weight) || 0), 0),
    };
  });
}

function performanceText(left: PlanMetrics, right: PlanMetrics) {
  if (!left.sessions && !right.sessions) return "עדיין אין נתוני ביצוע. לאחר שתתעד את שני האימונים תופיע כאן השוואה אישית.";
  if (!left.sessions || !right.sessions) return `יש נתונים רק עבור ${left.sessions ? left.name : right.name}. תעד גם את האימון השני כדי לקבל השוואה מלאה.`;
  if (left.volume === right.volume) return "נפח הביצוע המצטבר בשני האימונים זהה כרגע.";
  const leader = left.volume > right.volume ? left.name : right.name;
  const amount = Math.abs(left.volume - right.volume);
  return `${leader} מוביל כרגע בנפח המצטבר ב־${Math.round(amount)} ק״ג.`;
}

export function buildComparisons(sessions: WorkoutSession[], templates: WorkoutTemplate[] = workoutTemplates): Comparison[] {
  const metrics = buildPlanMetrics(sessions, templates);
  const byId = Object.fromEntries(metrics.map((metric) => [metric.id, metric]));
  const pairs: Array<[WorkoutId, WorkoutId, string]> = [
    ["push1", "push2", "Push — השוואת שני ימי הדחיפה"],
    ["pull1", "pull2", "Pull — השוואת שני ימי המשיכה"],
    ["legs1", "legs2", "Legs — השוואת שני ימי הרגליים"],
  ];
  return pairs.map(([leftId, rightId, title]) => ({ left: byId[leftId], right: byId[rightId], title, insight: performanceText(byId[leftId], byId[rightId]) }));
}

export function buildArmsInsight(sessions: WorkoutSession[], templates: WorkoutTemplate[] = workoutTemplates) {
  const metrics = buildPlanMetrics(sessions, templates);
  const arms = metrics.find((metric) => metric.id === "arms")!;
  const pushPull = metrics.filter((metric) => ["push1", "push2", "pull1", "pull2"].includes(metric.id));
  const planned = pushPull.reduce((sum, metric) => sum + metric.plannedSets, 0);
  return arms.sessions ? `ב־Arms/Pump הושלמו ${arms.completedSets} סטים בנפח ${Math.round(arms.volume)} ק״ג.` : `Arms/Pump מתוכנן עם ${arms.plannedSets} סטים. בימי Push ו-Pull מתוכננים יחד ${planned} סטים נוספים לידיים ולפלג הגוף העליון.`;
}

export type SessionTrend = {
  sessionId: string;
  templateId: WorkoutId;
  templateName: string;
  date: string;
  volume: number;
  completedSets: number;
  totalReps: number;
  bestWeight: number;
  estimatedOneRepMax: number;
  deltaVolume: number;
  deltaPercent: number;
  status: "up" | "down" | "same" | "first";
};

export type ExerciseTrend = {
  key: string;
  templateId: WorkoutId;
  templateName: string;
  exerciseId: string;
  exerciseName: string;
  sessions: number;
  latestVolume: number;
  previousVolume: number;
  deltaVolume: number;
  deltaPercent: number;
  latestBestWeight: number;
  previousBestWeight: number;
  status: "up" | "down" | "same" | "first";
};

function sessionStats(session: WorkoutSession) {
  const completed = session.sets.filter((set) => set.completed);
  const volume = calculateVolume(session);
  const totalReps = completed.reduce((sum, set) => sum + (Number(set.reps) || 0), 0);
  const bestWeight = completed.reduce((max, set) => Math.max(max, Number(set.weight) || 0), 0);
  const estimatedOneRepMax = completed.reduce((max, set) => {
    const weight = Number(set.weight) || 0;
    const reps = Number(set.reps) || 0;
    return Math.max(max, weight * (1 + reps / 30));
  }, 0);
  return { completedSets: completed.length, volume, totalReps, bestWeight, estimatedOneRepMax };
}

function percentageDelta(current: number, previous: number) {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
}

export function buildSessionTrends(sessions: WorkoutSession[], templates: WorkoutTemplate[] = workoutTemplates): SessionTrend[] {
  const chronological = [...sessions].filter((session) => session.finishedAt).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const previousByTemplate = new Map<WorkoutId, number>();
  return chronological.map((session) => {
    const template = templates.find((item) => item.id === session.templateId) ?? getTemplate(session.templateId);
    const stats = sessionStats(session);
    const previousVolume = previousByTemplate.get(session.templateId) ?? 0;
    previousByTemplate.set(session.templateId, stats.volume);
    const deltaVolume = previousVolume ? stats.volume - previousVolume : 0;
    return {
      sessionId: session.id,
      templateId: session.templateId,
      templateName: template.name,
      date: session.startedAt,
      ...stats,
      deltaVolume,
      deltaPercent: percentageDelta(stats.volume, previousVolume),
      status: !previousVolume ? "first" : deltaVolume > 0 ? "up" : deltaVolume < 0 ? "down" : "same",
    };
  });
}

export function buildExerciseTrends(sessions: WorkoutSession[], templates: WorkoutTemplate[] = workoutTemplates): ExerciseTrend[] {
  const grouped = new Map<string, { templateId: WorkoutId; templateName: string; exerciseId: string; exerciseName: string; entries: Array<{ volume: number; bestWeight: number }> }>();
  [...sessions].filter((session) => session.finishedAt).sort((a, b) => a.startedAt.localeCompare(b.startedAt)).forEach((session) => {
    const template = templates.find((item) => item.id === session.templateId) ?? getTemplate(session.templateId);
    const byExercise = new Map<string, typeof session.sets>();
    session.sets.filter((set) => set.completed).forEach((set) => byExercise.set(set.exerciseId, [...(byExercise.get(set.exerciseId) ?? []), set]));
    byExercise.forEach((sets, exerciseId) => {
      const key = `${session.templateId}:${exerciseId}`;
      const name = template.exercises.find((exercise) => exercise.id === exerciseId)?.name ?? exerciseId;
      const entry = grouped.get(key) ?? { templateId: session.templateId, templateName: template.name, exerciseId, exerciseName: name, entries: [] };
      entry.entries.push({ volume: sets.reduce((sum, set) => sum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0), bestWeight: sets.reduce((max, set) => Math.max(max, Number(set.weight) || 0), 0) });
      grouped.set(key, entry);
    });
  });
  return Array.from(grouped.values()).map((entry) => {
    const latest = entry.entries[entry.entries.length - 1];
    const previous = entry.entries[entry.entries.length - 2];
    const latestVolume = latest?.volume ?? 0;
    const previousVolume = previous?.volume ?? 0;
    const deltaVolume = previous ? latestVolume - previousVolume : 0;
    const status: ExerciseTrend["status"] = !previous ? "first" : deltaVolume > 0 ? "up" : deltaVolume < 0 ? "down" : "same";
    return {
      key: `${entry.templateId}:${entry.exerciseId}`,
      templateId: entry.templateId,
      templateName: entry.templateName,
      exerciseId: entry.exerciseId,
      exerciseName: entry.exerciseName,
      sessions: entry.entries.length,
      latestVolume,
      previousVolume,
      deltaVolume,
      deltaPercent: percentageDelta(latestVolume, previousVolume),
      latestBestWeight: latest?.bestWeight ?? 0,
      previousBestWeight: previous?.bestWeight ?? 0,
      status,
    };
  }).sort((a, b) => Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent));
}

export type LoadTrend = {
  sessionId: string;
  date: string;
  templateName: string;
  resistanceVolume: number;
  completedSets: number;
  cardioMinutes: number;
  recoveryScore: number | null;
  rawLoad: number;
  adjustedLoad: number;
  deltaPercent: number;
  status: "up" | "down" | "same" | "first";
};

/**
 * מדד עומס יחסי ושקוף: נפח התנגדות בקילוגרמים מומר לאלפים, כל סט שהושלם מוסיף 2,
 * וכל דקת אירובי מוסיפה 0.15. כאשר קיימת מדידת התאוששות, העומס מותאם בעדינות
 * לפי מוכנות: התאוששות נמוכה מגדילה את עומס ההשפעה, והתאוששות גבוהה מפחיתה אותו.
 */
export function buildLoadTrends(
  sessions: WorkoutSession[],
  recoveryLogs: import("./workout-store").RecoveryLog[] = [],
  cardioLogs: import("./workout-store").CardioLog[] = [],
  templates: WorkoutTemplate[] = workoutTemplates,
): LoadTrend[] {
  const chronological = [...sessions].filter((session) => session.finishedAt).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  let previousAdjusted = 0;
  return chronological.map((session) => {
    const template = templates.find((item) => item.id === session.templateId) ?? getTemplate(session.templateId);
    const completedSets = session.sets.filter((set) => set.completed).length;
    const resistanceVolume = calculateVolume(session);
    const sessionDate = new Date(session.startedAt).getTime();
    const nearestRecovery = [...recoveryLogs].sort((a, b) => Math.abs(new Date(a.date).getTime() - sessionDate) - Math.abs(new Date(b.date).getTime() - sessionDate))[0];
    const recoveryScore = nearestRecovery ? calculateRecoveryScore(nearestRecovery) : null;
    const cardioMinutes = cardioLogs.filter((log) => Math.abs(new Date(log.date).getTime() - sessionDate) < 36 * 60 * 60 * 1000).reduce((sum, log) => sum + (Number(log.durationMinutes) || 0), 0);
    const rawLoad = resistanceVolume / 1000 + completedSets * 2 + cardioMinutes * 0.15;
    const adjustedLoad = rawLoad * (recoveryScore === null ? 1 : 1 + (50 - recoveryScore) / 100);
    const deltaPercent = previousAdjusted > 0 ? Math.round(((adjustedLoad - previousAdjusted) / previousAdjusted) * 100) : 0;
    const status: LoadTrend["status"] = !previousAdjusted ? "first" : deltaPercent > 0 ? "up" : deltaPercent < 0 ? "down" : "same";
    previousAdjusted = adjustedLoad;
    return { sessionId: session.id, date: session.startedAt, templateName: template.name, resistanceVolume, completedSets, cardioMinutes, recoveryScore, rawLoad, adjustedLoad, deltaPercent, status };
  });
}

export function loadExplanation(load: LoadTrend | undefined) {
  if (!load) return "לא נמצאו עדיין אימונים שהושלמו לניתוח עומס.";
  if (load.recoveryScore !== null && load.recoveryScore < 50) return `העומס המותאם גבוה יותר מהעומס הגולמי בגלל התאוששות נמוכה (${load.recoveryScore}/100). מומלץ לבחון איכות שינה, כאבי שרירים ועייפות לפני העלאת עומס.`;
  if (load.deltaPercent > 10) return `העומס המותאם עלה ב־${load.deltaPercent}% לעומת האימון הקודם. בדוק שהעלייה תואמת את היעד ואת ההתאוששות.`;
  if (load.deltaPercent < -10) return `העומס המותאם ירד ב־${Math.abs(load.deltaPercent)}% לעומת האימון הקודם. בדוק אם זו הורדת עומס מתוכננת או ירידה בביצועים.`;
  return "העומס המותאם יציב יחסית לעומת האימון הקודם.";
}

export type WeeklyCardioTrend = {
  weekStart: string;
  label: string;
  calories: number;
  distanceKm: number;
  sessions: number;
};

function weekStartIso(iso: string) {
  const date = new Date(iso);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export function buildWeeklyCardioTrends(logs: import("./workout-store").CardioLog[], limit = 8): WeeklyCardioTrend[] {
  const groups = new Map<string, WeeklyCardioTrend>();
  logs.forEach((log) => {
    const weekStart = weekStartIso(log.date);
    const current = groups.get(weekStart) ?? { weekStart, label: new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short" }).format(new Date(weekStart)), calories: 0, distanceKm: 0, sessions: 0 };
    current.calories += Number(log.caloriesBurned) || 0;
    current.distanceKm += Number(log.distanceKm) || 0;
    current.sessions += 1;
    groups.set(weekStart, current);
  });
  return Array.from(groups.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart)).slice(-limit);
}


export type SmartLoadSnapshot = LoadTrend & {
  acuteLoad7d: number;
  baselineLoad28d: number;
  loadRatio: number | null;
  recoveryStatus: "high" | "moderate" | "low" | "missing";
  performanceDirection: "improving" | "stable" | "declining";
  recommendation: string;
};

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function buildSmartLoadSnapshots(trends: LoadTrend[]): SmartLoadSnapshot[] {
  return trends.map((trend, index) => {
    const currentTime = new Date(trend.date).getTime();
    const recent = trends.filter((item) => {
      const age = currentTime - new Date(item.date).getTime();
      return age >= 0 && age <= 7 * 24 * 60 * 60 * 1000;
    });
    const baseline = trends.filter((item) => {
      const age = currentTime - new Date(item.date).getTime();
      return age >= 0 && age <= 28 * 24 * 60 * 60 * 1000;
    });
    const acuteLoad7d = average(recent.map((item) => item.adjustedLoad));
    const baselineLoad28d = average(baseline.map((item) => item.adjustedLoad));
    const loadRatio = baselineLoad28d > 0 ? Number((acuteLoad7d / baselineLoad28d).toFixed(2)) : null;
    const recoveryStatus: SmartLoadSnapshot["recoveryStatus"] = trend.recoveryScore === null ? "missing" : trend.recoveryScore >= 75 ? "high" : trend.recoveryScore >= 50 ? "moderate" : "low";
    const previous = trends[index - 1];
    const performanceDirection: SmartLoadSnapshot["performanceDirection"] = !previous ? "stable" : trend.deltaPercent > 5 ? "improving" : trend.deltaPercent < -5 ? "declining" : "stable";
    let recommendation = "העומס נראה מאוזן. המשך לתעד שינה והתאוששות כדי לשפר את הדיוק.";
    if (recoveryStatus === "missing") recommendation = "אין מדידת התאוששות סמוכה. הזן שינה, עייפות וכאבי שרירים כדי להתאים את העומס.";
    else if (recoveryStatus === "low" && performanceDirection === "declining") recommendation = "ההתאוששות נמוכה והביצועים בירידה. שקול אימון קל יותר והפחתת נפח זמנית של 5–10%.";
    else if (recoveryStatus === "low") recommendation = "ההתאוששות נמוכה. שמור על עצימות מתונה ובחן את איכות השינה לפני העלאת עומס.";
    else if (loadRatio !== null && loadRatio > 1.25) recommendation = "העומס בשבעת הימים האחרונים גבוה מהבסיס. שקול יום קל יותר אם המגמה נמשכת.";
    else if (performanceDirection === "improving" && recoveryStatus === "high") recommendation = "הביצועים משתפרים וההתאוששות טובה. אפשר להתקדם בהדרגה לפי התוכנית.";
    return { ...trend, acuteLoad7d, baselineLoad28d, loadRatio, recoveryStatus, performanceDirection, recommendation };
  });
}

export function smartLoadExplanation(snapshot: SmartLoadSnapshot | undefined) {
  if (!snapshot) return "אין מספיק אימונים שהושלמו כדי להפיק ניתוח עומס חכם.";
  const ratio = snapshot.loadRatio === null ? "אין עדיין בסיס של 28 ימים" : `יחס קצר/בסיס ${snapshot.loadRatio.toFixed(2)}`;
  return `${snapshot.recommendation} ממוצע 7 ימים: ${snapshot.acuteLoad7d.toFixed(1)} · ממוצע בסיס 28 ימים: ${snapshot.baselineLoad28d.toFixed(1)} · ${ratio}.`;
}
