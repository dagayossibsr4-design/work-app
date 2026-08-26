export type ReminderSlot = "בוקר" | "צהריים" | "ערב";

export type SupplementReminderSettings = {
  enabled: boolean;
  times: Record<ReminderSlot, string>;
};

export const DEFAULT_SUPPLEMENT_REMINDER_SETTINGS: SupplementReminderSettings = {
  enabled: false,
  times: {
    בוקר: "08:00",
    צהריים: "13:00",
    ערב: "20:00",
  },
};

export const reminderSlots: ReminderSlot[] = ["בוקר", "צהריים", "ערב"];

function isValidTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function normalizeSupplementReminderSettings(input: unknown): SupplementReminderSettings {
  const source = input && typeof input === "object" ? input as Partial<SupplementReminderSettings> : {};
  const rawTimes = source.times && typeof source.times === "object" ? source.times as Partial<Record<ReminderSlot, string>> : {};
  return {
    enabled: source.enabled === true,
    times: Object.fromEntries(reminderSlots.map((slot) => [
      slot,
      typeof rawTimes[slot] === "string" && isValidTime(rawTimes[slot])
        ? rawTimes[slot]
        : DEFAULT_SUPPLEMENT_REMINDER_SETTINGS.times[slot],
    ])) as Record<ReminderSlot, string>,
  };
}
