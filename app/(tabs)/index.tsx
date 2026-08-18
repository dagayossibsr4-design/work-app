import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { getTemplate, type WorkoutId, type WorkoutTemplate } from "@/lib/workout-data";
import { exerciseLibrary } from "@/lib/exercise-library";
import { calculateVolume, useWorkoutStore } from "@/lib/workout-store";
import { calculateFivePercentProgress } from "@/lib/workout-progression";
import { calculateProjectedVolume } from "@/lib/workout-volume";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";

const formatDate = (iso: string) => new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long" }).format(new Date(iso));

type TrainingMethod = { id: string; title: string; subtitle: string; templateIds: WorkoutId[]; accent: string; icon: IconSymbolName };
const selectedMethodStorageKey = "workout-tracker-selected-method-v1";
const selectedDayStorageKey = "workout-tracker-selected-days-v1";

const trainingMethods: TrainingMethod[] = [
  { id: "fixed", title: "התוכנית הקבועה שלי", subtitle: "Push · Pull · Legs לפי החלוקה הקיימת", templateIds: ["push1", "pull1", "legs1", "push2", "pull2", "legs2"], accent: "#F5B72C", icon: "dumbbell.fill" },
  { id: "abc", title: "ABC", subtitle: "A חזה ויד אחורית · B גב ויד קדמית · C כתפיים ורגליים", templateIds: ["abc-a", "abc-b", "abc-c"], accent: "#65BDF6", icon: "square.grid.2x2.fill" },
  { id: "abcd", title: "ABCD", subtitle: "A חזה · B גב · C כתפיים · D רגליים", templateIds: ["abcd-a", "abcd-b", "abcd-c", "abcd-d"], accent: "#C084FC", icon: "rectangle.split.3x1.fill" },
  { id: "ab", title: "AB", subtitle: "אימון גוף עליון ואימון גוף תחתון", templateIds: ["ab-upper", "ab-lower"], accent: "#42D392", icon: "arrow.up.and.down" },
  { id: "full-body", title: "Full Body", subtitle: "כל קבוצות השרירים באימון אחד", templateIds: ["full-body"], accent: "#22C55E", icon: "figure.run" },
  { id: "cardio", title: "אירובי", subtitle: "הליכון, ריצה, אופניים, אליפטי, חתירה, שחייה ועוד", templateIds: ["cardio", "cycling", "elliptical", "stairs", "treadmill", "outdoor-run", "walking", "rowing", "swimming", "hiit"], accent: "#F59E0B", icon: "bicycle" },
];

export default function HomeScreen() {
  const { sessions, startWorkoutFromTemplate, hydrated, templates, addCustomTemplate, updateTemplate } = useWorkoutStore();
  const [selectedMethodId, setSelectedMethodId] = useState("fixed");
  const [isSwitchingMethod, setIsSwitchingMethod] = useState(false);
  const [isCardioPickerOpen, setIsCardioPickerOpen] = useState(false);
  const [selectedDayByMethod, setSelectedDayByMethod] = useState<Record<string, WorkoutId>>({});
  useEffect(() => { void AsyncStorage.getItem(selectedMethodStorageKey).then((stored) => { if (stored) setSelectedMethodId(stored); }); void AsyncStorage.getItem(selectedDayStorageKey).then((stored) => { if (stored) { try { setSelectedDayByMethod(JSON.parse(stored) as Record<string, WorkoutId>); } catch { /* נתון ישן או פגום — נשארים בברירת המחדל */ } } }); }, []);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<WorkoutTemplate | null>(null);
  const [isPreviewEditing, setIsPreviewEditing] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const [replacementSearch, setReplacementSearch] = useState("");
  const [autoProgressMessage, setAutoProgressMessage] = useState("");
  const [customName, setCustomName] = useState("");
  const [customSearch, setCustomSearch] = useState("");
  const [customIcon, setCustomIcon] = useState<IconSymbolName>("dumbbell.fill");
  const [customColor, setCustomColor] = useState("#F5B72C");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const customMethods: TrainingMethod[] = templates.filter((template) => template.id.startsWith("custom-")).map((template) => ({ id: template.id, title: template.name, subtitle: template.focus, templateIds: [template.id], accent: template.accent, icon: (template.icon as IconSymbolName) || "dumbbell.fill" }));
  const methods = [...trainingMethods, ...customMethods];
  const selectedMethod = methods.find((method) => method.id === selectedMethodId) ?? methods[0];
  const selectedDayId = selectedDayByMethod[selectedMethod.id] ?? selectedMethod.templateIds[0];
  const selectedDayTemplate = templates.find((template) => template.id === selectedDayId) ?? getTemplate(selectedDayId) ?? templates.find((template) => template.id === selectedMethod.templateIds[0]);
  const filteredCustomExercises = exerciseLibrary.filter((item) => `${item.name} ${item.englishName} ${(item.aliases ?? []).join(" ")}`.toLowerCase().includes(customSearch.toLowerCase())).slice(0, 14);
  const filteredReplacementExercises = exerciseLibrary.filter((item) => `${item.name} ${item.englishName} ${(item.aliases ?? []).join(" ")}`.toLowerCase().includes(replacementSearch.toLowerCase())).slice(0, 8);
  const completedSets = sessions.reduce((sum, session) => sum + session.sets.filter((set) => set.completed).length, 0);
  const last = sessions[0];
  const previousSessionForPreview = previewTemplate ? sessions.find((session) => session.templateId === previewTemplate.id && Boolean(session.finishedAt)) : undefined;
  const projectedPreviewVolume = previewTemplate ? calculateProjectedVolume(previewTemplate, previousSessionForPreview) : 0;
  const previousPreviewVolume = previousSessionForPreview ? calculateVolume(previousSessionForPreview) : null;
  const previewVolumeDelta = previousPreviewVolume && previousPreviewVolume > 0 ? ((projectedPreviewVolume - previousPreviewVolume) / previousPreviewVolume) * 100 : null;
  const volumeChartMax = Math.max(previousPreviewVolume ?? 0, projectedPreviewVolume);
  const openPreview = (id: WorkoutId) => { setPreviewTemplate(templates.find((template) => template.id === id) ?? getTemplate(id)); setIsPreviewEditing(false); setEditingExerciseIndex(null); setReplacementSearch(""); setAutoProgressMessage(""); };
  const updatePreview = (updater: (template: WorkoutTemplate) => WorkoutTemplate) => setPreviewTemplate((current) => current ? updater(current) : current);
  const updatePreviewSetTarget = (exerciseIndex: number, setIndex: number, target: string) => updatePreview((template) => ({ ...template, exercises: template.exercises.map((exercise, index) => index !== exerciseIndex ? exercise : { ...exercise, sets: exercise.sets.map((set, currentIndex) => currentIndex === setIndex ? { ...set, target, note: undefined, suggestedWeight: undefined } : set) }) }));
  const addPreviewSet = (exerciseIndex: number) => updatePreview((template) => ({ ...template, exercises: template.exercises.map((exercise, index) => index !== exerciseIndex ? exercise : { ...exercise, sets: [...exercise.sets, { target: exercise.sets[exercise.sets.length - 1]?.target ?? "8–12" }] }) }));
  const removePreviewSet = (exerciseIndex: number, setIndex: number) => updatePreview((template) => ({ ...template, exercises: template.exercises.map((exercise, index) => index !== exerciseIndex || exercise.sets.length <= 1 ? exercise : { ...exercise, sets: exercise.sets.filter((_, currentIndex) => currentIndex !== setIndex) }) }));
  const replacePreviewExercise = (exerciseIndex: number, item: typeof exerciseLibrary[number]) => { updatePreview((template) => ({ ...template, exercises: template.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, name: item.name, englishName: item.englishName, note: item.note } : exercise) })); setEditingExerciseIndex(null); setReplacementSearch(""); };
  const addPreviewExercise = (item: typeof exerciseLibrary[number]) => { updatePreview((template) => template ? { ...template, exercises: [...template.exercises, { id: `${item.id}-preview-${Date.now()}`, name: item.name, englishName: item.englishName, note: item.note, sets: [{ target: item.defaultTarget }, { target: item.defaultTarget }] }] } : template); setEditingExerciseIndex(null); setReplacementSearch(""); };
  const removePreviewExercise = (exerciseIndex: number) => updatePreview((template) => template && template.exercises.length > 1 ? { ...template, exercises: template.exercises.filter((_, index) => index !== exerciseIndex) } : template);
  const applyAutoProgress = () => {
    if (!previewTemplate) return;
    let updatedSets = 0;
    let weightSets = 0;
    let repSets = 0;
    updatePreview((template) => ({ ...template, exercises: template.exercises.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set, setIndex) => { const previous = previousSessionForPreview?.sets.find((candidate) => candidate.exerciseId === exercise.id && candidate.setNumber === setIndex + 1); const progress = calculateFivePercentProgress(previous); if (!progress) return set; updatedSets += 1; if (progress.mode === "weight") weightSets += 1; else repSets += 1; return { ...set, target: progress.mode === "reps" ? progress.value : set.target, suggestedWeight: progress.mode === "weight" ? progress.value : set.suggestedWeight, note: progress.mode === "weight" ? `משקל יעד: ${progress.value} ק״ג` : set.note }; }) })) }));
    setAutoProgressMessage(updatedSets ? `עודכנו ${updatedSets} סטים · ${weightSets} לפי משקל ו־${repSets} לפי חזרות` : "אין נתוני משקל או חזרות מהאימון הקודם לעדכון");
  };
  const finishPreview = (saveChanges: boolean) => { if (!previewTemplate) return; if (saveChanges) updateTemplate(previewTemplate.id, previewTemplate); startWorkoutFromTemplate(previewTemplate); router.push("/active-workout" as never); setPreviewTemplate(null); setIsPreviewEditing(false); setEditingExerciseIndex(null); };
  const toggleCustomExercise = (id: string) => setSelectedExerciseIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const switchMethod = (methodId: string) => { if (methodId === "cardio") { setSelectedMethodId(methodId); void AsyncStorage.setItem(selectedMethodStorageKey, methodId); setIsCardioPickerOpen(true); return; } if (methodId === selectedMethodId) return; setIsSwitchingMethod(true); setSelectedMethodId(methodId); void AsyncStorage.setItem(selectedMethodStorageKey, methodId); setTimeout(() => setIsSwitchingMethod(false), 180); };
  const selectTrainingDay = (methodId: string, templateId: WorkoutId) => { setSelectedDayByMethod((current) => { const next = { ...current, [methodId]: templateId }; void AsyncStorage.setItem(selectedDayStorageKey, JSON.stringify(next)); return next; }); };
  const createCustomWorkout = () => {
    const name = customName.trim();
    const exercises = selectedExerciseIds.map((id) => exerciseLibrary.find((item) => item.id === id)).filter(Boolean).map((item) => ({ id: `${item!.id}-custom-${Date.now()}`, name: item!.name, englishName: item!.englishName, note: item!.note, sets: [{ target: item!.defaultTarget }, { target: item!.defaultTarget }] }));
    if (!name || exercises.length === 0) return;
    const template: WorkoutTemplate = { id: `custom-${Date.now()}`, name, focus: exercises.map((exercise) => exercise.name).slice(0, 3).join(" · "), accent: customColor, icon: customIcon, exercises };
    addCustomTemplate(template);
    setSelectedMethodId(template.id);
    setCustomName(""); setCustomSearch(""); setSelectedExerciseIds([]); setIsCreatorOpen(false);
  };
  return (
    <ScreenContainer containerClassName="bg-background" className="px-5 pt-4">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push("/menu" as never)} style={styles.menuButton}><Text style={styles.menuText}>☰ תפריט</Text></Pressable>
            <Pressable onPress={() => router.push("/(tabs)/meal-plan" as never)} style={styles.mealButton}><Text style={styles.mealButtonText}>תפריט 5 ארוחות</Text></Pressable>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>יומן האימונים</Text>
            <Text style={styles.title} numberOfLines={1}>מוכנים לעבוד?</Text>
            <Text style={styles.subtitle}>{hydrated ? "כל סט נשמר מיד במכשיר" : "טוען את היומן שלך…"}</Text><Text testID="home-build-stamp" style={styles.buildStamp}>גרסת התקנה {Constants.expoConfig?.version ?? "לא ידועה"} · Android build {Constants.expoConfig?.android?.versionCode ?? "לא ידוע"}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="פתח היסטוריית אימונים" onPress={() => router.push("/(tabs)/history" as never)} style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}><Text style={styles.statValue}>{sessions.length}</Text><Text style={styles.statLabel}>אימונים · פתח היסטוריה</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="פתח סטים שהושלמו בהיסטוריה" onPress={() => router.push("/(tabs)/history" as never)} style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}><Text style={styles.statValue}>{completedSets}</Text><Text style={styles.statLabel}>סטים שהושלמו · פירוט</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="פתח את האימון האחרון" onPress={() => router.push("/(tabs)/history" as never)} style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}><Text style={styles.statValue}>{last ? `${Math.round(calculateVolume(last))}` : "—"}</Text><Text style={styles.statLabel}>נפח אחרון · פרטים</Text></Pressable>
        </View>
        <Pressable onPress={() => router.push("/(tabs)/meal-plan" as never)} style={({ pressed }) => [styles.menuCard, pressed && styles.pressed]}>
          <View><Text style={styles.menuCardTitle}>תפריט ותזונה יומית</Text><Text style={styles.menuCardText}>מעקב 5 ארוחות לפי היעד שבמחשבון הקלורי</Text></View><Text style={styles.menuCardArrow}>‹</Text>
        </Pressable>
        <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>שיטת האימון</Text><Text style={styles.sectionHint}>בחר סדרה מהרשימה — ללא גרירה</Text></View><Text style={styles.sectionHint}>{methods.length} סדרות</Text></View>
        <Pressable accessibilityRole="button" onPress={() => setIsCreatorOpen(true)} style={({ pressed }) => [styles.creatorButton, pressed && styles.pressed]}><IconSymbol name="plus" size={20} color="#0B1224" /><Text style={styles.creatorButtonText}>צור תוכנית מותאמת</Text></Pressable>
        <View style={styles.methodList}>{methods.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`בחר סדרת אימון ${item.title}`} onPress={() => { if (item.id === "cardio") { setSelectedMethodId("cardio"); void AsyncStorage.setItem(selectedMethodStorageKey, "cardio"); setIsCardioPickerOpen(true); } else { switchMethod(item.id); } }} testID={item.id === "cardio" ? "cardio-method-card" : undefined} style={({ pressed }) => [styles.methodRow, { borderColor: selectedMethod.id === item.id ? item.accent : "#2C3B55" }, selectedMethod.id === item.id && { backgroundColor: `${item.accent}18` }, pressed && styles.pressed]}><View style={[styles.methodIcon, { backgroundColor: `${item.accent}24`, borderColor: `${item.accent}88` }]}><IconSymbol name={item.icon} size={22} color={item.accent} /></View><View style={styles.methodRowText}><Text style={styles.methodTitle}>{item.title}</Text><Text style={styles.methodSubtitle}>{item.subtitle}</Text><Text style={[styles.methodState, { color: item.accent }]}>{selectedMethod.id === item.id ? "✓ הסדרה הפעילה" : `${item.templateIds.length} אימונים · לחץ להצגה`}</Text></View><Text style={[styles.methodCount, { color: item.accent }]}>{item.templateIds.length}</Text></Pressable>)}</View>
        <View style={styles.selectedMethodHeader}><View><Text style={styles.sectionTitle}>{selectedMethod.title} · חלוקת האימונים</Text><Text style={styles.selectedMethodText}>{selectedMethod.subtitle}</Text></View><Text style={[styles.methodCount, { color: selectedMethod.accent }]}>{selectedMethod.templateIds.length} ימים</Text></View>
        <View style={styles.methodChangeHint}>{isSwitchingMethod ? <><ActivityIndicator size="small" color={selectedMethod.accent} /><Text style={[styles.methodChangeText, { color: selectedMethod.accent }]}>מעדכן את סדרת האימונים…</Text></> : <Text style={styles.methodChangeText}>הבחירה האחרונה נשמרת אוטומטית במכשיר</Text>}</View><Text style={styles.exercisePreviewHint}>כל כרטיס הוא יום/אימון בסדרה. אפשר לראות את התרגילים כאן לפני הבחירה.</Text>
        <View style={styles.dayTabs} accessibilityRole="tablist">{selectedMethod.templateIds.map((templateId, index) => { const template = templates.find((item) => item.id === templateId) ?? getTemplate(templateId); if (!template) return null; const tabLabel = selectedMethod.id === "fixed" || selectedMethod.id === "full-body" || selectedMethod.id === "cardio" ? template.name : String.fromCharCode(65 + index); const active = selectedDayId === template.id; return <Pressable key={template.id} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={`יום ${tabLabel}, ${template.name}`} onPress={() => selectTrainingDay(selectedMethod.id, template.id)} style={({ pressed }) => [styles.dayTab, active && { backgroundColor: selectedMethod.accent, borderColor: selectedMethod.accent }, pressed && styles.pressed]}><Text style={[styles.dayTabLabel, active && styles.dayTabLabelActive]}>{tabLabel}</Text><Text style={[styles.dayTabMeta, active && styles.dayTabMetaActive]}>{template.exercises.length} תרגילים</Text></Pressable>; })}</View>
        {selectedDayTemplate ? <Pressable accessibilityRole="button" accessibilityLabel={`פתח ${selectedDayTemplate.name} עם ${selectedDayTemplate.exercises.length} תרגילים`} onPress={() => openPreview(selectedDayTemplate.id)} style={({ pressed }) => [styles.templateCard, styles.selectedDayCard, { borderColor: `${selectedDayTemplate.accent}88` }, pressed && styles.pressed]}><View style={[styles.accent, { backgroundColor: selectedDayTemplate.accent }]} /><View style={styles.templateCardHeader}><Text style={styles.templateName}>{selectedDayTemplate.name}</Text><Text style={[styles.exerciseCount, { color: selectedDayTemplate.accent }]}>{selectedDayTemplate.exercises.length} תרגילים</Text></View><Text style={styles.templateFocus}>{selectedDayTemplate.focus}</Text><View style={styles.templateExercisePreview}>{selectedDayTemplate.exercises.map((exercise) => <Text key={exercise.id} style={styles.templateExerciseName}>• {exercise.name}</Text>)}</View><Text style={[styles.startText, { color: selectedDayTemplate.accent }]}>פתח תרגילים והתחל  ›</Text></Pressable> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="פתח פירוט האימון האחרון" onPress={() => router.push("/(tabs)/history" as never)} style={({ pressed }) => [styles.lastCard, pressed && styles.pressed]}><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>האימון האחרון · לחץ לפירוט</Text><Text style={styles.sectionHint}>{last ? formatDate(last.startedAt) : "עדיין אין נתונים"}</Text></View>{last ? <Text style={styles.lastText}>{last.templateId.toUpperCase()} · {last.sets.filter((set) => set.completed).length} סטים הושלמו · הצג תרגילים וסטים</Text> : <Text style={styles.lastText}>אחרי האימון הראשון שלך יופיע כאן סיכום קצר.</Text>}</Pressable>
        {Platform.OS === "web" && isCardioPickerOpen ? <View style={styles.webCardioPicker}><View style={styles.modalHeader}><View><Text style={styles.modalTitle}>בחר סוג אירובי</Text><Text style={styles.previewSubtitle}>בחר פעילות כדי להתחיל מיד ולשמור את הנתונים בניתוח</Text></View><Pressable accessibilityRole="button" accessibilityLabel="סגור בחירת אירובי" onPress={() => setIsCardioPickerOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>{["cardio", "cycling", "elliptical", "stairs", "treadmill", "outdoor-run", "walking", "rowing", "swimming", "hiit"].map((id) => { const template = templates.find((item) => item.id === id) ?? getTemplate(id); if (!template) return null; return <Pressable key={`web-${id}`} accessibilityRole="button" accessibilityLabel={`בחר ${template.name}`} onPress={() => { selectTrainingDay("cardio", template.id); setIsCardioPickerOpen(false); openPreview(template.id); }} style={({ pressed }) => [styles.cardioOption, { borderColor: `${template.accent}99` }, pressed && styles.pressed]}><View style={[styles.cardioOptionIcon, { backgroundColor: `${template.accent}24`, borderColor: template.accent }]}><IconSymbol name="figure.run" size={26} color={template.accent} /></View><View style={styles.cardioOptionText}><Text style={styles.cardioOptionTitle}>{template.name}</Text><Text style={styles.cardioOptionSubtitle}>{template.focus}</Text><Text style={[styles.cardioOptionAction, { color: template.accent }]}>הגדר והתחל ›</Text></View></Pressable>; })}</View> : null}
      </ScrollView>
      <Modal visible={isCardioPickerOpen && Platform.OS !== "web"} animationType="slide" transparent onRequestClose={() => setIsCardioPickerOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.cardioPickerModal}><View style={styles.modalHeader}><View><Text style={styles.modalTitle}>בחר סוג אירובי</Text><Text style={styles.previewSubtitle}>בחר פעילות כדי להתחיל מיד ולשמור את הנתונים בניתוח</Text></View><Pressable accessibilityRole="button" accessibilityLabel="סגור בחירת אירובי" onPress={() => setIsCardioPickerOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View><ScrollView contentContainerStyle={styles.cardioPickerContent}>{["cardio", "cycling", "elliptical", "stairs", "treadmill", "outdoor-run", "walking", "rowing", "swimming", "hiit"].map((id) => { const template = templates.find((item) => item.id === id) ?? getTemplate(id); if (!template) return null; return <Pressable key={id} accessibilityRole="button" accessibilityLabel={`בחר ${template.name}`} onPress={() => { selectTrainingDay("cardio", template.id); setIsCardioPickerOpen(false); openPreview(template.id); }} style={({ pressed }) => [styles.cardioOption, { borderColor: `${template.accent}99` }, pressed && styles.pressed]}><View style={[styles.cardioOptionIcon, { backgroundColor: `${template.accent}24`, borderColor: template.accent }]}><IconSymbol name={id === "cycling" ? "bicycle" : id === "elliptical" ? "figure.run" : id === "stairs" ? "stairs" : id === "rowing" ? "rowing" : id === "swimming" ? "water" : id === "treadmill" || id === "outdoor-run" || id === "walking" ? "figure.run" : id === "hiit" ? "bolt.fill" : "figure.run"} size={26} color={template.accent} /></View><View style={styles.cardioOptionText}><Text style={styles.cardioOptionTitle}>{template.name}</Text><Text style={styles.cardioOptionSubtitle}>{template.focus}</Text><Text style={[styles.cardioOptionAction, { color: template.accent }]}>הגדר והתחל ›</Text></View></Pressable>; })}<View style={styles.cardioMoreCard}><Text style={styles.cardioMoreTitle}>אפשרויות נוספות</Text><Text style={styles.cardioMoreText}>ריצה בחוץ, הליכה מהירה, חתירה, שחייה ואינטרוולים זמינים להוספה דרך אירובי מותאם.</Text></View></ScrollView></View></View>
      </Modal>
      <Modal visible={Boolean(previewTemplate)} animationType="slide" transparent onRequestClose={() => setPreviewTemplate(null)}>
        <View style={styles.modalBackdrop}><View style={styles.previewModal}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.previewContent}>
          <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>{previewTemplate?.name}</Text><Text style={styles.previewSubtitle}>{previewTemplate?.focus}</Text></View><View style={styles.previewHeaderActions}><Pressable accessibilityRole="button" onPress={() => { setIsPreviewEditing((current) => !current); setEditingExerciseIndex(null); setReplacementSearch(""); }} style={styles.editPreviewButton}><Text style={styles.editPreviewText}>{isPreviewEditing ? "סיום עריכה" : "עריכה"}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="סגור תצוגה מקדימה" onPress={() => { setPreviewTemplate(null); setIsPreviewEditing(false); }} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View></View>
          <View style={styles.previewSummary}><Text style={styles.previewSummaryValue}>{previewTemplate?.exercises.length ?? 0}</Text><Text style={styles.previewSummaryLabel}>תרגילים</Text><Text style={styles.previewSummaryValue}>{previewTemplate?.exercises.reduce((total, exercise) => total + exercise.sets.length, 0) ?? 0}</Text><Text style={styles.previewSummaryLabel}>סטים</Text></View>
          {isPreviewEditing ? <><View style={styles.volumeSummary}><View><Text style={styles.volumeSummaryLabel}>נפח צפוי</Text><Text style={styles.volumeSummaryValue}>{Math.round(projectedPreviewVolume).toLocaleString("he-IL")} ק״ג</Text></View><Text style={styles.volumeSummaryCompare}>{previousPreviewVolume === null ? "אין אימון קודם להשוואה" : `קודם: ${Math.round(previousPreviewVolume).toLocaleString("he-IL")} ק״ג`}</Text><Text style={[styles.volumeSummaryDelta, { color: previewVolumeDelta === null ? "#AAB7C8" : previewVolumeDelta >= 0 ? "#42D392" : "#FB7185" }]}>{previewVolumeDelta === null ? "" : `${previewVolumeDelta >= 0 ? "↑" : "↓"} ${Math.abs(previewVolumeDelta).toFixed(1)}%`}</Text></View><View style={styles.volumeBars} accessibilityLabel="השוואת נפח האימון הקודם והנוכחי"><View style={styles.volumeBarColumn}><Text style={styles.volumeBarValue}>{previousPreviewVolume === null ? "—" : `${Math.round(previousPreviewVolume)} ק״ג`}</Text><View style={styles.volumeBarTrack}><View style={[styles.volumeBar, styles.previousVolumeBar, { height: `${volumeChartMax ? Math.max(8, (previousPreviewVolume ?? 0) / volumeChartMax * 100) : 8}%` }]} /></View><Text style={styles.volumeBarLabel}>אימון קודם</Text></View><View style={styles.volumeBarColumn}><Text style={styles.volumeBarValue}>{Math.round(projectedPreviewVolume)} ק״ג</Text><View style={styles.volumeBarTrack}><View style={[styles.volumeBar, styles.currentVolumeBar, { height: `${volumeChartMax ? Math.max(8, projectedPreviewVolume / volumeChartMax * 100) : 8}%` }]} /></View><Text style={styles.volumeBarLabel}>אימון נוכחי</Text></View></View></> : null}
          {isPreviewEditing ? <View style={styles.autoProgressPanel}><Pressable accessibilityRole="button" onPress={applyAutoProgress} style={({ pressed }) => [styles.autoProgressButton, pressed && styles.pressed]}><Text style={styles.autoProgressButtonText}>העלאת עומס אוטומטית · 5%</Text></Pressable><Text style={styles.autoProgressDescription}>מעלה משקל כשיש נתון קודם, או חזרות כשאין משקל</Text>{autoProgressMessage ? <Text style={styles.autoProgressMessage}>{autoProgressMessage}</Text> : null}</View> : null}
          <Text style={styles.previewSectionTitle}>תרגילי האימון</Text>
          <View style={styles.previewExerciseList}>{previewTemplate?.exercises.map((exercise, index) => <View key={exercise.id} style={styles.previewExercise}><View style={styles.previewExerciseHeader}><View style={[styles.exerciseNumber, { backgroundColor: previewTemplate.accent }]}><Text style={styles.exerciseNumberText}>{index + 1}</Text></View><View style={styles.exerciseChoiceText}><Text style={styles.previewExerciseName}>{exercise.name}</Text>{exercise.note ? <Text style={styles.previewNote}>{exercise.note}</Text> : null}</View></View>{isPreviewEditing ? <><View style={styles.previousPerformance}>{previousSessionForPreview?.sets.some((set) => set.exerciseId === exercise.id) ? <><Text style={styles.previousPerformanceTitle}>מהאימון הקודם</Text><View style={styles.previousPerformanceRow}>{previousSessionForPreview.sets.filter((set) => set.exerciseId === exercise.id).map((set, setIndex) => <Text key={`${exercise.id}-previous-${setIndex}`} style={styles.previousPerformanceText}>סט {setIndex + 1}: {set.weight || "—"} ק״ג · {set.reps || "—"} חזרות</Text>)}</View></> : <Text style={styles.previousPerformanceEmpty}>אין נתון קודם לתרגיל הזה</Text>}</View><View style={styles.editActionRow}><Pressable onPress={() => setEditingExerciseIndex(editingExerciseIndex === index ? null : index)} style={styles.smallEditButton}><Text style={styles.smallEditText}>החלף</Text></Pressable><Pressable onPress={() => removePreviewExercise(index)} style={styles.smallRemoveButton}><Text style={styles.smallRemoveText}>הסר תרגיל</Text></Pressable></View><View style={styles.previewSetRow}>{exercise.sets.map((set, setIndex) => <View key={`${exercise.id}-${setIndex}`} style={[styles.editSet, set.note ? styles.autoUpdatedSet : null]}>{set.note ? <Text style={styles.autoUpdatedBadge}>↑ עודכן ב־5%</Text> : null}<Text style={styles.previewSetLabel}>סט {setIndex + 1}</Text><TextInput value={set.target} onChangeText={(value) => updatePreviewSetTarget(index, setIndex, value)} style={styles.setTargetInput} textAlign="center" />{set.note ? <Text style={styles.autoProgressHint}>{set.note}</Text> : null}<Pressable onPress={() => removePreviewSet(index, setIndex)} disabled={exercise.sets.length <= 1} style={styles.removeSetButton}><Text style={styles.removeSetText}>−</Text></Pressable></View>)}</View><Pressable onPress={() => addPreviewSet(index)} style={styles.addSetButton}><Text style={styles.addSetText}>+ הוסף סט</Text></Pressable>{editingExerciseIndex === index ? <View style={styles.replacementBox}><TextInput value={replacementSearch} onChangeText={setReplacementSearch} placeholder="חפש תרגיל חלופי" placeholderTextColor="#718096" style={styles.replacementInput} textAlign="right" />{filteredReplacementExercises.map((item) => <Pressable key={item.id} onPress={() => replacePreviewExercise(index, item)} style={styles.replacementItem}><Text style={styles.replacementItemText}>{item.name}</Text><Text style={styles.replacementCategory}>{item.category}</Text></Pressable>)}</View> : null}</> : <View style={styles.previewSetRow}>{exercise.sets.map((set, setIndex) => <View key={`${exercise.id}-${setIndex}`} style={styles.previewSet}><Text style={styles.previewSetLabel}>סט {setIndex + 1}</Text><Text style={styles.previewSetTarget}>{set.target}</Text></View>)}</View>}</View>)}</View>{isPreviewEditing ? <><Pressable onPress={() => { setEditingExerciseIndex(-1); setReplacementSearch(""); }} style={styles.addExercisePreviewButton}><Text style={styles.addExercisePreviewText}>+ הוסף תרגיל</Text></Pressable>{editingExerciseIndex === -1 ? <View style={styles.replacementBox}><TextInput value={replacementSearch} onChangeText={setReplacementSearch} placeholder="חפש תרגיל להוספה" placeholderTextColor="#718096" style={styles.replacementInput} textAlign="right" />{filteredReplacementExercises.map((item) => <Pressable key={item.id} onPress={() => addPreviewExercise(item)} style={styles.replacementItem}><Text style={styles.replacementItemText}>{item.name}</Text><Text style={styles.replacementCategory}>{item.category}</Text></Pressable>)}</View> : null}</> : null}
          <View style={styles.previewActions}>{isPreviewEditing ? <><Pressable accessibilityRole="button" onPress={() => { setIsPreviewEditing(false); setEditingExerciseIndex(null); setReplacementSearch(""); }} style={styles.previewBackButton}><Text style={styles.previewBackText}>בטל שינויים</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setIsPreviewEditing(false)} style={[styles.previewStartButton, { backgroundColor: previewTemplate?.accent ?? "#F5B72C" }]}><Text style={styles.previewStartText}>שמור לתצוגה</Text></Pressable></> : <><Pressable accessibilityRole="button" onPress={() => setPreviewTemplate(null)} style={styles.previewBackButton}><Text style={styles.previewBackText}>חזרה</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { if (previewTemplate) finishPreview(previewTemplate.id.startsWith("custom-")); }} style={[styles.previewStartButton, { backgroundColor: previewTemplate?.accent ?? "#F5B72C" }]}><Text style={styles.previewStartText}>התחל אימון</Text></Pressable></>}</View>
        </ScrollView></View></View>
      </Modal>
      <Modal visible={isCreatorOpen} animationType="slide" transparent onRequestClose={() => setIsCreatorOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.creatorModal}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.creatorContent}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>תוכנית חדשה</Text><Pressable onPress={() => setIsCreatorOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>
          <Text style={styles.fieldLabel}>שם התוכנית</Text><TextInput value={customName} onChangeText={setCustomName} placeholder="לדוגמה: כוח וידיים" placeholderTextColor="#718096" style={styles.creatorInput} textAlign="right" />
          <Text style={styles.fieldLabel}>בחר אייקון</Text><View style={styles.optionRow}>{(["dumbbell.fill", "square.grid.2x2.fill", "figure.run", "bicycle"] as IconSymbolName[]).map((icon) => <Pressable key={icon} accessibilityRole="button" onPress={() => setCustomIcon(icon)} style={[styles.iconChoice, customIcon === icon && styles.selectedIconChoice]}><IconSymbol name={icon} size={22} color={customIcon === icon ? "#0B1224" : "#F7F9FC"} /></Pressable>)}</View>
          <Text style={styles.fieldLabel}>בחר צבע</Text><View style={styles.optionRow}>{["#F5B72C", "#65BDF6", "#C084FC", "#42D392", "#FB7185", "#F59E0B"].map((color) => <Pressable key={color} accessibilityRole="button" onPress={() => setCustomColor(color)} style={[styles.colorChoice, { backgroundColor: color }, customColor === color && styles.selectedColorChoice]} />)}</View>
          <Text style={styles.fieldLabel}>בחר תרגילים ({selectedExerciseIds.length})</Text><TextInput value={customSearch} onChangeText={setCustomSearch} placeholder="חפש תרגיל בעברית או באנגלית" placeholderTextColor="#718096" style={styles.creatorInput} textAlign="right" />
          <View style={styles.exercisePicker}>{filteredCustomExercises.map((exercise) => { const selected = selectedExerciseIds.includes(exercise.id); return <Pressable key={exercise.id} onPress={() => toggleCustomExercise(exercise.id)} style={[styles.exerciseChoice, selected && { borderColor: customColor, backgroundColor: `${customColor}18` }]}><View style={[styles.checkCircle, selected && { backgroundColor: customColor }]}><Text style={styles.checkText}>{selected ? "✓" : ""}</Text></View><View style={styles.exerciseChoiceText}><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseCategory}>{exercise.category} · יעד {exercise.defaultTarget}</Text></View></Pressable>; })}</View>
          <Pressable accessibilityRole="button" disabled={!customName.trim() || selectedExerciseIds.length === 0} onPress={createCustomWorkout} style={({ pressed }) => [styles.saveCreatorButton, { backgroundColor: customName.trim() && selectedExerciseIds.length ? customColor : "#334155" }, pressed && styles.pressed]}><Text style={styles.saveCreatorText}>הוסף לקרוסלה</Text></Pressable>
        </ScrollView></View></View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 28, gap: 22 },
  header: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 12 },
  titleBlock: { flex: 1, minWidth: 0, alignItems: "flex-end" },
  headerActions: { alignItems: "flex-end", gap: 8 },
  menuButton: { backgroundColor: "#253653", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  menuText: { color: "#F5B72C", fontSize: 11, fontWeight: "900" },
  mealButton: { borderColor: "#3F76A7", borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  mealButtonText: { color: "#A9DACA", fontSize: 10, fontWeight: "800" },
  eyebrow: { color: "#F5B72C", fontSize: 14, fontWeight: "700", textAlign: "right" },
  title: { color: "#F7F9FC", fontSize: 24, lineHeight: 30, fontWeight: "800", marginTop: 4, textAlign: "right" },
  subtitle: { color: "#AAB7C8", fontSize: 13, marginTop: 6, textAlign: "right" },
  buildStamp: { color: "#718096", fontSize: 9, marginTop: 5, textAlign: "right", letterSpacing: 0.2 },
  logoMark: { width: 54, height: 54, borderRadius: 16, backgroundColor: "#F5B72C", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#0B1224", fontSize: 28, fontWeight: "900" },
  statsRow: { flexDirection: "row-reverse", gap: 10 },
  statCard: { flex: 1, backgroundColor: "#16233A", borderRadius: 16, paddingVertical: 15, alignItems: "center", borderWidth: 1, borderColor: "#2C3B55" },
  statValue: { color: "#F7F9FC", fontSize: 21, fontWeight: "800" },
  statLabel: { color: "#AAB7C8", fontSize: 11, marginTop: 5, textAlign: "center" },
  menuCard: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1C3152", borderColor: "#3F76A7", borderWidth: 1, borderRadius: 16, padding: 15 },
  menuCardTitle: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "right" },
  menuCardText: { color: "#AAB7C8", fontSize: 11, marginTop: 4, textAlign: "right" },
  menuCardArrow: { color: "#F5B72C", fontSize: 25, fontWeight: "900" },
  sectionHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: "#F7F9FC", fontSize: 18, fontWeight: "800", textAlign: "right" },
  sectionHint: { color: "#AAB7C8", fontSize: 12 },
  creatorButton: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#F5B72C", borderRadius: 14, paddingVertical: 12 },
  creatorButtonText: { color: "#0B1224", fontSize: 13, fontWeight: "900" },
  methodCarousel: { paddingHorizontal: 4, gap: 10 },
  methodList: { gap: 8 },
  methodRow: { flexDirection: "row-reverse", alignItems: "center", gap: 11, backgroundColor: "#16233A", borderRadius: 15, padding: 12, borderWidth: 1 },
  methodRowText: { flex: 1, minWidth: 0 },
  exercisePreviewHint: { color: "#AAB7C8", fontSize: 11, textAlign: "right", lineHeight: 17 },
  methodChangeHint: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-start", gap: 7, minHeight: 20 },
  methodChangeText: { color: "#7E8DA4", fontSize: 10, textAlign: "right" },
  dayTabs: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7, paddingVertical: 2 },
  dayTab: { flexGrow: 1, minWidth: 62, backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 11, paddingVertical: 8, paddingHorizontal: 7, alignItems: "center", gap: 2 },
  dayTabLabel: { color: "#F7F9FC", fontSize: 13, fontWeight: "900" },
  dayTabLabelActive: { color: "#0B1224" },
  dayTabMeta: { color: "#AAB7C8", fontSize: 9 },
  dayTabMetaActive: { color: "#0B1224" },
  selectedDayCard: { width: "100%" },
  templateCardHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 6 },
  exerciseCount: { fontSize: 10, fontWeight: "900" },
  templateExercisePreview: { marginTop: 8, gap: 3 },
  templateExerciseName: { color: "#C7D4E5", fontSize: 10, textAlign: "right" },
  moreExercises: { color: "#F5B72C", fontSize: 10, fontWeight: "800", textAlign: "right", marginTop: 2 },
  methodCard: { width: 286, minHeight: 136, backgroundColor: "#16233A", borderRadius: 18, padding: 16, borderWidth: 1, justifyContent: "center" },
  methodTopRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  methodIcon: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  methodAccent: { width: 38, height: 5, borderRadius: 3 },
  methodTitle: { color: "#F7F9FC", fontSize: 21, fontWeight: "900", textAlign: "right" },
  methodSubtitle: { color: "#AAB7C8", fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 6 },
  methodState: { fontSize: 11, fontWeight: "900", textAlign: "right", marginTop: 11 },
  selectedMethodHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  selectedMethodText: { color: "#AAB7C8", fontSize: 11, textAlign: "right", marginTop: 3, maxWidth: 280 },
  methodCount: { fontSize: 12, fontWeight: "900" },
  templateGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 12 },
  templateCard: { width: "48%", minHeight: 142, backgroundColor: "#16233A", borderRadius: 18, padding: 15, borderWidth: 1, overflow: "hidden" },
  accent: { width: 32, height: 5, borderRadius: 3, alignSelf: "flex-end", marginBottom: 14 },
  templateName: { color: "#F7F9FC", fontSize: 19, fontWeight: "800", textAlign: "right" },
  templateFocus: { color: "#AAB7C8", fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 5, minHeight: 34 },
  startText: { fontSize: 12, fontWeight: "800", textAlign: "right", marginTop: 11 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  lastCard: { backgroundColor: "#16233A", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#2C3B55", gap: 13 },
  lastText: { color: "#AAB7C8", fontSize: 13, textAlign: "right" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(3, 8, 20, 0.78)", justifyContent: "flex-end" },
  webCardioPicker: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 999, maxHeight: "88%", overflow: "scroll", backgroundColor: "#101A30", borderColor: "#5278A8", borderWidth: 1, borderRadius: 18, padding: 15, gap: 10 }, cardioPickerModal: { maxHeight: "88%", backgroundColor: "#101B31", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: "#334155", padding: 18 }, cardioPickerContent: { paddingBottom: 20 }, cardioOption: { position: "relative", flexDirection: "row-reverse", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 16, backgroundColor: "#16233A", padding: 14, marginBottom: 10, minHeight: 82 }, cardioOptionIcon: { width: 52, height: 52, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" }, cardioOptionText: { flex: 1, alignItems: "flex-end" }, cardioOptionTitle: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "right" }, cardioOptionSubtitle: { color: "#AAB7C8", fontSize: 11, textAlign: "right", marginTop: 3 }, cardioOptionAction: { fontSize: 11, fontWeight: "900", marginTop: 7 }, cardioMoreCard: { backgroundColor: "#0B1224", borderRadius: 14, padding: 14, marginTop: 2 }, cardioMoreTitle: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" }, cardioMoreText: { color: "#AAB7C8", fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 5 },
  previewModal: { maxHeight: "88%", backgroundColor: "#101B31", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: "#334155" },
  previewContent: { padding: 20, gap: 14, paddingBottom: 30 },
  previewSubtitle: { color: "#AAB7C8", fontSize: 11, textAlign: "right", marginTop: 4 },
  previewSummary: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-around", backgroundColor: "#16233A", borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#2C3B55" },
  previewSummaryValue: { color: "#F7F9FC", fontSize: 20, fontWeight: "900" },
  previewSummaryLabel: { color: "#AAB7C8", fontSize: 11, marginHorizontal: 4 },
  volumeSummary: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: "#1B2B45", borderRadius: 13, borderWidth: 1, borderColor: "#3B82F6", paddingVertical: 10, paddingHorizontal: 12, gap: 10 },
  volumeSummaryLabel: { color: "#AAB7C8", fontSize: 10, textAlign: "right" },
  volumeSummaryValue: { color: "#F7F9FC", fontSize: 18, fontWeight: "900", textAlign: "right" },
  volumeSummaryCompare: { color: "#C7D4E5", fontSize: 10, flex: 1, textAlign: "right" },
  volumeSummaryDelta: { fontSize: 14, fontWeight: "900" },
  volumeBars: { flexDirection: "row-reverse", alignItems: "flex-end", justifyContent: "space-around", backgroundColor: "#111F35", borderRadius: 13, borderWidth: 1, borderColor: "#2C3B55", paddingTop: 10, paddingHorizontal: 18, minHeight: 126 },
  volumeBarColumn: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  volumeBarValue: { color: "#C7D4E5", fontSize: 9, fontWeight: "800" },
  volumeBarTrack: { height: 72, width: 32, justifyContent: "flex-end", backgroundColor: "#253653", borderRadius: 8, overflow: "hidden" },
  volumeBar: { width: "100%", borderRadius: 8 },
  previousVolumeBar: { backgroundColor: "#7DD3FC" },
  currentVolumeBar: { backgroundColor: "#F5B72C" },
  volumeBarLabel: { color: "#AAB7C8", fontSize: 9, textAlign: "center" },
  autoProgressPanel: { backgroundColor: "#172A36", borderRadius: 13, borderWidth: 1, borderColor: "#2F6B78", padding: 10, gap: 6 },
  autoProgressButton: { backgroundColor: "#F5B72C", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  autoProgressButtonText: { color: "#0B1224", fontSize: 12, fontWeight: "900" },
  autoProgressDescription: { color: "#B7D9E2", fontSize: 10, textAlign: "right" },
  autoProgressMessage: { color: "#7CE2A2", fontSize: 10, fontWeight: "800", textAlign: "right" },
  previewSectionTitle: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "right" },
  previewExerciseList: { gap: 9 },
  previewExercise: { backgroundColor: "#16233A", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#2C3B55", gap: 10 },
  previewExerciseHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  exerciseNumber: { width: 27, height: 27, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  exerciseNumberText: { color: "#0B1224", fontSize: 12, fontWeight: "900" },
  previewExerciseName: { color: "#F7F9FC", fontSize: 13, fontWeight: "800", textAlign: "right" },
  previewNote: { color: "#F5B72C", fontSize: 10, textAlign: "right", marginTop: 3 },
  previewSetRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
  previewSet: { minWidth: 70, backgroundColor: "#0F1A2E", borderRadius: 9, paddingVertical: 7, paddingHorizontal: 8, alignItems: "center" },
  previousPerformance: { backgroundColor: "#0D1D2A", borderRadius: 9, borderWidth: 1, borderColor: "#23445A", padding: 8, gap: 5 },
  previousPerformanceTitle: { color: "#65BDF6", fontSize: 10, fontWeight: "900", textAlign: "right" },
  previousPerformanceRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  previousPerformanceText: { color: "#C7E8F7", fontSize: 10, textAlign: "right" },
  previousPerformanceEmpty: { color: "#718096", fontSize: 10, textAlign: "right" },
  editActionRow: { flexDirection: "row-reverse", gap: 8, justifyContent: "flex-start" },
  smallEditButton: { backgroundColor: "#253653", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  smallEditText: { color: "#65BDF6", fontSize: 10, fontWeight: "900" },
  smallRemoveButton: { backgroundColor: "#3A202A", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  smallRemoveText: { color: "#FB7185", fontSize: 10, fontWeight: "900" },
  editSet: { minWidth: 74, backgroundColor: "#0F1A2E", borderRadius: 9, padding: 7, alignItems: "center", gap: 5 },
  autoUpdatedSet: { backgroundColor: "#203A2B", borderColor: "#42D392", borderWidth: 1 },
  autoUpdatedBadge: { color: "#42D392", fontSize: 9, fontWeight: "900", textAlign: "center" },
  setTargetInput: { width: 62, color: "#F7F9FC", borderWidth: 1, borderColor: "#475569", borderRadius: 6, paddingVertical: 4, paddingHorizontal: 3, fontSize: 11 },
  autoProgressHint: { color: "#F5B72C", fontSize: 9, textAlign: "center", fontWeight: "800" },
  removeSetButton: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#3A202A", alignItems: "center", justifyContent: "center" },
  removeSetText: { color: "#FB7185", fontSize: 16, lineHeight: 17, fontWeight: "900" },
  addSetButton: { alignSelf: "flex-start", paddingVertical: 5, paddingHorizontal: 8 },
  addSetText: { color: "#65BDF6", fontSize: 10, fontWeight: "800" },
  replacementBox: { gap: 6, backgroundColor: "#0F1A2E", borderRadius: 10, padding: 8 },
  replacementInput: { backgroundColor: "#16233A", color: "#F7F9FC", borderWidth: 1, borderColor: "#334155", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 8, fontSize: 11 },
  replacementItem: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#243550" },
  replacementItemText: { color: "#F7F9FC", fontSize: 11, fontWeight: "700", textAlign: "right", flex: 1 },
  replacementCategory: { color: "#AAB7C8", fontSize: 9, marginLeft: 8 },
  addExercisePreviewButton: { borderWidth: 1, borderStyle: "dashed", borderColor: "#65BDF6", borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  addExercisePreviewText: { color: "#65BDF6", fontSize: 12, fontWeight: "900" },
  previewSetLabel: { color: "#718096", fontSize: 9 },
  previewSetTarget: { color: "#F7F9FC", fontSize: 11, fontWeight: "800", marginTop: 2 },
  previewActions: { flexDirection: "row-reverse", gap: 10, marginTop: 3 },
  previewBackButton: { flex: 1, borderWidth: 1, borderColor: "#475569", borderRadius: 13, alignItems: "center", justifyContent: "center", paddingVertical: 13 },
  previewBackText: { color: "#CBD5E1", fontSize: 13, fontWeight: "800" },
  previewStartButton: { flex: 1.5, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingVertical: 13 },
  previewStartText: { color: "#0B1224", fontSize: 13, fontWeight: "900" },
  creatorModal: { maxHeight: "92%", backgroundColor: "#101B31", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: "#334155" },
  creatorContent: { padding: 20, gap: 14, paddingBottom: 34 },
  modalHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  previewHeaderActions: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  editPreviewButton: { backgroundColor: "#253653", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  editPreviewText: { color: "#F5B72C", fontSize: 11, fontWeight: "900" },
  modalTitle: { color: "#F7F9FC", fontSize: 22, fontWeight: "900", textAlign: "right" },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#253653", alignItems: "center", justifyContent: "center" },
  closeText: { color: "#F7F9FC", fontSize: 25, lineHeight: 27 },
  fieldLabel: { color: "#F7F9FC", fontSize: 13, fontWeight: "800", textAlign: "right", marginTop: 4 },
  creatorInput: { backgroundColor: "#16233A", color: "#F7F9FC", borderColor: "#334155", borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 13 },
  optionRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  iconChoice: { width: 48, height: 44, borderRadius: 13, borderWidth: 1, borderColor: "#334155", backgroundColor: "#16233A", alignItems: "center", justifyContent: "center" },
  selectedIconChoice: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
  colorChoice: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "transparent" },
  selectedColorChoice: { borderColor: "#F7F9FC", transform: [{ scale: 1.12 }] },
  exercisePicker: { gap: 8 },
  exerciseChoice: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#16233A", borderWidth: 1, borderColor: "#2C3B55", borderRadius: 12, padding: 11 },
  exerciseChoiceText: { flex: 1 },
  exerciseName: { color: "#F7F9FC", fontSize: 13, fontWeight: "800", textAlign: "right" },
  exerciseCategory: { color: "#AAB7C8", fontSize: 10, textAlign: "right", marginTop: 3 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: "#64748B", alignItems: "center", justifyContent: "center" },
  checkText: { color: "#0B1224", fontSize: 15, fontWeight: "900" },
  saveCreatorButton: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveCreatorText: { color: "#0B1224", fontSize: 14, fontWeight: "900" },
});
