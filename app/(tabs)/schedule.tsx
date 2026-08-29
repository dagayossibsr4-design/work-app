import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { completedWorkoutHistoryRoute } from "@/lib/completed-workout-route";
import { isCardioWorkoutTemplate, splitSessionsForWorkoutDate, useWorkoutStore, type WorkoutSession } from "@/lib/workout-store";
import { completedSessionForScheduleDay } from "@/lib/schedule-session";
import type { WorkoutId, WorkoutTemplate } from "@/lib/workout-data";
import { APP_TIME_ZONE, localDateKey, sundayWeekStart } from "@/lib/calendar-grid";

const SCHEDULE_KEY = "workout-schedule-overrides-v1";
const CYCLE_START = "2026-08-13";

type PlanKind = "workout" | "cardio" | "rest";
type CycleEntry = { kind: PlanKind; templateId?: WorkoutId; label: string; focus: string };
type Override = Partial<CycleEntry> & { cardioTemplateId?: WorkoutId };
type ScheduledDay = CycleEntry & { date: string; dayName: string; cardioTemplateId?: WorkoutId };

const cycle: CycleEntry[] = [
  { kind: "workout", templateId: "pull1", label: "PULL 1", focus: "גב, כתף אחורית ויד קדמית" },
  { kind: "rest", label: "חופש מוחלט", focus: "מנוחה והתאוששות מלאה" },
  { kind: "workout", templateId: "push1", label: "PUSH 1", focus: "חזה, כתפיים, יד אחורית ובטן" },
  { kind: "workout", templateId: "legs1", label: "LEGS 1", focus: "ארבע־ראשי ובטן" },
  { kind: "workout", templateId: "pull2", label: "PULL 2", focus: "גב, כתף אחורית ויד קדמית" },
  { kind: "cardio", label: "אירובי בלבד", focus: "אירובי והתאוששות פעילה" },
  { kind: "workout", templateId: "push2", label: "PUSH 2", focus: "חזה Rest-Pause, כתפיים ויד אחורית" },
  { kind: "workout", templateId: "legs2", label: "LEGS 2", focus: "המסטרינג, ישבן ובטן" },
  { kind: "rest", label: "חופש מוחלט", focus: "מנוחה והתאוששות מלאה" },
];
const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function addDays(date: string, amount: number) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString().slice(0, 10);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", timeZone: APP_TIME_ZONE }).format(new Date(`${date}T12:00:00Z`));
}

function dayIndex(date: string) {
  return Math.max(0, Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${CYCLE_START}T12:00:00Z`)) / 86400000));
}

function sessionTime(session: WorkoutSession) {
  return new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" }).format(new Date(session.startedAt));
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { demoFuture } = useLocalSearchParams<{ demoFuture?: string }>();
  const { templates, sessions, updateTemplate, startWorkoutOnDate } = useWorkoutStore();
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [weekStart, setWeekStart] = useState(() => sundayWeekStart(new Date()));
  const [manualWeekNavigation, setManualWeekNavigation] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [editing, setEditing] = useState(false);
  const [futurePreviewDay, setFuturePreviewDay] = useState<ScheduledDay | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(SCHEDULE_KEY).then((value) => {
      if (value) setOverrides(JSON.parse(value) as Record<string, Override>);
    });
  }, []);
  useEffect(() => {
    const refreshCurrentWeek = () => {
      if (manualWeekNavigation) return;
      const today = new Date();
      const todayKey = localDateKey(today);
      const currentWeekStart = sundayWeekStart(today);
      setSelectedDate((current) => current === todayKey ? current : todayKey);
      setWeekStart((current) => current === currentWeekStart ? current : currentWeekStart);
    };
    refreshCurrentWeek();
    const timer = setInterval(refreshCurrentWeek, 60 * 1000);
    return () => clearInterval(timer);
  }, [manualWeekNavigation]);

  useEffect(() => { void AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(overrides)); }, [overrides]);

  const week = useMemo<ScheduledDay[]>(() => Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const base = cycle[dayIndex(date) % cycle.length];
    const override = overrides[date] ?? {};
    return {
      date,
      dayName: dayNames[index],
      label: override.label ?? base.label,
      focus: override.focus ?? base.focus,
      kind: override.kind ?? base.kind,
      templateId: override.templateId ?? base.templateId,
      cardioTemplateId: override.cardioTemplateId,
    };
  }), [overrides, weekStart]);

  const selected = week.find((day) => day.date === selectedDate) ?? week[0];
  const strengthTemplates = templates.filter((template) => !isCardioWorkoutTemplate(template.id));
  const cardioTemplates = templates.filter((template) => isCardioWorkoutTemplate(template.id));
  const template = selected.templateId ? templates.find((item) => item.id === selected.templateId) : undefined;
  const plannedCardioTemplate = selected.cardioTemplateId ? templates.find((item) => item.id === selected.cardioTemplateId) : undefined;
  const selectedSessions = splitSessionsForWorkoutDate(sessions, selected.date);
  const completedStrengthSessions = selectedSessions.strength;
  const completedCardioSessions = selectedSessions.cardio;
  const demoTemplate = templates.find((item) => item.id === "push1") ?? strengthTemplates[0];
  const demoFuturePreviewDay: ScheduledDay | null = demoFuture === "1" && demoTemplate
    ? { date: selected.date, dayName: selected.dayName, kind: "workout", templateId: demoTemplate.id, label: demoTemplate.name, focus: demoTemplate.focus }
    : null;
  const visibleFuturePreviewDay = futurePreviewDay ?? demoFuturePreviewDay;

  const patchSelected = (patch: Override) => {
    setOverrides((current) => ({ ...current, [selected.date]: { ...current[selected.date], ...patch } }));
  };
  const chooseTemplate = (next: WorkoutTemplate) => patchSelected({ kind: "workout", templateId: next.id, label: next.name, focus: next.focus });
  const updateExerciseName = (exerciseId: string, name: string) => {
    if (!template) return;
    updateTemplate(template.id, { exercises: template.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, name } : exercise) });
  };
  const updateTarget = (exerciseId: string, setIndex: number, target: string) => {
    if (!template) return;
    updateTemplate(template.id, { exercises: template.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, sets: exercise.sets.map((set, index) => index === setIndex ? { ...set, target } : set) } : exercise) });
  };
  const addSet = (exerciseId: string) => {
    if (!template) return;
    updateTemplate(template.id, { exercises: template.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, sets: [...exercise.sets, { target: "8–12" }] } : exercise) });
  };
  const removeSet = (exerciseId: string, setIndex: number) => {
    if (!template) return;
    updateTemplate(template.id, { exercises: template.exercises.map((exercise) => exercise.id === exerciseId && exercise.sets.length > 1 ? { ...exercise, sets: exercise.sets.filter((_, index) => index !== setIndex) } : exercise) });
  };
  const startForSelectedDate = (templateId: WorkoutId) => {
    startWorkoutOnDate(templateId, selected.date);
    router.push({ pathname: "/active-workout", params: { templateId, scheduledDate: selected.date } } as never);
  };
  const openCompletedSession = (sessionId: string, editDate = false) => router.push(completedWorkoutHistoryRoute(sessionId, editDate ? { editDate: "1" } : undefined) as never);
  const sessionName = (session: WorkoutSession) => templates.find((item) => item.id === session.templateId)?.name ?? "אימון ללא שם";
  const openDay = (day: ScheduledDay) => {
    const completedSession = completedSessionForScheduleDay(sessions, day.date, day.kind);
    if (completedSession) {
      openCompletedSession(completedSession.id);
      return;
    }
    setSelectedDate(day.date);
    setEditing(false);
    setFuturePreviewDay(day.kind === "workout" && day.templateId ? day : null);
  };

  return (
    <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>יומן אימונים · לוח</Text>
          <Text style={styles.title}>לוח האימונים שלי</Text>
          <Text style={styles.subtitle}>אפשר לתכנן ולתעד כוח ואירובי באותו יום, כשני אימונים נפרדים.</Text>
        </View>

        <View style={styles.weekHeader}>
          <Pressable onPress={() => { const previous = addDays(weekStart, -7); setManualWeekNavigation(true); setWeekStart(previous); setSelectedDate(previous); }} style={styles.navButton}><Text style={styles.navText}>‹</Text></Pressable>
          <View><Text style={styles.weekTitle}>שבוע מתוכנן</Text><Text style={styles.weekRange}>{formatDate(week[0].date)} – {formatDate(week[6].date)}</Text></View>
          <Pressable onPress={() => { const next = addDays(weekStart, 7); setManualWeekNavigation(true); setWeekStart(next); setSelectedDate(next); }} style={styles.navButton}><Text style={styles.navText}>›</Text></Pressable>
        </View>

        <View style={styles.days}>
          {week.map((day) => {
            const daySessions = splitSessionsForWorkoutDate(sessions, day.date);
            const dayStrength = daySessions.strength.length;
            const dayCardio = daySessions.cardio.length;
            const hasCompletedWorkout = day.kind !== "rest" && daySessions.all.length > 0;
            const hasPendingWorkout = day.kind !== "rest" && !hasCompletedWorkout;
            return (
              <Pressable key={day.date} accessibilityRole="button" accessibilityLabel={daySessions.all.length ? `הצג מה בוצע ב${day.label} בתאריך ${formatDate(day.date)}` : `פתח את ${day.label} בתאריך ${formatDate(day.date)}`} onPress={() => openDay(day)} style={[styles.dayCard, selected.date === day.date && styles.dayCardActive, day.kind === "rest" && styles.dayRest, day.kind === "cardio" && styles.dayCardio, hasCompletedWorkout && styles.dayCompleted, hasPendingWorkout && styles.dayPending]}>
                <View style={styles.dayCardHeading}><Text style={[styles.dayDate, selected.date === day.date && !hasPendingWorkout && styles.dayDateActive, hasPendingWorkout && styles.dayPendingText]}>{formatDate(day.date)}</Text><Text style={[styles.dayName, hasPendingWorkout && styles.dayPendingText]}>{day.dayName}</Text></View>
                <Text style={[styles.dayLabel, selected.date === day.date && !hasPendingWorkout && styles.dayLabelActive, hasPendingWorkout && styles.dayPendingText]}>{day.label}</Text>
                <Text style={[styles.dayFocus, selected.date === day.date && !hasPendingWorkout && styles.dayFocusActive, hasPendingWorkout && styles.dayPendingText]} numberOfLines={2}>{day.focus}</Text>
                {day.cardioTemplateId ? <Text style={[styles.cardioAttached, selected.date === day.date && !hasPendingWorkout && styles.cardioAttachedActive, hasPendingWorkout && styles.dayPendingText]}>+ אירובי מצורף</Text> : null}
                {hasCompletedWorkout ? <Text style={styles.dayStatusCompleted}>✓ האימון בוצע</Text> : hasPendingWorkout ? <Text style={styles.dayStatusPending}>● טרם בוצע</Text> : null}
                {daySessions.all.length > 0 ? <Text style={[styles.daySessions, selected.date === day.date && styles.daySessionsActive]}>נשמרו: {dayStrength ? `${dayStrength} כוח` : ""}{dayStrength && dayCardio ? " · " : ""}{dayCardio ? `${dayCardio} אירובי` : ""}</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View><Text style={styles.detailLabel}>{selected.dayName} · {formatDate(selected.date)}</Text><Text style={styles.detailTitle}>{selected.label}</Text></View>
            <Text style={styles.statusBadge}>{selected.kind === "rest" ? "מנוחה" : selected.kind === "cardio" ? "אירובי" : "אימון כוח"}</Text>
          </View>
          <Text style={styles.detailFocus}>{selected.focus}</Text>

          {selected.kind === "workout" && template ? <>
            <View style={styles.sessionSection}>
              <View style={styles.sessionHeading}><Text style={styles.sessionCounter}>{completedStrengthSessions.length} תועדו</Text><Text style={styles.sessionTitle}>אימון כוח</Text></View>
              <View style={styles.actionRow}>
                <Pressable onPress={() => startForSelectedDate(template.id)} style={styles.primarySmall}><Text style={styles.primarySmallText}>התחל {template.name}</Text></Pressable>
                <Pressable onPress={() => setEditing((value) => !value)} style={[styles.secondarySmall, editing && styles.secondarySmallActive]}><Text style={styles.secondarySmallText}>{editing ? "סיום עריכה" : "עריכת התוכנית"}</Text></Pressable>
              </View>
              <View style={styles.templateSummary}><Text style={styles.templateSummaryTitle}>{template.name}</Text><Text style={styles.templateSummaryMeta}>{template.exercises.length} תרגילים · {template.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)} סטים</Text></View>
              {completedStrengthSessions.map((session) => <SessionRow key={session.id} session={session} name={sessionName(session)} onOpen={() => openCompletedSession(session.id)} onEditDate={() => openCompletedSession(session.id, true)} />)}
              {editing ? <TemplateEditor template={template} onNameChange={updateExerciseName} onTargetChange={updateTarget} onAddSet={addSet} onRemoveSet={removeSet} /> : <ExercisePreview template={template} />}
            </View>

            <View style={[styles.sessionSection, styles.cardioSection]}>
              <View style={styles.sessionHeading}><Text style={styles.sessionCounter}>{completedCardioSessions.length} תועדו</Text><Text style={styles.sessionTitle}>אירובי לצד הכוח</Text></View>
              {plannedCardioTemplate ? <>
                <Text style={styles.cardioPlanText}>{plannedCardioTemplate.name} · {plannedCardioTemplate.focus}</Text>
                <Pressable onPress={() => startForSelectedDate(plannedCardioTemplate.id)} style={styles.cardioStartButton}><Text style={styles.cardioStartText}>התחל אירובי</Text></Pressable>
                {completedCardioSessions.map((session) => <SessionRow key={session.id} session={session} name={sessionName(session)} onOpen={() => openCompletedSession(session.id)} onEditDate={() => openCompletedSession(session.id, true)} cardio />)}
              </> : <Text style={styles.emptyInline}>לא צורף אירובי ליום הזה. ניתן לבחור סוג אירובי באזור ההגדרה למטה.</Text>}
            </View>
          </> : <View style={styles.restMessage}>
            <Text style={styles.restTitle}>{selected.kind === "cardio" ? "יום אירובי והתאוששות פעילה" : "יום מנוחה"}</Text>
            <Text style={styles.restText}>{selected.kind === "cardio" ? "תעד אירובי נפרד עם זמן, מרחק ועצימות." : "אין תרגילי כוח מתוכננים ביום זה."}</Text>
            {selected.kind === "cardio" ? <Pressable onPress={() => startForSelectedDate("cardio")} style={styles.primarySmall}><Text style={styles.primarySmallText}>פתח אירובי</Text></Pressable> : null}
            {selectedSessions.all.map((session) => <SessionRow key={session.id} session={session} name={sessionName(session)} onOpen={() => openCompletedSession(session.id)} onEditDate={() => openCompletedSession(session.id, true)} cardio={isCardioWorkoutTemplate(session.templateId)} />)}
          </View>}

          <View style={styles.changeBox}>
            <Text style={styles.changeTitle}>שינוי אימון הכוח ליום זה</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatePills}>
              {strengthTemplates.slice(0, 8).map((item) => <Pressable key={item.id} onPress={() => chooseTemplate(item)} style={[styles.templatePill, selected.templateId === item.id && styles.templatePillActive]}><Text style={[styles.templatePillText, selected.templateId === item.id && styles.templatePillTextActive]}>{item.name}</Text></Pressable>)}
            </ScrollView>
            {selected.kind === "workout" ? <>
              <Text style={styles.changeTitle}>הוסף אירובי לצד אימון הכוח</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatePills}>
                {cardioTemplates.map((item) => <Pressable key={item.id} onPress={() => patchSelected({ cardioTemplateId: selected.cardioTemplateId === item.id ? undefined : item.id })} style={[styles.templatePill, styles.cardioPill, selected.cardioTemplateId === item.id && styles.cardioPillActive]}><Text style={[styles.templatePillText, selected.cardioTemplateId === item.id && styles.cardioPillTextActive]}>{item.name}</Text></Pressable>)}
              </ScrollView>
              {selected.cardioTemplateId ? <Pressable onPress={() => patchSelected({ cardioTemplateId: undefined })} style={styles.removeCardioButton}><Text style={styles.removeCardioText}>הסר אירובי מתוכנן מהיום</Text></Pressable> : null}
            </> : null}
            <View style={styles.changeActions}>
              <Pressable onPress={() => patchSelected({ kind: "cardio", label: "אירובי בלבד", focus: "אירובי והתאוששות פעילה", templateId: undefined, cardioTemplateId: undefined })} style={styles.changeButton}><Text style={styles.changeButtonText}>אירובי בלבד</Text></Pressable>
              <Pressable onPress={() => patchSelected({ kind: "rest", label: "חופש מוחלט", focus: "מנוחה והתאוששות מלאה", templateId: undefined, cardioTemplateId: undefined })} style={styles.changeButton}><Text style={styles.changeButtonText}>חופש מוחלט</Text></Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
      <FutureWorkoutPreview day={visibleFuturePreviewDay} templates={templates} onClose={() => { if (futurePreviewDay) { setFuturePreviewDay(null); return; } router.replace("/(tabs)/schedule" as never); }} onStart={(templateId) => { if (!futurePreviewDay) { router.replace("/(tabs)/schedule" as never); return; } startWorkoutOnDate(templateId, futurePreviewDay.date); setFuturePreviewDay(null); router.push({ pathname: "/active-workout", params: { templateId, scheduledDate: futurePreviewDay.date } } as never); }} />
    </ScreenContainer>
  );
}

function SessionRow({ session, name, onOpen, onEditDate, cardio = false }: { session: WorkoutSession; name: string; onOpen: () => void; onEditDate: () => void; cardio?: boolean }) {
  const completed = session.sets.filter((set) => set.completed).length;
  return <View style={[styles.sessionRow, cardio && styles.sessionRowCardio]}><Pressable accessibilityRole="button" onPress={onOpen} style={{ flex: 1 }}><View><Text style={styles.sessionRowMeta}>{sessionTime(session)} · {completed}/{session.sets.length} {cardio ? "מקטעים" : "סטים"}</Text><Text style={styles.sessionRowName}>{name}</Text></View><Text style={styles.sessionEdit}>הצג מה בוצע ›</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`ערוך תאריך של ${name}`} onPress={onEditDate} style={{ borderColor: "#65BDF6", borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, marginRight: 8 }}><Text style={{ color: "#8FD3F4", fontSize: 10, fontWeight: "900" }}>ערוך תאריך</Text></Pressable></View>;
}

function ExercisePreview({ template }: { template: WorkoutTemplate }) {
  return <View style={styles.exercisePreview}>{template.exercises.slice(0, 5).map((exercise) => <Text key={exercise.id} numberOfLines={2} style={styles.exerciseText}>• {exercise.name || exercise.id || "תרגיל ללא שם"} · {exercise.sets.length} סטים</Text>)}{template.exercises.length > 5 ? <Text style={styles.moreText}>+ עוד {template.exercises.length - 5} תרגילים</Text> : null}</View>;
}

function FutureWorkoutPreview({ day, templates, onClose, onStart }: { day: ScheduledDay | null; templates: WorkoutTemplate[]; onClose: () => void; onStart: (templateId: WorkoutId) => void }) {
  const template = day?.templateId ? templates.find((item) => item.id === day.templateId) : undefined;
  return <Modal visible={Boolean(day)} animationType="slide" transparent onRequestClose={onClose}><View style={styles.previewBackdrop}><View style={styles.previewSheet}><View style={styles.previewHeader}><View><Text style={styles.previewTitle}>{template?.name ?? day?.label}</Text><Text style={styles.previewSubtitle}>{day?.focus}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="סגור תצוגת תרגילים" onPress={onClose} style={styles.previewClose}><Text style={styles.previewCloseText}>×</Text></Pressable></View><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.previewContent}>{template ? <><View style={styles.previewSummary}><Text style={styles.previewSummaryValue}>{template.exercises.length}</Text><Text style={styles.previewSummaryLabel}>תרגילים</Text><Text style={styles.previewSummaryValue}>{template.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)}</Text><Text style={styles.previewSummaryLabel}>סטים</Text></View><Text style={styles.previewSectionTitle}>כל התרגילים בתוכנית</Text>{template.exercises.map((exercise, index) => <View key={exercise.id} style={styles.previewExerciseRow}><View style={styles.previewExerciseNumber}><Text style={styles.previewExerciseNumberText}>{index + 1}</Text></View><View style={styles.previewExerciseInfo}><Text style={styles.previewExerciseName}>{exercise.name}</Text><Text style={styles.previewExerciseSets}>{exercise.sets.map((set, setIndex) => `סט ${setIndex + 1}: ${set.target}`).join(" · ")}</Text></View></View>)}</> : <Text style={styles.previewEmpty}>אין תרגילי כוח מתוכננים ביום הזה.</Text>}</ScrollView>{template ? <Pressable accessibilityRole="button" onPress={() => onStart(template.id)} style={styles.previewStart}><Text style={styles.previewStartText}>התחל {template.name}</Text></Pressable> : null}</View></View></Modal>;
}

function TemplateEditor({ template, onNameChange, onTargetChange, onAddSet, onRemoveSet }: { template: WorkoutTemplate; onNameChange: (exerciseId: string, name: string) => void; onTargetChange: (exerciseId: string, index: number, target: string) => void; onAddSet: (exerciseId: string) => void; onRemoveSet: (exerciseId: string, index: number) => void }) {
  return <View style={styles.editorBox}><Text style={styles.editorTitle}>עריכת תרגילים, סטים וחזרות</Text>{template.exercises.map((exercise) => <View key={exercise.id} style={styles.exerciseBox}><TextInput value={exercise.name} onChangeText={(value) => onNameChange(exercise.id, value)} style={styles.exerciseInput} textAlign="right" /><View style={styles.sets}><Text style={styles.setsLabel}>סטים וחזרות יעד</Text>{exercise.sets.map((set, index) => <View key={`${exercise.id}-${index}`} style={styles.setRow}><TextInput value={set.target} onChangeText={(value) => onTargetChange(exercise.id, index, value)} style={styles.setInput} textAlign="right" /><Text style={styles.setNumber}>סט {index + 1}</Text><Pressable onPress={() => onRemoveSet(exercise.id, index)} disabled={exercise.sets.length <= 1} style={[styles.removeSet, exercise.sets.length <= 1 && styles.disabled]}><Text style={styles.removeText}>×</Text></Pressable></View>)}<Pressable onPress={() => onAddSet(exercise.id)} style={styles.addSet}><Text style={styles.addSetText}>+ הוסף סט</Text></Pressable></View></View>)}</View>;
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 40 }, heading: { alignItems: "flex-end", gap: 5 }, eyebrow: { color: "#F5B72C", fontWeight: "900", fontSize: 12 }, title: { color: "#F7F9FC", fontSize: 30, fontWeight: "900", textAlign: "right" }, subtitle: { color: "#AAB7C8", fontSize: 12, textAlign: "right" },
  weekHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: "#16233A", borderColor: "#8A6B20", borderWidth: 1, borderRadius: 16, padding: 10 }, weekTitle: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "center" }, weekRange: { color: "#AAB7C8", fontSize: 11, textAlign: "center", marginTop: 3 }, navButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#253653", alignItems: "center", justifyContent: "center" }, navText: { color: "#F5B72C", fontSize: 28, lineHeight: 30 },
  days: { gap: 8 }, dayCard: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 14, padding: 12, alignItems: "flex-end", gap: 3 }, dayCardActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" }, dayCompleted: { backgroundColor: "#123B31", borderColor: "#55D69C" }, dayPending: { backgroundColor: "#3A1F27", borderColor: "#F05252" }, dayRest: { backgroundColor: "#4A3908", borderColor: "#F5B72C" }, dayPendingText: { color: "#FFFFFF" }, dayCardio: { borderColor: "#3D806D" }, dayCardHeading: { width: "100%", flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }, dayName: { color: "#AAB7C8", fontSize: 10, fontWeight: "800" }, dayDate: { color: "#7E8DA4", fontSize: 10 }, dayDateActive: { color: "#3B2D05" }, dayLabel: { color: "#F7F9FC", fontSize: 16, fontWeight: "900" }, dayLabelActive: { color: "#0B1224" }, dayFocus: { color: "#AAB7C8", fontSize: 10, textAlign: "right" }, dayFocusActive: { color: "#3B2D05" }, cardioAttached: { color: "#57E0BD", fontSize: 10, fontWeight: "900", marginTop: 2 }, cardioAttachedActive: { color: "#26473C" }, daySessions: { color: "#6DE3C3", fontSize: 10, fontWeight: "900", marginTop: 3 }, dayStatusCompleted: { color: "#77F0B8", fontSize: 10, fontWeight: "900", textAlign: "right" }, dayStatusPending: { color: "#FF9B9B", fontSize: 10, fontWeight: "900", textAlign: "right" }, daySessionsActive: { color: "#3B2D05" },
  detailCard: { backgroundColor: "#16233A", borderColor: "#F5B72C", borderWidth: 1, borderRadius: 18, padding: 15, gap: 12 }, detailHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start" }, detailLabel: { color: "#F5D27A", fontSize: 11, textAlign: "right" }, detailTitle: { color: "#F7F9FC", fontSize: 22, fontWeight: "900", textAlign: "right", marginTop: 4 }, statusBadge: { color: "#0B1224", backgroundColor: "#F5B72C", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: "900" }, detailFocus: { color: "#D9E2EF", textAlign: "right", lineHeight: 18 },
  sessionSection: { backgroundColor: "#0B1224", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 14, padding: 11, gap: 9 }, cardioSection: { borderColor: "#367B68", backgroundColor: "#0D201F" }, sessionHeading: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }, sessionTitle: { color: "#F7F9FC", fontSize: 15, fontWeight: "900", textAlign: "right" }, sessionCounter: { color: "#AAB7C8", fontSize: 10, fontWeight: "800" }, actionRow: { flexDirection: "row-reverse", gap: 8 }, primarySmall: { flex: 1, backgroundColor: "#F5B72C", borderRadius: 11, paddingVertical: 11, alignItems: "center" }, primarySmallText: { color: "#0B1224", fontSize: 11, fontWeight: "900" }, secondarySmall: { flex: 1, borderColor: "#5E7CA5", borderWidth: 1, borderRadius: 11, paddingVertical: 11, alignItems: "center" }, secondarySmallActive: { backgroundColor: "#253653" }, secondarySmallText: { color: "#D9E2EF", fontSize: 11, fontWeight: "800" }, templateSummary: { backgroundColor: "#16233A", borderRadius: 12, padding: 11, gap: 3 }, templateSummaryTitle: { color: "#F5B72C", fontWeight: "900", textAlign: "right" }, templateSummaryMeta: { color: "#AAB7C8", fontSize: 10, textAlign: "right" },
  sessionRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", backgroundColor: "#16233A", borderColor: "#31425E", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9 }, sessionRowCardio: { backgroundColor: "#102E2A", borderColor: "#367B68" }, sessionRowName: { color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right" }, sessionRowMeta: { color: "#AAB7C8", fontSize: 10, textAlign: "right", marginTop: 2 }, sessionEdit: { color: "#F5D27A", fontSize: 11, fontWeight: "900" },
  cardioPlanText: { color: "#B8EADD", fontSize: 11, lineHeight: 18, textAlign: "right" }, cardioStartButton: { backgroundColor: "#42D392", borderRadius: 11, paddingVertical: 11, alignItems: "center" }, cardioStartText: { color: "#09221D", fontSize: 12, fontWeight: "900" }, emptyInline: { color: "#AAB7C8", fontSize: 11, textAlign: "right", lineHeight: 17 },
  exercisePreview: { gap: 7 }, exerciseText: { color: "#D9E2EF", fontSize: 12, textAlign: "right", writingDirection: "rtl", width: "100%", lineHeight: 19 }, moreText: { color: "#F5D27A", fontSize: 11, textAlign: "right", fontWeight: "800" }, editorBox: { gap: 10 }, editorTitle: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" }, exerciseBox: { backgroundColor: "#16233A", borderRadius: 12, padding: 10, gap: 8 }, exerciseInput: { color: "#F7F9FC", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 8, padding: 9, minHeight: 38 }, sets: { gap: 6 }, setsLabel: { color: "#AAB7C8", fontSize: 10, textAlign: "right" }, setRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 }, setInput: { flex: 1, backgroundColor: "#0B1224", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 8, padding: 8, color: "#F7F9FC", textAlign: "right" }, setNumber: { color: "#AAB7C8", fontSize: 10, width: 34, textAlign: "right" }, removeSet: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#432330", alignItems: "center", justifyContent: "center" }, removeText: { color: "#F16B7A", fontSize: 18 }, addSet: { borderColor: "#8A6B20", borderWidth: 1, borderRadius: 8, paddingVertical: 7, alignItems: "center" }, addSetText: { color: "#F5D27A", fontSize: 10, fontWeight: "900" },
  restMessage: { backgroundColor: "#0B1224", borderRadius: 12, padding: 12, gap: 8 }, restTitle: { color: "#F5B72C", fontWeight: "900", textAlign: "right" }, restText: { color: "#AAB7C8", fontSize: 11, textAlign: "right" },
  changeBox: { borderTopColor: "#2C3B55", borderTopWidth: 1, paddingTop: 10, gap: 8 }, changeTitle: { color: "#AAB7C8", fontSize: 10, textAlign: "right" }, templatePills: { flexDirection: "row", gap: 7 }, templatePill: { borderColor: "#2C3B55", borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 }, templatePillActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" }, templatePillText: { color: "#AAB7C8", fontSize: 10, fontWeight: "800" }, templatePillTextActive: { color: "#0B1224" }, cardioPill: { borderColor: "#3D806D" }, cardioPillActive: { backgroundColor: "#42D392", borderColor: "#42D392" }, cardioPillTextActive: { color: "#09221D" }, removeCardioButton: { borderColor: "#D86582", borderWidth: 1, borderRadius: 9, paddingVertical: 8, alignItems: "center" }, removeCardioText: { color: "#FFB1BE", fontSize: 10, fontWeight: "900" }, changeActions: { flexDirection: "row-reverse", gap: 8 }, changeButton: { flex: 1, borderColor: "#5E7CA5", borderWidth: 1, borderRadius: 9, paddingVertical: 8, alignItems: "center" }, changeButtonText: { color: "#D9E2EF", fontSize: 10, fontWeight: "800" }, disabled: { opacity: 0.25 },
  previewBackdrop: { flex: 1, backgroundColor: "rgba(2, 8, 22, 0.78)", justifyContent: "flex-end" }, previewSheet: { maxHeight: "86%", backgroundColor: "#16233A", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderColor: "#F5B72C", borderWidth: 1, padding: 16, gap: 12 }, previewHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start" }, previewTitle: { color: "#F7F9FC", fontSize: 23, fontWeight: "900", textAlign: "right" }, previewSubtitle: { color: "#AAB7C8", fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 4 }, previewClose: { width: 34, height: 34, borderRadius: 17, borderColor: "#5E7CA5", borderWidth: 1, alignItems: "center", justifyContent: "center" }, previewCloseText: { color: "#F7F9FC", fontSize: 22, lineHeight: 24 }, previewContent: { gap: 9, paddingBottom: 14 }, previewSummary: { flexDirection: "row-reverse", justifyContent: "flex-start", alignItems: "baseline", gap: 7, backgroundColor: "#0B1224", borderRadius: 12, padding: 11 }, previewSummaryValue: { color: "#F5B72C", fontSize: 17, fontWeight: "900" }, previewSummaryLabel: { color: "#AAB7C8", fontSize: 10, marginLeft: 8 }, previewSectionTitle: { color: "#F7F9FC", fontSize: 15, fontWeight: "900", textAlign: "right", marginTop: 3 }, previewExerciseRow: { flexDirection: "row-reverse", gap: 10, backgroundColor: "#0B1224", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 12, padding: 11, alignItems: "center" }, previewExerciseNumber: { width: 27, height: 27, borderRadius: 14, backgroundColor: "#F5B72C", alignItems: "center", justifyContent: "center" }, previewExerciseNumberText: { color: "#0B1224", fontWeight: "900", fontSize: 11 }, previewExerciseInfo: { flex: 1, alignItems: "flex-end", gap: 3 }, previewExerciseName: { color: "#F7F9FC", fontSize: 13, fontWeight: "900", textAlign: "right" }, previewExerciseSets: { color: "#AAB7C8", fontSize: 10, lineHeight: 16, textAlign: "right" }, previewEmpty: { color: "#AAB7C8", fontSize: 12, textAlign: "right" }, previewStart: { minHeight: 50, backgroundColor: "#F5B72C", borderRadius: 13, alignItems: "center", justifyContent: "center" }, previewStartText: { color: "#0B1224", fontSize: 14, fontWeight: "900" },
});
