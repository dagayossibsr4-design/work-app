import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarButton: HapticTab, tabBarStyle: { height: 62 + bottomPadding, paddingTop: 8, paddingBottom: bottomPadding, backgroundColor: colors.background, borderTopColor: colors.border }, tabBarLabelStyle: { fontSize: 11 } }}>
    <Tabs.Screen name="index" options={{ title: "היום", tabBarAccessibilityLabel: "מסך היום", tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={23} color={color} /> }} />
    <Tabs.Screen name="workouts" options={{ title: "אימונים", tabBarAccessibilityLabel: "מסך האימונים", tabBarIcon: ({ color }) => <IconSymbol name="fitness.center" size={23} color={color} /> }} />
    <Tabs.Screen name="nutrition" options={{ title: "תזונה", tabBarAccessibilityLabel: "מסך התזונה", tabBarIcon: ({ color }) => <IconSymbol name="restaurant.fill" size={23} color={color} /> }} />
    <Tabs.Screen name="settings" options={{ title: "הגדרות", tabBarAccessibilityLabel: "מסך ההגדרות", tabBarIcon: ({ color }) => <IconSymbol name="settings.fill" size={23} color={color} /> }} />
    <Tabs.Screen name="profile" options={{ href: null }} />
    <Tabs.Screen name="history" options={{ href: null }} />
    <Tabs.Screen name="schedule" options={{ href: null }} />
    <Tabs.Screen name="analysis" options={{ href: null }} />
    <Tabs.Screen name="editor" options={{ href: null }} />
    <Tabs.Screen name="garmin" options={{ href: null }} />
    <Tabs.Screen name="cardio" options={{ href: null }} />
    <Tabs.Screen name="recovery" options={{ href: null }} />
    <Tabs.Screen name="meal-plan" options={{ href: null }} />
    <Tabs.Screen name="macro-calculator" options={{ href: null }} />
    <Tabs.Screen name="food-library" options={{ href: null }} />
    <Tabs.Screen name="weekly-summary" options={{ href: null }} />
  </Tabs>;
}
