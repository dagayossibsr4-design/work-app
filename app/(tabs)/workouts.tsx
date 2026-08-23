import { useMemo, useState } from "react";
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { localDateKey } from "@/lib/calendar-grid";
import { isCardioWorkoutTemplate, useWorkoutStore } from "@/lib/workout-store";
import type { WorkoutTemplate } from "@/lib/workout-data";

type WorkoutSection = { title: string; data: WorkoutTemplate[] };

function groupTitle(template: WorkoutTemplate) {
  if (template.name.startsWith("ABCD")) return "תוכנית ABCD";
  if (template.name.startsWith("ABC")) return "תוכנית ABC";
  if (template.name.startsWith("AB")) return "תוכנית AB";
  if (template.name === "Full Body") return "Full Body";
  if (isCardioWorkoutTemplate(template.id)) return "אירובי";
  if (["Push", "Pull", "Legs", "Arms"].some((name) => template.name.startsWith(name))) return "התוכנית הקבועה שלי";
  return "תוכניות נוספות";
}

export default function WorkoutsScreen() {
  const { startWorkout, startWorkoutOnDate, sessions, templates } = useWorkoutStore();
  const [cardioSelection, setCardioSelection] = useState<Record<string, string>>({});
  const completed = sessions.filter((session) => Boolean(session.finishedAt)).length;
  const cardioTemplates = useMemo(() => templates.filter((template) => isCardioWorkoutTemplate(template.id)), [templates]);
  const sections = ["התוכנית הקבועה שלי", "תוכנית AB", "תוכנית ABC", "תוכנית ABCD", "Full Body", "אירובי", "תוכניות נוספות"]
    .map((title) => ({ title, data: templates.filter((template) => groupTitle(template) === title) }))
    .filter((section) => section.data.length) as WorkoutSection[];

  const openWorkout = (templateId: string, copyPrevious = false) => {
    startWorkout(templateId, copyPrevious);
    router.push("/active-workout" as never);
  };
  const openAttachedCardio = (templateId: string) => {
    startWorkoutOnDate(templateId, localDateKey(new Date()));
    router.push("/active-workout" as never);
  };

  return (
    <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<View style={styles.heading}><Text style={styles.eyebrow}>בחירת אימון</Text><Text style={styles.title}>האימונים שלך</Text><Text style={styles.subtitle}>בחר אימון כוח, או צרף לו אירובי שיישמר כאימון נפרד באותו יום.</Text><View style={styles.summaryPill}><Text style={styles.summaryText}>{completed} אימונים נשמרו · {templates.length} תבניות זמינות</Text></View></View>}
        renderSectionHeader={({ section }) => <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{section.title}</Text><Text style={styles.sectionHint}>{section.data.length} אפשרויות</Text></View>}
        renderItem={({ item }) => <WorkoutCard item={item} hasPrevious={sessions.some((session) => session.templateId === item.id)} cardioTemplates={cardioTemplates} selectedCardioId={cardioSelection[item.id]} onSelectCardio={(cardioId) => setCardioSelection((current) => ({ ...current, [item.id]: cardioId }))} onStart={() => openWorkout(item.id)} onCopy={() => openWorkout(item.id, true)} onStartCardio={openAttachedCardio} />}
      />
    </ScreenContainer>
  );
}

function WorkoutCard({ item, hasPrevious, cardioTemplates, selectedCardioId, onSelectCardio, onStart, onCopy, onStartCardio }: { item: WorkoutTemplate; hasPrevious: boolean; cardioTemplates: WorkoutTemplate[]; selectedCardioId?: string; onSelectCardio: (cardioId: string) => void; onStart: () => void; onCopy: () => void; onStartCardio: (cardioId: string) => void }) {
  const selectedCardio = cardioTemplates.find((template) => template.id === selectedCardioId) ?? cardioTemplates[0];
  const isCardio = isCardioWorkoutTemplate(item.id);
  return <View style={styles.card}><View style={[styles.line, { backgroundColor: item.accent }]} /><View style={styles.cardBody}><Text style={styles.name}>{item.name}</Text><Text style={styles.focus}>{item.focus}</Text><Text style={styles.meta}>{item.exercises.length} תרגילים · {item.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)} {isCardio ? "מקטעים מתוכננים" : "סטים מתוכננים"}</Text><View style={styles.exercisePreview}>{item.exercises.slice(0, 4).map((exercise) => <Text key={exercise.id} numberOfLines={2} style={styles.exerciseName}>• {exercise.name || exercise.id || "תרגיל ללא שם"}</Text>)}{item.exercises.length > 4 ? <Text style={styles.moreExercises}>+ עוד {item.exercises.length - 4} תרגילים</Text> : null}</View><Text style={[styles.historyHint, { color: hasPrevious ? "#42D392" : "#7E8DA4" }]}>{hasPrevious ? "✓ יש נתוני אימון קודם להעתקה" : "האימון הראשון · יתחיל ללא נתוני עבר"}</Text><View style={styles.actions}><Pressable accessibilityRole="button" accessibilityLabel={hasPrevious ? `העתק את האימון האחרון של ${item.name}` : `אין אימון קודם עבור ${item.name}`} onPress={onCopy} disabled={!hasPrevious} style={({ pressed }) => [styles.copyButton, !hasPrevious && styles.disabled, pressed && styles.pressed]}><Text style={styles.copyText}>{hasPrevious ? "העתק אימון קודם" : "אין אימון קודם"}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`התחל אימון חדש ${item.name}`} onPress={onStart} style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}><Text style={styles.startText}>התחל חדש</Text></Pressable></View>{!isCardio && selectedCardio ? <View style={cardioStyles.panel}><View style={cardioStyles.heading}><Text style={cardioStyles.badge}>אימון נפרד</Text><Text style={cardioStyles.title}>אירובי לצד {item.name}</Text></View><Text style={cardioStyles.description}>בחר פעילות. האירובי יתחיל כעת ויישמר לתאריך היום, בלי לשנות את אימון הכוח.</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cardioStyles.choices}>{cardioTemplates.map((cardio) => <Pressable key={`${item.id}-${cardio.id}`} accessibilityRole="button" accessibilityState={{ selected: selectedCardio.id === cardio.id }} onPress={() => onSelectCardio(cardio.id)} style={[cardioStyles.choice, selectedCardio.id === cardio.id && cardioStyles.choiceActive]}><Text style={[cardioStyles.choiceText, selectedCardio.id === cardio.id && cardioStyles.choiceTextActive]}>{cardio.name}</Text></Pressable>)}</ScrollView><Pressable accessibilityRole="button" testID={`start-attached-cardio-${item.id}`} accessibilityLabel={`התחל ${selectedCardio.name} לצד ${item.name} היום`} onPress={() => onStartCardio(selectedCardio.id)} style={({ pressed }) => [cardioStyles.start, pressed && styles.pressed]}><Text style={cardioStyles.startText}>התחל {selectedCardio.name} לצד אימון הכוח היום</Text></Pressable></View> : null}</View></View>;
}

const styles = StyleSheet.create({ heading: { alignItems: "flex-end", marginBottom: 10 }, eyebrow: { color: "#F5B72C", fontSize: 12, fontWeight: "900", marginBottom: 4 }, title: { color: "#F7F9FC", fontSize: 30, fontWeight: "800" }, subtitle: { color: "#AAB7C8", fontSize: 13, marginTop: 6, textAlign: "right", lineHeight: 19 }, summaryPill: { backgroundColor: "#1B3152", borderColor: "#3F76A7", borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginTop: 10 }, summaryText: { color: "#C7E8F7", fontSize: 10, fontWeight: "800", textAlign: "right", writingDirection: "rtl" }, list: { gap: 10, paddingBottom: 30 }, sectionHeader: { flexDirection: "row-reverse", alignItems: "baseline", justifyContent: "space-between", paddingTop: 9, paddingBottom: 5 }, sectionTitle: { color: "#65BDF6", fontSize: 15, fontWeight: "900", textAlign: "right" }, sectionHint: { color: "#7E8DA4", fontSize: 10 }, card: { flexDirection: "row-reverse", alignItems: "stretch", backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, overflow: "hidden" }, line: { width: 6 }, cardBody: { flex: 1, padding: 15, alignItems: "flex-end" }, name: { color: "#F7F9FC", fontSize: 19, fontWeight: "800", textAlign: "right", writingDirection: "rtl" }, focus: { color: "#AAB7C8", fontSize: 12, marginTop: 5, textAlign: "right" }, meta: { color: "#7E8DA4", fontSize: 11, marginTop: 8, textAlign: "right", writingDirection: "rtl" }, exercisePreview: { width: "100%", marginTop: 8, gap: 3, paddingVertical: 7, paddingHorizontal: 9, backgroundColor: "#0F1A2E", borderRadius: 9 }, exerciseName: { color: "#C7D4E5", fontSize: 10, textAlign: "right", writingDirection: "rtl", width: "100%", lineHeight: 15 }, moreExercises: { color: "#8FD3F4", fontSize: 10, fontWeight: "800", textAlign: "right", marginTop: 2 }, historyHint: { fontSize: 10, fontWeight: "800", marginTop: 6, textAlign: "right" }, actions: { flexDirection: "row-reverse", gap: 8, marginTop: 12, width: "100%" }, startButton: { flex: 1, minHeight: 48, backgroundColor: "#F5B72C", borderColor: "#F5B72C", borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", justifyContent: "center", shadowColor: "#F5B72C", shadowOpacity: 0.24, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 }, startText: { color: "#0B1224", fontSize: 12, fontWeight: "900", writingDirection: "rtl" }, copyButton: { flex: 1, borderColor: "#42D392", borderWidth: 1, borderRadius: 9, paddingVertical: 8, alignItems: "center" }, copyText: { color: "#42D392", fontSize: 10, fontWeight: "900" }, disabled: { opacity: 0.35, borderColor: "#7E8DA4" }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }, });

const cardioStyles = StyleSheet.create({ panel: { width: "100%", marginTop: 12, backgroundColor: "#102723", borderColor: "#367B68", borderWidth: 1, borderRadius: 13, padding: 10, gap: 8 }, heading: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 }, title: { color: "#E7FFF7", fontSize: 13, fontWeight: "900", textAlign: "right" }, badge: { color: "#09221D", backgroundColor: "#42D392", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, fontSize: 9, fontWeight: "900" }, description: { color: "#B8EADD", fontSize: 10, textAlign: "right", lineHeight: 16 }, choices: { flexDirection: "row", gap: 7, paddingVertical: 1 }, choice: { borderColor: "#4C8C7C", borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 7 }, choiceActive: { backgroundColor: "#42D392", borderColor: "#42D392" }, choiceText: { color: "#B8EADD", fontSize: 10, fontWeight: "800" }, choiceTextActive: { color: "#09221D" }, start: { backgroundColor: "#42D392", borderRadius: 10, minHeight: 42, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, startText: { color: "#09221D", fontSize: 11, fontWeight: "900", textAlign: "center" } });
