import React from "react";
import { Stack } from "expo-router";
import { WorkoutProvider } from "../context/workout-context";
import { AuthProvider } from "../context/auth-context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <WorkoutProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
        </Stack>
      </WorkoutProvider>
    </AuthProvider>
  );
}