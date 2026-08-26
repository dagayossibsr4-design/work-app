import "../global.css";
import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { I18nManager, Platform } from "react-native";
import { ThemeProvider } from "../lib/theme-provider";
import { EntryAnimation } from "../components/entry-animation";
import { WorkoutProvider } from "../lib/workout-store";
import { AccountSync } from "../components/account-sync";
import { trpc, createTRPCClient } from "../lib/trpc";
import {
  initializeSupplementReminders,
  recordSupplementReminderEvent,
} from "../lib/supplement-reminders";
import type { ReminderSlot } from "../lib/supplement-reminder-types";

function reminderSlotFromNotification(notification: Notifications.Notification): ReminderSlot | null {
  const slot = notification.request.content.data?.slot;
  return slot === "בוקר" || slot === "צהריים" || slot === "ערב" ? slot : null;
}

if (Platform.OS !== "web") {
  // Keep Android RTL support enabled without forcing a second native mirror.
  // Screens and navigation use explicit direction styles for deterministic layout.
  I18nManager.allowRTL(true);
}

export default function RootLayout() {
  const router = useRouter();
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTRPCClient());
  const [booted, setBooted] = useState(Platform.OS === "web");
  useEffect(() => {
    void initializeSupplementReminders();
    if (Platform.OS === "web") return;

    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const slot = reminderSlotFromNotification(notification);
      if (slot) void recordSupplementReminderEvent(slot, false);
    });
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const slot = reminderSlotFromNotification(response.notification);
      if (slot) void recordSupplementReminderEvent(slot, true);
      if (slot) router.push("/meal-plan?openSupplements=1" as never);
    });
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      const slot = reminderSlotFromNotification(lastResponse.notification);
      if (slot) {
        void recordSupplementReminderEvent(slot, true);
        router.push("/meal-plan?openSupplements=1" as never);
      }
    }
    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [router]);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0B1224" }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <WorkoutProvider>
              <AccountSync />
              <StatusBar style="light" />
              {booted ? <Stack screenOptions={{ headerShown: false }} /> : null}
              {!booted ? <EntryAnimation onFinished={() => setBooted(true)} /> : null}
            </WorkoutProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );
}
