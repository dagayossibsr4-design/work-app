export type CalendarCell = number | null;

export const CALENDAR_COLUMN_PERCENT = 100 / 7;
export const CALENDAR_CELL_PERCENT = 13;
export const CALENDAR_COLUMN_GAP_PERCENT = 1.5;

export const APP_TIME_ZONE = "Asia/Jerusalem";

function datePartsInAppTimeZone(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")) };
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** מחזיר תאריך לפי אזור הזמן של האפליקציה (ישראל), ולא לפי UTC של סביבת הדפדפן. */
export function localDateKey(date: Date) {
  const { year, month, day } = datePartsInAppTimeZone(date);
  return dateKey(year, month, day);
}

/** מחזיר את תחילת השבוע המקומי, כאשר יום ראשון הוא היום הראשון. */
export function sundayWeekStart(date: Date) {
  const { year, month, day } = datePartsInAppTimeZone(date);
  const start = new Date(Date.UTC(year, month - 1, day, 12));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  return dateKey(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate());
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
