import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";

import { ActionToast } from "@/components/action-toast";
import { WorkoutMethodPicker } from "@/components/workout-method-picker";
import { ScreenContainer } from "@/components/screen-container";
import { localDateKey, sundayFirstMonthCells } from "@/lib/calendar-grid";
import { libraryForWorkout, type ExerciseLibraryItem } from "@/lib/exercise-library";
import { calculateVolume, useWorkoutStore, type SetLog } from "@/lib/workout-store";
import { cardioPaceText, cardioTotalsForSets } from "@/lib/cardio-details";
import {
  getAccountBackupStatus,
  requestAccountCloudBackup,
  subscribeAccountBackupStatus,
  type AccountBackupStatus,
} from "@/lib/account-backup";

const HEBREW_WEEKDAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const CARDIO_TEMPLATE_IDS = new Set(["cardio", "cycling", "elliptical", "stairs", "treadmill", "outdoor-run", "walking", "rowing", "swimming", "hiit"]);

function WorkoutKeepAwake() {
  useKeepAwake();
  return null;
}

function dateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function calendarRows(year: number, monthIndex: number) {
  const cells = sundayFirstMonthCells(year, monthIndex);
  const finalCellCount = Math.ceil(cells.length / 7) * 7;
  const padded = [...cells, ...Array<null>(finalCellCount - cells.length).fill(null)];
  return Array.from({ length: padded.length / 7 }, (_, row) => padded.slice(row * 7, row * 7 + 7));
}

export default function ActiveWorkoutScreen() {
  const { templateId: routeTemplateId, scheduledDate } = useLocalSearchParams<{ templateId?: string; scheduledDate?: string }>();
  const routeStartKey = routeTemplateId && scheduledDate ? `${routeTemplateId}:${scheduledDate}` : null;
  const startedRouteKey = useRef<string | null>(null);
  const {
    activeSession,
    activeTemplate,
    templates,
    hydrated,
    startWorkoutOnDate,
    updateSet,
    updateActiveSession,
    updateExercise,
    finishWorkout,
    discardActiveWorkout,
    addExerciseToActiveWorkout,
    addExerciseToActiveWorkoutAfter,
    addCustomExerciseToActiveWorkout,
    addCustomExerciseToActiveWorkoutAfter,
    duplicateActiveExercise,
    addSetToActiveExercise,
    removeSetFromActiveExercise,
    removeExerciseFromActiveWorkout,
    moveActiveExercise,
    copyPreviousWorkoutIntoActive,
    recentSessionFor,
  } = useWorkoutStore();
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [dateDraft, setDateDraft] = useState("");
  const [closeConfirmVisible, setCloseConfirmVisible] = useState(false);
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
  const [insertionAfterExerciseId, setInsertionAfterExerciseId] = useState<string | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [customExerciseEnglishName, setCustomExerciseEnglishName] = useState("");
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseNameDraft, setExerciseNameDraft] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [restSeconds, setRestSeconds] = useState(0);
  const [lastLocalSaveAt, setLastLocalSaveAt] = useState<Date | null>(null);
  const [cloudBackupStatus, setCloudBackupStatus] = useState<AccountBackupStatus>(getAccountBackupStatus());
  const [copyChoiceVisible, setCopyChoiceVisible] = useState(false);
  const [copyChoiceDate, setCopyChoiceDate] = useState("");
  const [copyChoiceIncrement, setCopyChoiceIncrement] = useState<0 | 1.25 | 2.5 | 5>(0);
  const [methodPickerSetId, setMethodPickerSetId] = useState<string | null>(null);

  useEffect(() => subscribeAccountBackupStatus(setCloudBackupStatus), []);

  useEffect(() => {
    if (activeSession) setLastLocalSaveAt(new Date());
  }, [activeSession]);

  useEffect(() => {
    if (!hydrated || activeSession || !routeStartKey || !routeTemplateId || !scheduledDate || startedRouteKey.current === routeStartKey) return;
    const requestedTemplate = templates.find((template) => template.id === routeTemplateId);
    if (!requestedTemplate) return;
    startedRouteKey.current = routeStartKey;
    startWorkoutOnDate(requestedTemplate.id, scheduledDate);
  }, [activeSession, hydrated, routeStartKey, routeTemplateId, scheduledDate, startWorkoutOnDate, templates]);

  useEffect(() => {
    if (activeSession?.startedAt) setDateDraft(activeSession.startedAt.slice(0, 10));
  }, [activeSession?.startedAt]);

  useEffect(() => {
    if (restSeconds <= 0) return;
    const timer = setInterval(() => setRestSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [restSeconds]);

  const grouped = useMemo(
    () =>
      activeTemplate?.exercises.map((exercise) => ({
        exercise,
        sets: activeSession?.sets.filter((set) => set.exerciseId === exercise.id) ?? [],
      })) ?? [],
    [activeSession, activeTemplate],
  );
  const completed = activeSession?.sets.filter((set) => set.completed).length ?? 0;
  const total = activeSession?.sets.length ?? 0;
  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const rows = useMemo(() => calendarRows(calendarYear, calendarMonthIndex), [calendarMonthIndex, calendarYear]);
  const availableExercises = activeTemplate
    ? libraryForWorkout(activeTemplate.name).filter((item) => !activeTemplate.exercises.some((exercise) => exercise.name === item.name))
    : [];
  const isCardioWorkout = Boolean(activeTemplate && CARDIO_TEMPLATE_IDS.has(activeTemplate.id));
  const insertionAfterExercise = insertionAfterExerciseId
    ? activeTemplate?.exercises.find((exercise) => exercise.id === insertionAfterExerciseId)
    : undefined;
  const previousWorkoutForCopy = activeSession ? recentSessionFor(activeSession.templateId) : undefined;
  const copyPreviewRows = useMemo(() => {
    if (!previousWorkoutForCopy || !activeSession || !activeTemplate) return [];
    return activeTemplate.exercises.flatMap((exercise) => activeSession.sets
      .filter((set) => set.exerciseId === exercise.id)
      .map((set) => {
        const source = previousWorkoutForCopy.sets.find((candidate) => candidate.exerciseId === set.exerciseId && candidate.setNumber === set.setNumber);
        if (!source) return null;
        const oldWeight = source.weight?.trim() || "ללא משקל";
        const numericWeight = Number(source.weight);
        const canIncrease = !isCardioWorkout && copyChoiceIncrement !== 0 && source.weight.trim() !== "" && Number.isFinite(numericWeight);
        const newWeight = canIncrease ? String(Number((numericWeight + copyChoiceIncrement).toFixed(2))) : oldWeight;
        return {
          id: `${exercise.id}-${set.setNumber}`,
          exerciseName: exercise.name,
          setNumber: set.setNumber,
          oldWeight,
          newWeight,
          currentReps: set.reps?.trim() || "—",
          copiedReps: source.reps?.trim() || "—",
          changed: canIncrease,
        };
      })
      .filter((row): row is { id: string; exerciseName: string; setNumber: number; oldWeight: string; newWeight: string; currentReps: string; copiedReps: string; changed: boolean } => Boolean(row)));
  }, [activeSession?.sets, activeTemplate?.exercises, copyChoiceIncrement, isCardioWorkout, previousWorkoutForCopy]);

  if ((!activeSession || !activeTemplate) && routeStartKey) {
    return (
      <ScreenContainer className="px-5 pt-6" containerClassName="bg-background">
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>פותח את האימון…</Text>
          <Text style={styles.emptyText}>טוען את התרגילים והסטים של האימון שנבחר.</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!activeSession || !activeTemplate) {
    return (
      <ScreenContainer className="px-5 pt-6" containerClassName="bg-background">
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>אין אימון פעיל כרגע</Text>
          <Text style={styles.emptyText}>בחר תבנית אימון כדי להתחיל לתעד סטים בזמן אמת.</Text>
          <Pressable onPress={() => router.replace("/(tabs)/workouts" as never)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>לבחירת אימון</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const commitDate = (nextDate: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate) || Number.isNaN(new Date(`${nextDate}T12:00:00`).getTime())) {
      Alert.alert("תאריך לא תקין", "יש לבחור תאריך תקין בלוח או להזין YYYY-MM-DD.");
      return false;
    }
    updateActiveSession({ startedAt: `${nextDate}T${activeSession.startedAt.slice(11) || "12:00:00.000Z"}` });
    setDateDraft(nextDate);
    return true;
  };

  const chooseCalendarDay = (day: number) => {
    const nextDate = dateKey(calendarYear, calendarMonthIndex, day);
    if (commitDate(nextDate)) setDatePickerVisible(false);
  };
  const chooseToday = () => {
    const today = new Date();
    const todayDate = localDateKey(today);
    setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    if (commitDate(todayDate)) setDatePickerVisible(false);
  };

  const askToRemoveSet = (set: SetLog) => {
    const remove = () => removeSetFromActiveExercise(set.id);
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("למחוק את הסט הזה?")) remove();
      return;
    }
    Alert.alert("מחיקת סט", "למחוק את הסט הזה?", [{ text: "ביטול", style: "cancel" }, { text: "מחק", style: "destructive", onPress: remove }]);
  };

  const openCopyChoice = (initialIncrement: 0 | 1.25 | 2.5 | 5 = 0) => {
    const previousWorkout = recentSessionFor(activeSession.templateId);
    if (!previousWorkout) {
      setToastMessage(`לא נמצא אימון קודם של ${activeTemplate.name}`);
      return;
    }
    setCopyChoiceDate(previousWorkout.startedAt.slice(0, 10));
    setCopyChoiceIncrement(initialIncrement);
    setCopyChoiceVisible(true);
  };

  const confirmCopyChoice = () => {
    const copied = copyPreviousWorkoutIntoActive(copyChoiceIncrement);
    setCopyChoiceVisible(false);
    setToastMessage(copied
      ? `הועתק אימון ${activeTemplate.name} מתאריך ${copyChoiceDate}${copyChoiceIncrement ? ` עם תוספת ${copyChoiceIncrement} ק״ג` : ""}`
      : `לא נמצא אימון קודם של ${activeTemplate.name}`);
  };

  const copyPreviousWorkout = () => openCopyChoice();
  const copyPreviousWorkoutWithOverload = () => openCopyChoice(2.5);

  const askToRemoveExercise = (exerciseId: string, name: string) => {
    const remove = () => removeExerciseFromActiveWorkout(exerciseId);
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`למחוק את ${name} וכל הסטים שלו?`)) remove();
      return;
    }
    Alert.alert("מחיקת תרגיל", `למחוק את ${name} וכל הסטים שלו?`, [{ text: "ביטול", style: "cancel" }, { text: "מחק", style: "destructive", onPress: remove }]);
  };

  const finish = () => {
    finishWorkout();
    router.replace("/(tabs)" as never);
  };

  const cloudBackupLabel = cloudBackupStatus === "saving"
    ? "מגבה…"
    : cloudBackupStatus === "saved"
      ? "גיבוי ענן בוצע ✓"
      : cloudBackupStatus === "failed"
        ? "נסה גיבוי שוב"
        : cloudBackupStatus === "sign-in"
          ? "התחבר לגיבוי ענן"
          : cloudBackupStatus === "unavailable"
            ? "הגיבוי לא הוגדר"
            : "גבה לענן עכשיו";

  const saveExerciseName = (exerciseId: string) => {
    const name = exerciseNameDraft.trim();
    if (!name) return;
    updateExercise(activeSession.templateId, exerciseId, { name });
    setEditingExerciseId(null);
    setExerciseNameDraft("");
  };

  const adjustSetValue = (set: SetLog, field: "weight" | "reps", delta: number) => {
    const current = Number(set[field]) || 0;
    const next = Math.max(0, current + delta);
    updateSet(set.id, { [field]: String(Number(next.toFixed(field === "weight" ? 1 : 0))) });
  };
  const cardioTotals = cardioTotalsForSets(activeSession.sets);

  return (
    <ScreenContainer className="px-4 pt-4" containerClassName="bg-background">
      {Platform.OS !== "web" ? <WorkoutKeepAwake /> : null}
      <View style={styles.header}>
        <Pressable onPress={() => setCloseConfirmVisible(true)} style={styles.closeButton}><Text style={styles.closeText}>סגור</Text></Pressable>
        <View><Text style={styles.kicker}>אימון פעיל</Text><Text style={styles.title}>{activeTemplate.name}</Text></View>
      </View>

      <View style={styles.saveStatusCard}>
        <View style={styles.saveStatusTextBlock}>
          <Text style={styles.saveStatusTitle}>השינויים נשמרים אוטומטית</Text>
          <Text style={styles.saveStatusSubtitle}>{lastLocalSaveAt ? `נשמר מקומית ב־${new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" }).format(lastLocalSaveAt)} · רענון יחזיר את האימון` : "מכין שמירה לאימון הפעיל"}</Text>
        </View>
        <Pressable onPress={requestAccountCloudBackup} style={styles.backupButton}><Text style={styles.backupButtonText}>{cloudBackupLabel}</Text></Pressable>
      </View>

      <View style={styles.dateCard}>
        <Text style={styles.sectionTitle}>תאריך אימון</Text>
        <View style={styles.dateActions}>
          <Pressable onPress={() => { setCalendarMonth(new Date(`${dateDraft || activeSession.startedAt.slice(0, 10)}T12:00:00`)); setDatePickerVisible(true); }} style={styles.dateButton}>
            <Text style={styles.dateButtonText}>{dateDraft || "בחר תאריך"}</Text>
          </Pressable>
          <Pressable onPress={() => commitDate(dateDraft)} style={styles.smallButton}><Text style={styles.smallButtonText}>שמור</Text></Pressable>
        </View>
        <Text style={styles.hint}>אפשר לבחור כל יום, כולל שבת, ולתעד אימון בדיעבד.</Text>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${total ? Math.round((completed / total) * 100) : 0}%` }]} /></View>
        <Text style={styles.progressText}>{isCardioWorkout ? `${completed} מתוך ${total} מקטעים הושלמו · ${cardioTotals.minutes} דקות · ${cardioTotals.distanceKm.toFixed(1)} ק״מ · ${cardioTotals.averageSpeedKph ? `${cardioTotals.averageSpeedKph.toFixed(1)} קמ״ש` : "מהירות לא הוזנה"}` : `${completed} מתוך ${total} סטים הושלמו · נפח נוכחי ${Math.round(calculateVolume(activeSession))} ק״ג`}</Text>
        {restSeconds > 0 ? <Text style={styles.restText}>מנוחה {Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, "0")}</Text> : null}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => { setInsertionAfterExerciseId(null); setExercisePickerVisible(true); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>＋ הוסף תרגיל לסוף האימון</Text></Pressable>
        {grouped.map(({ exercise, sets }, exerciseIndex) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            {editingExerciseId === exercise.id ? (
              <View style={styles.editNameRow}>
                <TextInput value={exerciseNameDraft} onChangeText={setExerciseNameDraft} style={styles.nameInput} textAlign="right" autoFocus />
                <Pressable onPress={() => saveExerciseName(exercise.id)} style={styles.smallButton}><Text style={styles.smallButtonText}>שמור</Text></Pressable>
              </View>
            ) : (
              <View style={styles.exerciseHeader}>
                <View><Text style={styles.exerciseName}>{exercise.name}</Text>{exercise.englishName ? <Text style={styles.exerciseEnglish}>{exercise.englishName}</Text> : null}</View>
                <Pressable onPress={() => { setEditingExerciseId(exercise.id); setExerciseNameDraft(exercise.name); }} style={styles.outlineButton}><Text style={styles.outlineButtonText}>ערוך שם</Text></Pressable>
              </View>
            )}
            <View style={styles.exerciseActions}>
              <Pressable disabled={exerciseIndex === 0} onPress={() => moveActiveExercise(exercise.id, -1)} style={[styles.orderButton, exerciseIndex === 0 && styles.orderButtonDisabled]}><Text style={styles.orderButtonText}>↑ למעלה</Text></Pressable>
              <Pressable disabled={exerciseIndex === grouped.length - 1} onPress={() => moveActiveExercise(exercise.id, 1)} style={[styles.orderButton, exerciseIndex === grouped.length - 1 && styles.orderButtonDisabled]}><Text style={styles.orderButtonText}>↓ למטה</Text></Pressable>
              <Pressable onPress={() => { setInsertionAfterExerciseId(exercise.id); setExercisePickerVisible(true); }} style={styles.insertAfterButton}><Text style={styles.insertAfterText}>＋ אחרי</Text></Pressable>
              <Pressable onPress={() => addSetToActiveExercise(exercise.id)} style={styles.actionButton}><Text style={styles.actionText}>{isCardioWorkout ? "＋ מקטע" : "＋ סט"}</Text></Pressable>
              <Pressable onPress={() => duplicateActiveExercise(exercise.id)} style={styles.actionButton}><Text style={styles.actionText}>{isCardioWorkout ? "שכפל מקטע" : "שכפל"}</Text></Pressable>
              <View style={styles.exerciseFooterActions}>
                <Pressable onPress={copyPreviousWorkout} style={styles.copyPreviousButton}><Text style={styles.copyPreviousText}>העתק אימון קודם</Text></Pressable>
                {!isCardioWorkout ? <Pressable onPress={copyPreviousWorkoutWithOverload} style={styles.overloadButton}><Text style={styles.overloadText}>העתק עם +2.5 ק״ג</Text></Pressable> : null}
                <Pressable onPress={() => askToRemoveExercise(exercise.id, exercise.name)} style={styles.dangerButton}><Text style={styles.dangerText}>מחק תרגיל</Text></Pressable>
              </View>
            </View>
            {sets.map((set) => (
              <View key={set.id} style={[styles.setRow, set.completed && styles.setRowDone]}>
                <Pressable onPress={() => { const completing = !set.completed; const savedRest = set.restSeconds ?? 90; updateSet(set.id, { completed: completing, restSeconds: completing && !isCardioWorkout ? savedRest : set.restSeconds }); if (completing && !isCardioWorkout) setRestSeconds(savedRest); }} style={[styles.setCheck, set.completed && styles.setCheckDone]}><Text style={styles.setCheckText}>{set.completed ? "✓" : set.setNumber}</Text></Pressable>
                {isCardioWorkout ? <View style={styles.cardioFields}><View style={styles.cardioMeasureRow}><View style={styles.setFieldWithArrows}><View style={styles.setInputGroup}><Text style={styles.setLabel}>זמן (דק׳)</Text><TextInput value={set.reps} onChangeText={(reps) => updateSet(set.id, { reps })} keyboardType="decimal-pad" style={styles.setInput} /></View><View style={styles.arrowColumn}><Pressable onPress={() => adjustSetValue(set, "reps", 1)} style={styles.arrowButton}><Text style={styles.arrowText}>▲</Text></Pressable><Pressable onPress={() => adjustSetValue(set, "reps", -1)} style={styles.arrowButton}><Text style={styles.arrowText}>▼</Text></Pressable></View></View><View style={styles.setFieldWithArrows}><View style={styles.setInputGroup}><Text style={styles.setLabel}>מרחק (ק״מ)</Text><TextInput value={set.weight} onChangeText={(weight) => updateSet(set.id, { weight })} keyboardType="decimal-pad" style={styles.setInput} /></View><View style={styles.arrowColumn}><Pressable onPress={() => adjustSetValue(set, "weight", 0.1)} style={styles.arrowButton}><Text style={styles.arrowText}>▲</Text></Pressable><Pressable onPress={() => adjustSetValue(set, "weight", -0.1)} style={styles.arrowButton}><Text style={styles.arrowText}>▼</Text></Pressable></View></View></View><View style={styles.cardioMeasureRow}><View style={styles.setInputGroup}><Text style={styles.setLabel}>מהירות (קמ״ש)</Text><TextInput value={set.cardio?.speedKph ?? ""} onChangeText={(speedKph) => updateSet(set.id, { cardio: { ...set.cardio, speedKph } })} keyboardType="decimal-pad" style={styles.setInput} /></View><View style={styles.setInputGroup}><Text style={styles.setLabel}>שיפוע (%)</Text><TextInput value={set.cardio?.incline ?? ""} onChangeText={(incline) => updateSet(set.id, { cardio: { ...set.cardio, incline } })} keyboardType="decimal-pad" style={styles.setInput} /></View></View><View style={styles.cardioIntensityRow}>{(["קלילה", "בינונית", "גבוהה"] as const).map((intensity) => <Pressable key={intensity} onPress={() => updateSet(set.id, { cardio: { ...set.cardio, intensity } })} style={[styles.cardioIntensity, set.cardio?.intensity === intensity && styles.cardioIntensityActive]}><Text style={[styles.cardioIntensityText, set.cardio?.intensity === intensity && styles.cardioIntensityTextActive]}>{intensity}</Text></Pressable>)}</View><TextInput value={set.cardio?.heartRate ?? ""} onChangeText={(heartRate) => updateSet(set.id, { cardio: { ...set.cardio, heartRate } })} placeholder="דופק ממוצע (אופציונלי)" placeholderTextColor="#8291A8" keyboardType="numeric" style={styles.cardioNoteInput} textAlign="right" /><TextInput value={set.note ?? ""} onChangeText={(note) => updateSet(set.id, { note })} placeholder={`הערה · קצב מחושב ${cardioPaceText(Number(set.reps) > 0 && Number(set.weight) > 0 ? Math.round((Number(set.reps) * 60) / Number(set.weight)) : null)}`} placeholderTextColor="#8291A8" style={styles.cardioNoteInput} textAlign="right" /></View> : <><View style={styles.setFieldWithArrows}><View style={styles.setInputGroup}><Text style={styles.setLabel}>חזרות</Text><TextInput value={set.reps} onChangeText={(reps) => updateSet(set.id, { reps })} keyboardType="decimal-pad" style={styles.setInput} /></View><View style={styles.arrowColumn}><Pressable onPress={() => adjustSetValue(set, "reps", 1)} style={styles.arrowButton}><Text style={styles.arrowText}>▲</Text></Pressable><Pressable onPress={() => adjustSetValue(set, "reps", -1)} style={styles.arrowButton}><Text style={styles.arrowText}>▼</Text></Pressable></View></View><View style={styles.setFieldWithArrows}><View style={styles.setInputGroup}><Text style={styles.setLabel}>ק״ג</Text><TextInput value={set.weight} onChangeText={(weight) => updateSet(set.id, { weight })} keyboardType="decimal-pad" style={styles.setInput} /></View><View style={styles.arrowColumn}><Pressable onPress={() => adjustSetValue(set, "weight", 2.5)} style={styles.arrowButton}><Text style={styles.arrowText}>▲</Text></Pressable><Pressable onPress={() => adjustSetValue(set, "weight", -2.5)} style={styles.arrowButton}><Text style={styles.arrowText}>▼</Text></Pressable></View></View><Pressable accessibilityRole="button" accessibilityLabel={`בחר שיטת אימון לסט ${set.setNumber}`} onPress={() => setMethodPickerSetId(set.id)} style={[styles.methodButton, set.method && styles.methodButtonSelected]}><Text style={styles.methodButtonText}>{set.method ?? "שיטה"}</Text></Pressable></>}
                <Pressable onPress={() => askToRemoveSet(set)} style={styles.removeSet}><Text style={styles.removeSetText}>−</Text></Pressable>
              </View>
            ))}
          </View>
        ))}
        <Pressable onPress={finish} style={styles.finishButton}><Text style={styles.finishText}>סיום ושמירת האימון</Text></Pressable>
      </ScrollView>

      <WorkoutMethodPicker visible={Boolean(methodPickerSetId)} selectedMethod={activeSession.sets.find((set) => set.id === methodPickerSetId)?.method} onClose={() => setMethodPickerSetId(null)} onSelect={(method) => { if (methodPickerSetId) updateSet(methodPickerSetId, { method: method.title === "ללא שיטה" ? undefined : method.title }); setMethodPickerSetId(null); }} />

      <Modal visible={datePickerVisible} transparent animationType="fade" onRequestClose={() => setDatePickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.calendarCard}>
            <Text style={styles.calendarTitle}>בחירת תאריך אימון</Text>
            <Text style={styles.calendarHint}>כל שורה מכילה בדיוק שבעה ימים; שבת היא העמודה השמאלית.</Text>
            <View style={styles.monthNav}>
              <Pressable onPress={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex + 1, 1))} style={styles.navButton}><Text style={styles.navText}>‹</Text></Pressable>
              <Text style={styles.monthTitle}>{new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(calendarMonth)}</Text>
              <Pressable onPress={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex - 1, 1))} style={styles.navButton}><Text style={styles.navText}>›</Text></Pressable>
            </View>
            <View style={styles.weekRow}>{HEBREW_WEEKDAYS.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}</View>
            <View style={styles.calendarRows}>
              {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.calendarRow}>
                  {row.map((day, index) => {
                    const selected = day !== null && dateDraft === dateKey(calendarYear, calendarMonthIndex, day);
                    return <View key={`${rowIndex}-${index}`} style={styles.daySlot}>{day === null ? null : <Pressable onPress={() => chooseCalendarDay(day)} style={[styles.dayButton, selected && styles.dayButtonSelected]}><Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text></Pressable>}</View>;
                  })}
                </View>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setDatePickerVisible(false)} style={styles.cancelButton}><Text style={styles.cancelText}>ביטול</Text></Pressable>
              <Pressable onPress={chooseToday} style={styles.saveDateButton}><Text style={styles.saveDateText}>היום</Text></Pressable>
              <Pressable onPress={() => { if (commitDate(dateDraft)) setDatePickerVisible(false); }} style={styles.saveDateButton}><Text style={styles.saveDateText}>שמור תאריך</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={exercisePickerVisible} transparent animationType="slide" onRequestClose={() => { setExercisePickerVisible(false); setInsertionAfterExerciseId(null); }}>
        <View style={styles.modalBottomBackdrop}><View style={styles.exercisePicker}>
          <View style={styles.exercisePickerHeader}><View><Text style={styles.calendarTitle}>{insertionAfterExercise ? `הוספה אחרי ${insertionAfterExercise.name}` : "הוספת תרגיל לסוף האימון"}</Text><Text style={styles.pickerHint}>{insertionAfterExercise ? "התרגיל החדש ייכנס מיד אחרי התרגיל שסימנת." : "התרגיל החדש יתווסף בסוף סדר האימון."}</Text></View><Pressable onPress={() => { setExercisePickerVisible(false); setInsertionAfterExerciseId(null); }}><Text style={styles.closeText}>סגור</Text></Pressable></View>
          <TextInput value={customExerciseName} onChangeText={setCustomExerciseName} placeholder="שם תרגיל מותאם" placeholderTextColor="#8291A8" style={styles.customInput} textAlign="right" />
          <TextInput value={customExerciseEnglishName} onChangeText={setCustomExerciseEnglishName} placeholder="שם באנגלית (אופציונלי)" placeholderTextColor="#8291A8" style={styles.customInput} textAlign="right" />
          <Pressable onPress={() => { if (!customExerciseName.trim()) return; const name = customExerciseName.trim(); if (insertionAfterExerciseId) addCustomExerciseToActiveWorkoutAfter(name, customExerciseEnglishName.trim(), insertionAfterExerciseId); else addCustomExerciseToActiveWorkout(name, customExerciseEnglishName.trim()); setCustomExerciseName(""); setCustomExerciseEnglishName(""); setExercisePickerVisible(false); setInsertionAfterExerciseId(null); setToastMessage(`נוסף ${name} לאימון`); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>הוסף תרגיל מותאם</Text></Pressable>
          <ScrollView style={styles.exerciseList}>{availableExercises.map((item: ExerciseLibraryItem) => <Pressable key={item.id} onPress={() => { if (insertionAfterExerciseId) addExerciseToActiveWorkoutAfter(item, insertionAfterExerciseId); else addExerciseToActiveWorkout(item); setExercisePickerVisible(false); setInsertionAfterExerciseId(null); setToastMessage(`נוסף ${item.name} לאימון`); }} style={styles.libraryExercise}><View><Text style={styles.libraryName}>{item.name}</Text><Text style={styles.libraryMeta}>{item.englishName} · {item.defaultTarget}</Text></View><Text style={styles.libraryPlus}>＋</Text></Pressable>)}</ScrollView>
        </View></View>
      </Modal>

      <Modal visible={copyChoiceVisible} transparent animationType="fade" onRequestClose={() => setCopyChoiceVisible(false)}>
        <View style={styles.modalBackdrop}><View style={styles.confirmCard}>
          <Text style={styles.calendarTitle}>העתקת אימון קודם</Text>
          <Text style={styles.calendarHint}>האימון האחרון של {activeTemplate.name} מתאריך {copyChoiceDate}</Text>
          <Text style={styles.copyChoiceLabel}>תוספת למשקלים מספריים</Text>
          <View style={styles.copyChoiceRow}>
            {([0, 1.25, 2.5, 5] as const).map((increment) => (
              <Pressable key={increment} onPress={() => setCopyChoiceIncrement(increment)} style={[styles.copyChoiceButton, copyChoiceIncrement === increment && styles.copyChoiceButtonActive]}>
                <Text style={[styles.copyChoiceText, copyChoiceIncrement === increment && styles.copyChoiceTextActive]}>{increment === 0 ? "ללא תוספת" : `+${increment} ק״ג`}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.copyChoiceLabel}>תצוגה מקדימה לפני ההעתקה</Text>
          <ScrollView style={styles.copyPreviewList} nestedScrollEnabled>
            {copyPreviewRows.length === 0 ? <Text style={styles.calendarHint}>לא נמצאו סטים תואמים להצגה.</Text> : copyPreviewRows.map((row) => (
              <View key={row.id} style={styles.copyPreviewRow}>
                <Text style={styles.copyPreviewExercise}>{row.exerciseName} · סט {row.setNumber}</Text>
                <Text style={styles.copyPreviewValues}><Text style={styles.copyPreviewOld}>משקל: {row.oldWeight}</Text><Text style={styles.copyPreviewArrow}> ← </Text><Text style={row.changed ? styles.copyPreviewNew : styles.copyPreviewOld}>{row.newWeight} ק״ג</Text></Text>
                <Text style={styles.copyPreviewValues}><Text style={styles.copyPreviewOld}>חזרות: {row.currentReps}</Text><Text style={styles.copyPreviewArrow}> ← </Text><Text style={styles.copyPreviewNew}>{row.copiedReps}</Text></Text>
              </View>
            ))}
          </ScrollView>
          <Text style={styles.calendarHint}>המשקל מקבל את התוספת שנבחרה; החזרות שיועתקו מסומנות בירוק. אירובי ומשקל שאינו מספרי לא יקבלו תוספת.</Text>
          <View style={styles.modalActions}>
            <Pressable onPress={() => setCopyChoiceVisible(false)} style={styles.cancelButton}><Text style={styles.cancelText}>ביטול</Text></Pressable>
            <Pressable onPress={confirmCopyChoice} style={styles.saveDateButton}><Text style={styles.saveDateText}>אישור והעתקה</Text></Pressable>
          </View>
        </View></View>
      </Modal>
      <Modal visible={closeConfirmVisible} transparent animationType="fade" onRequestClose={() => setCloseConfirmVisible(false)}>
        <View style={styles.modalBackdrop}><View style={styles.confirmCard}><Text style={styles.calendarTitle}>לסגור את האימון?</Text><Text style={styles.calendarHint}>הנתונים שלא סומנו כהושלמו לא יישמרו.</Text><View style={styles.modalActions}><Pressable onPress={() => setCloseConfirmVisible(false)} style={styles.cancelButton}><Text style={styles.cancelText}>להישאר</Text></Pressable><Pressable onPress={() => { discardActiveWorkout(); router.replace("/(tabs)/workouts" as never); }} style={styles.dangerConfirm}><Text style={styles.dangerText}>סגור אימון</Text></Pressable></View></View></View>
      </Modal>
      <ActionToast message={toastMessage} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  closeButton: { minHeight: 40, paddingHorizontal: 12, justifyContent: "center" }, closeText: { color: "#F5B72C", fontSize: 13, fontWeight: "900" },
  kicker: { color: "#F5B72C", fontSize: 12, textAlign: "right", fontWeight: "800" }, title: { color: "#F7F9FC", fontSize: 26, fontWeight: "900", textAlign: "right" },
  saveStatusCard: { flexDirection: "row-reverse", alignItems: "center", gap: 9, backgroundColor: "#102E2A", borderColor: "#367B68", borderWidth: 1, borderRadius: 13, padding: 10, marginBottom: 10 }, saveStatusTextBlock: { flex: 1, alignItems: "flex-end", gap: 2 }, saveStatusTitle: { color: "#8BE8C4", fontSize: 11, fontWeight: "900", textAlign: "right" }, saveStatusSubtitle: { color: "#B8EADD", fontSize: 9, textAlign: "right" }, backupButton: { backgroundColor: "#253653", borderColor: "#5B9FE3", borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7, maxWidth: 128 }, backupButtonText: { color: "#D9EEFF", fontSize: 9, fontWeight: "900", textAlign: "center" },
  dateCard: { backgroundColor: "#16233A", borderColor: "#3D5D7E", borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 }, sectionTitle: { color: "#F7F9FC", fontSize: 13, fontWeight: "900", textAlign: "right" },
  dateActions: { flexDirection: "row-reverse", gap: 8 }, dateButton: { flex: 1, minHeight: 44, backgroundColor: "#0B1224", borderColor: "#52759C", borderWidth: 1, borderRadius: 10, justifyContent: "center", paddingHorizontal: 10 }, dateButtonText: { color: "#F7F9FC", textAlign: "right", writingDirection: "ltr", fontWeight: "800" },
  smallButton: { minHeight: 42, paddingHorizontal: 13, justifyContent: "center", alignItems: "center", backgroundColor: "#253653", borderColor: "#5B9FE3", borderWidth: 1, borderRadius: 9 }, smallButtonText: { color: "#D9EEFF", fontSize: 11, fontWeight: "900" }, hint: { color: "#AAB7C8", fontSize: 10, textAlign: "right" },
  progressCard: { backgroundColor: "#0F1C31", borderRadius: 12, padding: 10, marginTop: 10, gap: 6 }, progressTrack: { height: 8, borderRadius: 8, backgroundColor: "#24354E", overflow: "hidden" }, progressFill: { height: "100%", backgroundColor: "#F5B72C" }, progressText: { color: "#D9E2EF", fontSize: 10, textAlign: "right" }, restText: { color: "#F5B72C", fontWeight: "900", fontSize: 11, textAlign: "right" },
  content: { paddingVertical: 14, paddingBottom: 34, gap: 11 }, primaryButton: { minHeight: 46, backgroundColor: "#F5B72C", borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }, primaryButtonText: { color: "#0B1224", fontSize: 13, fontWeight: "900" },
  exerciseCard: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 15, padding: 12, gap: 9 }, exerciseHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }, exerciseName: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "right" }, exerciseEnglish: { color: "#8FD3F4", fontSize: 10, textAlign: "right", marginTop: 2 }, outlineButton: { borderColor: "#52759C", borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }, outlineButtonText: { color: "#D9EEFF", fontSize: 10, fontWeight: "900" }, editNameRow: { flexDirection: "row-reverse", gap: 7 }, nameInput: { flex: 1, minHeight: 42, backgroundColor: "#0B1224", borderColor: "#5B9FE3", borderWidth: 1, borderRadius: 9, color: "#F7F9FC", paddingHorizontal: 9 },
  exerciseActions: { flexDirection: "row-reverse", gap: 6, flexWrap: "wrap" }, exerciseFooterActions: { flexDirection: "row-reverse", justifyContent: "flex-start", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }, copyPreviousButton: { backgroundColor: "#173D55", borderColor: "#63B5F5", borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 }, copyPreviousText: { color: "#BDE4FF", fontSize: 10, fontWeight: "900" }, overloadButton: { backgroundColor: "#3B3320", borderColor: "#F5B72C", borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 }, overloadText: { color: "#FFD978", fontSize: 10, fontWeight: "900" }, actionButton: { backgroundColor: "#253653", borderColor: "#52759C", borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 }, actionText: { color: "#D9EEFF", fontSize: 10, fontWeight: "900" }, orderButton: { borderColor: "#5B9FE3", borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7 }, orderButtonText: { color: "#D9EEFF", fontSize: 10, fontWeight: "900" }, orderButtonDisabled: { opacity: 0.35 }, insertAfterButton: { backgroundColor: "#1E473E", borderColor: "#55D69C", borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 }, insertAfterText: { color: "#9BF3CD", fontSize: 10, fontWeight: "900" }, dangerButton: { backgroundColor: "#35222A", borderColor: "#D86582", borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 }, dangerText: { color: "#FFB1BE", fontSize: 10, fontWeight: "900" },
  setRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7, borderTopColor: "#2C3B55", borderTopWidth: 1, paddingTop: 8 }, setRowDone: { opacity: 0.62 }, setCheck: { width: 34, height: 34, borderRadius: 9, backgroundColor: "#253653", alignItems: "center", justifyContent: "center" }, setCheckDone: { backgroundColor: "#F5B72C" }, setCheckText: { color: "#F7F9FC", fontWeight: "900" }, setInputGroup: { flex: 1, gap: 3 }, setLabel: { color: "#AAB7C8", fontSize: 9, textAlign: "right" }, setInput: { height: 36, backgroundColor: "#0B1224", borderColor: "#3C4E6A", borderWidth: 1, borderRadius: 8, color: "#F7F9FC", textAlign: "center", paddingHorizontal: 5 }, setFieldWithArrows: { flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 4 }, arrowColumn: { gap: 3, paddingBottom: 1 }, arrowButton: { width: 24, height: 17, borderRadius: 5, backgroundColor: "#253653", alignItems: "center", justifyContent: "center" }, arrowText: { color: "#8FD3F4", fontSize: 9, fontWeight: "900" }, cardioFields: { flex: 1, gap: 7 }, cardioMeasureRow: { flexDirection: "row-reverse", gap: 7 }, cardioIntensityRow: { flexDirection: "row-reverse", gap: 5 }, cardioIntensity: { flex: 1, borderColor: "#3C4E6A", borderWidth: 1, borderRadius: 7, paddingVertical: 6, alignItems: "center" }, cardioIntensityActive: { backgroundColor: "#42D392", borderColor: "#42D392" }, cardioIntensityText: { color: "#AAB7C8", fontSize: 9, fontWeight: "900" }, cardioIntensityTextActive: { color: "#09221D" }, cardioNoteInput: { minHeight: 34, backgroundColor: "#0B1224", borderColor: "#3C4E6A", borderWidth: 1, borderRadius: 8, color: "#F7F9FC", textAlign: "right", paddingHorizontal: 7, fontSize: 10 }, removeSet: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#3A2028", alignItems: "center", justifyContent: "center" }, removeSetText: { color: "#FF93AB", fontSize: 19, fontWeight: "900" }, finishButton: { minHeight: 54, backgroundColor: "#F5B72C", borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 }, finishText: { color: "#0B1224", fontSize: 14, fontWeight: "900" }, methodButton: { minHeight: 34, maxWidth: 150, borderRadius: 9, borderWidth: 1, borderColor: "#526B8E", backgroundColor: "#101C31", paddingHorizontal: 8, alignItems: "center", justifyContent: "center" }, methodButtonSelected: { borderColor: "#D77CFF", backgroundColor: "#33265C" }, methodButtonText: { color: "#D8A2F4", fontSize: 9, fontWeight: "900", textAlign: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(5,10,24,0.8)", justifyContent: "center", padding: 18 }, modalBottomBackdrop: { flex: 1, backgroundColor: "rgba(5,10,24,0.8)", justifyContent: "flex-end" }, calendarCard: { backgroundColor: "#16233A", borderColor: "#5B9FE3", borderWidth: 1, borderRadius: 18, padding: 14, gap: 10 }, confirmCard: { backgroundColor: "#16233A", borderColor: "#F5B72C", borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 }, calendarTitle: { color: "#F7F9FC", fontSize: 19, fontWeight: "900", textAlign: "right" }, calendarHint: { color: "#AAB7C8", fontSize: 11, textAlign: "right", lineHeight: 16 }, monthNav: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }, navButton: { width: 42, height: 42, backgroundColor: "#253653", borderRadius: 10, alignItems: "center", justifyContent: "center" }, navText: { color: "#F5B72C", fontSize: 28, fontWeight: "900" }, monthTitle: { flex: 1, color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "center" },
  weekRow: { flexDirection: "row-reverse" }, weekday: { flex: 1, color: "#AAB7C8", fontSize: 11, fontWeight: "900", textAlign: "center" }, calendarRows: { gap: 5 }, calendarRow: { flexDirection: "row-reverse", minHeight: 40 }, daySlot: { flex: 1, alignItems: "center", justifyContent: "center" }, dayButton: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" }, dayButtonSelected: { backgroundColor: "#F5B72C" }, dayText: { color: "#F7F9FC", fontSize: 13, fontWeight: "900" }, dayTextSelected: { color: "#0B1224" }, modalActions: { flexDirection: "row-reverse", gap: 8, marginTop: 4 }, cancelButton: { flex: 1, minHeight: 44, borderColor: "#52759C", borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" }, cancelText: { color: "#D9EEFF", fontWeight: "900", fontSize: 11 }, saveDateButton: { flex: 1, minHeight: 44, backgroundColor: "#F5B72C", borderRadius: 10, alignItems: "center", justifyContent: "center" }, saveDateText: { color: "#0B1224", fontWeight: "900", fontSize: 11 }, dangerConfirm: { flex: 1, minHeight: 44, backgroundColor: "#3A2028", borderColor: "#D86582", borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" }, copyChoiceLabel: { color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right" }, copyChoiceRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 }, copyChoiceButton: { minHeight: 42, flexGrow: 1, flexBasis: "42%", borderColor: "#52759C", borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, copyChoiceButtonActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" }, copyChoiceText: { color: "#D9EEFF", fontSize: 10, fontWeight: "900" }, copyPreviewList: { maxHeight: 190, borderColor: "#2C3B55", borderWidth: 1, borderRadius: 10, padding: 7, backgroundColor: "#0B1224" }, copyPreviewRow: { borderBottomColor: "#263854", borderBottomWidth: 1, paddingVertical: 6, gap: 2 }, copyPreviewExercise: { color: "#8FD3F4", fontSize: 10, fontWeight: "900", textAlign: "right" }, copyPreviewValues: { color: "#D9EEFF", fontSize: 11, fontWeight: "900", textAlign: "right" }, copyPreviewOld: { color: "#AAB7C8" }, copyPreviewArrow: { color: "#F5B72C" }, copyPreviewNew: { color: "#55D69C" }, copyPreviewReps: { color: "#D9EEFF", fontWeight: "700" }, copyChoiceTextActive: { color: "#0B1224" },
  exercisePicker: { maxHeight: "80%", backgroundColor: "#16233A", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 15, gap: 9, borderColor: "#5B9FE3", borderWidth: 1 }, exercisePickerHeader: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }, pickerHint: { color: "#AAB7C8", fontSize: 10, textAlign: "right", marginTop: 3 }, customInput: { minHeight: 42, borderColor: "#3F76A7", borderWidth: 1, borderRadius: 9, backgroundColor: "#0B1224", color: "#F7F9FC", paddingHorizontal: 10 }, exerciseList: { maxHeight: 260 }, libraryExercise: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderTopColor: "#2C3B55", borderTopWidth: 1 }, libraryName: { color: "#F7F9FC", fontSize: 13, fontWeight: "800", textAlign: "right" }, libraryMeta: { color: "#8291A8", fontSize: 10, textAlign: "right", marginTop: 2 }, libraryPlus: { color: "#F5B72C", fontSize: 22, fontWeight: "900" },
  empty: { alignItems: "center", justifyContent: "center", flex: 1, paddingHorizontal: 24, gap: 10 }, emptyTitle: { color: "#F7F9FC", fontSize: 21, fontWeight: "900" }, emptyText: { color: "#AAB7C8", textAlign: "center", lineHeight: 20 },
});
