export const CYCLE_STORAGE_KEY = "supplement-cycles-v1";
export const cycleWeekdays = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "שבת"] as const;
export const defaultCycleMaterials = ["טסט", "פרימו", "בולדנון", "אוביטרל", "ארמדיקס", "פפטיד מותאם אישית"] as const;

export type CycleRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  selectedDays: number[];
  materialsByDay: Record<string, string[]>;
  customMaterials: string[];
};

export function renameCycleRecords(records: CycleRecord[], id: string, name: string): CycleRecord[] {
  const trimmedName = name.trim();
  if (!trimmedName) return records;
  return records.map((cycle) => (cycle.id === id ? { ...cycle, name: trimmedName } : cycle));
}

export function cycleDateRangeLabel(cycle: Pick<CycleRecord, "startDate" | "endDate">): string {
  const start = cycle.startDate.trim() || "ללא התחלה";
  const end = cycle.endDate.trim() || "ללא סיום";
  return `${start} עד ${end}`;
}

export function normalizeCycleRecords(input: unknown): CycleRecord[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw, index) => {
    const item = (raw && typeof raw === "object" ? raw : {}) as Partial<CycleRecord>;
    const legacyDays = Array.isArray(item.selectedDays) ? item.selectedDays.map(Number).filter(Number.isFinite) : [0];
    const selectedDays = [...new Set(legacyDays.map((day) => day >= 1 && day <= 7 ? day - 1 : Math.max(0, Math.min(6, day))))].sort((a, b) => a - b);
    const materialsByDay: Record<string, string[]> = {};
    Object.entries(item.materialsByDay ?? {}).forEach(([day, names]) => {
      const numericDay = Number(day);
      const normalizedDay = numericDay >= 1 && numericDay <= 7 ? numericDay - 1 : numericDay;
      materialsByDay[String(Math.max(0, Math.min(6, normalizedDay)))] = Array.isArray(names) ? names.filter((name): name is string => typeof name === "string" && Boolean(name.trim())) : [];
    });
    return {
      id: typeof item.id === "string" && item.id ? item.id : `cycle-${index}-${Date.now()}`,
      name: typeof item.name === "string" ? item.name : "מחזור ללא שם",
      startDate: typeof item.startDate === "string" ? item.startDate : "",
      endDate: typeof item.endDate === "string" ? item.endDate : "",
      selectedDays: selectedDays.length ? selectedDays : [0],
      materialsByDay,
      customMaterials: Array.isArray(item.customMaterials) ? item.customMaterials.filter((name): name is string => typeof name === "string" && Boolean(name.trim())) : [],
    };
  });
}
