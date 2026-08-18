import type { WorkoutTemplate } from "./workout-data";
import type { WorkoutSession } from "./workout-store";

export type DeclineAlert = {
  exerciseId: string;
  exerciseName: string;
  sessionsCount: number;
  declinePercent: number;
  currentWeight: number;
  suggestedWeight: number;
  message: string;
};

function sessionVolume(session: WorkoutSession, exerciseId: string) {
  return session.sets.filter((set) => set.exerciseId === exerciseId && set.completed).reduce((sum, set) => sum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0);
}

function sessionBestWeight(session: WorkoutSession, exerciseId: string) {
  return session.sets.filter((set) => set.exerciseId === exerciseId && set.completed).reduce((max, set) => Math.max(max, Number(set.weight) || 0), 0);
}

function roundDownToIncrement(value: number, increment = 2.5) {
  return Math.max(0, Math.floor(value / increment) * increment);
}

export function detectPerformanceDeclines(sessions: WorkoutSession[], template: WorkoutTemplate): DeclineAlert[] {
  const templateSessions = sessions.filter((session) => session.templateId === template.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (templateSessions.length < 3) return [];
  return template.exercises.flatMap((exercise) => {
    const recent = templateSessions.map((session) => ({ session, volume: sessionVolume(session, exercise.id) })).filter((item) => item.volume > 0).slice(0, 3);
    if (recent.length < 3) return [];
    const [latest, middle, oldest] = recent;
    const isDescending = oldest.volume > middle.volume && middle.volume > latest.volume;
    const declinePercent = oldest.volume ? ((oldest.volume - latest.volume) / oldest.volume) * 100 : 0;
    if (!isDescending || declinePercent < 8) return [];
    const currentWeight = sessionBestWeight(latest.session, exercise.id);
    const suggestedWeight = roundDownToIncrement(currentWeight * 0.95);
    return [{ exerciseId: exercise.id, exerciseName: exercise.name, sessionsCount: 3, declinePercent: Math.round(declinePercent), currentWeight, suggestedWeight, message: `נרשמה ירידה של ${Math.round(declinePercent)}% בנפח בשלושת האימונים האחרונים. מומלץ להוריד עומס בכ־5% באופן זמני ולבחון התאוששות.` }];
  });
}

export function buildTemplateDeclineAlert(sessions: WorkoutSession[], template: WorkoutTemplate) {
  const alerts = detectPerformanceDeclines(sessions, template);
  if (!alerts.length) return null;
  const worst = alerts.reduce((max, alert) => alert.declinePercent > max.declinePercent ? alert : max, alerts[0]);
  return { ...worst, count: alerts.length, title: "זוהתה ירידה מתמשכת בביצועים" };
}
