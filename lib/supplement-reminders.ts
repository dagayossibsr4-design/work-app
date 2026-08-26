import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  DEFAULT_SUPPLEMENT_REMINDER_SETTINGS,
  normalizeSupplementReminderSettings,
  reminderSlots,
  type ReminderSlot,
  type SupplementReminderSettings,
} from "@/lib/supplement-reminder-types";

export const SUPPLEMENT_REMINDER_SETTINGS_KEY = "supplement-reminder-settings-v1";
export const SUPPLEMENT_REMINDER_IDS_KEY = "supplement-reminder-ids-v1";
export const SUPPLEMENT_REMINDER_HISTORY_KEY = "supplement-reminder-history-v1";

export type SupplementReminderEvent = {
  id: string;
  slot: ReminderSlot;
  dateKey: string;
  occurredAt: string;
  opened: boolean;
};

export async function loadSupplementReminderHistory(): Promise<SupplementReminderEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(SUPPLEMENT_REMINDER_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is SupplementReminderEvent => Boolean(item && typeof item === "object" && typeof (item as SupplementReminderEvent).slot === "string" && typeof (item as SupplementReminderEvent).occurredAt === "string")) : [];
  } catch {
    return [];
  }
}

export async function recordSupplementReminderEvent(slot: ReminderSlot, opened: boolean) {
  const current = await loadSupplementReminderHistory();
  const occurredAt = new Date().toISOString();
  const next: SupplementReminderEvent[] = [{
    id: `${occurredAt}-${slot}-${opened ? "opened" : "received"}`,
    slot,
    dateKey: occurredAt.slice(0, 10),
    occurredAt,
    opened,
  }, ...current].slice(0, 90);
  await AsyncStorage.setItem(SUPPLEMENT_REMINDER_HISTORY_KEY, JSON.stringify(next));
}

export async function loadSupplementReminderSettings(): Promise<SupplementReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(SUPPLEMENT_REMINDER_SETTINGS_KEY);
    return normalizeSupplementReminderSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_SUPPLEMENT_REMINDER_SETTINGS;
  }
}

async function cancelSavedReminders() {
  try {
    const raw = await AsyncStorage.getItem(SUPPLEMENT_REMINDER_IDS_KEY);
    const ids = raw ? JSON.parse(raw) as unknown : [];
    if (Array.isArray(ids)) {
      await Promise.all(ids.filter((id): id is string => typeof id === "string").map((id) =>
        Notifications.cancelScheduledNotificationAsync(id),
      ));
    }
  } catch {
    // A missing or already-cancelled notification should not block new scheduling.
  }
  await AsyncStorage.removeItem(SUPPLEMENT_REMINDER_IDS_KEY);
}

async function prepareNotificationChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("supplement-reminders", {
      name: "תזכורות תוספי תזונה",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 100, 180],
      lightColor: "#F5B72C",
    });
  }
}

export async function requestSupplementReminderPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  await prepareNotificationChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

export async function saveAndScheduleSupplementReminders(
  settings: SupplementReminderSettings,
): Promise<{ enabled: boolean; scheduled: number; permissionDenied: boolean }> {
  const normalized = normalizeSupplementReminderSettings(settings);
  await AsyncStorage.setItem(SUPPLEMENT_REMINDER_SETTINGS_KEY, JSON.stringify(normalized));
  await cancelSavedReminders();

  if (Platform.OS === "web" || !normalized.enabled) {
    return { enabled: false, scheduled: 0, permissionDenied: false };
  }

  const permitted = await requestSupplementReminderPermission();
  if (!permitted) {
    return { enabled: false, scheduled: 0, permissionDenied: true };
  }

  const ids = await Promise.all(reminderSlots.map(async (slot) => {
    const [hour, minute] = normalized.times[slot].split(":").map(Number);
    return Notifications.scheduleNotificationAsync({
      content: {
        title: `תזכורת תוספים — ${slot}`,
        body: "בדוק את תוספי התזונה שסימנת, כולל GH אם הוא מסומן אצלך.",
        data: { type: "supplement-reminder", slot },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === "android" ? { channelId: "supplement-reminders" } : {}),
      },
    });
  }));
  await AsyncStorage.setItem(SUPPLEMENT_REMINDER_IDS_KEY, JSON.stringify(ids));
  return { enabled: true, scheduled: ids.length, permissionDenied: false };
}

export async function sendSupplementReminderTest(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const permitted = await requestSupplementReminderPermission();
  if (!permitted) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "בדיקת תזכורת תוספים",
      body: "זו התראה לבדיקה. ניתן לפתוח את תפריט התוספים מכאן.",
      data: { type: "supplement-reminder", slot: "בוקר", test: true },
    },
    trigger: null,
  });
  return true;
}

export async function initializeSupplementReminders() {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}
