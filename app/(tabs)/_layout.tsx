import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0b1329", // צבע רקע כחול כהה
          borderTopColor: "#1e293b",
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#f59e0b", // צבע מוזהב לטאב פעיל
        tabBarInactiveTintColor: "#64748b", // צבע אפור לטאב לא פעיל
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "היום",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "אימונים",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "לוח אימונים",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: "תזונה",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "הגדרות",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-sharp" size={size} color={color} />
          ),
        }}
      />

      {/* הסתרת כל השאר */}
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