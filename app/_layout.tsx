import "../global.css";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, usePathname, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { I18nManager, Platform } from "react-native";
import { ThemeProvider } from "../lib/theme-provider";
import { EntryAnimation } from "../components/entry-animation";
import { WorkoutProvider } from "../lib/workout-store";
import { AccountSync } from "../components/account-sync";
import { WebComplianceOverlay } from "../components/web-compliance-overlay";
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

const LAST_ROUTE_KEY = "prolifto-last-route-v1";

const canResumeRoute = (route: string) =>
  route.length > 1 &&
  !route.startsWith("/oauth") &&
  !route.startsWith("/register") &&
    !route.startsWith("/legal") &&
  !route.startsWith("/barcode-scanner");

function readLastRoute(): Promise<string | null> {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      return Promise.resolve(window.localStorage.getItem(LAST_ROUTE_KEY));
    } catch {
      return Promise.resolve(null);
    }
  }
  return AsyncStorage.getItem(LAST_ROUTE_KEY);
}

function saveLastRoute(route: string) {
  if (!canResumeRoute(route)) return;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LAST_ROUTE_KEY, route);
    } catch {
      // Some privacy modes disable localStorage; the app remains usable.
    }
    return;
  }
  void AsyncStorage.setItem(LAST_ROUTE_KEY, route).catch(() => undefined);
}

if (Platform.OS !== "web") {
  I18nManager.allowRTL(true);
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTRPCClient());
  const [booted, setBooted] = useState(false);
  const [resumeLoaded, setResumeLoaded] = useState(false);
  const resumeTargetRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void readLastRoute()
      .then((savedRoute) => {
        if (!active) return;
        const target = savedRoute && canResumeRoute(savedRoute) ? savedRoute : null;
        resumeTargetRef.current = target;
        if (target && pathname !== target) {
          router.replace(target as never);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setResumeLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!resumeLoaded || !canResumeRoute(pathname)) return;
    const target = resumeTargetRef.current;
    if (target && pathname !== target) return;
    resumeTargetRef.current = null;
    saveLastRoute(pathname);
  }, [pathname, resumeLoaded]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const persistCurrentRoute = () => saveLastRoute(pathname);
    window.addEventListener("pagehide", persistCurrentRoute);
    window.addEventListener("beforeunload", persistCurrentRoute);
    return () => {
      window.removeEventListener("pagehide", persistCurrentRoute);
      window.removeEventListener("beforeunload", persistCurrentRoute);
    };
  }, [pathname]);

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
              <Stack screenOptions={{ headerShown: false }} />
              {!booted ? <EntryAnimation onFinished={() => setBooted(true)} /> : null}
              <WebComplianceOverlay />
            </WorkoutProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );
}
