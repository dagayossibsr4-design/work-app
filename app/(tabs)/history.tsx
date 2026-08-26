import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

import { ScreenContainer } from "@/components/screen-container";
import { libraryForWorkout, type ExerciseLibraryItem } from "@/lib/exercise-library";
import { addExerciseToHistorySession, addSetToHistoryExercise, removeExerciseFromHistorySession, removeSetFromHistorySession } from "@/lib/history-session-editor";
import { getTemplate } from "@/lib/workout-data";
import { calculateVolume, isCardioWorkoutTemplate, sortWorkoutSessionsNewestFirst, useWorkoutStore, type SetLog, type WorkoutSession } from "@/lib/workout-store";
import { categoryForTemplate } from "@/lib/session-comparison";
import { formatRestSeconds, techniqueTipForExercise } from "@/lib/workout-session-insights";
import { cardioPaceText, cardioTotalsForSets } from "@/lib/cardio-details";

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
    return session.sets.map((set) => `<tr><td>${dateTimeText(session.startedAt)}</td><td>${template.name}</td><td>${set.exerciseId}</td><td>${set.setNumber}</td><td>${set.weight || "—"}</td><td>${set.reps || "—"}</td><td>${formatRestSeconds(set.restSeconds)}</td><td>${set.note || "—"}</td><td>${set.completed ? "כן" : "לא"}</td></tr>`);
  }).join("");
  const html = `<html dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial;color:#17233a;padding:28px}h1{color:#d39400}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #cbd5e1;padding:7px;text-align:right;font-size:12px}th{background:#e8eef7}</style></head><body><h1>היסטוריית אימונים</h1><p>נוצר בתאריך ${new Date().toLocaleDateString("he-IL")}</p><table><tr><th>תאריך</th><th>אימון</th><th>תרגיל</th><th>סט</th><th>משקל</th><th>חזרות</th><th>מנוחה</th><th>הערה</th><th>הושלם</th></tr>${rows}</table></body></html>`;
  const result = await Print.printToFileAsync({ html });
  await shareFile(result.uri, "application/pdf", "שיתוף היסטוריית אימונים");
}

async function exportHistoryCsv(sessions: WorkoutSession[]) {
  if (!sessions.length) return Alert.alert("אין נתונים", "אין עדיין אימונים לייצוא.");
  const header = "תאריך,אימון,תרגיל,סט,משקל,חזרות,מנוחה,הערה,הושלם";
  const rows = sessions.flatMap((session) => {
    const template = getTemplate(session.templateId);
    return session.sets.map((set) => [dateTimeText(session.startedAt), template.name, set.exerciseId, set.setNumber, set.weight || "", set.reps || "", formatRestSeconds(set.restSeconds), set.note || "", set.completed ? "כן" : "לא"].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","));
  });
  const csv = `\uFEFF${[header, ...rows].join("\n")}`;
  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "workout-history.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }
  const uri = `${FileSystem.cacheDirectory}workout-history.csv`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(uri, "text/csv", "שיתוף היסטוריית אימונים CSV");
}

const dateTimeText = (iso: string) => new Intl.DateTimeFormat("he-IL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const historyDateKey = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const historyCalendarDays = (month: Date) => {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<number | null> = Array.from({ length: firstDay }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
};

export default function HistoryScreen() {
  const { sessions, templates } = useWorkoutStore();
  const { sessionId, edit, editDate } = useLocalSearchParams<{ sessionId?: string; edit?: string; editDate?: string }>();
  const orderedSessions = useMemo(() => sortWorkoutSessionsNewestFirst(sessions), [sessions]);
  const [selectedId, setSelectedId] = useState<string | undefined>(sessionId);

  useEffect(() => {
    if (sessionId) setSelectedId(sessionId);
  }, [sessionId]);

  const selected = orderedSessions.find((session) => session.id === selectedId) ?? orderedSessions[0];
  const previous = orderedSessions[1];

  return (
    <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
      <FlatList
        data={orderedSessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<>
          <View style={styles.heading}>
            <Text style={styles.title}>היסטוריה</Text>
            <Text style={styles.subtitle}>כל מה שביצעת נשמר כאן</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="פתח ניתוח עומסים והתקדמות" onPress={() => router.push("/(tabs)/analysis" as never)} style={({ pressed }) => [styles.analysisButton, pressed && styles.pressed]}><Text style={styles.analysisButtonText}>ניתוח עומסים והתקדמות ›</Text></Pressable>
            <View style={styles.exportRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="ייצא היסטוריית אימונים ל־PDF" onPress={() => exportHistoryPdf(orderedSessions)} style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}><Text style={styles.exportText}>PDF</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="ייצא היסטוריית אימונים ל־CSV" onPress={() => exportHistoryCsv(orderedSessions)} style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}><Text style={styles.exportText}>CSV</Text></Pressable>
            </View>
          </View>
          {selected ? <View style={styles.focusCard}>
            <Text style={styles.focusTitle}>{orderedSessions.length > 1 ? "גישה מהירה לאימון קודם" : "האימון האחרון שלך"}</Text>
            {orderedSessions.length > 1 ? <View style={styles.tabRow}>
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: selected.id === orderedSessions[0]?.id }} onPress={() => setSelectedId(orderedSessions[0]?.id)} style={[styles.tab, selected.id === orderedSessions[0]?.id && styles.tabActive]}><Text style={styles.tabText}>האימון האחרון</Text></Pressable>
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: selected.id === previous?.id }} onPress={() => setSelectedId(previous?.id)} style={[styles.tab, selected.id === previous?.id && styles.tabActive]}><Text style={styles.tabText}>האימון הקודם</Text></Pressable>
            </View> : null}
            <SessionDetail session={selected} template={templates.find((item) => item.id === selected.templateId) ?? getTemplate(selected.templateId)} openInEditMode={edit === "1" || editDate === "1"} />
          </View> : null}
        </>}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>עדיין אין אימונים</Text><Text style={styles.emptyText}>התחל אימון ראשון ממסך היום וההיסטוריה תתמלא אוטומטית.</Text></View>}
        renderItem={({ item }) => {
          const template = templates.find((candidate) => candidate.id === item.templateId) ?? getTemplate(item.templateId);
          const completed = item.sets.filter((set) => set.completed).length;
          return <Pressable accessibilityRole="button" onPress={() => setSelectedId(item.id)} style={({ pressed }) => [styles.card, pressed && styles.pressed, selected?.id === item.id && styles.cardSelected]}><View style={[styles.dot, { backgroundColor: template.accent }]} /><View style={styles.body}><View style={styles.row}><Text style={styles.date}>{dateTimeText(item.startedAt)}</Text><Text style={styles.name}>{template.name}</Text></View><Text style={styles.meta}>{completed} סטים הושלמו · נפח {Math.round(calculateVolume(item))} ק״ג</Text><Text style={styles.openHint}>{selected?.id === item.id ? "מוצג למעלה" : "לחץ להצגת פרטי הסטים"}</Text></View></Pressable>;
        }}
      />
    </ScreenContainer>
  );
}

function SessionDetail({ session, template, openInEditMode = false }: { session: WorkoutSession; template: ReturnType<typeof getTemplate>; openInEditMode?: boolean }) {
  const { updateSession, deleteSession, sessions } = useWorkoutStore();
  const [editing, setEditing] = useState(openInEditMode);
  const [draft, setDraft] = useState(session);
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(session.startedAt));
  const [customExerciseName, setCustomExerciseName] = useState("");
  const toDateInput = (iso: string) => iso.slice(0, 10);
  const withDate = (iso: string, date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return iso;
    const current = new Date(iso);
    const next = new Date(`${date}T${String(current.getHours()).padStart(2, "0")}:${String(current.getMinutes()).padStart(2, "0")}:00`);
    return Number.isNaN(next.getTime()) ? iso : next.toISOString();
  };
  const shiftDraftDate = (offset: number) => {
    setDraft((current) => {
      const date = new Date(current.startedAt);
      date.setDate(date.getDate() + offset);
      return Number.isNaN(date.getTime()) ? current : { ...current, startedAt: date.toISOString() };
    });
  };

  useEffect(() => {
    setDraft(session);
    setCalendarMonth(new Date(session.startedAt));
    setEditing(openInEditMode);
    setCalendarVisible(false);
    setExercisePickerVisible(false);
    setCustomExerciseName("");
  }, [session, openInEditMode]);

  const knownExerciseIds = new Set(template.exercises.map((exercise) => exercise.id));
  const isCardioSession = isCardioWorkoutTemplate(session.templateId);
  const cardioTotals = cardioTotalsForSets(draft.sets);
  const grouped = [
    ...template.exercises.map((exercise) => ({ exercise, sets: draft.sets.filter((set) => set.exerciseId === exercise.id) })),
    ...Array.from(new Set(draft.sets.filter((set) => !knownExerciseIds.has(set.exerciseId)).map((set) => set.exerciseId))).map((exerciseId) => ({ exercise: { id: exerciseId, name: exerciseId }, sets: draft.sets.filter((set) => set.exerciseId === exerciseId) })),
  ].filter((item) => item.sets.length);
  const availableExercises = libraryForWorkout(template.name).filter((item) => !grouped.some(({ exercise }) => exercise.name === item.name));
  const previousInSeries = sessions.filter((candidate) => candidate.templateId === session.templateId && candidate.id !== session.id && Date.parse(candidate.startedAt) < Date.parse(session.startedAt)).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];

  const updateDraftSet = (setId: string, patch: Partial<SetLog>) => setDraft((current) => ({ ...current, sets: current.sets.map((set) => set.id === setId ? { ...set, ...patch } : set) }));
  const addExerciseToDraft = (item: ExerciseLibraryItem | { name: string; defaultTarget: string }) => {
    const exerciseId = item.name.trim();
    if (!exerciseId) return;
    if (grouped.some(({ exercise }) => exercise.name === exerciseId)) {
      Alert.alert("התרגיל כבר קיים", "התרגיל הזה כבר מופיע באימון. אפשר להוסיף לו סט נוסף.");
      return;
    }
    setDraft((current) => addExerciseToHistorySession(current, exerciseId, item.defaultTarget));
    setExercisePickerVisible(false);
    setCustomExerciseName("");
  };
  const addSetToDraftExercise = (exerciseId: string) => {
    setDraft((current) => addSetToHistoryExercise(current, exerciseId));
  };
  const removeDraftSet = (set: SetLog) => {
    const remove = () => setDraft((current) => removeSetFromHistorySession(current, set));
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("למחוק את הסט הזה מהאימון?")) remove();
      return;
    }
    Alert.alert("מחיקת סט", "למחוק את הסט הזה מהאימון?", [{ text: "ביטול", style: "cancel" }, { text: "מחק", style: "destructive", onPress: remove }]);
  };
  const removeDraftExercise = (exerciseId: string, name: string) => {
    const remove = () => setDraft((current) => removeExerciseFromHistorySession(current, exerciseId));
    const message = `למחוק את ${name} וכל הסטים שלו מהאימון?`;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(message)) remove();
      return;
    }
    Alert.alert("מחיקת תרגיל", message, [{ text: "ביטול", style: "cancel" }, { text: "מחק", style: "destructive", onPress: remove }]);
  };
  const save = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(toDateInput(draft.startedAt))) return;
    updateSession(session.id, { startedAt: draft.startedAt, sets: draft.sets });
    setEditing(false);
    setCalendarVisible(false);
  };
  const chooseCalendarDate = (day: number) => {
    const nextDate = historyDateKey(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    setDraft((current) => ({ ...current, startedAt: withDate(current.startedAt, nextDate) }));
    setCalendarVisible(false);
  };
  const remove = () => {
    const message = "האימון וכל הסטים שלו יימחקו מההיסטוריה. הפעולה אינה הפיכה.";
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(message)) deleteSession(session.id);
      return;
    }
    Alert.alert("מחיקת אימון", message, [{ text: "ביטול", style: "cancel" }, { text: "מחק", style: "destructive", onPress: () => deleteSession(session.id) }]);
  };

  return (
    <ScrollView style={styles.detail} nestedScrollEnabled keyboardShouldPersistTaps="handled">
      <View style={styles.detailHeader}><Text style={styles.detailVolume}>{isCardioSession ? `${cardioTotals.minutes} דק׳` : `${Math.round(calculateVolume(draft))} ק״ג`}</Text><View><Text style={styles.detailName}>{template.name}</Text>{editing ? <View style={{ marginTop: 6, gap: 5 }}><Text style={{ color: "#AAB7C8", fontSize: 10, fontWeight: "800", textAlign: "right" }}>תאריך האימון</Text><View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 5 }}><Pressable accessibilityRole="button" onPress={() => shiftDraftDate(1)} style={{ borderColor: "#52759C", borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 6 }}><Text style={{ color: "#D9E2EF", fontSize: 9, fontWeight: "900" }}>+ יום</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="פתח לוח שנה לבחירת תאריך אימון" onPress={() => { setCalendarMonth(new Date(draft.startedAt)); setCalendarVisible(true); }} style={[styles.dateInput, { flex: 1, justifyContent: "center", marginTop: 0 }]}><Text style={{ color: "#F7F9FC", textAlign: "center", fontWeight: "800" }}>{toDateInput(draft.startedAt)}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => shiftDraftDate(-1)} style={{ borderColor: "#52759C", borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 6 }}><Text style={{ color: "#D9E2EF", fontSize: 9, fontWeight: "900" }}>יום −</Text></Pressable></View><Text style={{ color: "#7E8DA4", fontSize: 9, textAlign: "right" }}>לחץ על התאריך כדי לפתוח לוח שנה, או הזז ביום אחד.</Text></View> : <Text style={styles.detailDate}>{dateTimeText(draft.startedAt)}</Text>}</View></View>
      <View style={styles.detailActions}>
        {previousInSeries ? <Pressable accessibilityRole="button" accessibilityLabel="השווה לאימון קודם מאותה סדרה" onPress={() => router.push({ pathname: "/(tabs)/analysis", params: { templateId: session.templateId, baselineId: previousInSeries.id, currentId: session.id } } as never)} style={styles.compareAction}><Text style={styles.compareActionText}>השווה ל־{template.name} קודם</Text></Pressable> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="השווה לסדרה מקבילה באותה קטגוריה" onPress={() => router.push({ pathname: "/(tabs)/analysis", params: { category: categoryForTemplate(session.templateId) } } as never)} style={styles.compareAction}><Text style={styles.compareActionText}>השווה לסדרה מקבילה</Text></Pressable>
        {editing ? <><Pressable accessibilityRole="button" accessibilityLabel="ביטול עריכת האימון" onPress={() => { setDraft(session); setEditing(false); }} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>ביטול</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="שמירת עריכת האימון והתאריך" onPress={save} style={styles.primaryAction}><Text style={styles.primaryActionText}>שמור שינויים</Text></Pressable></> : <Pressable accessibilityRole="button" accessibilityLabel="ערוך אימון ותאריך מההיסטוריה" onPress={() => setEditing(true)} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>ערוך אימון ותאריך</Text></Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel="מחק אימון מההיסטוריה" onPress={remove} style={styles.deleteAction}><Text style={styles.deleteText}>מחק</Text></Pressable>
      </View>
      {editing && !isCardioSession ? <Pressable accessibilityRole="button" accessibilityLabel="הוסף תרגיל לאימון שבוצע" onPress={() => setExercisePickerVisible(true)} style={styles.addExerciseButton}><Text style={styles.addExerciseText}>＋ הוסף תרגיל</Text></Pressable> : null}
      {isCardioSession ? <CardioSessionBlocks sets={draft.sets} editing={editing} onUpdate={updateDraftSet} onRemove={removeDraftSet} /> : grouped.map(({ exercise, sets }) => <View key={exercise.id} style={styles.exerciseBlock}><Text style={styles.exerciseName}>{exercise.name}</Text>{techniqueTipForExercise(exercise.name) ? <Text style={styles.techniqueTip}>טכניקה: {techniqueTipForExercise(exercise.name)}</Text> : null}{editing ? <View style={styles.exerciseEditActions}><Pressable accessibilityRole="button" accessibilityLabel={`הוסף סט ל${exercise.name}`} onPress={() => addSetToDraftExercise(exercise.id)} style={styles.addSetButton}><Text style={styles.addSetText}>＋ סט</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`מחק את ${exercise.name}`} onPress={() => removeDraftExercise(exercise.id, exercise.name)} style={styles.removeExerciseButton}><Text style={styles.removeExerciseText}>מחק תרגיל</Text></Pressable></View> : null}{sets.map((set) => editing ? <View key={set.id} style={styles.editSetRow}><TextInput accessibilityLabel={`${exercise.name} סט ${set.setNumber} משקל`} value={set.weight} onChangeText={(value) => updateDraftSet(set.id, { weight: value })} keyboardType="decimal-pad" placeholder="ק״ג" placeholderTextColor="#7E8DA4" style={styles.editInput} /><Text style={styles.setLabel}>סט {set.setNumber}</Text><TextInput accessibilityLabel={`${exercise.name} סט ${set.setNumber} חזרות`} value={set.reps} onChangeText={(value) => updateDraftSet(set.id, { reps: value })} keyboardType="decimal-pad" placeholder="חזרות" placeholderTextColor="#7E8DA4" style={styles.editInput} /><TextInput accessibilityLabel={`${exercise.name} סט ${set.setNumber} מנוחה בשניות`} value={set.restSeconds ? String(set.restSeconds) : ""} onChangeText={(value) => updateDraftSet(set.id, { restSeconds: Number(value) || 0 })} keyboardType="numeric" placeholder="מנוחה (שנ׳)" placeholderTextColor="#7E8DA4" style={styles.editInput} /><TextInput accessibilityLabel={`${exercise.name} סט ${set.setNumber} הערה`} value={set.note ?? ""} onChangeText={(value) => updateDraftSet(set.id, { note: value })} placeholder="הערה" placeholderTextColor="#7E8DA4" style={styles.editInput} /><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: set.completed }} onPress={() => updateDraftSet(set.id, { completed: !set.completed })} style={[styles.doneToggle, set.completed && styles.doneToggleActive]}><Text style={styles.doneToggleText}>{set.completed ? "✓" : "○"}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`מחק סט ${set.setNumber}`} onPress={() => removeDraftSet(set)} style={styles.removeSetButton}><Text style={styles.removeSetText}>−</Text></Pressable></View> : <View key={set.id} accessibilityLabel={`${exercise.name}, סט ${set.setNumber}, ${set.weight || "ללא משקל"} קילוגרם, ${set.reps || "ללא"} חזרות`} style={styles.setRow}><Text style={styles.setValue}>{set.reps || "—"} חזרות</Text><View style={styles.setCenter}><Text style={styles.setLabel}>סט {set.setNumber}{set.completed ? " · ✓" : ""}</Text><Text style={styles.restValue}>{formatRestSeconds(set.restSeconds)}</Text>{set.note ? <Text style={styles.noteValue}>{set.note}</Text> : null}</View><Text style={styles.setValue}>{set.weight || "—"} ק״ג</Text></View>)}</View>)}
      <Modal visible={calendarVisible} transparent animationType="fade" onRequestClose={() => setCalendarVisible(false)}><View style={styles.modalBottomBackdrop}><View style={styles.exercisePicker}><Text style={styles.modalTitle}>בחירת תאריך אימון</Text><View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginVertical: 12 }}><Pressable onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} style={styles.compareAction}><Text style={styles.compareActionText}>חודש קודם</Text></Pressable><Text style={styles.detailName}>{new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(calendarMonth)}</Text><Pressable onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} style={styles.compareAction}><Text style={styles.compareActionText}>חודש הבא</Text></Pressable></View><View style={{ flexDirection: "row-reverse", justifyContent: "space-around", marginBottom: 6 }}>{["שבת", "ו׳", "ה׳", "ד׳", "ג׳", "ב׳", "א׳"].map((day) => <Text key={day} style={{ color: "#AAB7C8", fontSize: 10, width: 32, textAlign: "center" }}>{day}</Text>)}</View>{historyCalendarDays(calendarMonth).map((row, rowIndex) => <View key={rowIndex} style={{ flexDirection: "row-reverse", justifyContent: "space-around", marginBottom: 6 }}>{row.map((day, index) => day === null ? <View key={`${rowIndex}-${index}`} style={{ width: 32, height: 32 }} /> : <Pressable key={`${rowIndex}-${index}`} onPress={() => chooseCalendarDate(day)} style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: toDateInput(draft.startedAt) === historyDateKey(calendarMonth.getFullYear(), calendarMonth.getMonth(), day) ? "#F5B72C" : "#253653" }}><Text style={{ color: toDateInput(draft.startedAt) === historyDateKey(calendarMonth.getFullYear(), calendarMonth.getMonth(), day) ? "#0B1224" : "#F7F9FC", fontWeight: "800" }}>{day}</Text></Pressable>)}</View>)}<Pressable onPress={() => setCalendarVisible(false)} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>סגור</Text></Pressable></View></View></Modal>
      <Modal visible={exercisePickerVisible} transparent animationType="slide" onRequestClose={() => setExercisePickerVisible(false)}><View style={styles.modalBottomBackdrop}><View style={styles.exercisePicker}><View style={styles.exercisePickerHeader}><Text style={styles.modalTitle}>הוספת תרגיל לאימון שבוצע</Text><Pressable onPress={() => setExercisePickerVisible(false)}><Text style={styles.closeText}>סגור</Text></Pressable></View><Text style={styles.modalHint}>התרגיל והסטים החדשים יתווספו לאימון הזה בלבד. תוכנית האימונים הקבועה לא תשתנה.</Text><TextInput value={customExerciseName} onChangeText={setCustomExerciseName} placeholder="שם תרגיל מותאם" placeholderTextColor="#8291A8" style={styles.customInput} textAlign="right" /><Pressable accessibilityRole="button" accessibilityLabel="הוסף תרגיל מותאם לאימון שבוצע" onPress={() => addExerciseToDraft({ name: customExerciseName, defaultTarget: "8–12" })} style={styles.modalPrimaryButton}><Text style={styles.modalPrimaryText}>הוסף תרגיל מותאם</Text></Pressable><ScrollView style={styles.exerciseList} keyboardShouldPersistTaps="handled">{availableExercises.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`הוסף ${item.name} לאימון`} onPress={() => addExerciseToDraft(item)} style={styles.libraryExercise}><View><Text style={styles.libraryName}>{item.name}</Text><Text style={styles.libraryMeta}>{item.englishName} · {item.defaultTarget}</Text></View><Text style={styles.libraryPlus}>＋</Text></Pressable>)}</ScrollView></View></View></Modal>
    </ScrollView>
  );
}

function CardioSessionBlocks({ sets, editing, onUpdate, onRemove }: { sets: SetLog[]; editing: boolean; onUpdate: (setId: string, patch: Partial<SetLog>) => void; onRemove: (set: SetLog) => void }) {
  const totals = cardioTotalsForSets(sets);
  return <View style={styles.cardioSession}><Text style={styles.cardioSessionTitle}>פירוט האירובי שבוצע</Text><View style={styles.cardioSummary}><Text style={styles.cardioSummaryText}>{totals.minutes} דקות</Text><Text style={styles.cardioSummaryText}>{totals.distanceKm.toFixed(2)} ק״מ</Text><Text style={styles.cardioSummaryText}>{totals.averageSpeedKph ? `${totals.averageSpeedKph.toFixed(1)} קמ״ש` : "מהירות לא הוזנה"}</Text><Text style={styles.cardioSummaryText}>{cardioPaceText(totals.paceSecondsPerKm)}</Text></View>{sets.map((set) => <View key={set.id} style={styles.cardioSegment}><View style={styles.cardioSegmentHeader}><Text style={styles.cardioSegmentTitle}>מקטע {set.setNumber}{set.completed ? " · הושלם ✓" : ""}</Text>{editing ? <Pressable accessibilityRole="button" accessibilityLabel={`מחק מקטע ${set.setNumber}`} onPress={() => onRemove(set)} style={styles.removeSetButton}><Text style={styles.removeSetText}>−</Text></Pressable> : null}</View>{editing ? <><View style={styles.cardioEditRow}><TextInput value={set.reps} onChangeText={(reps) => onUpdate(set.id, { reps })} keyboardType="decimal-pad" placeholder="דקות" placeholderTextColor="#7E8DA4" style={styles.editInput} /><TextInput value={set.weight} onChangeText={(weight) => onUpdate(set.id, { weight })} keyboardType="decimal-pad" placeholder="ק״מ" placeholderTextColor="#7E8DA4" style={styles.editInput} /><TextInput value={set.cardio?.speedKph ?? ""} onChangeText={(speedKph) => onUpdate(set.id, { cardio: { ...set.cardio, speedKph } })} keyboardType="decimal-pad" placeholder="קמ״ש" placeholderTextColor="#7E8DA4" style={styles.editInput} /></View><View style={styles.cardioEditRow}><TextInput value={set.cardio?.incline ?? ""} onChangeText={(incline) => onUpdate(set.id, { cardio: { ...set.cardio, incline } })} keyboardType="decimal-pad" placeholder="שיפוע %" placeholderTextColor="#7E8DA4" style={styles.editInput} /><TextInput value={set.cardio?.heartRate ?? ""} onChangeText={(heartRate) => onUpdate(set.id, { cardio: { ...set.cardio, heartRate } })} keyboardType="numeric" placeholder="דופק" placeholderTextColor="#7E8DA4" style={styles.editInput} /><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: set.completed }} onPress={() => onUpdate(set.id, { completed: !set.completed })} style={[styles.doneToggle, set.completed && styles.doneToggleActive]}><Text style={styles.doneToggleText}>{set.completed ? "✓" : "○"}</Text></Pressable></View><View style={styles.cardioIntensityRow}>{(["קלילה", "בינונית", "גבוהה"] as const).map((intensity) => <Pressable key={intensity} onPress={() => onUpdate(set.id, { cardio: { ...set.cardio, intensity } })} style={[styles.cardioIntensity, set.cardio?.intensity === intensity && styles.cardioIntensityActive]}><Text style={[styles.cardioIntensityText, set.cardio?.intensity === intensity && styles.cardioIntensityTextActive]}>{intensity}</Text></Pressable>)}</View><TextInput value={set.note ?? ""} onChangeText={(note) => onUpdate(set.id, { note })} placeholder="הערה" placeholderTextColor="#7E8DA4" style={styles.editInput} /></> : <><Text style={styles.cardioSegmentMeta}>{set.reps || "—"} דקות · {set.weight || "—"} ק״מ · {set.cardio?.speedKph ? `${set.cardio.speedKph} קמ״ש` : cardioPaceText(Number(set.reps) > 0 && Number(set.weight) > 0 ? Math.round((Number(set.reps) * 60) / Number(set.weight)) : null)}</Text><Text style={styles.cardioSegmentMeta}>{set.cardio?.intensity ?? "עצימות לא הוזנה"}{set.cardio?.incline ? ` · שיפוע ${set.cardio.incline}%` : ""}{set.cardio?.heartRate ? ` · דופק ${set.cardio.heartRate}` : ""}</Text>{set.note ? <Text style={styles.noteValue}>{set.note}</Text> : null}</>}</View>)}</View>;
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingBottom: 30 }, analysisButton: { alignSelf: "stretch", backgroundColor: "#1C3152", borderColor: "#65BDF6", borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 10 }, analysisButtonText: { color: "#D9EEFF", fontSize: 12, fontWeight: "900" }, exportRow: { flexDirection: "row-reverse", gap: 8, marginTop: 10 }, exportButton: { backgroundColor: "#F5B72C", borderRadius: 9, paddingHorizontal: 16, paddingVertical: 8 }, exportText: { color: "#0B1224", fontWeight: "900", fontSize: 11 }, heading: { alignItems: "flex-end", marginBottom: 18 }, title: { color: "#F7F9FC", fontSize: 30, fontWeight: "800" }, subtitle: { color: "#AAB7C8", fontSize: 13, marginTop: 6 }, focusCard: { backgroundColor: "#1B3152", borderColor: "#3C6B9E", borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 2 }, focusTitle: { color: "#F5B72C", fontSize: 16, fontWeight: "900", textAlign: "right", marginBottom: 10 }, tabRow: { flexDirection: "row-reverse", gap: 8 }, tab: { flex: 1, borderColor: "#52759C", borderWidth: 1, borderRadius: 10, paddingVertical: 9, alignItems: "center" }, tabActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" }, tabText: { color: "#F7F9FC", fontSize: 11, fontWeight: "800" }, detail: { backgroundColor: "#0B1224", borderRadius: 14, padding: 12, marginTop: 12, maxHeight: 500 }, detailActions: { flexDirection: "row-reverse", gap: 7, marginTop: 10, flexWrap: "wrap" }, primaryAction: { backgroundColor: "#F5B72C", borderRadius: 8, paddingHorizontal: 11, paddingVertical: 8 }, primaryActionText: { color: "#0B1224", fontSize: 10, fontWeight: "900" }, secondaryAction: { borderColor: "#42D392", borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 }, secondaryActionText: { color: "#42D392", fontSize: 10, fontWeight: "900" }, compareAction: { borderColor: "#65BDF6", borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 }, compareActionText: { color: "#8FD3F4", fontSize: 10, fontWeight: "900" }, deleteAction: { borderColor: "#D86582", borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 }, deleteText: { color: "#FF93AB", fontSize: 10, fontWeight: "900" }, addExerciseButton: { backgroundColor: "#F5B72C", borderRadius: 9, paddingVertical: 10, alignItems: "center", marginTop: 11 }, addExerciseText: { color: "#0B1224", fontSize: 12, fontWeight: "900" }, exerciseEditActions: { flexDirection: "row-reverse", gap: 6, marginBottom: 5, flexWrap: "wrap" }, addSetButton: { borderColor: "#65BDF6", borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, alignSelf: "flex-start" }, addSetText: { color: "#8FD3F4", fontSize: 10, fontWeight: "900" }, removeExerciseButton: { borderColor: "#D86582", borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, alignSelf: "flex-start" }, removeExerciseText: { color: "#FF93AB", fontSize: 10, fontWeight: "900" }, editSetRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 5, backgroundColor: "#101A2D", borderRadius: 7, padding: 5, marginTop: 3 }, editInput: { flex: 1, minWidth: 48, color: "#F7F9FC", borderColor: "#52759C", borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 5, fontSize: 11, textAlign: "center" }, doneToggle: { borderColor: "#52759C", borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 5 }, doneToggleActive: { backgroundColor: "#42D392", borderColor: "#42D392" }, doneToggleText: { color: "#F7F9FC", fontWeight: "900" }, removeSetButton: { width: 27, height: 27, borderRadius: 14, backgroundColor: "#3A2028", alignItems: "center", justifyContent: "center" }, removeSetText: { color: "#FF93AB", fontSize: 18, fontWeight: "900", lineHeight: 20 }, detailHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderBottomColor: "#2C3B55", borderBottomWidth: 1, paddingBottom: 10, marginBottom: 4 }, detailName: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "right" }, detailDate: { color: "#AAB7C8", fontSize: 10, textAlign: "right", marginTop: 3 }, dateInput: { color: "#F5B72C", borderColor: "#52759C", borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, textAlign: "right", marginTop: 5, minWidth: 120 }, detailVolume: { color: "#42D392", fontSize: 15, fontWeight: "900" }, exerciseBlock: { borderBottomColor: "#263653", borderBottomWidth: 1, paddingVertical: 8 }, exerciseName: { color: "#F5B72C", fontSize: 12, fontWeight: "800", textAlign: "right", marginBottom: 3 }, techniqueTip: { color: "#AAB7C8", fontSize: 10, textAlign: "right", lineHeight: 15, marginBottom: 5 }, setRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 7, borderRadius: 7, backgroundColor: "#101A2D", paddingHorizontal: 8, marginTop: 3 }, setCenter: { alignItems: "center", flex: 1 }, setLabel: { color: "#7E8DA4", fontSize: 10 }, setValue: { color: "#D9E2EF", fontSize: 10, width: 62, textAlign: "center" }, restValue: { color: "#65BDF6", fontSize: 9, marginTop: 2 }, noteValue: { color: "#F5B72C", fontSize: 9, marginTop: 2, textAlign: "center" }, cardioSession: { backgroundColor: "#102E2A", borderColor: "#367B68", borderWidth: 1, borderRadius: 10, padding: 9, gap: 7, marginTop: 8 }, cardioSessionTitle: { color: "#8AE6CF", fontSize: 12, fontWeight: "900", textAlign: "right" }, cardioSummary: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 }, cardioSummaryText: { color: "#D4F8EE", fontSize: 9, fontWeight: "800", backgroundColor: "#163B36", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4 }, cardioSegment: { borderTopColor: "#367B68", borderTopWidth: 1, paddingTop: 7, gap: 4 }, cardioSegmentHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }, cardioSegmentTitle: { color: "#F7F9FC", fontSize: 11, fontWeight: "900", textAlign: "right" }, cardioSegmentMeta: { color: "#B8EADD", fontSize: 10, textAlign: "right", lineHeight: 16 }, cardioEditRow: { flexDirection: "row-reverse", gap: 5 }, cardioIntensityRow: { flexDirection: "row-reverse", gap: 5 }, cardioIntensity: { flex: 1, borderColor: "#3C7D70", borderWidth: 1, borderRadius: 6, paddingVertical: 5, alignItems: "center" }, cardioIntensityActive: { backgroundColor: "#42D392", borderColor: "#42D392" }, cardioIntensityText: { color: "#B8EADD", fontSize: 9, fontWeight: "900" }, cardioIntensityTextActive: { color: "#09221D" }, card: { flexDirection: "row-reverse", alignItems: "center", padding: 16, backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18 }, cardSelected: { borderColor: "#F5B72C" }, pressed: { opacity: 0.76 }, dot: { width: 11, height: 11, borderRadius: 6, marginLeft: 12 }, body: { flex: 1, gap: 7 }, row: { flexDirection: "row-reverse", justifyContent: "space-between" }, name: { color: "#F7F9FC", fontSize: 17, fontWeight: "800" }, date: { color: "#AAB7C8", fontSize: 12 }, meta: { color: "#7E8DA4", fontSize: 12, textAlign: "right" }, openHint: { color: "#42D392", fontSize: 10, textAlign: "right" }, empty: { marginTop: 80, alignItems: "center", paddingHorizontal: 30 }, emptyTitle: { color: "#F7F9FC", fontSize: 19, fontWeight: "800" }, emptyText: { color: "#AAB7C8", textAlign: "center", lineHeight: 21, marginTop: 9 }, modalBottomBackdrop: { flex: 1, backgroundColor: "rgba(5,10,24,0.8)", justifyContent: "flex-end" }, exercisePicker: { maxHeight: "80%", backgroundColor: "#16233A", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 15, gap: 9, borderColor: "#5B9FE3", borderWidth: 1 }, exercisePickerHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, modalTitle: { color: "#F7F9FC", fontSize: 18, fontWeight: "900", textAlign: "right" }, closeText: { color: "#F5B72C", fontSize: 13, fontWeight: "900" }, modalHint: { color: "#AAB7C8", fontSize: 10, textAlign: "right", lineHeight: 16 }, customInput: { minHeight: 42, borderColor: "#3F76A7", borderWidth: 1, borderRadius: 9, backgroundColor: "#0B1224", color: "#F7F9FC", paddingHorizontal: 10 }, modalPrimaryButton: { minHeight: 42, backgroundColor: "#F5B72C", borderRadius: 9, alignItems: "center", justifyContent: "center" }, modalPrimaryText: { color: "#0B1224", fontSize: 11, fontWeight: "900" }, exerciseList: { maxHeight: 260 }, libraryExercise: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderTopColor: "#2C3B55", borderTopWidth: 1 }, libraryName: { color: "#F7F9FC", fontSize: 13, fontWeight: "800", textAlign: "right" }, libraryMeta: { color: "#8291A8", fontSize: 10, textAlign: "right", marginTop: 2 }, libraryPlus: { color: "#F5B72C", fontSize: 22, fontWeight: "900" },
});
