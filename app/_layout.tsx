import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { I18nManager, Platform } from "react-native";
import { ThemeProvider } from "@/lib/theme-provider";
import { EntryAnimation } from "@/components/entry-animation";
import { WorkoutProvider } from "@/lib/workout-store";
import { AccountSync } from "@/components/account-sync";
import { trpc, createTRPCClient } from "@/lib/trpc";

if (Platform.OS !== "web") {
  // Keep Android RTL support enabled without forcing a second native mirror.
  // Screens and navigation use explicit direction styles for deterministic layout.
  I18nManager.allowRTL(true);
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTRPCClient());
  const [booted, setBooted] = useState(false);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0B1224" }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <WorkoutProvider>
              <AccountSync />
              <StatusBar style="light" />
              {booted ? <Stack screenOptions={{ headerShown: false }} /> : null}
              <EntryAnimation onFinished={() => setBooted(true)} />
            </WorkoutProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );
}
