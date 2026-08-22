import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { height: 60 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="workouts" options={{ title: "Workouts" }} />
      <Tabs.Screen name="schedule" options={{ title: "Schedule" }} />
      <Tabs.Screen name="nutrition" options={{ title: "Nutrition" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      
      <Tabs.Screen name="analysis" options={{ href: null }} />
      <Tabs.Screen name="cardio" options={{ href: null }} />
      <Tabs.Screen name="editor" options={{ href: null }} />
      <Tabs.Screen name="food-library" options={{ href: null }} />
      <Tabs.Screen name="food-search" options={{ href: null }} />
      <Tabs.Screen name="garmin" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="macro-calculator" options={{ href: null }} />
      <Tabs.Screen name="meal-plan" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="recovery" options={{ href: null }} />
      <Tabs.Screen name="weekly-summary" options={{ href: null }} />
    </Tabs>
  );
}