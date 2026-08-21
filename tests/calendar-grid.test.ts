import { describe, expect, it } from "vitest";
import { CALENDAR_CELL_PERCENT, CALENDAR_COLUMN_GAP_PERCENT, CALENDAR_COLUMN_PERCENT, localDateKey, sundayFirstMonthCells } from "../lib/calendar-grid";

describe("לוח תאריכי אימון", () => {
  it("ממקם את אוגוסט 2026 נכון: ה־1 וה־22 הם שבת", () => {
    const cells = sundayFirstMonthCells(2026, 7);
    expect(cells.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(cells[6]).toBe(1);
    expect(cells[27]).toBe(22);
  });

  it("מחלק את רוחב הלוח בדיוק לשבע עמודות", () => {
    expect(CALENDAR_COLUMN_PERCENT * 7).toBeCloseTo(100, 10);
    expect(CALENDAR_CELL_PERCENT * 7 + CALENDAR_COLUMN_GAP_PERCENT * 6).toBe(100);
  });

  it("יוצר תאריך מקומי תקין עבור פעולת היום", () => {
    expect(localDateKey(new Date(2026, 7, 22, 12))).toBe("2026-08-22");
  });
});
