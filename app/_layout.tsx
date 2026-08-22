import { Stack } from "expo-router";
import { WorkoutProvider } from "@/context/workout-context";

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