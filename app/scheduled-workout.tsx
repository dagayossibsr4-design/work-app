import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { completedWorkoutHistoryRoute } from "@/lib/completed-workout-route";
import { isCardioWorkoutTemplate, splitSessionsForWorkoutDate, useWorkoutStore } from "@/lib/workout-store";

type DayKind = "workout" | "cardio" | "rest";

function displayDate(date: string) {
  return new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
}

export default function ScheduledWorkoutScreen() {
  const { date = new Date().toISOString().slice(0, 10), kind = "workout", templateId = "", label = "אימון", focus = "" } = useLocalSearchParams<{ date?: string; kind?: DayKind; templateId?: string; label?: string; focus?: string }>();
  const { templates, sessions, startWorkoutOnDate } = useWorkoutStore();
  const fallbackCardio = templates.find((item) => isCardioWorkoutTemplate(item.id));
  const template = templates.find((item) => item.id === templateId) ?? (kind === "cardio" ? fallbackCardio : undefined);
  const daySessions = splitSessionsForWorkoutDate(sessions, date);
  const isRest = kind === "rest";
  const isCardio = kind === "cardio" || Boolean(template && isCardioWorkoutTemplate(template.id));

  const startWorkout = () => {
    if (!template) return;
    startWorkoutOnDate(template.id, date);
    router.replace("/active-workout" as never);
  };

  return <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.topRow}><Pressable accessibilityRole="button" accessibilityLabel="חזרה ללוח" onPress={() => router.back()} style={styles.backButton}><Text style={styles.backButtonText}>›</Text></Pressable><View><Text style={styles.eyebrow}>לוח האימונים</Text><Text style={styles.title}>{label}</Text><Text style={styles.date}>{displayDate(date)}</Text></View></View>
      <View style={[styles.hero, isCardio && styles.heroCardio, isRest && styles.heroRest]}><Text style={styles.heroTitle}>{isRest ? "יום התאוששות" : isCardio ? "תוכנית אירובי" : "תוכנית אימון כוח"}</Text><Text style={styles.focus}>{focus || (isRest ? "מנוחה והתאוששות מלאה" : template?.focus ?? "")}</Text>{!isRest && template ? <Text style={styles.meta}>{template.exercises.length} {isCardio ? "מקטעי אירובי" : "תרגילים"} · {template.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)} {isCardio ? "מקטעים" : "סטים"} מתוכננים</Text> : null}</View>

      {!isRest && template ? <><Pressable accessibilityRole="button" accessibilityLabel={`התחל את ${template.name}`} onPress={startWorkout} style={[styles.startButton, isCardio && styles.startCardio]}><Text style={[styles.startText, isCardio && styles.startCardioText]}>התחל {template.name}</Text></Pressable><View style={styles.section}><Text style={styles.sectionTitle}>כל התרגילים בתוכנית</Text>{template.exercises.map((exercise, exerciseIndex) => <View key={exercise.id} style={styles.exercise}><View style={styles.exerciseHeader}><Text style={styles.exerciseNumber}>{exerciseIndex + 1}</Text><Text style={styles.exerciseName}>{exercise.name || exercise.id || "תרגיל ללא שם"}</Text></View><View style={styles.targets}>{exercise.sets.map((set, setIndex) => <Text key={`${exercise.id}-${setIndex}`} style={styles.target}>סט {setIndex + 1}: {set.target || "ללא יעד"}</Text>)}</View></View>)}</View></> : <View style={styles.restCard}><Text style={styles.restTitle}>אין אימון מתוכנן להיום</Text><Text style={styles.restText}>זהו יום מנוחה. אפשר לחזור ללוח ולשנות את סוג היום במידת הצורך.</Text></View>}

      {daySessions.all.length ? <View style={styles.recorded}><Text style={styles.sectionTitle}>אימונים שכבר תועדו בתאריך זה</Text>{daySessions.all.map((session) => <Pressable key={session.id} accessibilityRole="button" onPress={() => router.push(completedWorkoutHistoryRoute(session.id) as never)} style={styles.recordedButton}><Text style={styles.recordedText}>פתח אימון מתועד ›</Text></Pressable>)}</View> : null}
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 34, gap: 13 }, topRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start" }, backButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#253653", alignItems: "center", justifyContent: "center" }, backButtonText: { color: "#F5B72C", fontSize: 30, lineHeight: 34 }, eyebrow: { color: "#F5B72C", fontSize: 11, fontWeight: "900", textAlign: "right" }, title: { color: "#F7F9FC", fontSize: 29, fontWeight: "900", textAlign: "right", marginTop: 2 }, date: { color: "#AAB7C8", fontSize: 11, textAlign: "right", marginTop: 4 }, hero: { backgroundColor: "#1B3152", borderColor: "#3C6B9E", borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 }, heroCardio: { backgroundColor: "#102E2A", borderColor: "#367B68" }, heroRest: { backgroundColor: "#251C29", borderColor: "#715B6A" }, heroTitle: { color: "#F7F9FC", fontSize: 15, fontWeight: "900", textAlign: "right" }, focus: { color: "#D9E2EF", fontSize: 12, textAlign: "right", lineHeight: 19 }, meta: { color: "#AAB7C8", fontSize: 10, textAlign: "right" }, startButton: { backgroundColor: "#F5B72C", borderRadius: 14, minHeight: 54, alignItems: "center", justifyContent: "center" }, startCardio: { backgroundColor: "#42D392" }, startText: { color: "#0B1224", fontSize: 14, fontWeight: "900" }, startCardioText: { color: "#09221D" }, section: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 15, padding: 12, gap: 8 }, sectionTitle: { color: "#F5D27A", fontSize: 14, fontWeight: "900", textAlign: "right" }, exercise: { backgroundColor: "#0B1224", borderRadius: 10, padding: 10, gap: 7 }, exerciseHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 8 }, exerciseNumber: { color: "#0B1224", backgroundColor: "#F5B72C", borderRadius: 8, minWidth: 24, paddingVertical: 4, textAlign: "center", fontSize: 10, fontWeight: "900" }, exerciseName: { color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right", flex: 1 }, targets: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 5 }, target: { color: "#B8C7DB", backgroundColor: "#17253C", borderRadius: 7, paddingHorizontal: 7, paddingVertical: 5, fontSize: 9, fontWeight: "800" }, restCard: { backgroundColor: "#251C29", borderColor: "#715B6A", borderWidth: 1, borderRadius: 14, padding: 15, gap: 7 }, restTitle: { color: "#F7D6E1", fontSize: 15, fontWeight: "900", textAlign: "right" }, restText: { color: "#D5BEC7", fontSize: 11, textAlign: "right", lineHeight: 18 }, recorded: { backgroundColor: "#102E2A", borderColor: "#367B68", borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 }, recordedButton: { borderColor: "#42D392", borderWidth: 1, borderRadius: 9, paddingVertical: 9, alignItems: "center" }, recordedText: { color: "#8AE6CF", fontSize: 11, fontWeight: "900" },
});
