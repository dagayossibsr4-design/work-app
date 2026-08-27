import { describe, expect, it } from "vitest";
import { cycleDateRangeLabel, cycleWeekdays, normalizeCycleRecords, renameCycleRecords } from "../lib/cycle-tracking";

describe("cycle tracking model", () => {
  it("uses Hebrew weekday labels", () => {
    expect(cycleWeekdays).toEqual(["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "שבת"]);
  });

  it("normalizes legacy day numbers from 1-7 to zero-based weekdays", () => {
    const [cycle] = normalizeCycleRecords([{ name: "ישן", selectedDays: [1, 6, 7], materialsByDay: { "1": ["טסט"], "7": ["פרימו"] } }]);
    expect(cycle.selectedDays).toEqual([0, 5, 6]);
    expect(cycle.materialsByDay["0"]).toEqual(["טסט"]);
    expect(cycle.materialsByDay["6"]).toEqual(["פרימו"]);
  });

  it("preserves modern zero-based days when Sunday is not selected", () => {
    const [cycle] = normalizeCycleRecords([{ id: "modern", name: "חדש", dayIndexVersion: 2, selectedDays: [1, 3, 5], materialsByDay: { "1": ["טסט"], "3": ["פרימו"] } }]);
    expect(cycle.selectedDays).toEqual([1, 3, 5]);
    expect(cycle.materialsByDay["1"]).toEqual(["טסט"]);
    expect(cycle.materialsByDay["3"]).toEqual(["פרימו"]);
  });

  it("keeps multiple cycles as separate records", () => {
    const cycles = normalizeCycleRecords([{ id: "a", name: "א", selectedDays: [0] }, { id: "b", name: "ב", selectedDays: [1] }]);
    expect(cycles).toHaveLength(2);
    expect(cycles.map((cycle) => cycle.name)).toEqual(["א", "ב"]);
  });

  it("preserves the configured date range and formats it without timezone conversion", () => {
    const [cycle] = normalizeCycleRecords([{ id: "dates", name: "טסט", startDate: "2026-06-02", endDate: "2026-10-16", selectedDays: [0] }]);
    expect(cycle.startDate).toBe("2026-06-02");
    expect(cycle.endDate).toBe("2026-10-16");
    expect(cycleDateRangeLabel(cycle)).toBe("2026-06-02 עד 2026-10-16");
  });

  it("renames only the selected cycle and preserves its other data", () => {
    const cycles = normalizeCycleRecords([{ id: "a", name: "ישן", selectedDays: [0], materialsByDay: { "0": ["טסט"] } }, { id: "b", name: "נשאר", selectedDays: [1] }]);
    const renamed = renameCycleRecords(cycles, "a", "  חדש  ");
    expect(renamed[0]).toMatchObject({ id: "a", name: "חדש", selectedDays: [0], materialsByDay: { "0": ["טסט"] } });
    expect(renamed[1].name).toBe("נשאר");
    expect(renameCycleRecords(cycles, "a", "   ")).toEqual(cycles);
  });
});
