import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { AuthGuardFallback } from "@/components/auth-guard-fallback";
import { useAuthGuard } from "@/lib/use-auth-guard";

const sections = [
  { title: "אימון יומי", items: [["היום", "/(tabs)"], ["אימונים", "/(tabs)/workouts"], ["יומן אימונים ולוח", "/(tabs)/schedule"], ["היסטוריה", "/(tabs)/history"]] },
  { title: "תזונה", items: [["מחשבון קלורי ומאקרו", "/(tabs)/macro-calculator"], ["ניהול ארוחות", "/(tabs)/meal-plan"], ["מאגר מזון והמרות", "/(tabs)/food-library"], ["תזונה והעדפות", "/(tabs)/nutrition"]] },
  { title: "מעקב וניתוח", items: [["לוח בקרה · אימונים ותזונה", "/dashboard"], ["פרופיל אישי והתקדמות", "/(tabs)/profile"], ["סיכום שבועי", "/(tabs)/weekly-summary"], ["שינה והתאוששות", "/(tabs)/recovery"], ["אירובי", "/(tabs)/cardio"], ["ניתוח התקדמות", "/(tabs)/analysis"]] },
  { title: "הגדרות וחיבורים", items: [["הרשמה / התחברות", "/register"], ["עריכת תבניות", "/(tabs)/editor"], ["הגדרות", "/settings"], ["איך משתמשים באפליקציה", "/guide"], ["TRT וסטרואידים — מידע בטוח", "/hormone-health"], ["יומן מעקב אישי ותוספים", "/hormone-tracking"], ["פרטיות ומידע משפטי", "/legal"]] },
] as const;

export default function MenuScreen() {
  const authState = useAuthGuard();
  if (authState !== "authorized") return <AuthGuardFallback />;
  return <ScreenContainer className="px-5 pt-5" containerClassName="bg-background"><ScrollView contentContainerStyle={styles.content}><View style={styles.header}><Text style={styles.eyebrow}>ניווט מהיר</Text><Text style={styles.title}>כל האזורים</Text><Text style={styles.subtitle}>פעולות הליבה נמצאות למעלה. שאר המסכים מחולקים לפי מטרה.</Text></View>{sections.map((section) => <View key={section.title} style={styles.section}><Text style={styles.sectionTitle}>{section.title}</Text>{section.items.map(([label, path]) => <Pressable key={path} accessibilityRole="button" accessibilityLabel={`פתח ${label}`} onPress={() => router.push(path as never)} style={({ pressed }) => [styles.item, pressed && styles.pressed]}><Text style={styles.arrow}>‹</Text><Text style={styles.label}>{label}</Text></Pressable>)}</View>)}<Pressable accessibilityRole="button" accessibilityLabel="חזרה למסך הקודם" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>חזרה למסך הקודם</Text></Pressable></ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { gap: 18, paddingBottom: 35 }, header: { alignItems: "flex-end", marginBottom: 2 }, eyebrow: { color: "#F5B72C", fontSize: 13, fontWeight: "800" }, title: { color: "#F7F9FC", fontSize: 30, fontWeight: "900" }, subtitle: { color: "#AAB7C8", fontSize: 13, marginTop: 5, textAlign: "right", lineHeight: 19 }, section: { gap: 8 }, sectionTitle: { color: "#65BDF6", fontSize: 12, fontWeight: "900", textAlign: "right", marginBottom: 1 }, item: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 15, padding: 15 }, label: { color: "#F7F9FC", fontSize: 16, fontWeight: "800" }, arrow: { color: "#F5B72C", fontSize: 25, fontWeight: "900" }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }, back: { alignItems: "center", padding: 13 }, backText: { color: "#AAB7C8", fontWeight: "800" } });
