export type CalendarCell = number | null;

export const CALENDAR_COLUMN_PERCENT = 100 / 7;
export const CALENDAR_CELL_PERCENT = 13;
export const CALENDAR_COLUMN_GAP_PERCENT = 1.5;

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** מחזיר תאי חודש בלוח שמתחיל ביום ראשון ומכיל בדיוק שבע עמודות. */
export function sundayFirstMonthCells(
  year: number,
  zeroBasedMonth: number,
): CalendarCell[] {
  const firstWeekday = new Date(year, zeroBasedMonth, 1).getDay();
  const daysInMonth = new Date(year, zeroBasedMonth + 1, 0).getDate();
  return Array.from(
    { length: firstWeekday + daysInMonth },
    (_, index) => (index < firstWeekday ? null : index - firstWeekday + 1),
  );
}
