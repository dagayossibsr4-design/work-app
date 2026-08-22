import React from "react";
import { Stack } from "expo-router";
import { WorkoutProvider } from "../lib/workout-store";

export default function RootLayout() {
  return (
    <WorkoutProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
      </Stack>
    </WorkoutProvider>
  );
}