import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { completedWorkoutHistoryRoute } from "@/lib/completed-workout-route";
import { getTemplate, type WorkoutId, type WorkoutTemplate } from "@/lib/workout-data";
import { categoryForExercise, exerciseLibrary } from "@/lib/exercise-library";
import { calculateVolume, MAX_SELECTED_PROGRAMS, sortWorkoutSessionsNewestFirst, useWorkoutStore } from "@/lib/workout-store";
import { calculateFivePercentProgress } from "@/lib/workout-progression";
import { calculateProjectedVolume } from "@/lib/workout-volume";
import { buildPlanMetrics } from "@/lib/workout-analysis";
import { getWorkoutEncyclopediaProgram, workoutEncyclopediaCategories, workoutEncyclopediaPrograms } from "@/lib/workout-encyclopedia";
import { muscleBuildingFolderIds, muscleBuildingFolderTemplateIds } from "@/lib/muscle-building-content";
import { workoutCategoryTemplateIds } from "@/lib/workout-category-content";
import { workoutAudienceSections } from "@/lib/workout-audience-sections";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { supabase } from "@/lib/supabase";
import { confirmSignOut } from "@/lib/confirm-sign-out";
import { setDefaultWorkoutTemplateId } from "@/lib/workout-schedule";

const formatDate = (iso: string) => new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long" }).format(new Date(iso));

type TrainingMethod = { id: string; title: string; subtitle: string; templateIds: WorkoutId[]; accent: string; icon: IconSymbolName; group: string };
type CreatorExercise = { id: string; name: string; englishName: string; aliases?: string[]; category: string; defaultTarget: string; note?: string };
const selectedMethodStorageKey = "workout-tracker-selected-method-v1";
const selectedDayStorageKey = "workout-tracker-selected-days-v1";

const selectionIdForTemplate = (templateId: WorkoutId): string => {
  const group = Object.entries(muscleBuildingFolderTemplateIds).find(([, ids]) =>
    ids.includes(templateId),
  )?.[0];
  return group ?? templateId;
};

const workoutMenuFolders = [
  { id: "ppl", title: "PPL", description: "PPL 1, PPL 2 ו־Arms/Pump: Push, Pull ו־Legs", accent: "#F5B72C" },
  { id: "ab", title: "AB", description: "אימון A לפלג גוף עליון ואימון B לפלג גוף תחתון", accent: "#42D392" },
  { id: "abc", title: "ABC", description: "שלושה ימי אימון לפי קבוצות השרירים", accent: "#65BDF6" },
  { id: "abcd", title: "ABCD", description: "ארבעה ימי אימון ממוקדים", accent: "#C084FC" },
  { id: "full-body", title: "Full Body", description: "אימון גוף מלא עם כל קבוצות השרירים", accent: "#22C55E" },
  ...workoutEncyclopediaCategories.map((category) => category.id === "bodybuilding" ? { ...category, title: "שיטות למסת שריר" } : category),
];

const builderCategoryOrder = ["חזה", "גב", "כתפיים", "רגליים", "יד קדמית", "יד אחורית", "ליבה", "כללי"];
const builderCategoryMeta: Record<string, { icon: IconSymbolName; accent: string; subtitle: string }> = {
  "חזה": { icon: "square.grid.2x2.fill", accent: "#FB7185", subtitle: "לחיצות, פרפר ושכיבות סמיכה" },
  "גב": { icon: "rowing", accent: "#65BDF6", subtitle: "משיכות, חתירות ותרגילי גב" },
  "כתפיים": { icon: "dumbbell.fill", accent: "#C084FC", subtitle: "כתף קדמית, אמצעית ואחורית" },
  "רגליים": { icon: "figure.run", accent: "#42D392", subtitle: "ארבע ראשי, המסטרינג, ישבן ותאומים" },
  "יד קדמית": { icon: "dumbbell.fill", accent: "#F5B72C", subtitle: "כפיפות מרפקים ובייספס" },
  "יד אחורית": { icon: "dumbbell.fill", accent: "#F59E0B", subtitle: "פשיטות מרפקים וטרייספס" },
  "ליבה": { icon: "bolt.fill", accent: "#22C55E", subtitle: "בטן, ליבה וייצוב" },
  "כללי": { icon: "square.grid.2x2.fill", accent: "#94A3B8", subtitle: "תרגילים כלליים" },
};

const trainingMethods: TrainingMethod[] = [
  { id: "fixed", group: "PPL", title: "PPL", subtitle: "PPL1 ו־PPL2 · Push · Pull · Legs · Arms / Pump", templateIds: ["push1", "pull1", "legs1", "push2", "pull2", "legs2", "arms"], accent: "#F5B72C", icon: "dumbbell.fill" },
  { id: "muscle-gain-methods", group: "התוכניות שלי", title: "שיטות לעלייה במסת שריר", subtitle: "מדריך טכניקות: Rest-Pause, דרופ־סט, סופר־סט ועוד", templateIds: [], accent: "#E38BFF", icon: "bolt.fill" },
  { id: "ab", group: "תוכנית AB", title: "AB", subtitle: "A חזה, רגליים ויד אחורית · B גב, כתפיים ויד קדמית", templateIds: ["ab-upper", "ab-lower"], accent: "#42D392", icon: "arrow.up.and.down" },
  { id: "abc", group: "תוכנית ABC", title: "ABC", subtitle: "A חזה ויד אחורית · B גב ויד קדמית · C כתפיים ורגליים", templateIds: ["abc-a", "abc-b", "abc-c"], accent: "#65BDF6", icon: "square.grid.2x2.fill" },
  { id: "abcd", group: "תוכנית ABCD", title: "ABCD", subtitle: "A חזה · B גב · C כתפיים · D רגליים", templateIds: ["abcd-a", "abcd-b", "abcd-c", "abcd-d"], accent: "#C084FC", icon: "rectangle.split.3x1.fill" },
  { id: "full-body", group: "Full Body", title: "Full Body", subtitle: "7–8 תרגילי ליבה לכל קבוצות השרירים", templateIds: ["full-body"], accent: "#22C55E", icon: "figure.run" },
  { id: "cardio", group: "אירובי", title: "אירובי", subtitle: "הליכון, ריצה, אופניים, אליפטי, חתירה, שחייה ועוד", templateIds: ["cardio", "cycling", "elliptical", "stairs", "treadmill", "outdoor-run", "walking", "rowing", "swimming", "hiit"], accent: "#F59E0B", icon: "bicycle" },
];

export default function HomeScreen() {
  const { sessions, startWorkoutFromTemplate, hydrated, templates, addCustomTemplate, updateTemplate, selectedProgramIds, toggleSelectedProgram } = useWorkoutStore();
  const [accountName, setAccountName] = useState<string | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState("fixed");
  const [isSwitchingMethod, setIsSwitchingMethod] = useState(false);
  const [isCardioPickerOpen, setIsCardioPickerOpen] = useState(false);
  const [selectedDayByMethod, setSelectedDayByMethod] = useState<Record<string, WorkoutId>>({});
  useEffect(() => { void AsyncStorage.getItem(selectedMethodStorageKey).then((stored) => { if (stored) setSelectedMethodId(stored); }); void AsyncStorage.getItem(selectedDayStorageKey).then((stored) => { if (stored) { try { setSelectedDayByMethod(JSON.parse(stored) as Record<string, WorkoutId>); } catch { /* נתון ישן או פגום — נשארים בברירת המחדל */ } } }); }, []);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isMyProgramsOpen, setIsMyProgramsOpen] = useState(false);
  const [isCustomDefault, setIsCustomDefault] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<WorkoutTemplate | null>(null);
  const [isPreviewEditing, setIsPreviewEditing] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const [replacementSearch, setReplacementSearch] = useState("");
  const [autoProgressMessage, setAutoProgressMessage] = useState("");
  const [customName, setCustomName] = useState("");
  const [customSearch, setCustomSearch] = useState("");
  const [customCategory, setCustomCategory] = useState("הכול");
  const [customIcon, setCustomIcon] = useState<IconSymbolName>("dumbbell.fill");
  const [customColor, setCustomColor] = useState("#F5B72C");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [expandedBuilderCategories, setExpandedBuilderCategories] = useState<string[]>([]);
  useEffect(() => {
    if (!supabase) return;
    const updateAccountName = (session: Session | null) => {
      const user = session?.user;
      const metadataName = user?.user_metadata?.full_name ?? user?.user_metadata?.name;
      const fallbackName = user?.email?.split("@")[0];
      setAccountName(typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : fallbackName ?? null);
    };
    void supabase.auth.getSession().then(({ data }) => updateAccountName(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => updateAccountName(session));
    return () => listener.subscription.unsubscribe();
  }, []);
  const requestAccountSignOut = () => confirmSignOut(() => {
    void supabase?.auth.signOut().then(() => router.replace("/register" as never));
  });
  const customMethods: TrainingMethod[] = templates.filter((template) => template.id.startsWith("custom-")).map((template) => ({ id: template.id, group: "תוכניות מותאמות", title: template.name, subtitle: template.focus, templateIds: [template.id], accent: template.accent, icon: (template.icon as IconSymbolName) || "dumbbell.fill" }));
  const methods = [...trainingMethods, ...customMethods];
  const selectedMethod = methods.find((method) => method.id === selectedMethodId) ?? methods[0];
  const selectedDayId = selectedDayByMethod[selectedMethod.id] ?? selectedMethod.templateIds[0];
  const selectedDayTemplate = templates.find((template) => template.id === selectedDayId) ?? getTemplate(selectedDayId) ?? templates.find((template) => template.id === selectedMethod.templateIds[0]);
  const selectedPersonalPrograms = selectedProgramIds.map((id) => {
    const templateIds = muscleBuildingFolderTemplateIds[id as keyof typeof muscleBuildingFolderTemplateIds] ?? workoutCategoryTemplateIds[id] ?? [id as WorkoutId];
    const selectedTemplates = templateIds
      .map((templateId) => templates.find((template) => template.id === templateId) ?? getTemplate(templateId))
      .filter((template): template is WorkoutTemplate => Boolean(template));
    return {
      id,
      template: selectedTemplates[0],
      templates: selectedTemplates,
      program: getWorkoutEncyclopediaProgram(id),
    };
  }).filter((item) => Boolean(item.template || item.program));
  const planMetrics = buildPlanMetrics(sessions, templates);
  const allBuilderExercises = useMemo<CreatorExercise[]>(() => {
    const templateExercises = templates.flatMap((template) => template.exercises.map((exercise) => ({ id: `template-${exercise.id}`, name: exercise.name, englishName: exercise.englishName ?? "", note: exercise.note, category: categoryForExercise(`${exercise.name} ${exercise.englishName ?? ""}`) ?? "כללי", defaultTarget: exercise.sets[0]?.target ?? "8–12" })));
    const merged = [...exerciseLibrary, ...templateExercises];
    const seen = new Set<string>();
    return merged.filter((item) => { const key = `${item.name.trim().toLowerCase()}|${item.englishName.trim().toLowerCase()}`; if (seen.has(key)) return false; seen.add(key); return Boolean(item.name.trim()); });
  }, [templates]);
  const builderCategories = useMemo(() => ["הכול", ...builderCategoryOrder.filter((category) => allBuilderExercises.some((item) => item.category === category)), ...Array.from(new Set(allBuilderExercises.map((item) => item.category))).filter((category) => !builderCategoryOrder.includes(category))], [allBuilderExercises]);
  const filteredCustomExercises = allBuilderExercises.filter((item) => customCategory === "הכול" || item.category === customCategory).filter((item) => `${item.name} ${item.englishName} ${(item.aliases ?? []).join(" ")}`.toLowerCase().includes(customSearch.toLowerCase()));
  const visibleBuilderCategories = builderCategories.filter((category) => category !== "הכול").map((category) => ({ category, exercises: allBuilderExercises.filter((item) => item.category === category && (customCategory === "הכול" || item.category === customCategory)).filter((item) => `${item.name} ${item.englishName} ${(item.aliases ?? []).join(" ")}`.toLowerCase().includes(customSearch.toLowerCase())) })).filter(({ exercises }) => exercises.length > 0);
  const filteredReplacementExercises = exerciseLibrary.filter((item) => `${item.name} ${item.englishName} ${(item.aliases ?? []).join(" ")}`.toLowerCase().includes(replacementSearch.toLowerCase())).slice(0, 8);
  const completedSets = sessions.reduce((sum, session) => sum + session.sets.filter((set) => set.completed).length, 0);
  const last = useMemo(() => sortWorkoutSessionsNewestFirst(sessions)[0], [sessions]);
  const previousSessionForPreview = previewTemplate ? sessions.find((session) => session.templateId === previewTemplate.id && Boolean(session.finishedAt)) : undefined;
  const projectedPreviewVolume = previewTemplate ? calculateProjectedVolume(previewTemplate, previousSessionForPreview) : 0;
  const previousPreviewVolume = previousSessionForPreview ? calculateVolume(previousSessionForPreview) : null;
  const previewVolumeDelta = previousPreviewVolume && previousPreviewVolume > 0 ? ((projectedPreviewVolume - previousPreviewVolume) / previousPreviewVolume) * 100 : null;
  const volumeChartMax = Math.max(previousPreviewVolume ?? 0, projectedPreviewVolume);
  const openPreview = (id: WorkoutId) => { setPreviewTemplate(templates.find((template) => template.id === id) ?? getTemplate(id)); setIsPreviewEditing(false); setEditingExerciseIndex(null); setReplacementSearch(""); setAutoProgressMessage(""); };
  const openPreviewForEditing = (id: WorkoutId) => { openPreview(id); setIsPreviewEditing(true); };
  const startTemplateFromFolder = (template: WorkoutTemplate) => { startWorkoutFromTemplate(template); router.push("/active-workout" as never); };
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
  const toggleBuilderCategory = (category: string) => setExpandedBuilderCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  const switchMethod = (methodId: string) => { if (methodId === "muscle-gain-methods") { router.push("/muscle-gain-methods" as never); return; } if (methodId === "cardio") { setSelectedMethodId(methodId); void AsyncStorage.setItem(selectedMethodStorageKey, methodId); setIsCardioPickerOpen(true); return; } if (methodId === selectedMethodId) return; setIsSwitchingMethod(true); setSelectedMethodId(methodId); void AsyncStorage.setItem(selectedMethodStorageKey, methodId); setTimeout(() => setIsSwitchingMethod(false), 180); };
  const selectTrainingDay = (methodId: string, templateId: WorkoutId) => { setSelectedDayByMethod((current) => { const next = { ...current, [methodId]: templateId }; void AsyncStorage.setItem(selectedDayStorageKey, JSON.stringify(next)); return next; }); };
  const createCustomWorkout = async () => {
    const name = customName.trim();
    const exercises = selectedExerciseIds.map((id) => allBuilderExercises.find((item) => item.id === id)).filter(Boolean).map((item) => ({ id: `${item!.id}-custom-${Date.now()}`, name: item!.name, englishName: item!.englishName, note: item!.note, sets: [{ target: item!.defaultTarget }, { target: item!.defaultTarget }] }));
    if (!name || exercises.length === 0) return;
    const template: WorkoutTemplate = { id: `custom-${Date.now()}`, name, focus: exercises.map((exercise) => exercise.name).slice(0, 3).join(" · "), accent: customColor, icon: customIcon, exercises };
    addCustomTemplate(template);
    if (isCustomDefault) await setDefaultWorkoutTemplateId(template.id);
    setSelectedMethodId(template.id);
    setCustomName(""); setCustomSearch(""); setCustomCategory("הכול"); setSelectedExerciseIds([]); setIsCustomDefault(false); setIsCreatorOpen(false);
  };
  return (
    <ScreenContainer containerClassName="bg-background" className="px-5 pt-4">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push("/menu" as never)} style={styles.menuButton}><Text style={styles.menuText}>☰ תפריט</Text></Pressable>
            <Pressable onPress={() => router.push("/(tabs)/meal-plan" as never)} style={styles.mealButton}><Text style={styles.mealButtonText}>הארוחות שלי</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={accountName ? "התנתקות מהחשבון המחובר" : "הרשמה או התחברות"} onPress={accountName ? requestAccountSignOut : () => router.push("/register" as never)} style={styles.accountButton}><Text style={styles.accountButtonText}>{accountName ? `👤 ${accountName}` : "הרשמה / התחברות"}</Text></Pressable>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>יומן האימונים</Text>
            <Text style={styles.title} numberOfLines={1}>{accountName ? `שלום ${accountName}!` : "מוכנים לעבוד?"}</Text>
            <Text style={styles.subtitle}>{accountName ? "החשבון מחובר והנתונים מגובים בענן" : hydrated ? "כל סט נשמר מיד במכשיר" : "טוען את היומן שלך…"}</Text><Text testID="home-build-stamp" style={styles.buildStamp}>גרסת התקנה {Constants.expoConfig?.version ?? "לא ידועה"} · Android build {Constants.expoConfig?.android?.versionCode ?? "לא ידוע"}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="פתח היסטוריית אימונים" onPress={() => router.push("/(tabs)/history" as never)} style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}><Text style={styles.statValue}>{sessions.length}</Text><Text style={styles.statLabel}>אימונים · פתח היסטוריה</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="פתח סטים שהושלמו בהיסטוריה" onPress={() => router.push("/(tabs)/history" as never)} style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}><Text style={styles.statValue}>{completedSets}</Text><Text style={styles.statLabel}>סטים שהושלמו · פירוט</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="פתח את האימון האחרון" onPress={() => last ? router.push(completedWorkoutHistoryRoute(last.id) as never) : router.push("/(tabs)/history" as never)} style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}><Text style={styles.statValue}>{last ? `${Math.round(calculateVolume(last))}` : "—"}</Text><Text style={styles.statLabel}>נפח אחרון · פרטים</Text></Pressable>
        </View>
        <View style={styles.personalProfilePanel}>
          <View style={styles.personalProfileHeader}><View style={styles.personalProfileIcon}><Text style={styles.personalProfileIconText}>◉</Text></View><View style={styles.personalProfileHeading}><Text style={styles.personalProfileTitle}>הפרופיל האישי שלי</Text><Text style={styles.personalProfileSubtitle}>כל הכלים האישיים שלך במקום אחד</Text></View></View>
          <View style={styles.personalProfileList}>{[
            { id: "meals", title: "מעקב אחרי הארוחות שלי", description: "ניהול ארוחות, מאקרו וכמויות בפועל" },
            { id: "programs", title: "התוכנית שלי", description: "בחירת עד 5 תוכניות ושיבוץ לפי ימי השבוע" },
            { id: "builder", title: "בניית תוכנית מותאמת אישית", description: "בחירת כל תרגילי האפליקציה ללא שיוך מגדרי" },
            { id: "progress", title: "ניתוח פרופיל והתקדמות", description: "סיכום אימונים, נפח, עומס ומגמות אישיות" },
            { id: "sleep", title: "מדדי שינה", description: "שינה, התאוששות, עייפות ודופק מנוחה" },
            { id: "muscle-methods", title: "שיטות לעלייה במסת שריר", description: "12 שיטות ורובריקות לתכנון עומס, נפח והתקדמות" },
          ].map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.title} onPress={() => { if (item.id === "meals") router.push("/(tabs)/meal-plan" as never); else if (item.id === "programs") setIsMyProgramsOpen(true); else if (item.id === "builder") setIsCreatorOpen(true); else if (item.id === "progress") router.push("/(tabs)/profile" as never); else if (item.id === "muscle-methods") router.push("/muscle-gain-methods" as never); else router.push("/(tabs)/recovery" as never); }} style={({ pressed }) => [styles.personalProfileRow, pressed && styles.pressed]}><View style={styles.personalProfileArrow}><Text style={styles.personalProfileArrowText}>‹</Text></View><View style={styles.personalProfileRowText}><Text style={styles.personalProfileRowTitle}>{item.title}</Text><Text style={styles.personalProfileRowDescription}>{item.description}</Text></View></Pressable>)}</View>
        </View>
        <View style={styles.personalProgramsPanel}><View style={styles.personalProgramsHeader}><Text style={styles.sectionTitle}>התוכניות שלי · {selectedPersonalPrograms.length}/5</Text><Pressable accessibilityRole="button" onPress={() => setIsMyProgramsOpen(true)} style={styles.personalProgramsLink}><Text style={styles.personalProgramsLinkText}>פתיחה ושיבוץ ›</Text></Pressable></View>{selectedPersonalPrograms.length ? selectedPersonalPrograms.map(({ id, template, program }) => { const title = template?.name ?? program?.title ?? id; const accent = template?.accent ?? "#F5B72C"; return <Pressable key={`personal-${id}`} accessibilityRole="button" onPress={() => template ? openPreview(template.id) : router.push({ pathname: "/(tabs)/workouts" as never, params: { category: program?.categoryId ?? "bodybuilding" } } as never)} style={({ pressed }) => [styles.personalProgramRow, { borderColor: `${accent}99` }, pressed && styles.pressed]}><Text style={styles.personalProgramRowTitle}>{title}</Text><Text style={styles.personalProgramRowMeta}>{template ? `${template.exercises.length} תרגילים · ${template.focus}` : program?.description}</Text></Pressable>; }) : <Text style={styles.personalProgramsEmpty}>עדיין לא נבחרו תוכניות. פתח את הקטלוג והוסף עד 5 תוכניות.</Text>}</View>
        <WorkoutCategoryMenu templates={templates} selectedProgramIds={selectedProgramIds} selectedCount={selectedPersonalPrograms.length} onToggleSelected={toggleSelectedProgram} onOpenTemplate={openPreview} onEditTemplate={(template) => openPreviewForEditing(template.id)} onStartTemplate={startTemplateFromFolder} />
        <Pressable accessibilityRole="button" accessibilityLabel="פתח פירוט האימון האחרון" onPress={() => last ? router.push(completedWorkoutHistoryRoute(last.id) as never) : router.push("/(tabs)/history" as never)} style={({ pressed }) => [styles.lastCard, pressed && styles.pressed]}><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>האימון האחרון · לחץ לפירוט</Text><Text style={styles.sectionHint}>{last ? formatDate(last.startedAt) : "עדיין אין נתונים"}</Text></View>{last ? <Text style={styles.lastText}>{last.templateId.toUpperCase()} · {last.sets.filter((set) => set.completed).length} סטים הושלמו · הצג תרגילים וסטים</Text> : <Text style={styles.lastText}>אחרי האימון הראשון שלך יופיע כאן סיכום קצר.</Text>}</Pressable>
        {Platform.OS === "web" && isCardioPickerOpen ? <View style={styles.webCardioPicker}><View style={styles.modalHeader}><View><Text style={styles.modalTitle}>בחר סוג אירובי</Text><Text style={styles.previewSubtitle}>בחר פעילות כדי להתחיל מיד ולשמור את הנתונים בניתוח</Text></View><Pressable accessibilityRole="button" accessibilityLabel="סגור בחירת אירובי" onPress={() => setIsCardioPickerOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>{["cardio", "cycling", "elliptical", "stairs", "treadmill", "outdoor-run", "walking", "rowing", "swimming", "hiit"].map((id) => { const template = templates.find((item) => item.id === id) ?? getTemplate(id); if (!template) return null; return <Pressable key={`web-${id}`} accessibilityRole="button" accessibilityLabel={`בחר ${template.name}`} onPress={() => { selectTrainingDay("cardio", template.id); setIsCardioPickerOpen(false); openPreview(template.id); }} style={({ pressed }) => [styles.cardioOption, { borderColor: `${template.accent}99` }, pressed && styles.pressed]}><View style={[styles.cardioOptionIcon, { backgroundColor: `${template.accent}24`, borderColor: template.accent }]}><IconSymbol name="figure.run" size={26} color={template.accent} /></View><View style={styles.cardioOptionText}><Text style={styles.cardioOptionTitle}>{template.name}</Text><Text style={styles.cardioOptionSubtitle}>{template.focus}</Text><Text style={[styles.cardioOptionAction, { color: template.accent }]}>הגדר והתחל ›</Text></View></Pressable>; })}</View> : null}
      </ScrollView>
      <MyProgramsModal visible={isMyProgramsOpen} selectedPrograms={selectedPersonalPrograms.map(({ template, templates, program, id }) => ({ id, template, templates, program }))} onClose={() => setIsMyProgramsOpen(false)} onOpenCatalog={() => { setIsMyProgramsOpen(false); router.push("/(tabs)/workouts" as never); }} />
      <Modal visible={isCardioPickerOpen && Platform.OS !== "web"} animationType="slide" transparent onRequestClose={() => setIsCardioPickerOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.cardioPickerModal}><View style={styles.modalHeader}><View><Text style={styles.modalTitle}>בחר סוג אירובי</Text><Text style={styles.previewSubtitle}>בחר פעילות כדי להתחיל מיד ולשמור את הנתונים בניתוח</Text></View><Pressable accessibilityRole="button" accessibilityLabel="סגור בחירת אירובי" onPress={() => setIsCardioPickerOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View><ScrollView contentContainerStyle={styles.cardioPickerContent}>{["cardio", "cycling", "elliptical", "stairs", "treadmill", "outdoor-run", "walking", "rowing", "swimming", "hiit"].map((id) => { const template = templates.find((item) => item.id === id) ?? getTemplate(id); if (!template) return null; return <Pressable key={id} accessibilityRole="button" accessibilityLabel={`בחר ${template.name}`} onPress={() => { selectTrainingDay("cardio", template.id); setIsCardioPickerOpen(false); openPreview(template.id); }} style={({ pressed }) => [styles.cardioOption, { borderColor: `${template.accent}99` }, pressed && styles.pressed]}><View style={[styles.cardioOptionIcon, { backgroundColor: `${template.accent}24`, borderColor: template.accent }]}><IconSymbol name={id === "cycling" ? "bicycle" : id === "elliptical" ? "figure.run" : id === "stairs" ? "stairs" : id === "rowing" ? "rowing" : id === "swimming" ? "water" : id === "treadmill" || id === "outdoor-run" || id === "walking" ? "figure.run" : id === "hiit" ? "bolt.fill" : "figure.run"} size={26} color={template.accent} /></View><View style={styles.cardioOptionText}><Text style={styles.cardioOptionTitle}>{template.name}</Text><Text style={styles.cardioOptionSubtitle}>{template.focus}</Text><Text style={[styles.cardioOptionAction, { color: template.accent }]}>הגדר והתחל ›</Text></View></Pressable>; })}<View style={styles.cardioMoreCard}><Text style={styles.cardioMoreTitle}>אפשרויות נוספות</Text><Text style={styles.cardioMoreText}>ריצה בחוץ, הליכה מהירה, חתירה, שחייה ואינטרוולים זמינים להוספה דרך אירובי מותאם.</Text></View></ScrollView></View></View>
      </Modal>
      <Modal visible={Boolean(previewTemplate)} animationType="slide" transparent onRequestClose={() => setPreviewTemplate(null)}>
        <View style={styles.modalBackdrop}><View style={styles.previewModal}><ScrollView style={styles.previewScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={styles.previewContent}>
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
        <View style={styles.modalBackdrop}><View style={styles.creatorModal}><ScrollView style={styles.creatorScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={styles.creatorContent}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>בניית תוכנית מותאמת אישית</Text><Pressable onPress={() => setIsCreatorOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>
          <Text style={styles.fieldLabel}>שם התוכנית</Text><TextInput value={customName} onChangeText={setCustomName} placeholder="לדוגמה: כוח וידיים" placeholderTextColor="#718096" style={styles.creatorInput} textAlign="right" />
          <Text style={styles.fieldLabel}>בחר אייקון</Text><View style={styles.optionRow}>{(["dumbbell.fill", "square.grid.2x2.fill", "figure.run", "bicycle"] as IconSymbolName[]).map((icon) => <Pressable key={icon} accessibilityRole="button" onPress={() => setCustomIcon(icon)} style={[styles.iconChoice, customIcon === icon && styles.selectedIconChoice]}><IconSymbol name={icon} size={22} color={customIcon === icon ? "#0B1224" : "#F7F9FC"} /></Pressable>)}</View>
          <Text style={styles.fieldLabel}>בחר צבע</Text><View style={styles.optionRow}>{["#F5B72C", "#65BDF6", "#C084FC", "#42D392", "#FB7185", "#F59E0B"].map((color) => <Pressable key={color} accessibilityRole="button" onPress={() => setCustomColor(color)} style={[styles.colorChoice, { backgroundColor: color }, customColor === color && styles.selectedColorChoice]} />)}</View>
          <View style={styles.builderSelectionHeader}><View><Text style={styles.fieldLabel}>בחר תרגילים</Text><Text style={styles.builderSelectionHint}>כל התרגילים זמינים לבחירה, ללא שיוך מגדרי</Text></View><View style={[styles.builderSelectionBadge, { borderColor: customColor }]}><Text style={[styles.builderSelectionBadgeValue, { color: customColor }]}>{selectedExerciseIds.length}</Text><Text style={styles.builderSelectionBadgeLabel}>נבחרו</Text></View></View>
          <TextInput value={customSearch} onChangeText={setCustomSearch} placeholder="חפש תרגיל בעברית, באנגלית או בכינוי" placeholderTextColor="#718096" style={styles.creatorInput} textAlign="right" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorCategoryRow}>{builderCategories.map((category) => <Pressable key={category} accessibilityRole="button" accessibilityState={{ selected: customCategory === category }} onPress={() => setCustomCategory(category)} style={[styles.creatorCategory, customCategory === category && { backgroundColor: customColor, borderColor: customColor }]}><Text style={[styles.creatorCategoryText, customCategory === category && styles.creatorCategoryTextActive]}>{category === "הכול" ? "כל הקטגוריות" : category}</Text></Pressable>)}</ScrollView>
          <Text style={styles.creatorResultCount}>{filteredCustomExercises.length} תרגילים מוצגים · בחר תרגילים מכל קטגוריה</Text>
          <View style={styles.exerciseCategoryList}>{visibleBuilderCategories.map(({ category, exercises }) => { const meta = builderCategoryMeta[category] ?? builderCategoryMeta["כללי"]; const expanded = customCategory !== "הכול" || expandedBuilderCategories.includes(category); return <View key={category} style={[styles.exerciseCategorySection, { borderColor: `${meta.accent}88` }]}><Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${expanded ? "סגור" : "פתח"} קטגוריית ${category}`} onPress={() => { setCustomCategory("הכול"); toggleBuilderCategory(category); }} style={({ pressed }) => [styles.exerciseCategoryHeader, pressed && styles.pressed]}><View style={[styles.exerciseCategoryIcon, { backgroundColor: `${meta.accent}22`, borderColor: meta.accent }]}><IconSymbol name={meta.icon} size={20} color={meta.accent} /></View><View style={styles.exerciseCategoryHeaderCopy}><Text style={styles.exerciseCategoryTitle}>{category}</Text><Text style={styles.exerciseCategorySubtitle}>{meta.subtitle}</Text></View><View style={styles.exerciseCategoryCount}><Text style={[styles.exerciseCategoryCountValue, { color: meta.accent }]}>{exercises.length}</Text><Text style={styles.exerciseCategoryCountLabel}>תרגילים</Text></View><Text style={styles.exerciseCategoryChevron}>{expanded ? "⌃" : "⌄"}</Text></Pressable>{expanded && <View style={styles.exerciseCategoryExercises}>{exercises.map((exercise) => { const selected = selectedExerciseIds.includes(exercise.id); return <Pressable key={exercise.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => toggleCustomExercise(exercise.id)} style={({ pressed }) => [styles.exerciseChoice, selected && { borderColor: customColor, backgroundColor: `${customColor}18` }, pressed && styles.pressed]}><View style={[styles.checkCircle, selected && { backgroundColor: customColor }]}><Text style={styles.checkText}>{selected ? "✓" : ""}</Text></View><View style={styles.exerciseChoiceText}><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseCategory}>{exercise.category} · יעד {exercise.defaultTarget}{exercise.englishName ? ` · ${exercise.englishName}` : ""}</Text></View></Pressable>; })}</View>}</View>; })}</View>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: isCustomDefault }} onPress={() => setIsCustomDefault((current) => !current)} style={({ pressed }) => [styles.defaultProgramRow, isCustomDefault && styles.defaultProgramRowActive, pressed && styles.pressed]}><View style={[styles.defaultProgramCheck, isCustomDefault && styles.defaultProgramCheckActive]}><Text style={styles.defaultProgramCheckText}>{isCustomDefault ? "✓" : ""}</Text></View><View style={styles.defaultProgramCopy}><Text style={styles.defaultProgramTitle}>הפוך לברירת מחדל בלוח האימונים</Text><Text style={styles.defaultProgramDescription}>התוכנית תופיע בלוח גם אם אינה אחת מחמש התוכניות שנבחרו.</Text></View></Pressable>
          <Pressable accessibilityRole="button" disabled={!customName.trim() || selectedExerciseIds.length === 0} onPress={() => void createCustomWorkout()} style={({ pressed }) => [styles.saveCreatorButton, { backgroundColor: customName.trim() && selectedExerciseIds.length ? customColor : "#334155" }, pressed && styles.pressed]}><Text style={styles.saveCreatorText}>הוסף לקרוסלה</Text></Pressable>
        </ScrollView></View></View>
      </Modal>
    </ScreenContainer>
  );
}


function FolderWorkoutCard({ template, isSelected, selectedCount, onToggleSelected, onOpen, onEdit, onStart }: { template: WorkoutTemplate; isSelected: boolean; selectedCount: number; onToggleSelected: () => { selected: boolean; limitReached: boolean }; onOpen: () => void; onEdit: () => void; onStart: () => void }) {
  const handleToggle = () => { const result = onToggleSelected(); if (result.limitReached) alert(`אפשר לבחור עד ${MAX_SELECTED_PROGRAMS} תוכניות. הסר תוכנית קיימת כדי לבחור אחרת.`); };
  return <View style={[styles.folderWorkoutCard, { borderColor: `${template.accent}88` }]}>
    <View style={styles.folderWorkoutHeader}><View style={[styles.folderWorkoutBadge, { borderColor: template.accent, backgroundColor: `${template.accent}22` }]}><Text style={[styles.folderWorkoutBadgeText, { color: template.accent }]}>{template.exercises.length}</Text></View><View style={styles.folderWorkoutHeading}><Text style={styles.folderWorkoutTitle}>{template.name}</Text><Text style={styles.folderWorkoutFocus}>{template.focus}</Text></View></View>
    <View style={styles.folderExerciseList}>{template.exercises.map((exercise, index) => <View key={exercise.id} style={styles.folderExerciseRow}><Text style={[styles.folderExerciseNumber, { color: template.accent }]}>{index + 1}</Text><View style={styles.folderExerciseInfo}><Text style={styles.folderExerciseName}>{exercise.name || exercise.id}</Text><Text style={styles.folderExerciseMeta}>{exercise.sets.length} סטים · {exercise.sets.map((set) => set.target).join(" · ")}</Text></View></View>)}</View>
    <View style={styles.folderWorkoutActions}><Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => [styles.folderOutlineButton, { borderColor: template.accent }, pressed && styles.pressed]}><Text style={[styles.folderOutlineButtonText, { color: template.accent }]}>פירוט מלא</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ selected: isSelected }} onPress={handleToggle} style={({ pressed }) => [styles.folderSelectButton, isSelected && { backgroundColor: "#42D39222", borderColor: "#42D392" }, pressed && styles.pressed]}><Text style={[styles.folderSelectButtonText, isSelected && { color: "#9AF2C7" }]}>{isSelected ? "✓ בתוכנית שלי" : `הוסף לתוכנית שלי · ${selectedCount}/${MAX_SELECTED_PROGRAMS}`}</Text></Pressable></View>
    <View style={styles.folderWorkoutActions}><Pressable accessibilityRole="button" onPress={onEdit} style={({ pressed }) => [styles.folderOutlineButton, pressed && styles.pressed]}><Text style={styles.folderOutlineButtonText}>ערוך אימון</Text></Pressable><Pressable accessibilityRole="button" onPress={onStart} style={({ pressed }) => [styles.folderStartButton, { backgroundColor: template.accent }, pressed && styles.pressed]}><Text style={styles.folderStartButtonText}>התחל אימון</Text></Pressable></View>
  </View>;
}

function WorkoutCategoryMenu({ templates, selectedProgramIds, selectedCount, onToggleSelected, onOpenTemplate, onEditTemplate, onStartTemplate }: { templates: WorkoutTemplate[]; selectedProgramIds: string[]; selectedCount: number; onToggleSelected: (templateId: string) => { selected: boolean; limitReached: boolean }; onOpenTemplate: (templateId: WorkoutId) => void; onEditTemplate: (template: WorkoutTemplate) => void; onStartTemplate: (template: WorkoutTemplate) => void }) {
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [isMuscleBuildingExpanded, setIsMuscleBuildingExpanded] = useState(false);
  const [expandedAudience, setExpandedAudience] = useState<string | null>(null);
  const categories = workoutMenuFolders as Array<{ id: string; title: string; description: string; accent: string }>;
  const muscleFolders = categories.filter((category) => muscleBuildingFolderIds.includes(category.id as typeof muscleBuildingFolderIds[number]));
  const audienceCategoryIds = new Set(workoutAudienceSections.flatMap((section) => section.categoryIds));
  const otherFolders = categories.filter((category) => !muscleBuildingFolderIds.includes(category.id as typeof muscleBuildingFolderIds[number]) && category.id !== "bodybuilding" && !audienceCategoryIds.has(category.id));

  const renderFolder = (category: { id: string; title: string; description: string; accent: string }) => {
    const categoryPrograms = workoutEncyclopediaPrograms.filter((program) => program.categoryId === category.id);
    const categoryTemplateIds = (workoutCategoryTemplateIds[category.id] ?? (muscleBuildingFolderTemplateIds as Record<string, WorkoutId[]>)[category.id] ?? []);
    const categoryTemplates = categoryTemplateIds.map((id) => templates.find((template) => template.id === id)).filter((template): template is WorkoutTemplate => Boolean(template));
    const visiblePrograms = categoryPrograms.filter((program) => !categoryTemplateIds.includes(program.id) && !muscleBuildingFolderIds.includes(program.id as typeof muscleBuildingFolderIds[number]));
    const isExpanded = expandedFolder === category.id;
    const isGroupSelected = selectedProgramIds.includes(category.id);
    const toggleGroup = () => {
      const result = onToggleSelected(category.id);
      if (result.limitReached) alert(`אפשר לבחור עד ${MAX_SELECTED_PROGRAMS} תוכניות. הסר תוכנית קיימת כדי לבחור אחרת.`);
    };
    return <View key={category.id} style={[styles.categoryFolder, styles.nestedCategoryFolder, { borderColor: `${category.accent}88` }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${isExpanded ? "סגור" : "פתח"} את קטגוריית ${category.title}`} onPress={() => setExpandedFolder(isExpanded ? null : category.id)} style={({ pressed }) => [styles.categoryFolderHeader, pressed && styles.pressed]}>
        <View style={[styles.categoryFolderIcon, { backgroundColor: `${category.accent}22`, borderColor: `${category.accent}88` }]}><Text style={[styles.categoryFolderIconText, { color: category.accent }]}>{category.title.slice(0, 2)}</Text></View>
        <View style={styles.categoryFolderText}><Text style={[styles.categoryFolderTitle, { color: category.accent }]}>{category.title}</Text><Text style={styles.categoryFolderDescription}>{category.description}</Text></View>
        <Text style={[styles.categoryFolderCount, { color: category.accent }]}>{categoryTemplates.length + visiblePrograms.length}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: isGroupSelected }} accessibilityLabel={`${isGroupSelected ? "הסר" : "הוסף"} את כל תוכנית ${category.title} לתוכנית שלי`} onPress={toggleGroup} style={({ pressed }) => [styles.groupSelectButton, { borderColor: category.accent, backgroundColor: isGroupSelected ? `${category.accent}28` : "transparent" }, pressed && styles.pressed]}><Text style={[styles.groupSelectButtonText, { color: category.accent }]}>{isGroupSelected ? "✓ שלי" : "הוסף קבוצה"}</Text></Pressable>
        <Text style={[styles.categoryFolderChevron, { color: category.accent }]}>{isExpanded ? "−" : "+"}</Text>
      </Pressable>
      {isExpanded ? <View style={styles.categoryFolderContent}>
        {categoryTemplates.map((template) => <FolderWorkoutCard key={template.id} template={template} isSelected={selectedProgramIds.includes(selectionIdForTemplate(template.id))} selectedCount={selectedCount} onToggleSelected={() => onToggleSelected(selectionIdForTemplate(template.id))} onOpen={() => onOpenTemplate(template.id)} onEdit={() => onEditTemplate(template)} onStart={() => onStartTemplate(template)} />)}
        {visiblePrograms.map((program) => <Pressable key={program.id} accessibilityRole="button" accessibilityLabel={`פתח את התוכנית ${program.title}`} onPress={() => router.push("/(tabs)/workouts" as never)} style={({ pressed }) => [styles.categoryProgramRow, pressed && styles.pressed]}><View style={styles.categoryProgramText}><Text style={styles.categoryProgramTitle}>{program.title}</Text><Text style={styles.categoryProgramDescription}>{program.description}</Text></View><Text style={[styles.categoryProgramAction, { color: category.accent }]}>פרטים ›</Text></Pressable>)}
        {!categoryTemplates.length && !visiblePrograms.length ? <Text style={styles.categoryEmptyText}>התוכן יתווסף בקרוב.</Text> : null}
      </View> : null}
    </View>;
  };

  const muscleExpanded = isMuscleBuildingExpanded;
  const renderAudienceSection = (section: typeof workoutAudienceSections[number]) => {
    const sectionFolders = section.categoryIds.map((id) => categories.find((category) => category.id === id)).filter((category): category is (typeof categories)[number] => Boolean(category));
    const sectionTemplates = (section.templateIds ?? []).map((id) => templates.find((template) => template.id === id)).filter((template): template is WorkoutTemplate => Boolean(template));
    const isExpanded = expandedAudience === section.id;
    return <View key={section.id} style={[styles.categoryFolder, styles.audienceFolder, { borderColor: `${section.accent}88` }]}>
      <View style={styles.categoryFolderHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${isExpanded ? "סגור" : "פתח"} את קבוצת ${section.title}`} onPress={() => setExpandedAudience(isExpanded ? null : section.id)} style={({ pressed }) => [styles.audienceHeaderPressable, pressed && styles.pressed]}>
          <View style={[styles.categoryFolderIcon, { backgroundColor: `${section.accent}22`, borderColor: `${section.accent}88` }]}><Text style={[styles.categoryFolderIconText, { color: section.accent }]}>{section.title.slice(0, 2)}</Text></View>
          <View style={styles.categoryFolderText}><Text style={[styles.categoryFolderTitle, { color: section.accent }]}>{section.title}</Text><Text style={styles.categoryFolderDescription}>{section.description}</Text></View>
          <Text style={[styles.categoryFolderCount, { color: section.accent }]}>{sectionTemplates.length || sectionFolders.length}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${isExpanded ? "סגור" : "פתח"} את קבוצת ${section.title}`} onPress={() => setExpandedAudience(isExpanded ? null : section.id)} style={({ pressed }) => [styles.categoryFolderChevronButton, pressed && styles.pressed]}><Text style={[styles.categoryFolderChevron, { color: section.accent }]}>{isExpanded ? "−" : "+"}</Text></Pressable>
      </View>
      {isExpanded ? <View style={styles.nestedFolderList}>{sectionTemplates.map((template) => <FolderWorkoutCard key={template.id} template={template} isSelected={selectedProgramIds.includes(selectionIdForTemplate(template.id))} selectedCount={selectedCount} onToggleSelected={() => onToggleSelected(selectionIdForTemplate(template.id))} onOpen={() => onOpenTemplate(template.id)} onEdit={() => onEditTemplate(template)} onStart={() => onStartTemplate(template)} />)}{sectionTemplates.length === 0 ? sectionFolders.map(renderFolder) : null}</View> : null}
    </View>;
  };
  return <View style={styles.categoryMenu}>
    <View style={styles.categoryMenuHeader}>
      <Text style={styles.categoryMenuTitle}>תפריט אימונים</Text>
      <Text style={styles.categoryMenuSubtitle}>פתח את שיטת האימון כדי לראות את התוכניות והתרגילים שלה.</Text>
    </View>
    <View style={[styles.categoryFolder, styles.muscleBuildingFolder, { borderColor: "#F5B72C99" }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${muscleExpanded ? "סגור" : "פתח"} אימונים לבניית מסת שריר`} onPress={() => setIsMuscleBuildingExpanded((current) => !current)} style={({ pressed }) => [styles.categoryFolderHeader, pressed && styles.pressed]}>
        <View style={[styles.categoryFolderIcon, styles.muscleBuildingIcon]}><Text style={[styles.categoryFolderIconText, { color: "#F5B72C" }]}>מ׳</Text></View>
        <View style={styles.categoryFolderText}><Text style={[styles.categoryFolderTitle, { color: "#F5B72C" }]}>אימונים לבניית מסת שריר</Text><Text style={styles.categoryFolderDescription}>PPL, AB, ABC, ABCD ו־Full Body — פתח כדי לראות את כל האימונים והתרגילים</Text></View>
        <Text style={[styles.categoryFolderCount, { color: "#F5B72C" }]}>{muscleFolders.length}</Text>
        <Text style={[styles.categoryFolderChevron, { color: "#F5B72C" }]}>{muscleExpanded ? "−" : "+"}</Text>
      </Pressable>
      {muscleExpanded ? <View style={styles.nestedFolderList}>{muscleFolders.map(renderFolder)}</View> : null}
    </View>
    {workoutAudienceSections.map(renderAudienceSection)}
    {otherFolders.map(renderFolder)}
  </View>;
}

type SelectedProgramItem = { id: string; template?: WorkoutTemplate; templates?: WorkoutTemplate[]; program?: ReturnType<typeof getWorkoutEncyclopediaProgram> };

function MyProgramsModal({ visible, selectedPrograms, onClose, onOpenCatalog }: { visible: boolean; selectedPrograms: SelectedProgramItem[]; onClose: () => void; onOpenCatalog: () => void }) {
  const availablePrograms = selectedPrograms.filter((item): item is SelectedProgramItem & { template: WorkoutTemplate } => Boolean(item.template));

  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <View style={styles.myProgramsModal}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>התוכנית שלי</Text>
            <Text style={styles.previewSubtitle}>בחרת {availablePrograms.length}/5 תוכניות. התוכניות נשמרות כאן; את שיבוץ הימים מבצעים ביומן האימונים.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="סגור התוכנית שלי" onPress={onClose} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
        </View>
        {availablePrograms.length ? <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.myProgramsContent}>
          <View style={styles.selectedProgramsSummary}>
            <Text style={styles.selectedProgramsSummaryTitle}>התוכניות שנבחרו</Text>
            {availablePrograms.map((item) => <View key={`selected-summary-${item.id}`} style={styles.selectedProgramSummaryCard}>
              <Text style={styles.selectedProgramSummaryTitle}>{item.program?.title ?? item.template.name}</Text>
              <Text style={styles.selectedProgramSummaryMeta}>{(item.templates ?? [item.template]).map((template) => template.name).join(" · ")}</Text>
            </View>)}
            <Text style={styles.selectedProgramsSummaryHint}>עד 5 תוכניות נשמרות כאן. כדי לשבץ יום, פתח את „יומן האימונים”.</Text>
          </View>
        </ScrollView> : <View style={styles.myProgramsEmpty}>
          <View style={styles.myProgramsEmptyIcon}><Text style={styles.myProgramsEmptyIconText}>＋</Text></View>
          <Text style={styles.myProgramsEmptyTitle}>בוא נבנה את התוכנית שלך</Text>
          <Text style={styles.myProgramsEmptyText}>עדיין לא בחרת תוכנית אימונים. בחר תוכניות מועדפות, והן יופיעו כאן כדי שתוכל להשתמש בהן ביומן השבועי.</Text>
          <View style={styles.myProgramsSteps}>
            <Text style={styles.myProgramsStep}><Text style={styles.myProgramsStepNumber}>1</Text> פתח את קטלוג האימונים</Text>
            <Text style={styles.myProgramsStep}><Text style={styles.myProgramsStepNumber}>2</Text> הוסף עד 5 תוכניות מועדפות</Text>
            <Text style={styles.myProgramsStep}><Text style={styles.myProgramsStepNumber}>3</Text> עבור ליומן ושבץ יום לכל אימון</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="פתח את קטלוג האימונים ובחר תוכנית" onPress={onOpenCatalog} style={({ pressed }) => [styles.myProgramsChooseButton, pressed && styles.pressed]}><Text style={styles.myProgramsChooseButtonText}>בחירת תוכנית אימונים</Text><Text style={styles.myProgramsChooseButtonArrow}>‹</Text></Pressable>
        </View>}
        <Pressable accessibilityRole="button" accessibilityLabel="עבור ליומן האימונים לשיבוץ" onPress={() => { onClose(); router.push("/schedule" as never); }} style={({ pressed }) => [styles.scheduleLink, pressed && styles.pressed]}><View style={styles.scheduleLinkIcon}><Text style={styles.scheduleLinkIconText}>▦</Text></View><View style={styles.scheduleLinkCopy}><Text style={styles.scheduleLinkText}>עבור ליומן האימונים לשיבוץ</Text><Text style={styles.scheduleLinkSubtext}>בחר יום ושבץ את התוכנית שלך</Text></View><Text style={styles.scheduleLinkArrow}>←</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.myProgramsDone}><Text style={styles.myProgramsDoneText}>סגירה</Text></Pressable>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  categoryMenu: { marginTop: 18, gap: 10 }, personalProfilePanel: { backgroundColor: "#16233A", borderColor: "#F5B72C", borderWidth: 1.5, borderRadius: 18, padding: 13, gap: 11 }, personalProfileHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 10 }, personalProfileIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#F5B72C22", borderColor: "#F5B72C88", borderWidth: 1, alignItems: "center", justifyContent: "center" }, personalProfileIconText: { fontSize: 19 }, personalProfileHeading: { flex: 1, alignItems: "flex-end", gap: 2 }, personalProfileTitle: { color: "#F5B72C", fontSize: 20, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, personalProfileSubtitle: { color: "#AAB7C8", fontSize: 11, lineHeight: 16, textAlign: "right", writingDirection: "rtl" }, personalProfileList: { gap: 7 }, personalProfileRow: { flexDirection: "row-reverse", alignItems: "center", gap: 9, borderColor: "#2C3B55", borderWidth: 1, borderRadius: 11, backgroundColor: "#0F1A2E", paddingHorizontal: 10, paddingVertical: 9 }, personalProfileArrow: { width: 27, height: 27, borderRadius: 9, backgroundColor: "#F5B72C22", alignItems: "center", justifyContent: "center" }, personalProfileArrowText: { color: "#F5B72C", fontSize: 22, lineHeight: 22, fontWeight: "900" }, personalProfileRowText: { flex: 1, alignItems: "flex-end", gap: 2 }, personalProfileRowTitle: { color: "#F7F9FC", fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, personalProfileRowDescription: { color: "#AAB7C8", fontSize: 10, lineHeight: 14, textAlign: "right", writingDirection: "rtl" }, categoryMenuHeader: { alignItems: "flex-end", gap: 4, marginBottom: 2 }, categoryMenuTitle: { color: "#F7F9FC", fontSize: 22, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, categoryMenuSubtitle: { color: "#AAB7C8", fontSize: 12, lineHeight: 18, textAlign: "right", writingDirection: "rtl" }, categoryFolder: { backgroundColor: "#111D31", borderWidth: 1, borderRadius: 16, padding: 10, gap: 7 }, audienceFolder: { backgroundColor: "#111D31", borderWidth: 1, borderRadius: 16, padding: 10, gap: 8 }, muscleBuildingFolder: { backgroundColor: "#14243D", borderWidth: 1.5, borderRadius: 16, padding: 10, gap: 8 }, muscleBuildingIcon: { backgroundColor: "#F5B72C22", borderColor: "#F5B72C88" }, nestedFolderList: { gap: 8, paddingTop: 4 }, nestedCategoryFolder: { borderRadius: 13, padding: 8 }, categoryFolderContent: { gap: 7, paddingTop: 3 }, categoryFolderChevron: { fontSize: 22, fontWeight: "900", lineHeight: 22 }, audienceHeaderPressable: { flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 10 }, categoryFolderChevronButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" }, groupSelectButton: { minWidth: 68, minHeight: 30, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }, groupSelectButtonText: { fontSize: 9, fontWeight: "900", textAlign: "center", writingDirection: "rtl" }, categoryEmptyText: { color: "#AAB7C8", fontSize: 11, textAlign: "right", paddingVertical: 7 }, categoryFolderHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 4 }, categoryFolderIcon: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" }, categoryFolderIconText: { fontSize: 11, fontWeight: "900" }, categoryFolderText: { flex: 1, alignItems: "flex-end", gap: 2 }, categoryFolderTitle: { fontSize: 15, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, categoryFolderDescription: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, categoryFolderCount: { fontSize: 12, fontWeight: "900" }, categoryProgramRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8, backgroundColor: "#16233A", borderWidth: 1, borderRadius: 11, padding: 9 }, categoryProgramText: { flex: 1, alignItems: "flex-end", gap: 2 }, categoryProgramTitle: { color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, categoryProgramDescription: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, categoryProgramAction: { fontSize: 10, fontWeight: "900" }, folderWorkoutCard: { backgroundColor: "#0B1224", borderWidth: 1, borderRadius: 13, padding: 11, gap: 9 }, folderWorkoutHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 9 }, folderWorkoutBadge: { width: 34, height: 34, borderWidth: 1, borderRadius: 11, alignItems: "center", justifyContent: "center" }, folderWorkoutBadgeText: { fontSize: 13, fontWeight: "900" }, folderWorkoutHeading: { flex: 1, alignItems: "flex-end", gap: 2 }, folderWorkoutTitle: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, folderWorkoutFocus: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, folderExerciseList: { gap: 5, borderTopColor: "#2C3B55", borderTopWidth: 1, paddingTop: 8 }, folderExerciseRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 7 }, folderExerciseNumber: { minWidth: 15, fontSize: 10, fontWeight: "900", textAlign: "right" }, folderExerciseInfo: { flex: 1, alignItems: "flex-end", gap: 1 }, folderExerciseName: { color: "#EAF1F8", fontSize: 11, fontWeight: "800", textAlign: "right", writingDirection: "rtl" }, folderExerciseMeta: { color: "#7E8DA4", fontSize: 9, lineHeight: 14, textAlign: "right", writingDirection: "rtl" }, folderWorkoutActions: { flexDirection: "row-reverse", gap: 8 }, folderOutlineButton: { flex: 1, minHeight: 37, borderColor: "#52759C", borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }, folderOutlineButtonText: { color: "#A9CFF2", fontSize: 10, fontWeight: "900", textAlign: "center", writingDirection: "rtl" }, folderSelectButton: { flex: 1.45, minHeight: 37, borderColor: "#42D392", borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }, folderSelectButtonText: { color: "#42D392", fontSize: 10, fontWeight: "900", textAlign: "center", writingDirection: "rtl" }, folderStartButton: { flex: 1, minHeight: 37, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }, folderStartButtonText: { color: "#081222", fontSize: 10, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  content: { paddingBottom: 28, gap: 22 },
  header: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 12 },
  titleBlock: { flex: 1, minWidth: 0, alignItems: "flex-end" },
  headerActions: { alignItems: "flex-end", gap: 8 },
  menuButton: { backgroundColor: "#253653", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  menuText: { color: "#F5B72C", fontSize: 11, fontWeight: "900" },
  mealButton: { borderColor: "#3F76A7", borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  mealButtonText: { color: "#F2D48A", fontSize: 10, fontWeight: "800" },
  accountButton: { borderColor: "#F5B72C", borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: "#2A2413" },
  accountButtonText: { color: "#F5B72C", fontSize: 10, fontWeight: "900" },
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
      defaultProgramRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, borderColor: "#2C3B55", borderWidth: 1, borderRadius: 12, backgroundColor: "#0F1A2E", padding: 11 },
      defaultProgramRowActive: { borderColor: "#F5B72C", backgroundColor: "#2A2413" },
      defaultProgramCheck: { width: 28, height: 28, borderRadius: 9, borderColor: "#52759C", borderWidth: 1, alignItems: "center", justifyContent: "center" },
      defaultProgramCheckActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
      defaultProgramCheckText: { color: "#0B1224", fontSize: 18, fontWeight: "900" },
      defaultProgramCopy: { flex: 1, alignItems: "flex-end", gap: 2 },
      defaultProgramTitle: { color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
      defaultProgramDescription: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, personalProgramsPanel: { backgroundColor: "#16233A", borderColor: "#F5B72C", borderWidth: 1, borderRadius: 18, padding: 14, gap: 9 }, personalProgramsHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }, personalProgramsLink: { borderColor: "#F5B72C", borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 }, personalProgramsLinkText: { color: "#F5D27A", fontSize: 10, fontWeight: "900" }, scheduleLink: { backgroundColor: "#F5B72C", borderRadius: 14, borderWidth: 1, borderColor: "#FFE29A", flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 11, shadowColor: "#F5B72C", shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }, scheduleLinkIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#0B1224", alignItems: "center", justifyContent: "center" }, scheduleLinkIconText: { color: "#F5B72C", fontSize: 24, lineHeight: 27, fontWeight: "900" }, scheduleLinkCopy: { flex: 1, alignItems: "flex-end", gap: 2 }, scheduleLinkText: { color: "#0B1224", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, scheduleLinkSubtext: { color: "#3A2A08", fontSize: 10, fontWeight: "700", textAlign: "right", writingDirection: "rtl" }, scheduleLinkArrow: { color: "#0B1224", fontSize: 22, fontWeight: "900" }, personalProgramRow: { backgroundColor: "#0F1A2E", borderWidth: 1, borderRadius: 11, padding: 10, alignItems: "flex-end", gap: 3 }, personalProgramRowTitle: { color: "#F7F9FC", fontSize: 14, fontWeight: "900", textAlign: "right" }, personalProgramRowMeta: { color: "#AAB7C8", fontSize: 10, textAlign: "right" }, personalProgramsEmpty: { color: "#AAB7C8", fontSize: 11, textAlign: "right", lineHeight: 17 },
  methodCarousel: { paddingHorizontal: 4, gap: 10 },
  analysisPanel: { backgroundColor: "#101C31", borderColor: "#65BDF6", borderWidth: 1, borderRadius: 18, padding: 14, gap: 9, marginTop: 15 }, analysisPanelHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10 }, analysisLink: { borderColor: "#65BDF6", borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 }, analysisLinkText: { color: "#8FD3F4", fontSize: 11, fontWeight: "900" }, analysisTotals: { flexDirection: "row-reverse", gap: 8 }, analysisTotal: { flex: 1, backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 5, alignItems: "center" }, analysisTotalValue: { color: "#F7F9FC", fontSize: 14, fontWeight: "900", textAlign: "center" }, analysisTotalLabel: { color: "#AAB7C8", fontSize: 9, marginTop: 3, textAlign: "center", writingDirection: "rtl" }, analysisRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#16233A", borderWidth: 1, borderRadius: 12, padding: 10 }, analysisIcon: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" }, analysisIconText: { fontSize: 11, fontWeight: "900" }, analysisRowText: { flex: 1, gap: 3, alignItems: "flex-end" }, analysisRowTitle: { color: "#F7F9FC", fontSize: 13, fontWeight: "900", textAlign: "right" }, analysisRowMeta: { color: "#AAB7C8", fontSize: 10, textAlign: "right", writingDirection: "rtl" }, analysisRowStatus: { fontSize: 10, fontWeight: "900", textAlign: "right" }, methodList: { gap: 8 },
  categoryTitle: { color: "#F5B72C", fontSize: 14, fontWeight: "900", textAlign: "right", marginTop: 12, marginBottom: 2 },
  categoryTitleFirst: { marginTop: 0 },
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
  myProgramsModal: { maxHeight: "88%", backgroundColor: "#101B31", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: "#334155", padding: 18 }, selectedProgramsSummary: { gap: 8, paddingBottom: 6 }, selectedProgramsSummaryTitle: { color: "#F5B72C", fontSize: 15, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, selectedProgramSummaryCard: { backgroundColor: "#0B1224", borderColor: "#52759C", borderWidth: 1, borderRadius: 11, padding: 9, gap: 3 }, selectedProgramSummaryTitle: { color: "#F7F9FC", fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, selectedProgramSummaryMeta: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, selectedProgramsSummaryHint: { color: "#F2D48A", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, myProgramsContent: { paddingBottom: 16, gap: 9 }, assignmentCard: { backgroundColor: "#16233A", borderColor: "#3F76A7", borderWidth: 1, borderRadius: 14, padding: 11, gap: 7 }, assignmentHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }, assignmentDate: { color: "#7E8DA4", fontSize: 10 }, assignmentDay: { color: "#F7F9FC", fontSize: 15, fontWeight: "900", textAlign: "right" }, assignmentCurrent: { color: "#AAB7C8", fontSize: 11, textAlign: "right", writingDirection: "rtl" }, assignmentChoices: { flexDirection: "row-reverse", gap: 7, paddingVertical: 2 }, assignmentChoice: { minHeight: 34, borderColor: "#52759C", borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, alignItems: "center", justifyContent: "center" }, assignmentChoiceText: { color: "#C7D4E5", fontSize: 10, fontWeight: "800", textAlign: "center" }, myProgramsEmpty: { alignItems: "flex-end", gap: 10, paddingVertical: 18 }, myProgramsEmptyIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: "#F5B72C22", borderColor: "#F5B72C", borderWidth: 1, alignItems: "center", justifyContent: "center", alignSelf: "center" }, myProgramsEmptyIconText: { color: "#F5B72C", fontSize: 31, lineHeight: 34, fontWeight: "900" }, myProgramsEmptyTitle: { color: "#F5B72C", fontSize: 18, fontWeight: "900", textAlign: "right" }, myProgramsEmptyText: { color: "#C7D4E5", fontSize: 12, lineHeight: 19, textAlign: "right", writingDirection: "rtl" }, myProgramsSteps: { alignSelf: "stretch", backgroundColor: "#0B1224", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 13, padding: 11, gap: 8 }, myProgramsStep: { color: "#EAF1F8", fontSize: 11, lineHeight: 17, textAlign: "right", writingDirection: "rtl" }, myProgramsStepNumber: { color: "#F5B72C", fontWeight: "900" }, myProgramsChooseButton: { alignSelf: "stretch", minHeight: 46, borderRadius: 12, backgroundColor: "#F5B72C", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 2, shadowColor: "#F5B72C", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }, myProgramsChooseButtonText: { color: "#0B1224", fontSize: 13, fontWeight: "900", textAlign: "center" }, myProgramsChooseButtonArrow: { color: "#0B1224", fontSize: 22, lineHeight: 22, fontWeight: "900" }, myProgramsDone: { minHeight: 44, borderRadius: 11, backgroundColor: "#F5B72C", alignItems: "center", justifyContent: "center", marginTop: 8 }, myProgramsDoneText: { color: "#0B1224", fontSize: 12, fontWeight: "900" }, modalBackdrop: { flex: 1, backgroundColor: "rgba(3, 8, 20, 0.78)", justifyContent: "flex-end" },
  webCardioPicker: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 999, maxHeight: "88%", overflow: "scroll", backgroundColor: "#101A30", borderColor: "#5278A8", borderWidth: 1, borderRadius: 18, padding: 15, gap: 10 }, cardioPickerModal: { maxHeight: "88%", backgroundColor: "#101B31", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: "#334155", padding: 18 }, cardioPickerContent: { paddingBottom: 20 }, cardioOption: { position: "relative", flexDirection: "row-reverse", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 16, backgroundColor: "#16233A", padding: 14, marginBottom: 10, minHeight: 82 }, cardioOptionIcon: { width: 52, height: 52, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" }, cardioOptionText: { flex: 1, alignItems: "flex-end" }, cardioOptionTitle: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "right" }, cardioOptionSubtitle: { color: "#AAB7C8", fontSize: 11, textAlign: "right", marginTop: 3 }, cardioOptionAction: { fontSize: 11, fontWeight: "900", marginTop: 7 }, cardioMoreCard: { backgroundColor: "#0B1224", borderRadius: 14, padding: 14, marginTop: 2 }, cardioMoreTitle: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" }, cardioMoreText: { color: "#AAB7C8", fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 5 },
  previewModal: { height: "88%", backgroundColor: "#101B31", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: "#334155" },
  previewScroll: { flex: 1 },
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
  creatorModal: { height: "92%", backgroundColor: "#101B31", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: "#334155" },
  creatorScroll: { flex: 1 },
  creatorContent: { padding: 20, gap: 14, paddingBottom: 34 }, builderSelectionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10 }, builderSelectionHint: { color: "#8FA4BB", fontSize: 10, textAlign: "right", marginTop: 3 }, builderSelectionBadge: { minWidth: 54, minHeight: 46, borderWidth: 1, borderRadius: 12, backgroundColor: "#0B1224", alignItems: "center", justifyContent: "center", paddingHorizontal: 7 }, builderSelectionBadgeValue: { fontSize: 18, fontWeight: "900" }, builderSelectionBadgeLabel: { color: "#AAB7C8", fontSize: 9, marginTop: 1 }, creatorCategoryRow: { flexDirection: "row-reverse", gap: 7, paddingVertical: 2 }, creatorCategory: { borderColor: "#48617E", borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8 }, creatorCategoryText: { color: "#C7D4E5", fontSize: 10, fontWeight: "800" }, creatorCategoryTextActive: { color: "#0B1224" },   creatorResultCount: { color: "#8ED8FF", fontSize: 10, textAlign: "right", writingDirection: "rtl" }, exerciseCategoryList: { gap: 9 }, exerciseCategorySection: { backgroundColor: "#16233A", borderWidth: 1, borderRadius: 15, overflow: "hidden" }, exerciseCategoryHeader: { minHeight: 68, flexDirection: "row-reverse", alignItems: "center", gap: 9, padding: 11 }, exerciseCategoryIcon: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" }, exerciseCategoryHeaderCopy: { flex: 1, alignItems: "flex-end" }, exerciseCategoryTitle: { color: "#F7F9FC", fontSize: 14, fontWeight: "900", textAlign: "right" }, exerciseCategorySubtitle: { color: "#AAB7C8", fontSize: 9, lineHeight: 14, textAlign: "right", marginTop: 2 }, exerciseCategoryCount: { minWidth: 42, alignItems: "center" }, exerciseCategoryCountValue: { fontSize: 16, fontWeight: "900" }, exerciseCategoryCountLabel: { color: "#7E8DA4", fontSize: 8, marginTop: 1 }, exerciseCategoryChevron: { color: "#F7F9FC", fontSize: 19, width: 18, textAlign: "center" }, exerciseCategoryExercises: { gap: 7, paddingHorizontal: 9, paddingBottom: 9, borderTopColor: "#2C3B55", borderTopWidth: 1 },
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
