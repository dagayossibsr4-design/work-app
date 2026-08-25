export type WaterEntry = {
  id: string;
  amount: number;
  at: string;
};

export type WaterDay = {
  consumed: number;
  goal: number;
};

/**
 * מסיר רישום שתייה יחיד ומפחית רק את הכמות שנרשמה בו.
 * הפעולה מחזירה מבנים חדשים כדי לשמור על עדכון React ועל שמירה מיידית.
 */
export function removeWaterHistoryEntry(
  eventsByDate: Record<string, WaterEntry[]>,
  historyByDate: Record<string, WaterDay>,
  date: string,
  entryId: string,
) {
  const dayEvents = eventsByDate[date] ?? [];
  const removed = dayEvents.find((entry) => entry.id === entryId);
  if (!removed) {
    return { eventsByDate, historyByDate, removed: false };
  }

  const dayHistory = historyByDate[date] ?? {
    consumed: dayEvents.reduce((sum, entry) => sum + entry.amount, 0),
    goal: 2000,
  };
  const nextEvents = dayEvents.filter((entry) => entry.id !== entryId);
  const nextDay: WaterDay = {
    consumed: Math.max(0, dayHistory.consumed - removed.amount),
    goal: Math.max(250, Number(dayHistory.goal) || 2000),
  };

  return {
    eventsByDate: { ...eventsByDate, [date]: nextEvents },
    historyByDate: { ...historyByDate, [date]: nextDay },
    removed: true,
  };
}
