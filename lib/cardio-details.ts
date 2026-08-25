import type { SetLog } from "./workout-store";

export type CardioTotals = {
  minutes: number;
  distanceKm: number;
  averageSpeedKph: number;
  paceSecondsPerKm: number | null;
};

/** מחשב סיכום אירובי מתוך מקטעים שנרשמו: זמן, מרחק, מהירות וקצב. */
export function cardioTotalsForSets(sets: SetLog[]): CardioTotals {
  const minutes = sets.reduce((sum, set) => sum + Math.max(0, Number(set.reps) || 0), 0);
  const distanceKm = sets.reduce((sum, set) => sum + Math.max(0, Number(set.weight) || 0), 0);
  const averageSpeedKph = minutes > 0 ? (distanceKm / minutes) * 60 : 0;
  const paceSecondsPerKm = distanceKm > 0 ? Math.round((minutes * 60) / distanceKm) : null;
  return { minutes, distanceKm, averageSpeedKph, paceSecondsPerKm };
}

export function cardioPaceText(paceSecondsPerKm: number | null) {
  if (!paceSecondsPerKm || !Number.isFinite(paceSecondsPerKm)) return "—";
  return `${Math.floor(paceSecondsPerKm / 60)}:${String(paceSecondsPerKm % 60).padStart(2, "0")} דק׳/ק״מ`;
}
