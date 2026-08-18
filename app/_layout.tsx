import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { I18nManager, Platform } from "react-native";
import { ThemeProvider } from "@/lib/theme-provider";
import { WorkoutProvider } from "@/lib/workout-store";
import { trpc, createTRPCClient } from "@/lib/trpc";

if (Platform.OS !== "web") {
  // Keep Android RTL support enabled without forcing a second native mirror.
  // Screens and navigation use explicit direction styles for deterministic layout.
  I18nManager.allowRTL(true);
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTRPCClient());
  return (
    <GestureHandlerRootView style={{ flex: 1, direction: "rtl", backgroundColor: "#0B1224" }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <WorkoutProvider>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false }} />
            </WorkoutProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );
}
