import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { BrandMark } from "@/components/ui/brand-mark";
import { useWorkoutStore, calculateVolume } from "@/lib/workout-store";
import { buildLoadTrends } from "@/lib/workout-analysis";
import { calculateRecoveryScore } from "@/lib/recovery-analysis";
import { DEFAULT_WEEKLY_GOALS, normalizeWeeklyGoals, WEEKLY_GOALS_KEY, type WeeklyGoals } from "@/lib/weekly-goals";
import { supabase } from "@/lib/supabase";
import { confirmSignOut } from "@/lib/confirm-sign-out";

const DAY = 24 * 60 * 60 * 1000;

function inRange(date: string, start: number, end: number) {
  const time = new Date(date).getTime();
  return time >= start && time < end;
}

function signed(value: number, unit = "") {
  if (!Number.isFinite(value) || value === 0) return "0";
  return `${value > 0 ? "+" : ""}${Math.round(value)}${unit}`;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max > 0 ? Math.min(100, Math.max(4, (value / max) * 100)) : 4;
  return <View style={styles.barTrack}><View style={[styles.barFill, { width: `${width}%`, backgroundColor: color }]} /></View>;
}

export default function ProfileScreen() {
  const { sessions, cardioLogs, recoveryLogs } = useWorkoutStore();
  const [goals, setGoals] = useState<WeeklyGoals>(DEFAULT_WEEKLY_GOALS);
  useEffect(() => { AsyncStorage.getItem(WEEKLY_GOALS_KEY).then((raw) => { if (raw) setGoals(normalizeWeeklyGoals(JSON.parse(raw))); }).catch(() => undefined); }, []);
  const summary = useMemo(() => {
    const now = Date.now();
    const thisStart = now - 7 * DAY;
    const previousStart = now - 14 * DAY;
    const thisSessions = sessions.filter((session) => session.finishedAt && inRange(session.startedAt, thisStart, now + DAY));
    const previousSessions = sessions.filter((session) => session.finishedAt && inRange(session.startedAt, previousStart, thisStart));
    const thisCardio = cardioLogs.filter((log) => inRange(log.date, thisStart, now + DAY));
    const previousCardio = cardioLogs.filter((log) => inRange(log.date, previousStart, thisStart));
    const thisRecovery = recoveryLogs.filter((log) => inRange(log.date, thisStart, now + DAY));
    const previousRecovery = recoveryLogs.filter((log) => inRange(log.date, previousStart, thisStart));
    const totalVolume = thisSessions.reduce((sum, session) => sum + calculateVolume(session), 0);
    const previousVolume = previousSessions.reduce((sum, session) => sum + calculateVolume(session), 0);
    const totalLoad = buildLoadTrends(thisSessions, thisRecovery, thisCardio).reduce((sum, trend) => sum + trend.adjustedLoad, 0);
    const previousLoad = buildLoadTrends(previousSessions, previousRecovery, previousCardio).reduce((sum, trend) => sum + trend.adjustedLoad, 0);
    const distance = thisCardio.reduce((sum, log) => sum + (Number(log.distanceKm) || 0), 0);
    const previousDistance = previousCardio.reduce((sum, log) => sum + (Number(log.distanceKm) || 0), 0);
    const calories = thisCardio.reduce((sum, log) => sum + (Number(log.caloriesBurned) || 0), 0);
    const previousCalories = previousCardio.reduce((sum, log) => sum + (Number(log.caloriesBurned) || 0), 0);
    const recoveryAverage = thisRecovery.length ? thisRecovery.reduce((sum, log) => sum + calculateRecoveryScore(log), 0) / thisRecovery.length : null;
    const previousRecoveryAverage = previousRecovery.length ? previousRecovery.reduce((sum, log) => sum + calculateRecoveryScore(log), 0) / previousRecovery.length : null;
    const sleepAverage = thisRecovery.length ? thisRecovery.reduce((sum, log) => sum + (Number(log.sleepHours) || 0), 0) / thisRecovery.length : null;
    return { thisSessions, totalVolume, previousVolume, totalLoad, previousLoad, distance, previousDistance, calories, previousCalories, recoveryAverage, previousRecoveryAverage, sleepAverage, hasData: thisSessions.length + thisCardio.length + thisRecovery.length > 0 };
  }, [sessions, cardioLogs, recoveryLogs]);
  const recoveryColor = summary.recoveryAverage === null ? "#7E8DA4" : summary.recoveryAverage >= 75 ? "#42D392" : summary.recoveryAverage >= 50 ? "#F5B72C" : "#F27E9A";
  const requestSignOut = () => confirmSignOut(() => {
    void supabase?.auth.signOut().then(() => router.replace("/register" as never));
  });
  return <ScreenContainer className="px-5 pt-5"><ScrollView contentContainerStyle={styles.content}><Pressable accessibilityRole="button" accessibilityLabel="התנתקות באמצעות לחיצה על שם החשבון" onPress={requestSignOut}><BrandMark /></Pressable><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="פתח תפריט" onPress={() => router.push("/menu")} style={({ pressed }) => [styles.menu, pressed && styles.pressed]}><Text style={styles.menuText}>☰ תפריט</Text></Pressable><Text style={styles.eyebrow}>פרופיל אישי</Text><Text style={styles.title}>ההתקדמות שלי</Text><Text style={styles.subtitle}>סיכום של שבעת הימים האחרונים מול השבוע שקדם להם</Text></View><View style={styles.hero}><View><Text style={styles.heroValue}>{summary.thisSessions.length}</Text><Text style={styles.heroLabel}>אימונים השבוע</Text></View><View><Text style={[styles.heroValue, { color: recoveryColor }]}>{summary.recoveryAverage === null ? "—" : Math.round(summary.recoveryAverage)}</Text><Text style={styles.heroLabel}>התאוששות ממוצעת</Text></View><View><Text style={styles.heroValue}>{summary.totalVolume > 0 ? `${Math.round(summary.totalVolume / 1000)}k` : "—"}</Text><Text style={styles.heroLabel}>נפח בק״ג</Text></View></View>{!summary.hasData ? <View style={styles.empty}><Text style={styles.emptyTitle}>עדיין אין מספיק נתונים</Text><Text style={styles.emptyText}>תעד אימון, אירובי או שינה כדי שהפרופיל יציג מגמת התקדמות אישית.</Text><Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/workouts")} style={styles.primary}><Text style={styles.primaryText}>פתח אימונים</Text></Pressable></View> : <><View style={styles.card}><Text style={styles.cardTitle}>מדדי השבוע</Text><Metric label="נפח אימוני כוח" value={summary.totalVolume} previous={summary.previousVolume} target={goals.strengthVolume} unit="ק״ג" color="#F5B72C" /><Metric label="עומס מותאם" value={summary.totalLoad} previous={summary.previousLoad} target={goals.load} unit="נק׳" color="#A78BFA" /><Metric label="מרחק אירובי" value={summary.distance} previous={summary.previousDistance} target={goals.cardioDistance} unit="ק״מ" color="#38BDF8" /><Metric label="קלוריות אירובי" value={summary.calories} previous={summary.previousCalories} target={goals.cardioCalories} unit="קק״ל" color="#FB7185" /></View><View style={styles.card}><Text style={styles.cardTitle}>שינה והתאוששות</Text><View style={styles.recoveryRow}><View style={styles.recoveryMetric}><Text style={[styles.recoveryValue, { color: recoveryColor }]}>{summary.recoveryAverage === null ? "—" : `${Math.round(summary.recoveryAverage)}/100`}</Text><Text style={styles.recoveryLabel}>ציון התאוששות</Text></View><View style={styles.recoveryMetric}><Text style={styles.recoveryValue}>{summary.sleepAverage === null ? "—" : `${summary.sleepAverage.toFixed(1)} ש׳`}</Text><Text style={styles.recoveryLabel}>שינה ממוצעת</Text></View></View><Text style={styles.explanation}>{summary.recoveryAverage === null ? "אין עדיין מדידות התאוששות לשבוע הזה." : summary.recoveryAverage >= 75 ? "ההתאוששות השבועית טובה. אפשר להמשיך לפי התוכנית תוך מעקב אחר שינה ועייפות." : summary.recoveryAverage >= 50 ? "ההתאוששות בינונית. כדאי לשמור על קצב יציב ולבחון את איכות השינה לפני העלאת עומס." : "ההתאוששות נמוכה. כדאי לשקול אימון קל יותר ולבדוק שינה, עייפות וכאבי שרירים."}</Text></View><View style={styles.card}><Text style={styles.cardTitle}>השינוי לעומת השבוע הקודם</Text><View style={styles.changeGrid}><Change label="נפח" value={summary.totalVolume - summary.previousVolume} unit=" ק״ג" /><Change label="עומס" value={summary.totalLoad - summary.previousLoad} unit=" נק׳" /><Change label="מרחק" value={summary.distance - summary.previousDistance} unit=" ק״מ" /><Change label="קלוריות" value={summary.calories - summary.previousCalories} unit=" קק״ל" /></View></View><View style={styles.card}><Text style={styles.cardTitle}>הצעדים הבאים</Text><Text style={styles.explanation}>לדיוק טוב יותר, המשך לתעד כל אימון, הזן שינה והתאוששות, ושמור על עקביות במדידת האירובי.</Text><View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/analysis")} style={styles.secondary}><Text style={styles.secondaryText}>ניתוח עומסים</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/recovery")} style={styles.secondary}><Text style={styles.secondaryText}>תיעוד התאוששות</Text></Pressable></View></View></>}</ScrollView></ScreenContainer>;
}

function Metric({ label, value, previous, target, unit, color }: { label: string; value: number; previous: number; target: number; unit: string; color: string }) { const delta = value - previous; return <View style={styles.metric}><View style={styles.metricHeader}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{Math.round(value)} / {Math.round(target)} {unit} · {signed(delta)} {unit}</Text></View><Bar value={value} max={target} color={color} /></View>; }
function Change({ label, value, unit }: { label: string; value: number; unit: string }) { const color = value > 0 ? "#42D392" : value < 0 ? "#F27E9A" : "#AAB7C8"; return <View style={styles.change}><Text style={[styles.changeValue, { color }]}>{signed(value)}{unit}</Text><Text style={styles.changeLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({ content: { gap: 14, paddingBottom: 38 }, header: { alignItems: "flex-end", gap: 5 }, menu: { backgroundColor: "#253653", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7, marginBottom: 4 }, menuText: { color: "#F5B72C", fontWeight: "900", fontSize: 11 }, eyebrow: { color: "#F5B72C", fontWeight: "900" }, title: { color: "#F7F9FC", fontSize: 30, fontWeight: "900" }, subtitle: { color: "#AAB7C8", fontSize: 13, textAlign: "right", lineHeight: 18 }, hero: { flexDirection: "row-reverse", justifyContent: "space-between", backgroundColor: "#16233A", borderColor: "#3F76A7", borderWidth: 1, borderRadius: 17, padding: 16 }, heroValue: { color: "#F5B72C", fontSize: 24, fontWeight: "900", textAlign: "center" }, heroLabel: { color: "#AAB7C8", fontSize: 9, textAlign: "center", marginTop: 3 }, card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 17, padding: 15, gap: 12 }, cardTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right" }, metric: { gap: 6 }, metricHeader: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 8 }, metricLabel: { color: "#D9E2EF", fontSize: 11, fontWeight: "800" }, metricValue: { color: "#AAB7C8", fontSize: 10, textAlign: "right" }, barTrack: { height: 9, backgroundColor: "#0B1224", borderRadius: 8, overflow: "hidden" }, barFill: { height: 9, borderRadius: 8 }, recoveryRow: { flexDirection: "row-reverse", gap: 8 }, recoveryMetric: { flex: 1, backgroundColor: "#0B1224", borderRadius: 11, padding: 12, alignItems: "flex-end" }, recoveryValue: { fontSize: 20, fontWeight: "900" }, recoveryLabel: { color: "#AAB7C8", fontSize: 10, marginTop: 4 }, explanation: { color: "#D9E2EF", fontSize: 11, lineHeight: 18, textAlign: "right" }, changeGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }, change: { width: "48%", backgroundColor: "#0B1224", borderRadius: 11, padding: 11, alignItems: "flex-end" }, changeValue: { fontSize: 16, fontWeight: "900" }, changeLabel: { color: "#AAB7C8", fontSize: 10, marginTop: 3 }, actions: { flexDirection: "row-reverse", gap: 8 }, secondary: { flex: 1, borderColor: "#52759C", borderWidth: 1, borderRadius: 10, padding: 10, alignItems: "center" }, secondaryText: { color: "#65BDF6", fontWeight: "900", fontSize: 11 }, primary: { backgroundColor: "#F5B72C", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 3 }, primaryText: { color: "#0B1224", fontWeight: "900" }, empty: { backgroundColor: "#16233A", borderRadius: 17, borderColor: "#2C3B55", borderWidth: 1, padding: 18, gap: 9, alignItems: "flex-end" }, emptyTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "900" }, emptyText: { color: "#AAB7C8", textAlign: "right", lineHeight: 18 }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] } });
