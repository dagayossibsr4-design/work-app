import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { BrandMark } from "@/components/ui/brand-mark";
import { AuthGuardFallback } from "@/components/auth-guard-fallback";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { DEFAULT_WEEKLY_GOALS, normalizeWeeklyGoals, WEEKLY_GOALS_KEY, type WeeklyGoals } from "@/lib/weekly-goals";

type GoalField = { key: keyof WeeklyGoals; label: string; unit: string; hint: string };
const fields: GoalField[] = [
  { key: "workouts", label: "אימוני כוח ואימון אירובי", unit: "אימונים", hint: "כמה אימונים תרצה להשלים בשבוע" },
  { key: "strengthVolume", label: "נפח אימוני כוח", unit: "ק״ג", hint: "סך משקל × חזרות בשבוע" },
  { key: "load", label: "עומס מותאם", unit: "נקודות", hint: "סך עומס משוקלל לשבוע" },
  { key: "cardioDistance", label: "מרחק אירובי", unit: "ק״מ", hint: "סך מרחק מכל פעילויות האירובי" },
  { key: "cardioCalories", label: "קלוריות אירובי", unit: "קק״ל", hint: "קלוריות שנשרפו באירובי" },
  { key: "sleepHours", label: "שעות שינה", unit: "שעות", hint: "יעד שבועי מצטבר" },
  { key: "recoveryScore", label: "ציון התאוששות", unit: "נקודות", hint: "סך ציוני ההתאוששות בשבוע" },
];

export default function WeeklyGoalsScreen() {
  const authState = useAuthGuard();
  const [goals, setGoals] = useState<WeeklyGoals>(DEFAULT_WEEKLY_GOALS);
  const [status, setStatus] = useState("");
  useEffect(() => { AsyncStorage.getItem(WEEKLY_GOALS_KEY).then((raw) => { if (raw) setGoals(normalizeWeeklyGoals(JSON.parse(raw))); }).catch(() => undefined); }, []);
  const update = (key: keyof WeeklyGoals, value: string) => setGoals((current) => ({ ...current, [key]: value === "" ? 0 : Math.max(0, Number(value.replace(",", ".")) || 0) }));
  const save = async () => { await AsyncStorage.setItem(WEEKLY_GOALS_KEY, JSON.stringify(goals)); setStatus("היעדים נשמרו ויופיעו מיד בפרופיל האישי."); };
  const reset = async () => { setGoals(DEFAULT_WEEKLY_GOALS); await AsyncStorage.setItem(WEEKLY_GOALS_KEY, JSON.stringify(DEFAULT_WEEKLY_GOALS)); setStatus("היעדים אופסו לברירת המחדל."); };
  if (authState !== "authorized") return <AuthGuardFallback />;
  return <ScreenContainer className="px-5 pt-5"><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><BrandMark /><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="חזרה להגדרות" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ חזרה</Text></Pressable><Text style={styles.eyebrow}>הגדרות מתקדמות</Text><Text style={styles.title}>יעדים שבועיים</Text><Text style={styles.subtitle}>הגדר את היעדים האישיים שיוצגו בפסי ההתקדמות בפרופיל.</Text></View><View style={styles.info}><Text style={styles.infoTitle}>איך זה עובד?</Text><Text style={styles.infoText}>הפרופיל משווה את הנתונים שנצברו השבוע ליעדים שלך. ניתן לשנות את היעדים בכל עת; הם נשמרים במכשיר בלבד.</Text></View><View style={styles.card}>{fields.map((field) => <View key={field.key} style={styles.field}><Text style={styles.label}>{field.label}</Text><Text style={styles.hint}>{field.hint}</Text><View style={styles.inputRow}><Text style={styles.unit}>{field.unit}</Text><TextInput accessibilityLabel={`יעד ${field.label}`} keyboardType="decimal-pad" value={String(goals[field.key])} onChangeText={(value) => update(field.key, value)} style={styles.input} /></View></View>)}</View><Pressable accessibilityRole="button" accessibilityLabel="שמור יעדים שבועיים" onPress={() => void save()} style={styles.primary}><Text style={styles.primaryText}>שמור יעדים</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="אפס יעדים לברירת המחדל" onPress={() => void reset()} style={styles.secondary}><Text style={styles.secondaryText}>אפס לברירת המחדל</Text></Pressable>{status ? <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text> : null}</ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { gap: 14, paddingBottom: 35 }, header: { alignItems: "flex-end", gap: 5 }, back: { alignSelf: "flex-start", padding: 5 }, backText: { color: "#65BDF6", fontWeight: "900" }, eyebrow: { color: "#F5B72C", fontWeight: "900" }, title: { color: "#F7F9FC", fontSize: 30, fontWeight: "900" }, subtitle: { color: "#AAB7C8", fontSize: 13, textAlign: "right", lineHeight: 19 }, info: { backgroundColor: "#1C3152", borderColor: "#3F76A7", borderWidth: 1, borderRadius: 15, padding: 14, gap: 5 }, infoTitle: { color: "#F5B72C", fontSize: 15, fontWeight: "900", textAlign: "right" }, infoText: { color: "#D9E2EF", fontSize: 11, lineHeight: 18, textAlign: "right" }, card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 17, padding: 14, gap: 13 }, field: { borderTopColor: "#2C3B55", borderTopWidth: 1, paddingTop: 11, gap: 3 }, label: { color: "#F7F9FC", fontSize: 13, fontWeight: "900", textAlign: "right" }, hint: { color: "#7E8DA4", fontSize: 10, textAlign: "right" }, inputRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 5 }, input: { flex: 1, height: 42, backgroundColor: "#0B1224", color: "#F7F9FC", borderColor: "#52759C", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, textAlign: "right", fontSize: 16, fontWeight: "800" }, unit: { color: "#F5B72C", fontWeight: "900", minWidth: 62, textAlign: "right" }, primary: { backgroundColor: "#F5B72C", borderRadius: 11, padding: 14, alignItems: "center" }, primaryText: { color: "#0B1224", fontWeight: "900" }, secondary: { borderColor: "#52759C", borderWidth: 1, borderRadius: 11, padding: 13, alignItems: "center" }, secondaryText: { color: "#65BDF6", fontWeight: "900" }, status: { color: "#42D392", fontSize: 12, fontWeight: "800", textAlign: "right" } });
