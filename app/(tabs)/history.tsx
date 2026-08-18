import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { getTemplate } from "@/lib/workout-data";
import { calculateVolume, useWorkoutStore, type WorkoutSession } from "@/lib/workout-store";

async function shareFile(uri: string, mimeType: string, title: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.print();
    return;
  }
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType, dialogTitle: title });
  else Alert.alert("הקובץ מוכן", "שיתוף קבצים אינו זמין במכשיר זה.");
}

async function exportHistoryPdf(sessions: WorkoutSession[]) {
  if (!sessions.length) return Alert.alert("אין נתונים", "אין עדיין אימונים לייצוא.");
  const rows = sessions.flatMap((session) => {
    const template = getTemplate(session.templateId);
    return session.sets.map((set) => `<tr><td>${dateText(session.startedAt)}</td><td>${template.name}</td><td>${set.exerciseId}</td><td>${set.setNumber}</td><td>${set.weight || "—"}</td><td>${set.reps || "—"}</td><td>${set.completed ? "כן" : "לא"}</td></tr>`);
  }).join("");
  const html = `<html dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial;color:#17233a;padding:28px}h1{color:#d39400}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #cbd5e1;padding:7px;text-align:right;font-size:12px}th{background:#e8eef7}</style></head><body><h1>היסטוריית אימונים</h1><p>נוצר בתאריך ${new Date().toLocaleDateString("he-IL")}</p><table><tr><th>תאריך</th><th>אימון</th><th>תרגיל</th><th>סט</th><th>משקל</th><th>חזרות</th><th>הושלם</th></tr>${rows}</table></body></html>`;
  const result = await Print.printToFileAsync({ html });
  await shareFile(result.uri, "application/pdf", "שיתוף היסטוריית אימונים");
}

async function exportHistoryCsv(sessions: WorkoutSession[]) {
  if (!sessions.length) return Alert.alert("אין נתונים", "אין עדיין אימונים לייצוא.");
  const header = "תאריך,אימון,תרגיל,סט,משקל,חזרות,הושלם";
  const rows = sessions.flatMap((session) => {
    const template = getTemplate(session.templateId);
    return session.sets.map((set) => [dateText(session.startedAt), template.name, set.exerciseId, set.setNumber, set.weight || "", set.reps || "", set.completed ? "כן" : "לא"].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","));
  });
  const csv = `\\uFEFF${[header, ...rows].join("\\n")}`;
  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "workout-history.csv"; anchor.click(); URL.revokeObjectURL(url);
    return;
  }
  const uri = `${FileSystem.cacheDirectory}workout-history.csv`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(uri, "text/csv", "שיתוף היסטוריית אימונים CSV");
}

const dateText = (iso: string) => new Intl.DateTimeFormat("he-IL", { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));

export default function HistoryScreen() {
  const { sessions, templates } = useWorkoutStore();
  const [selectedId, setSelectedId] = useState<string | undefined>(sessions[0]?.id);
  const selected = sessions.find((session) => session.id === selectedId) ?? sessions[0];
  const previous = sessions[1];
  return (
    <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<>
          <View style={styles.heading}><Text style={styles.title}>היסטוריה</Text><Text style={styles.subtitle}>כל מה שביצעת נשמר כאן</Text><Pressable accessibilityRole="button" accessibilityLabel="פתח ניתוח עומסים והתקדמות" onPress={() => router.push("/(tabs)/analysis" as never)} style={({ pressed }) => [styles.analysisButton, pressed && styles.pressed]}><Text style={styles.analysisButtonText}>ניתוח עומסים והתקדמות ›</Text></Pressable><View style={styles.exportRow}><Pressable accessibilityRole="button" accessibilityLabel="ייצא היסטוריית אימונים ל־PDF" onPress={() => exportHistoryPdf(sessions)} style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}><Text style={styles.exportText}>PDF</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="ייצא היסטוריית אימונים ל־CSV" onPress={() => exportHistoryCsv(sessions)} style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}><Text style={styles.exportText}>CSV</Text></Pressable></View></View>
          {sessions.length > 1 && <View style={styles.focusCard}>
            <Text style={styles.focusTitle}>גישה מהירה לאימון קודם</Text>
            <View style={styles.tabRow}>
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: selected?.id === sessions[0]?.id }} onPress={() => setSelectedId(sessions[0]?.id)} style={[styles.tab, selected?.id === sessions[0]?.id && styles.tabActive]}><Text style={styles.tabText}>האימון האחרון</Text></Pressable>
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: selected?.id === previous?.id }} onPress={() => setSelectedId(previous?.id)} style={[styles.tab, selected?.id === previous?.id && styles.tabActive]}><Text style={styles.tabText}>האימון הקודם</Text></Pressable>
            </View>
            {selected && <SessionDetail session={selected} template={templates.find((item) => item.id === selected.templateId) ?? getTemplate(selected.templateId)} />}
          </View>}
        </>}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>עדיין אין אימונים</Text><Text style={styles.emptyText}>התחל אימון ראשון ממסך היום וההיסטוריה תתמלא אוטומטית.</Text></View>}
        renderItem={({ item }) => {
          const template = templates.find((candidate) => candidate.id === item.templateId) ?? getTemplate(item.templateId);
          const completed = item.sets.filter((set) => set.completed).length;
          return <Pressable accessibilityRole="button" onPress={() => setSelectedId(item.id)} style={({ pressed }) => [styles.card, pressed && styles.pressed, selected?.id === item.id && styles.cardSelected]}><View style={[styles.dot, { backgroundColor: template.accent }]} /><View style={styles.body}><View style={styles.row}><Text style={styles.date}>{dateText(item.startedAt)}</Text><Text style={styles.name}>{template.name}</Text></View><Text style={styles.meta}>{completed} סטים הושלמו · נפח {Math.round(calculateVolume(item))} ק״ג</Text><Text style={styles.openHint}>{selected?.id === item.id ? "מוצג למעלה" : "לחץ להצגת פרטי הסטים"}</Text></View></Pressable>;
        }}
      />
    </ScreenContainer>
  );
}

function SessionDetail({ session, template }: { session: WorkoutSession; template: ReturnType<typeof getTemplate> }) {
  const { updateSession, deleteSession } = useWorkoutStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session);
  useEffect(() => { setDraft(session); setEditing(false); }, [session]);
  const grouped = template.exercises.map((exercise) => ({ exercise, sets: draft.sets.filter((set) => set.exerciseId === exercise.id) })).filter((item) => item.sets.length);
  const updateDraftSet = (setId: string, patch: { weight?: string; reps?: string; completed?: boolean }) => setDraft((current) => ({ ...current, sets: current.sets.map((set) => set.id === setId ? { ...set, ...patch } : set) }));
  const save = () => { updateSession(session.id, { sets: draft.sets }); setEditing(false); };
  const remove = () => { const message = "האימון וכל הסטים שלו יימחקו מההיסטוריה. הפעולה אינה הפיכה."; if (Platform.OS === "web") { if (typeof window !== "undefined" && window.confirm(message)) deleteSession(session.id); return; } Alert.alert("מחיקת אימון", message, [{ text: "ביטול", style: "cancel" }, { text: "מחק", style: "destructive", onPress: () => deleteSession(session.id) }]); };
  return <ScrollView style={styles.detail} nestedScrollEnabled keyboardShouldPersistTaps="handled"><View style={styles.detailHeader}><Text style={styles.detailVolume}>{Math.round(calculateVolume(draft))} ק״ג</Text><View><Text style={styles.detailName}>{template.name}</Text><Text style={styles.detailDate}>{dateText(session.startedAt)}</Text></View></View><View style={styles.detailActions}>{editing ? <><Pressable accessibilityRole="button" accessibilityLabel="ביטול עריכת האימון" onPress={() => { setDraft(session); setEditing(false); }} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>ביטול</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="שמירת עריכת האימון" onPress={save} style={styles.primaryAction}><Text style={styles.primaryActionText}>שמור שינויים</Text></Pressable></> : <Pressable accessibilityRole="button" accessibilityLabel="ערוך אימון מההיסטוריה" onPress={() => setEditing(true)} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>ערוך אימון</Text></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel="מחק אימון מההיסטוריה" onPress={remove} style={styles.deleteAction}><Text style={styles.deleteText}>מחק</Text></Pressable></View>{grouped.map(({ exercise, sets }) => <View key={exercise.id} style={styles.exerciseBlock}><Text style={styles.exerciseName}>{exercise.name}</Text>{sets.map((set) => editing ? <View key={set.id} style={styles.editSetRow}><TextInput accessibilityLabel={`${exercise.name} סט ${set.setNumber} משקל`} value={set.weight} onChangeText={(value) => updateDraftSet(set.id, { weight: value })} keyboardType="decimal-pad" placeholder="ק״ג" placeholderTextColor="#7E8DA4" style={styles.editInput} /><Text style={styles.setLabel}>סט {set.setNumber}</Text><TextInput accessibilityLabel={`${exercise.name} סט ${set.setNumber} חזרות`} value={set.reps} onChangeText={(value) => updateDraftSet(set.id, { reps: value })} keyboardType="decimal-pad" placeholder="חזרות" placeholderTextColor="#7E8DA4" style={styles.editInput} /><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: set.completed }} onPress={() => updateDraftSet(set.id, { completed: !set.completed })} style={[styles.doneToggle, set.completed && styles.doneToggleActive]}><Text style={styles.doneToggleText}>{set.completed ? "✓" : "○"}</Text></Pressable></View> : <View key={set.id} accessibilityLabel={`${exercise.name}, סט ${set.setNumber}, ${set.weight || "ללא משקל"} קילוגרם, ${set.reps || "ללא"} חזרות`} style={styles.setRow}><Text style={styles.setValue}>{set.reps || "—"} חזרות</Text><Text style={styles.setLabel}>סט {set.setNumber}{set.completed ? " · ✓" : ""}</Text><Text style={styles.setValue}>{set.weight || "—"} ק״ג</Text></View>)}</View>)}</ScrollView>;
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingBottom: 30 }, analysisButton: { alignSelf: "stretch", backgroundColor: "#1C3152", borderColor: "#65BDF6", borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 10 }, analysisButtonText: { color: "#D9EEFF", fontSize: 12, fontWeight: "900" }, exportRow: { flexDirection: "row-reverse", gap: 8, marginTop: 10 }, exportButton: { backgroundColor: "#F5B72C", borderRadius: 9, paddingHorizontal: 16, paddingVertical: 8 }, exportText: { color: "#0B1224", fontWeight: "900", fontSize: 11 }, heading: { alignItems: "flex-end", marginBottom: 18 }, title: { color: "#F7F9FC", fontSize: 30, fontWeight: "800" }, subtitle: { color: "#AAB7C8", fontSize: 13, marginTop: 6 }, focusCard: { backgroundColor: "#1B3152", borderColor: "#3C6B9E", borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 2 }, focusTitle: { color: "#F5B72C", fontSize: 16, fontWeight: "900", textAlign: "right", marginBottom: 10 }, tabRow: { flexDirection: "row-reverse", gap: 8 }, tab: { flex: 1, borderColor: "#52759C", borderWidth: 1, borderRadius: 10, paddingVertical: 9, alignItems: "center" }, tabActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" }, tabText: { color: "#F7F9FC", fontSize: 11, fontWeight: "800" }, detail: { backgroundColor: "#0B1224", borderRadius: 14, padding: 12, marginTop: 12, maxHeight: 430 }, detailActions: { flexDirection: "row-reverse", gap: 7, marginTop: 10, flexWrap: "wrap" }, primaryAction: { backgroundColor: "#F5B72C", borderRadius: 8, paddingHorizontal: 11, paddingVertical: 8 }, primaryActionText: { color: "#0B1224", fontSize: 10, fontWeight: "900" }, secondaryAction: { borderColor: "#42D392", borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 }, secondaryActionText: { color: "#42D392", fontSize: 10, fontWeight: "900" }, deleteAction: { borderColor: "#D86582", borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 }, deleteText: { color: "#FF93AB", fontSize: 10, fontWeight: "900" }, editSetRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 5, backgroundColor: "#101A2D", borderRadius: 7, padding: 5, marginTop: 3 }, editInput: { flex: 1, minWidth: 54, color: "#F7F9FC", borderColor: "#52759C", borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 5, fontSize: 11, textAlign: "center" }, doneToggle: { borderColor: "#52759C", borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5 }, doneToggleActive: { backgroundColor: "#42D392", borderColor: "#42D392" }, doneToggleText: { color: "#F7F9FC", fontWeight: "900" }, detailHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderBottomColor: "#2C3B55", borderBottomWidth: 1, paddingBottom: 10, marginBottom: 4 }, detailName: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "right" }, detailDate: { color: "#AAB7C8", fontSize: 10, textAlign: "right", marginTop: 3 }, detailVolume: { color: "#42D392", fontSize: 15, fontWeight: "900" }, exerciseBlock: { borderBottomColor: "#263653", borderBottomWidth: 1, paddingVertical: 8 }, exerciseName: { color: "#F5B72C", fontSize: 12, fontWeight: "800", textAlign: "right", marginBottom: 5 }, setRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderRadius: 7, backgroundColor: "#101A2D", paddingHorizontal: 8, marginTop: 3 }, setLabel: { color: "#7E8DA4", fontSize: 10 }, setValue: { color: "#D9E2EF", fontSize: 10 }, card: { flexDirection: "row-reverse", alignItems: "center", padding: 16, backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18 }, cardSelected: { borderColor: "#F5B72C" }, pressed: { opacity: 0.76 }, dot: { width: 11, height: 11, borderRadius: 6, marginLeft: 12 }, body: { flex: 1, gap: 7 }, row: { flexDirection: "row-reverse", justifyContent: "space-between" }, name: { color: "#F7F9FC", fontSize: 17, fontWeight: "800" }, date: { color: "#AAB7C8", fontSize: 12 }, meta: { color: "#7E8DA4", fontSize: 12, textAlign: "right" }, openHint: { color: "#42D392", fontSize: 10, textAlign: "right" }, empty: { marginTop: 80, alignItems: "center", paddingHorizontal: 30 }, emptyTitle: { color: "#F7F9FC", fontSize: 19, fontWeight: "800" }, emptyText: { color: "#AAB7C8", textAlign: "center", lineHeight: 21, marginTop: 9 },
});
