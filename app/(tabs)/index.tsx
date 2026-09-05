import { ActivityIndicator, Alert, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { KeyboardAvoidingView } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { completedWorkoutHistoryRoute } from "@/lib/completed-workout-route";
import { getTemplate, type WorkoutId, type WorkoutTemplate } from "@/lib/workout-data";
import { categoryForExercise, exerciseLibrary } from "@/lib/exercise-library";
import { CARDIO_WORKOUT_TEMPLATE_IDS, calculateVolume, MAX_SELECTED_PROGRAMS, sortWorkoutSessionsNewestFirst, useWorkoutStore, type PersonalProgram } from "@/lib/workout-store";
import { calculateFivePercentProgress } from "@/lib/workout-progression";
import { calculateProjectedVolume } from "@/lib/workout-volume";
import { buildPlanMetrics } from "@/lib/workout-analysis";
import { getWorkoutEncyclopediaProgram, workoutEncyclopediaCategories, workoutEncyclopediaPrograms } from "@/lib/workout-encyclopedia";
import { muscleBuildingFolderIds, muscleBuildingFolderTemplateIds } from "@/lib/muscle-building-content";
import { workoutCategoryTemplateIds } from "@/lib/workout-category-content";
import { workoutAudienceSections } from "@/lib/workout-audience-sections";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { ActionToast } from "@/components/action-toast";
import { HomeTimeWeatherWidget } from "@/components/home-time-weather-widget";
import { BrandMark } from "@/components/ui/brand-mark";
import { supabase } from "@/lib/supabase";
import { confirmSignOut } from "@/lib/confirm-sign-out";
import { getAllowedScheduleTemplates, readDefaultWorkoutTemplateId, readWorkoutScheduleOverrides, resolveTodaySchedule, setDefaultWorkoutTemplateId, type TodaySchedule } from "@/lib/workout-schedule";
import { canonicalProgramSelectionId } from "@/lib/workout-program-selection";
import { localDateKey } from "@/lib/calendar-grid";

const formatDate = (iso: string) => new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long" }).format(new Date(iso));

type TrainingMethod = { id: string; title: string; subtitle: string; templateIds: WorkoutId[]; accent: string; icon: IconSymbolName; group: string };
type CreatorExercise = { id: string; name: string; englishName: string; aliases?: string[]; category: string; defaultTarget: string; note?: string; sourceTemplateId?: WorkoutId; sourceExerciseId?: string; sourceSetCount?: number };
type BuilderWorkoutDraft = { id: string; name: string; exerciseIds: string[]; sourceTemplateId?: WorkoutId };
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
const builderIconOptions: IconSymbolName[] = ["dumbbell.fill", "square.grid.2x2.fill", "figure.run", "bicycle", "bolt.fill", "star.fill", "figure.elliptical", "stairs", "person.fill", "heart.fill", "timer"];
const builderColorOptions = ["#F5B72C", "#65BDF6", "#C084FC", "#42D392", "#FB7185", "#F59E0B", "#E38BFF", "#14B8A6", "#FB923C", "#A3E635"] as const;
const builderExerciseIdentity = (exercise: Pick<CreatorExercise, "name" | "englishName">) => `${exercise.name.trim().toLowerCase()}|${exercise.englishName.trim().toLowerCase()}`;
const isPersonalBuilderExercise = (exercise: Pick<CreatorExercise, "id" | "note">) => exercise.id.startsWith("custom-builder-exercise-") || exercise.id.startsWith("saved-") || exercise.note === "תרגיל מותאם אישית";
const builderSourceLabels = { all: "הכול", catalog: "קטלוג", personal: "אישי" } as const;
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
  const { sessions, startWorkoutFromTemplate, templates, addCustomTemplate, addPersonalProgram, removePersonalProgram, updatePersonalProgram, movePersonalProgramWorkout, duplicatePersonalProgram, updateTemplate, selectedProgramIds, toggleSelectedProgram, personalPrograms } = useWorkoutStore();
  const [accountName, setAccountName] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState("fixed");
  const [isSwitchingMethod, setIsSwitchingMethod] = useState(false);
  const [isCardioPickerOpen, setIsCardioPickerOpen] = useState(false);
  const [selectedDayByMethod, setSelectedDayByMethod] = useState<Record<string, WorkoutId>>({});
  useEffect(() => { void AsyncStorage.getItem(selectedMethodStorageKey).then((stored) => { if (stored) setSelectedMethodId(stored); }); void AsyncStorage.getItem(selectedDayStorageKey).then((stored) => { if (stored) { try { setSelectedDayByMethod(JSON.parse(stored) as Record<string, WorkoutId>); } catch { /* נתון ישן או פגום — נשארים בברירת המחדל */ } } }); }, []);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isBuilderStarted, setIsBuilderStarted] = useState(false);
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
  const [builderSourceFilter, setBuilderSourceFilter] = useState<"all" | "catalog" | "personal">("all");
  const [customIcon, setCustomIcon] = useState<IconSymbolName>("dumbbell.fill");
  const [customColor, setCustomColor] = useState("#F5B72C");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [customBuilderExercises, setCustomBuilderExercises] = useState<CreatorExercise[]>([]);
  const [builderExerciseOverrides, setBuilderExerciseOverrides] = useState<Record<string, Partial<CreatorExercise>>>({});
  const [customExerciseDraftName, setCustomExerciseDraftName] = useState("");
  const [customExerciseDraftEnglishName, setCustomExerciseDraftEnglishName] = useState("");
  const [creatorToastMessage, setCreatorToastMessage] = useState<string | null>(null);
  const [editingCustomExerciseId, setEditingCustomExerciseId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [editingPersonalProgramId, setEditingPersonalProgramId] = useState<string | null>(null);
  const [builderReturnToSchedule, setBuilderReturnToSchedule] = useState(false);
  const [isBuilderReviewOpen, setIsBuilderReviewOpen] = useState(false);
  const [isProgramNameConfirmed, setIsProgramNameConfirmed] = useState(false);
  const [confirmedBuilderWorkoutIds, setConfirmedBuilderWorkoutIds] = useState<string[]>([]);
  const [builderExerciseDrag, setBuilderExerciseDrag] = useState<{ workoutId: string; exerciseId: string; lastY: number } | null>(null);
  const [pendingBuilderExercise, setPendingBuilderExercise] = useState<CreatorExercise | null>(null);
  const [hiddenPersonalExerciseKeys, setHiddenPersonalExerciseKeys] = useState<string[]>([]);
  const [builderWorkouts, setBuilderWorkouts] = useState<BuilderWorkoutDraft[]>([{ id: "draft-workout-1", name: "", exerciseIds: [] }]);
  const [activeBuilderWorkoutId, setActiveBuilderWorkoutId] = useState("draft-workout-1");
  const [expandedBuilderCategories, setExpandedBuilderCategories] = useState<string[]>([]);
  useEffect(() => {
    if (!supabase) return;
    const updateAccountName = (session: Session | null) => {
      const user = session?.user;
      const metadataName = user?.user_metadata?.full_name ?? user?.user_metadata?.name;
      // Deliberately no email-derived fallback here: showing the local part
      // of someone's email address (e.g. "dagayossi") reads as a leaked
      // email fragment, not a friendly greeting - a generic "שלום!" is used
      // instead when there is no real display name on the account.
      setAccountName(typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : null);
      setIsSignedIn(Boolean(user));
    };
    void supabase.auth.getSession().then(({ data }) => updateAccountName(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => updateAccountName(session));
    return () => listener.subscription.unsubscribe();
  }, []);
  const [todaySchedule, setTodaySchedule] = useState<TodaySchedule>({ status: "none" });
  const refreshTodaySchedule = useCallback(async () => {
    const [overrides, defaultTemplateId] = await Promise.all([readWorkoutScheduleOverrides(), readDefaultWorkoutTemplateId()]);
    const allowed = getAllowedScheduleTemplates(templates, selectedProgramIds, defaultTemplateId, CARDIO_WORKOUT_TEMPLATE_IDS, personalPrograms);
    setTodaySchedule(resolveTodaySchedule(overrides[localDateKey(new Date())], allowed));
  }, [templates, selectedProgramIds, personalPrograms]);
  useEffect(() => { void refreshTodaySchedule(); }, [refreshTodaySchedule]);
  // Tab screens stay mounted in the background, so assigning a workout on
  // the schedule tab and switching back here would otherwise keep showing
  // the stale "nothing scheduled" state from this screen's last mount.
  useFocusEffect(useCallback(() => { void refreshTodaySchedule(); }, [refreshTodaySchedule]));
  const requestAccountSignOut = () => confirmSignOut(() => {
    void supabase?.auth.signOut().then(() => router.replace("/register" as never));
  });
  const customMethods: TrainingMethod[] = templates.filter((template) => template.id.startsWith("custom-")).map((template) => ({ id: template.id, group: "תוכניות מותאמות", title: template.name, subtitle: template.focus, templateIds: [template.id], accent: template.accent, icon: (template.icon as IconSymbolName) || "dumbbell.fill" }));
  const methods = [...trainingMethods, ...customMethods];
  const selectedMethod = methods.find((method) => method.id === selectedMethodId) ?? methods[0];
  const selectedDayId = selectedDayByMethod[selectedMethod.id] ?? selectedMethod.templateIds[0];
  const selectedDayTemplate = templates.find((template) => template.id === selectedDayId) ?? getTemplate(selectedDayId) ?? templates.find((template) => template.id === selectedMethod.templateIds[0]);
  const personalProgramById = new Map(personalPrograms.map((program) => [program.id, program]));
  const selectedPersonalPrograms = selectedProgramIds.map((id) => {
    const canonicalId = canonicalProgramSelectionId(id);
    const personalProgram = personalProgramById.get(id) ?? personalProgramById.get(canonicalId);
    if (personalProgram) {
      const personalTemplates = personalProgram.workoutTemplateIds.map((templateId) => templates.find((template) => template.id === templateId) ?? getTemplate(templateId)).filter((template): template is WorkoutTemplate => Boolean(template));
      return { id: personalProgram.id, template: personalTemplates[0], templates: personalTemplates, personalProgram, program: undefined };
    }
    const templateIds = muscleBuildingFolderTemplateIds[canonicalId as keyof typeof muscleBuildingFolderTemplateIds] ?? workoutCategoryTemplateIds[canonicalId] ?? [canonicalId as WorkoutId];
    const selectedTemplates = templateIds
      .map((templateId) => templates.find((template) => template.id === templateId) ?? getTemplate(templateId))
      .filter((template): template is WorkoutTemplate => Boolean(template));
    return {
      id: canonicalId,
      template: selectedTemplates[0],
      templates: selectedTemplates,
      personalProgram: undefined,
      program: getWorkoutEncyclopediaProgram(canonicalId),
    };
  }).filter((item) => Boolean(item.template || item.program));
  const planMetrics = buildPlanMetrics(sessions, templates);
  const allBuilderExercises = useMemo<CreatorExercise[]>(() => {
    const templateExercises = templates.flatMap((template) => template.exercises.map((exercise) => ({ id: `template-${exercise.id}`, name: exercise.name, englishName: exercise.englishName ?? "", note: exercise.note, category: categoryForExercise(`${exercise.name} ${exercise.englishName ?? ""}`) ?? "כללי", defaultTarget: exercise.sets[0]?.target ?? "8–12" })));
    const savedPersonalExercises = templates.flatMap((template) => template.exercises.filter((exercise) => exercise.note === "תרגיל מותאם אישית" || exercise.id.startsWith("custom-")).map((exercise) => ({ id: `saved-${exercise.id}`, name: exercise.name, englishName: exercise.englishName ?? "", note: exercise.note, category: categoryForExercise(`${exercise.name} ${exercise.englishName ?? ""}`) ?? "כללי", defaultTarget: exercise.sets[0]?.target ?? "8–12" })));
    const merged = [...customBuilderExercises, ...savedPersonalExercises, ...exerciseLibrary, ...templateExercises].map((item) => builderExerciseOverrides[item.id] ? { ...item, ...builderExerciseOverrides[item.id] } : item);
    const seen = new Set<string>();
    return merged.filter((item) => { const key = "sourceExerciseId" in item && item.sourceExerciseId ? item.id : `${item.name.trim().toLowerCase()}|${item.englishName.trim().toLowerCase()}`; if (seen.has(key)) return false; seen.add(key); return Boolean(item.name.trim()); });
  }, [builderExerciseOverrides, customBuilderExercises, templates]);
  const builderCategories = useMemo(() => ["הכול", ...builderCategoryOrder.filter((category) => allBuilderExercises.some((item) => item.category === category)), ...Array.from(new Set(allBuilderExercises.map((item) => item.category))).filter((category) => !builderCategoryOrder.includes(category))], [allBuilderExercises]);
  const builderMatchesSourceFilter = (exercise: CreatorExercise) => builderSourceFilter === "all" || (builderSourceFilter === "personal" ? isPersonalBuilderExercise(exercise) : !isPersonalBuilderExercise(exercise));
  const filteredCustomExercises = allBuilderExercises.filter(builderMatchesSourceFilter).filter((item) => customCategory === "הכול" || item.category === customCategory).filter((item) => `${item.name} ${item.englishName} ${(item.aliases ?? []).join(" ")}`.toLowerCase().includes(customSearch.toLowerCase()));
  const visibleBuilderCategories = builderCategories.filter((category) => category !== "הכול").map((category) => ({ category, exercises: filteredCustomExercises.filter((item) => item.category === category) })).filter(({ exercises }) => exercises.length > 0);
  const myExercises = useMemo(() => {
    const customFromTemplates = templates.flatMap((template) => template.exercises.filter((exercise) => exercise.note === "תרגיל מותאם אישית" || exercise.id.startsWith("custom-")).map((exercise) => ({ id: `saved-${exercise.id}`, name: exercise.name, englishName: exercise.englishName ?? "", category: categoryForExercise(`${exercise.name} ${exercise.englishName ?? ""}`) ?? "כללי", defaultTarget: exercise.sets[0]?.target ?? "8–12", note: exercise.note })));
    const merged = [...customBuilderExercises, ...customFromTemplates];
    const seen = new Set<string>();
    return merged.filter((exercise) => { const key = `${exercise.name.trim().toLowerCase()}|${exercise.englishName.trim().toLowerCase()}`; if (seen.has(key) || hiddenPersonalExerciseKeys.includes(key)) return false; seen.add(key); return true; });
  }, [customBuilderExercises, hiddenPersonalExerciseKeys, templates]);
  const filteredReplacementExercises = exerciseLibrary.filter((item) => `${item.name} ${item.englishName} ${(item.aliases ?? []).join(" ")}`.toLowerCase().includes(replacementSearch.toLowerCase())).slice(0, 8);
  const selectedBuilderExerciseIdentities = new Set(selectedExerciseIds.map((id) => allBuilderExercises.find((exercise) => exercise.id === id)).filter((exercise): exercise is CreatorExercise => Boolean(exercise)).map(builderExerciseIdentity));
  const isBuilderExerciseSelected = (exercise: CreatorExercise) => selectedExerciseIds.includes(exercise.id);
  const isBuilderExerciseAlreadyChosen = (exercise: CreatorExercise) => isBuilderExerciseSelected(exercise) || selectedBuilderExerciseIdentities.has(builderExerciseIdentity(exercise));
  const availableMyExercises = myExercises.filter((exercise) => !isBuilderExerciseAlreadyChosen(exercise));
  const builderSourceCounts = { all: allBuilderExercises.length, catalog: allBuilderExercises.filter((exercise) => !isPersonalBuilderExercise(exercise)).length, personal: allBuilderExercises.filter((exercise) => isPersonalBuilderExercise(exercise)).length };
  const builderDuplicateCount = selectedExerciseIds.length - new Set(selectedExerciseIds.map((id) => { const exercise = allBuilderExercises.find((item) => item.id === id); return exercise ? builderExerciseIdentity(exercise) : id; })).size;
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
  const activeBuilderWorkout = builderWorkouts.find((workout) => workout.id === activeBuilderWorkoutId) ?? builderWorkouts[0];
  const currentBuilderDrafts = () => builderWorkouts.map((workout) => workout.id === activeBuilderWorkoutId ? { ...workout, name: workoutName.trim(), exerciseIds: selectedExerciseIds } : workout);
  const confirmBuilderAction = (title: string, message: string, confirmText: string, onConfirm: () => void, destructive = false) => {
    if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.confirm === "function") { if (window.confirm(`${title}\n\n${message}`)) onConfirm(); return; }
    Alert.alert(title, message, [{ text: "ביטול", style: "cancel" }, { text: confirmText, style: destructive ? "destructive" : "default", onPress: onConfirm }]);
  };
  const requestRemoveSelectedProgram = (id: string, title: string, personalProgram: PersonalProgram | undefined) => {
    confirmBuilderAction(
      "הסרת תוכנית",
      personalProgram ? `להסיר את ${title} מהתוכניות שלי? כל האימונים שלה יוסרו גם הם.` : `להסיר את ${title} מהתוכניות שלי?`,
      "הסר",
      () => {
        if (personalProgram) removePersonalProgram(personalProgram.id);
        else toggleSelectedProgram(id);
        setCreatorToastMessage(`${title} הוסרה מהתוכניות שלי`);
      },
      true,
    );
  };
  const setActiveBuilderExercises = (exerciseIds: string[]) => {
    setSelectedExerciseIds(exerciseIds);
    setBuilderWorkouts((current) => current.map((workout) => workout.id === activeBuilderWorkoutId ? { ...workout, exerciseIds } : workout));
  };
  const toggleCustomExercise = (id: string) => {
    const exercise = allBuilderExercises.find((item) => item.id === id);
    const selectedId = selectedExerciseIds.find((selected) => {
      if (selected === id) return true;
      if (!exercise) return false;
      const selectedExercise = allBuilderExercises.find((item) => item.id === selected);
      return selectedExercise ? builderExerciseIdentity(selectedExercise) === builderExerciseIdentity(exercise) : false;
    });
    const nextIds = selectedId ? selectedExerciseIds.filter((item) => item !== selectedId) : [...selectedExerciseIds, id];
    setActiveBuilderExercises(nextIds);
  };
  const requestRemoveBuilderExercise = (id: string) => {
    const exercise = allBuilderExercises.find((item) => item.id === id);
    const selectedId = selectedExerciseIds.find((selected) => {
      if (selected === id) return true;
      if (!exercise) return false;
      const selectedExercise = allBuilderExercises.find((item) => item.id === selected);
      return selectedExercise ? builderExerciseIdentity(selectedExercise) === builderExerciseIdentity(exercise) : false;
    });
    if (!exercise || !selectedId) return;
    confirmBuilderAction("הסרת תרגיל", `להסיר את „${exercise.name}” מהאימון הנוכחי?`, "הסר תרגיל", () => { toggleCustomExercise(selectedId); Keyboard.dismiss(); }, true);
  };
  const requestRemovePersonalBuilderExercise = (exercise: CreatorExercise) => {
    confirmBuilderAction("הסרת תרגיל אישי", `להסיר את „${exercise.name}” מאזור התרגילים האישיים?`, "הסר מהרשימה", () => {
      const identity = builderExerciseIdentity(exercise);
      setHiddenPersonalExerciseKeys((current) => current.includes(identity) ? current : [...current, identity]);
      setActiveBuilderExercises(selectedExerciseIds.filter((selectedId) => {
        const selectedExercise = allBuilderExercises.find((item) => item.id === selectedId);
        return !selectedExercise || builderExerciseIdentity(selectedExercise) !== identity;
      }));
      Keyboard.dismiss();
      setCreatorToastMessage("התרגיל הוסר מרשימת התרגילים האישיים");
    }, true);
  };
  const requestAddBuilderExercise = (id: string) => {
    const exercise = allBuilderExercises.find((item) => item.id === id);
    if (!exercise) return;
    const alreadySelected = selectedExerciseIds.some((selected) => {
      if (selected === id) return true;
      const selectedExercise = allBuilderExercises.find((item) => item.id === selected);
      return selectedExercise ? builderExerciseIdentity(selectedExercise) === builderExerciseIdentity(exercise) : false;
    });
    if (alreadySelected) { requestRemoveBuilderExercise(id); return; }
    Keyboard.dismiss();
    setPendingBuilderExercise(exercise);
  };
  const confirmPendingBuilderExercise = () => {
    const exercise = pendingBuilderExercise;
    if (!exercise) return;
    const alreadySelected = selectedExerciseIds.some((selected) => {
      if (selected === exercise.id) return true;
      const selectedExercise = allBuilderExercises.find((item) => item.id === selected);
      return selectedExercise ? builderExerciseIdentity(selectedExercise) === builderExerciseIdentity(exercise) : false;
    });
    if (!alreadySelected) setActiveBuilderExercises([...selectedExerciseIds, exercise.id]);
    setPendingBuilderExercise(null);
    Keyboard.dismiss();
    setCreatorToastMessage(`נוסף לאימון: ${exercise.name}`);
  };
  const moveBuilderExercise = (workoutId: string, exerciseId: string, direction: "up" | "down") => {
    const drafts = currentBuilderDrafts();
    const draft = drafts.find((workout) => workout.id === workoutId);
    if (!draft) return;
    const currentIndex = draft.exerciseIds.indexOf(exerciseId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= draft.exerciseIds.length) return;
    const nextExerciseIds = [...draft.exerciseIds];
    [nextExerciseIds[currentIndex], nextExerciseIds[targetIndex]] = [nextExerciseIds[targetIndex], nextExerciseIds[currentIndex]];
    setBuilderWorkouts(drafts.map((workout) => workout.id === workoutId ? { ...workout, exerciseIds: nextExerciseIds } : workout));
    if (workoutId === activeBuilderWorkoutId) setSelectedExerciseIds(nextExerciseIds);
  };
  const updateBuilderExerciseNote = (exerciseId: string, note: string) => setBuilderExerciseOverrides((current) => ({ ...current, [exerciseId]: { ...current[exerciseId], note: note.trim() ? note : undefined } }));
  const startBuilderExerciseDrag = (workoutId: string, exerciseId: string, event: GestureResponderEvent) => setBuilderExerciseDrag({ workoutId, exerciseId, lastY: event.nativeEvent.pageY });
  const moveBuilderExerciseDrag = (event: GestureResponderEvent) => { const drag = builderExerciseDrag; if (!drag) return; const pageY = event.nativeEvent.pageY; if (Math.abs(pageY - drag.lastY) < 30) return; moveBuilderExercise(drag.workoutId, drag.exerciseId, pageY < drag.lastY ? "up" : "down"); setBuilderExerciseDrag({ ...drag, lastY: pageY }); };
  const endBuilderExerciseDrag = () => setBuilderExerciseDrag(null);
  const estimateWorkoutMinutes = (exerciseCount: number, setCount: number) => Math.max(5, Math.round((setCount * 2 + exerciseCount) / 5) * 5);
  const updateBuilderWorkoutName = (name: string) => {
    setWorkoutName(name);
    setConfirmedBuilderWorkoutIds((current) => current.filter((id) => id !== activeBuilderWorkoutId));
    setBuilderWorkouts((current) => current.map((workout) => workout.id === activeBuilderWorkoutId ? { ...workout, name } : workout));
  };
  const confirmProgramName = () => { if (customName.trim()) setIsProgramNameConfirmed(true); };
  const confirmBuilderWorkout = () => { if (!workoutName.trim()) return; saveActiveBuilderWorkout(); setConfirmedBuilderWorkoutIds((current) => current.includes(activeBuilderWorkoutId) ? current : [...current, activeBuilderWorkoutId]); };
  const saveActiveBuilderWorkout = () => setBuilderWorkouts(currentBuilderDrafts());
  const selectBuilderWorkout = (id: string) => {
    const drafts = currentBuilderDrafts();
    setBuilderWorkouts(drafts);
    const next = drafts.find((workout) => workout.id === id);
    if (!next) return;
    setActiveBuilderWorkoutId(id); setWorkoutName(next.name); setSelectedExerciseIds(next.exerciseIds);
  };
  const addAnotherBuilderWorkout = () => {
    if (!isActiveBuilderWorkoutConfirmed) { setCreatorToastMessage("אשר קודם את האימון הנוכחי לפני הוספת אימון נוסף"); return; }
    const createNextWorkout = () => {
      const drafts = currentBuilderDrafts();
      const nextId = `draft-workout-${Date.now()}`;
      setBuilderWorkouts([...drafts, { id: nextId, name: "", exerciseIds: [] }]);
      setActiveBuilderWorkoutId(nextId); setWorkoutName(""); setSelectedExerciseIds([]);
      setConfirmedBuilderWorkoutIds((current) => current.filter((id) => id !== nextId));
    };
    const confirmationMessage = "האימון הנוכחי אושר. ליצור עכשיו אימון נוסף?";
    if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.confirm === "function") { if (window.confirm(confirmationMessage)) createNextWorkout(); return; }
    Alert.alert("הוספת אימון לתוכנית", confirmationMessage, [{ text: "ביטול", style: "cancel" }, { text: "אישור והוספה", onPress: createNextWorkout }]);
  };
  const isAppendingWorkoutToExistingProgram = Boolean(editingPersonalProgramId && builderReturnToSchedule);
  const isBuilderProgramNameConfirmed = isProgramNameConfirmed || isAppendingWorkoutToExistingProgram;
  const isActiveBuilderWorkoutConfirmed = isBuilderProgramNameConfirmed && confirmedBuilderWorkoutIds.includes(activeBuilderWorkoutId);
  const canSaveCustomProgram = Boolean(customName.trim() && currentBuilderDrafts().every((workout) => workout.name.trim() && workout.exerciseIds.length > 0));
  const builderSaveHint = !customName.trim() ? "הזן שם לתוכנית כדי להמשיך." : currentBuilderDrafts().some((workout) => !workout.name.trim()) ? "השלם שם לכל אימון לפני השמירה." : currentBuilderDrafts().some((workout) => workout.exerciseIds.length === 0) ? "הוסף לפחות תרגיל אחד לכל אימון." : "התוכנית מוכנה לשמירה ולהוספה לתוכנית האימונים שלי.";
  const handleBuilderSavePress = () => {
    if (!canSaveCustomProgram) { setCreatorToastMessage(builderSaveHint); return; }
    Keyboard.dismiss();
    openBuilderReview();
  };
  const addCustomBuilderExercise = () => {
    const name = customExerciseDraftName.trim();
    if (!name) return;
    if (editingCustomExerciseId) {
      setCustomBuilderExercises((current) => current.map((item) => item.id === editingCustomExerciseId ? { ...item, name, englishName: customExerciseDraftEnglishName.trim(), category: customCategory === "הכול" ? item.category : customCategory } : item));
      setEditingCustomExerciseId(null); setCustomExerciseDraftName(""); setCustomExerciseDraftEnglishName(""); setCreatorToastMessage("התרגיל עודכן");
      return;
    }
    const exercise: CreatorExercise = { id: `custom-builder-exercise-${Date.now()}`, name, englishName: customExerciseDraftEnglishName.trim(), category: customCategory === "הכול" ? "כללי" : customCategory, defaultTarget: "8–12", note: "תרגיל מותאם אישית" };
    const addExercise = () => {
      setCustomBuilderExercises((current) => [...current, exercise]);
      const nextExerciseIds = selectedExerciseIds.includes(exercise.id) ? selectedExerciseIds : [...selectedExerciseIds, exercise.id];
      setActiveBuilderExercises(nextExerciseIds);
      setCustomExerciseDraftName(""); setCustomExerciseDraftEnglishName("");
      setCreatorToastMessage("הועבר לתרגילים שלי");
    };
    confirmBuilderAction("אישור הוספת תרגיל אישי", `להוסיף את „${exercise.name}” לאימון הנוכחי?`, "הוסף תרגיל", () => { addExercise(); Keyboard.dismiss(); });
  };
  const beginEditBuilderExercise = (exercise: CreatorExercise) => {
    if (!exercise.id.startsWith("custom-builder-exercise-")) { setCreatorToastMessage("תרגילי הקטלוג נשמרים כפי שהם; אפשר לערוך אותם במסך העבודה לאחר השמירה"); return; }
    setEditingCustomExerciseId(exercise.id); setCustomExerciseDraftName(exercise.name); setCustomExerciseDraftEnglishName(exercise.englishName); setCustomCategory(exercise.category);
  };
  const toggleBuilderCategory = (category: string) => setExpandedBuilderCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  const switchMethod = (methodId: string) => { if (methodId === "muscle-gain-methods") { router.push("/muscle-gain-methods" as never); return; } if (methodId === "cardio") { setSelectedMethodId(methodId); void AsyncStorage.setItem(selectedMethodStorageKey, methodId); setIsCardioPickerOpen(true); return; } if (methodId === selectedMethodId) return; setIsSwitchingMethod(true); setSelectedMethodId(methodId); void AsyncStorage.setItem(selectedMethodStorageKey, methodId); setTimeout(() => setIsSwitchingMethod(false), 180); };
  const selectTrainingDay = (methodId: string, templateId: WorkoutId) => { setSelectedDayByMethod((current) => { const next = { ...current, [methodId]: templateId }; void AsyncStorage.setItem(selectedDayStorageKey, JSON.stringify(next)); return next; }); };
  const resetCreatorDraft = () => {
    const firstWorkoutId = `draft-workout-${Date.now()}`;
    setEditingPersonalProgramId(null); setBuilderReturnToSchedule(false); setIsBuilderReviewOpen(false); setIsProgramNameConfirmed(false); setConfirmedBuilderWorkoutIds([]); setBuilderExerciseOverrides({}); setCustomName(""); setWorkoutName(""); setCustomSearch(""); setCustomCategory("הכול"); setBuilderSourceFilter("all"); setSelectedExerciseIds([]); setCustomBuilderExercises([]); setHiddenPersonalExerciseKeys([]); setPendingBuilderExercise(null); setIsBuilderStarted(false); setBuilderWorkouts([{ id: firstWorkoutId, name: "", exerciseIds: [] }]); setActiveBuilderWorkoutId(firstWorkoutId); setIsCustomDefault(false); setCustomExerciseDraftName(""); setCustomExerciseDraftEnglishName(""); setEditingCustomExerciseId(null);
  };
  const openCreator = () => { resetCreatorDraft(); setIsCreatorOpen(true); };
  const openCreatorForProgram = (program: PersonalProgram, appendWorkout = false) => {
    const programTemplates = program.workoutTemplateIds.map((templateId) => templates.find((template) => template.id === templateId) ?? getTemplate(templateId)).filter((template): template is WorkoutTemplate => Boolean(template));
    const editorExercises: CreatorExercise[] = programTemplates.flatMap((template) => template.exercises.map((exercise) => ({ id: `existing-exercise-${template.id}-${exercise.id}`, name: exercise.name, englishName: exercise.englishName ?? "", note: exercise.note, category: categoryForExercise(`${exercise.name} ${exercise.englishName ?? ""}`) ?? "כללי", defaultTarget: exercise.sets[0]?.target ?? "8–12", sourceTemplateId: template.id, sourceExerciseId: exercise.id, sourceSetCount: exercise.sets.length })));
    const drafts: BuilderWorkoutDraft[] = programTemplates.map((template) => ({ id: `existing-workout-${template.id}`, name: template.name, exerciseIds: editorExercises.filter((exercise) => exercise.sourceTemplateId === template.id).map((exercise) => exercise.id), sourceTemplateId: template.id }));
    const firstWorkoutId = appendWorkout ? `draft-workout-${Date.now()}` : drafts[0]?.id ?? `draft-workout-${Date.now()}`;
    const nextDrafts = appendWorkout || !drafts.length ? [...drafts, { id: firstWorkoutId, name: "", exerciseIds: [] }] : drafts;
    const activeDraft = nextDrafts.find((draft) => draft.id === firstWorkoutId) ?? nextDrafts[0];
    setEditingPersonalProgramId(program.id); setBuilderReturnToSchedule(appendWorkout); setIsBuilderReviewOpen(false); setIsProgramNameConfirmed(false); setConfirmedBuilderWorkoutIds(drafts.filter((draft) => Boolean(draft.name.trim())).map((draft) => draft.id)); setBuilderExerciseOverrides({}); setCustomName(program.name); setCustomColor(program.accent); setCustomIcon((program.icon as IconSymbolName) || "dumbbell.fill"); setCustomSearch(""); setCustomCategory("הכול"); setBuilderSourceFilter("all"); setCustomBuilderExercises(editorExercises); setHiddenPersonalExerciseKeys([]); setPendingBuilderExercise(null); setBuilderWorkouts(nextDrafts); setActiveBuilderWorkoutId(activeDraft.id); setWorkoutName(activeDraft.name); setSelectedExerciseIds(activeDraft.exerciseIds); setIsBuilderStarted(true); setIsCustomDefault(false); setIsCreatorOpen(true);
  };
  const editPersonalProgram = (program: PersonalProgram) => { setIsMyProgramsOpen(false); openCreatorForProgram(program, false); };
  const addWorkoutToPersonalProgram = (program: PersonalProgram) => { setIsMyProgramsOpen(false); openCreatorForProgram(program, true); };
  const editPersonalWorkout = (template: WorkoutTemplate) => { setIsMyProgramsOpen(false); router.push({ pathname: "/template-exercises" as never, params: { templateId: template.id } } as never); };
  const builderPreviewWorkouts = currentBuilderDrafts().map((workout) => ({ ...workout, exercises: workout.exerciseIds.map((id) => allBuilderExercises.find((item) => item.id === id)).filter((exercise): exercise is CreatorExercise => Boolean(exercise)) }));
  const builderPreviewExerciseTotal = builderPreviewWorkouts.reduce((total, workout) => total + workout.exercises.length, 0);
  const builderPreviewSetTotal = builderPreviewWorkouts.reduce((total, workout) => total + workout.exercises.reduce((sets, exercise) => sets + (exercise.sourceSetCount ?? 2), 0), 0);
  const builderPreviewWorkoutMinutes = builderPreviewWorkouts.map((workout) => estimateWorkoutMinutes(workout.exercises.length, workout.exercises.reduce((total, exercise) => total + (exercise.sourceSetCount ?? 2), 0)));
  const builderPreviewTotalMinutes = builderPreviewWorkoutMinutes.reduce((total, minutes) => total + minutes, 0);
  const openBuilderReview = () => { const drafts = currentBuilderDrafts(); if (!customName.trim() || drafts.some((workout) => !workout.name.trim() || workout.exerciseIds.length === 0)) return; setBuilderWorkouts(drafts); setIsBuilderReviewOpen(true); };
  const createCustomWorkout = async () => {
    const programName = customName.trim();
    const drafts = currentBuilderDrafts();
    if (!programName || drafts.some((workout) => !workout.name.trim() || workout.exerciseIds.length === 0)) return;
    const stamp = Date.now();
    const isEditingProgram = Boolean(editingPersonalProgramId);
    const editingProgram = editingPersonalProgramId ? personalPrograms.find((program) => program.id === editingPersonalProgramId) : undefined;
    let savedProgramId: string | null = null;
    const createdTemplates = drafts.map((workout, index) => {
      const existingTemplate = workout.sourceTemplateId ? templates.find((template) => template.id === workout.sourceTemplateId) : undefined;
      const exercises = workout.exerciseIds.map((id) => allBuilderExercises.find((item) => item.id === id)).filter((item): item is CreatorExercise => Boolean(item)).map((item, exerciseIndex) => {
        const sourceExercise = existingTemplate && item.sourceTemplateId === existingTemplate.id && item.sourceExerciseId ? existingTemplate.exercises.find((exercise) => exercise.id === item.sourceExerciseId) : undefined;
        return sourceExercise ? { ...sourceExercise, name: item.name, englishName: item.englishName || undefined, note: item.note } : { id: `${item.id}-personal-${stamp}-${index}-${exerciseIndex}`, name: item.name, englishName: item.englishName || undefined, note: item.note, sets: [{ target: item.defaultTarget }, { target: item.defaultTarget }] };
      });
      return { ...(existingTemplate ?? {}), id: existingTemplate?.id ?? `custom-personal-${stamp}-${index}`, name: workout.name.trim(), focus: exercises.map((exercise) => exercise.name).slice(0, 3).join(" · "), accent: customColor, icon: customIcon, exercises } satisfies WorkoutTemplate;
    });
    if (isEditingProgram && editingProgram) {
      savedProgramId = editingProgram.id;
      createdTemplates.forEach((template) => { if (templates.some((candidate) => candidate.id === template.id)) updateTemplate(template.id, template); else addCustomTemplate(template); });
      updatePersonalProgram(editingProgram.id, { name: programName, accent: customColor, icon: customIcon, workoutTemplateIds: createdTemplates.map((template) => template.id) });
      if (isCustomDefault && createdTemplates[0]) await setDefaultWorkoutTemplateId(createdTemplates[0].id);
    } else {
      createdTemplates.forEach(addCustomTemplate);
      const programId = `personal-program-${stamp}`;
      savedProgramId = programId;
      addPersonalProgram({ id: programId, name: programName, workoutTemplateIds: createdTemplates.map((template) => template.id), accent: customColor, icon: customIcon, createdAt: new Date().toISOString() });
      if (isCustomDefault && createdTemplates[0]) await setDefaultWorkoutTemplateId(createdTemplates[0].id);
      setSelectedMethodId(createdTemplates[0]?.id ?? selectedMethodId);
    }
    const shouldAutoSelectProgram = Boolean(savedProgramId) && (!isEditingProgram || builderReturnToSchedule);
    const selectionResult = shouldAutoSelectProgram && savedProgramId && !selectedProgramIds.includes(savedProgramId) ? toggleSelectedProgram(savedProgramId) : { selected: Boolean(savedProgramId), limitReached: false };
    const shouldGoToSchedule = shouldAutoSelectProgram && Boolean(savedProgramId) && !selectionResult.limitReached;
    if (shouldAutoSelectProgram && selectionResult.limitReached) Alert.alert("האימון נשמר", "התוכנית נשמרה, אך לא ניתן להוסיף אותה ללוח כי כבר נבחרו 5 תוכניות. הסר תוכנית קיימת כדי להוסיף אותה.");
    setCustomName(""); setCustomSearch(""); setCustomCategory("הכול"); setSelectedExerciseIds([]); setWorkoutName(""); setIsBuilderStarted(false); setEditingPersonalProgramId(null); setBuilderReturnToSchedule(false); setIsBuilderReviewOpen(false); setIsProgramNameConfirmed(false); setConfirmedBuilderWorkoutIds([]); setBuilderExerciseOverrides({}); const resetWorkoutId = `draft-workout-${Date.now()}`; setBuilderWorkouts([{ id: resetWorkoutId, name: "", exerciseIds: [] }]); setActiveBuilderWorkoutId(resetWorkoutId); setIsCustomDefault(false); setIsCreatorOpen(false); if (shouldGoToSchedule) { setIsMyProgramsOpen(false); router.push("/(tabs)/schedule" as never); } else { setIsMyProgramsOpen(true); }
  };
  return (
    <ScreenContainer containerClassName="bg-background" className="px-5 pt-4">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <BrandMark variant="wordmark" />
            <Text style={styles.title} numberOfLines={1}>{accountName ? `שלום, ${accountName}!` : isSignedIn ? "שלום!" : "מוכנים לעבוד?"}</Text>
          </View>
        </View>
        <HomeTimeWeatherWidget
          isSignedIn={isSignedIn}
          onLogout={requestAccountSignOut}
          onSignIn={() => router.push("/register" as never)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={todaySchedule.status === "workout" ? `התחל את ${todaySchedule.label}` : "פתח את לוח הזמנים"}
          onPress={() => {
            if (todaySchedule.status !== "workout") { router.push("/(tabs)/schedule" as never); return; }
            const template = templates.find((item) => item.id === todaySchedule.templateId) ?? getTemplate(todaySchedule.templateId as WorkoutId);
            if (template) startTemplateFromFolder(template);
            else router.push("/(tabs)/schedule" as never);
          }}
          style={({ pressed }) => [styles.todayCard, pressed && styles.pressed]}
        >
          <Text style={styles.todayEyebrow}>האימון של היום</Text>
          {todaySchedule.status === "workout" ? (
            <>
              <Text style={styles.todayTitle}>{todaySchedule.label}</Text>
              {todaySchedule.focus ? <Text style={styles.todaySubtitle}>{todaySchedule.focus}</Text> : null}
              <View style={styles.todayButton}><Text style={styles.todayButtonText}>התחל אימון</Text></View>
            </>
          ) : todaySchedule.status === "rest" ? (
            <>
              <Text style={styles.todayTitle}>יום מנוחה 💤</Text>
              <Text style={styles.todaySubtitle}>מתוכנן יום מנוחה להיום. אפשר לפתוח את לוח הזמנים לשינוי.</Text>
            </>
          ) : (
            <>
              <Text style={styles.todayTitle}>עדיין לא שובץ אימון להיום</Text>
              <View style={styles.todayButton}><Text style={styles.todayButtonText}>שיבוץ אימון להיום</Text></View>
            </>
          )}
        </Pressable>
        <View style={styles.statsRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="פתח היסטוריית אימונים" onPress={() => router.push("/(tabs)/history" as never)} style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}><Text style={styles.statValue}>{sessions.length}</Text><Text style={styles.statLabel}>אימונים · פתח היסטוריה</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="פתח את האימון האחרון" onPress={() => last ? router.push(completedWorkoutHistoryRoute(last.id) as never) : router.push("/(tabs)/history" as never)} style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}><Text style={styles.statValue} numberOfLines={1}>{last ? (templates.find((template) => template.id === last.templateId)?.name ?? last.templateId.toUpperCase()) : "—"}</Text><Text style={styles.statLabel}>האימון האחרון · פתח</Text></Pressable>
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
          ].map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.title} onPress={() => { if (item.id === "meals") router.push("/(tabs)/meal-plan" as never); else if (item.id === "programs") setIsMyProgramsOpen(true); else if (item.id === "builder") openCreator(); else if (item.id === "progress") router.push("/(tabs)/profile" as never); else if (item.id === "muscle-methods") router.push("/muscle-gain-methods" as never); else router.push("/(tabs)/recovery" as never); }} style={({ pressed }) => [styles.personalProfileRow, pressed && styles.pressed]}><View style={styles.personalProfileArrow}><Text style={styles.personalProfileArrowText}>‹</Text></View><View style={styles.personalProfileRowText}><Text style={styles.personalProfileRowTitle}>{item.title}</Text><Text style={styles.personalProfileRowDescription}>{item.description}</Text></View></Pressable>)}</View>
        </View>
        <View style={styles.personalProgramsPanel}><View style={styles.personalProgramsHeader}><Text style={styles.sectionTitle}>התוכניות שלי · {selectedPersonalPrograms.length}/5</Text><Pressable accessibilityRole="button" onPress={() => setIsMyProgramsOpen(true)} style={styles.personalProgramsLink}><Text style={styles.personalProgramsLinkText}>פתיחה ושיבוץ ›</Text></Pressable></View>{selectedPersonalPrograms.length ? selectedPersonalPrograms.map(({ id, template, templates: programTemplates, personalProgram, program }) => { const title = personalProgram?.name ?? program?.title ?? template?.name ?? id; const accent = personalProgram?.accent ?? template?.accent ?? "#F5B72C"; return <View key={`personal-${id}`} style={styles.personalProgramBlock}><Pressable accessibilityRole="button" onPress={() => template ? openPreview(template.id) : router.push({ pathname: "/(tabs)/workouts" as never, params: { category: program?.categoryId ?? "bodybuilding" } } as never)} style={({ pressed }) => [styles.personalProgramRow, { borderColor: `${accent}99` }, pressed && styles.pressed]}><Text style={styles.personalProgramRowTitle}>{title}</Text><Text style={styles.personalProgramRowMeta}>{personalProgram || program ? `${programTemplates?.length ?? 0} אימונים · ${programTemplates?.reduce((total, item) => total + item.exercises.length, 0) ?? 0} תרגילים` : template ? `${template.exercises.length} תרגילים · ${template.focus}` : ""}</Text></Pressable><View style={styles.personalProgramActions}>{personalProgram ? <Pressable accessibilityRole="button" onPress={() => editPersonalProgram(personalProgram)} style={({ pressed }) => [styles.personalProgramActionButton, pressed && styles.pressed]}><Text style={styles.personalProgramActionText}>עריכת תוכנית</Text></Pressable> : null}<Pressable accessibilityRole="button" accessibilityLabel={`הסר את ${title} מהתוכניות שלי`} onPress={() => requestRemoveSelectedProgram(id, title, personalProgram)} style={({ pressed }) => [styles.removeProgramButton, pressed && styles.pressed]}><Text style={styles.removeProgramButtonText}>הסר</Text></Pressable></View></View>; }) : <Text style={styles.personalProgramsEmpty}>עדיין לא נבחרו תוכניות. פתח את הבחירה והוסף עד 5 תוכניות מוכנות או אישיות.</Text>}</View>
        <WorkoutCategoryMenu templates={templates} selectedProgramIds={selectedProgramIds} selectedCount={selectedPersonalPrograms.length} onToggleSelected={toggleSelectedProgram} onOpenTemplate={openPreview} onEditTemplate={(template) => router.push({ pathname: "/template-exercises" as never, params: { templateId: template.id } } as never)} onStartTemplate={startTemplateFromFolder} />
        <Pressable accessibilityRole="button" accessibilityLabel="פתח פירוט האימון האחרון" onPress={() => last ? router.push(completedWorkoutHistoryRoute(last.id) as never) : router.push("/(tabs)/history" as never)} style={({ pressed }) => [styles.lastCard, pressed && styles.pressed]}><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>האימון האחרון · לחץ לפירוט</Text><Text style={styles.sectionHint}>{last ? formatDate(last.startedAt) : "עדיין אין נתונים"}</Text></View>{last ? <Text style={styles.lastText}>{last.templateId.toUpperCase()} · {last.sets.filter((set) => set.completed).length} סטים הושלמו · הצג תרגילים וסטים</Text> : <Text style={styles.lastText}>אחרי האימון הראשון שלך יופיע כאן סיכום קצר.</Text>}</Pressable>
        {Platform.OS === "web" && isCardioPickerOpen ? <View style={styles.webCardioPicker}><View style={styles.modalHeader}><View><Text style={styles.modalTitle}>בחר סוג אירובי</Text><Text style={styles.previewSubtitle}>בחר פעילות כדי להתחיל מיד ולשמור את הנתונים בניתוח</Text></View><Pressable accessibilityRole="button" accessibilityLabel="סגור בחירת אירובי" onPress={() => setIsCardioPickerOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>{["cardio", "cycling", "elliptical", "stairs", "treadmill", "outdoor-run", "walking", "rowing", "swimming", "hiit"].map((id) => { const template = templates.find((item) => item.id === id) ?? getTemplate(id); if (!template) return null; return <Pressable key={`web-${id}`} accessibilityRole="button" accessibilityLabel={`בחר ${template.name}`} onPress={() => { selectTrainingDay("cardio", template.id); setIsCardioPickerOpen(false); openPreview(template.id); }} style={({ pressed }) => [styles.cardioOption, { borderColor: `${template.accent}99` }, pressed && styles.pressed]}><View style={[styles.cardioOptionIcon, { backgroundColor: `${template.accent}24`, borderColor: template.accent }]}><IconSymbol name="figure.run" size={26} color={template.accent} /></View><View style={styles.cardioOptionText}><Text style={styles.cardioOptionTitle}>{template.name}</Text><Text style={styles.cardioOptionSubtitle}>{template.focus}</Text><Text style={[styles.cardioOptionAction, { color: template.accent }]}>הגדר והתחל ›</Text></View></Pressable>; })}</View> : null}
      </ScrollView>
      <MyProgramsModal visible={isMyProgramsOpen} selectedPrograms={selectedPersonalPrograms.map(({ template, templates, program, personalProgram, id }) => ({ id, template, templates, program, personalProgram }))} availablePersonalPrograms={personalPrograms.map((program) => ({ program, templates: program.workoutTemplateIds.map((templateId) => templates.find((template) => template.id === templateId) ?? getTemplate(templateId)).filter((template): template is WorkoutTemplate => Boolean(template)) }))} selectedProgramIds={selectedProgramIds} onToggleProgram={toggleSelectedProgram} onRemovePersonalProgram={removePersonalProgram} onUpdatePersonalProgram={updatePersonalProgram} onMovePersonalProgramWorkout={movePersonalProgramWorkout} onDuplicatePersonalProgram={duplicatePersonalProgram} onUpdateTemplate={updateTemplate} onEditPersonalProgram={editPersonalProgram} onAddWorkoutToPersonalProgram={addWorkoutToPersonalProgram} onEditTemplate={editPersonalWorkout} onClose={() => setIsMyProgramsOpen(false)} onOpenCatalog={() => { setIsMyProgramsOpen(false); router.push("/(tabs)/workouts" as never); }} />
      <Modal visible={isCardioPickerOpen && Platform.OS !== "web"} animationType="slide" transparent onRequestClose={() => setIsCardioPickerOpen(false)}>
        <View style={styles.modalBackdrop}><View style={styles.cardioPickerModal}><View style={styles.modalHeader}><View><Text style={styles.modalTitle}>בחר סוג אירובי</Text><Text style={styles.previewSubtitle}>בחר פעילות כדי להתחיל מיד ולשמור את הנתונים בניתוח</Text></View><Pressable accessibilityRole="button" accessibilityLabel="סגור בחירת אירובי" onPress={() => setIsCardioPickerOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View><ScrollView contentContainerStyle={styles.cardioPickerContent}>{["cardio", "cycling", "elliptical", "stairs", "treadmill", "outdoor-run", "walking", "rowing", "swimming", "hiit"].map((id) => { const template = templates.find((item) => item.id === id) ?? getTemplate(id); if (!template) return null; return <Pressable key={id} accessibilityRole="button" accessibilityLabel={`בחר ${template.name}`} onPress={() => { selectTrainingDay("cardio", template.id); setIsCardioPickerOpen(false); openPreview(template.id); }} style={({ pressed }) => [styles.cardioOption, { borderColor: `${template.accent}99` }, pressed && styles.pressed]}><View style={[styles.cardioOptionIcon, { backgroundColor: `${template.accent}24`, borderColor: template.accent }]}><IconSymbol name={id === "cycling" ? "bicycle" : id === "elliptical" ? "figure.run" : id === "stairs" ? "stairs" : id === "rowing" ? "rowing" : id === "swimming" ? "water" : id === "treadmill" || id === "outdoor-run" || id === "walking" ? "figure.run" : id === "hiit" ? "bolt.fill" : "figure.run"} size={26} color={template.accent} /></View><View style={styles.cardioOptionText}><Text style={styles.cardioOptionTitle}>{template.name}</Text><Text style={styles.cardioOptionSubtitle}>{template.focus}</Text><Text style={[styles.cardioOptionAction, { color: template.accent }]}>הגדר והתחל ›</Text></View></Pressable>; })}<View style={styles.cardioMoreCard}><Text style={styles.cardioMoreTitle}>אפשרויות נוספות</Text><Text style={styles.cardioMoreText}>ריצה בחוץ, הליכה מהירה, חתירה, שחייה ואינטרוולים זמינים להוספה דרך אירובי מותאם.</Text></View></ScrollView></View></View>
      </Modal>
      <Modal visible={Boolean(previewTemplate)} animationType="slide" transparent onRequestClose={() => setPreviewTemplate(null)}>
        <View style={styles.modalBackdrop}><View style={styles.previewModal}><ScrollView style={styles.previewScroll} nestedScrollEnabled keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={styles.previewContent}>
          <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>{previewTemplate?.name}</Text><Text style={styles.previewSubtitle}>{previewTemplate?.focus}</Text></View><View style={styles.previewHeaderActions}><Pressable accessibilityRole="button" onPress={() => { setIsPreviewEditing((current) => !current); setEditingExerciseIndex(null); setReplacementSearch(""); }} style={styles.editPreviewButton}><Text style={styles.editPreviewText}>{isPreviewEditing ? "סיום עריכה" : "עריכה"}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="סגור תצוגה מקדימה" onPress={() => { setPreviewTemplate(null); setIsPreviewEditing(false); }} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View></View>
          <View style={styles.previewSummary}><Text style={styles.previewSummaryValue}>{previewTemplate?.exercises.length ?? 0}</Text><Text style={styles.previewSummaryLabel}>תרגילים</Text><Text style={styles.previewSummaryValue}>{previewTemplate?.exercises.reduce((total, exercise) => total + exercise.sets.length, 0) ?? 0}</Text><Text style={styles.previewSummaryLabel}>סטים</Text></View>
          {isPreviewEditing ? <><View style={styles.volumeSummary}><View><Text style={styles.volumeSummaryLabel}>נפח צפוי</Text><Text style={styles.volumeSummaryValue}>{Math.round(projectedPreviewVolume).toLocaleString("he-IL")} ק״ג</Text></View><Text style={styles.volumeSummaryCompare}>{previousPreviewVolume === null ? "אין אימון קודם להשוואה" : `קודם: ${Math.round(previousPreviewVolume).toLocaleString("he-IL")} ק״ג`}</Text><Text style={[styles.volumeSummaryDelta, { color: previewVolumeDelta === null ? "#AAB7C8" : previewVolumeDelta >= 0 ? "#42D392" : "#FB7185" }]}>{previewVolumeDelta === null ? "" : `${previewVolumeDelta >= 0 ? "↑" : "↓"} ${Math.abs(previewVolumeDelta).toFixed(1)}%`}</Text></View><View style={styles.volumeBars} accessibilityLabel="השוואת נפח האימון הקודם והנוכחי"><View style={styles.volumeBarColumn}><Text style={styles.volumeBarValue}>{previousPreviewVolume === null ? "—" : `${Math.round(previousPreviewVolume)} ק״ג`}</Text><View style={styles.volumeBarTrack}><View style={[styles.volumeBar, styles.previousVolumeBar, { height: `${volumeChartMax ? Math.max(8, (previousPreviewVolume ?? 0) / volumeChartMax * 100) : 8}%` }]} /></View><Text style={styles.volumeBarLabel}>אימון קודם</Text></View><View style={styles.volumeBarColumn}><Text style={styles.volumeBarValue}>{Math.round(projectedPreviewVolume)} ק״ג</Text><View style={styles.volumeBarTrack}><View style={[styles.volumeBar, styles.currentVolumeBar, { height: `${volumeChartMax ? Math.max(8, projectedPreviewVolume / volumeChartMax * 100) : 8}%` }]} /></View><Text style={styles.volumeBarLabel}>אימון נוכחי</Text></View></View></> : null}
          {isPreviewEditing ? <View style={styles.autoProgressPanel}><Pressable accessibilityRole="button" onPress={applyAutoProgress} style={({ pressed }) => [styles.autoProgressButton, pressed && styles.pressed]}><Text style={styles.autoProgressButtonText}>העלאת עומס אוטומטית · 5%</Text></Pressable><Text style={styles.autoProgressDescription}>מעלה משקל כשיש נתון קודם, או חזרות כשאין משקל</Text>{autoProgressMessage ? <Text style={styles.autoProgressMessage}>{autoProgressMessage}</Text> : null}</View> : null}
          <Text style={styles.previewSectionTitle}>תרגילי האימון</Text>
          <View style={styles.previewExerciseList}>{previewTemplate?.exercises.map((exercise, index) => <View key={exercise.id} style={styles.previewExercise}><View style={styles.previewExerciseHeader}><View style={[styles.exerciseNumber, { backgroundColor: previewTemplate.accent }]}><Text style={styles.exerciseNumberText}>{index + 1}</Text></View><View style={styles.exerciseChoiceText}><Text style={styles.previewExerciseName}>{exercise.name}</Text>{exercise.note ? <Text style={styles.previewNote}>{exercise.note}</Text> : null}</View></View>{isPreviewEditing ? <><View style={styles.previousPerformance}>{previousSessionForPreview?.sets.some((set) => set.exerciseId === exercise.id) ? <><Text style={styles.previousPerformanceTitle}>מהאימון הקודם</Text><View style={styles.previousPerformanceRow}>{previousSessionForPreview.sets.filter((set) => set.exerciseId === exercise.id).map((set, setIndex) => <Text key={`${exercise.id}-previous-${setIndex}`} style={styles.previousPerformanceText}>סט {setIndex + 1}: {set.weight || "—"} ק״ג · {set.reps || "—"} חזרות</Text>)}</View></> : <Text style={styles.previousPerformanceEmpty}>אין נתון קודם לתרגיל הזה</Text>}</View><View style={styles.editActionRow}><Pressable onPress={() => setEditingExerciseIndex(editingExerciseIndex === index ? null : index)} style={styles.smallEditButton}><Text style={styles.smallEditText}>החלף</Text></Pressable><Pressable onPress={() => removePreviewExercise(index)} style={styles.smallRemoveButton}><Text style={styles.smallRemoveText}>הסר תרגיל</Text></Pressable></View><View style={styles.previewSetRow}>{exercise.sets.map((set, setIndex) => <View key={`${exercise.id}-${setIndex}`} style={[styles.editSet, set.note ? styles.autoUpdatedSet : null]}>{set.note ? <Text style={styles.autoUpdatedBadge}>↑ עודכן ב־5%</Text> : null}<Text style={styles.previewSetLabel}>סט {setIndex + 1}</Text><TextInput value={set.target} onChangeText={(value) => updatePreviewSetTarget(index, setIndex, value)} style={styles.setTargetInput} textAlign="center" />{set.note ? <Text style={styles.autoProgressHint}>{set.note}</Text> : null}<Pressable onPress={() => removePreviewSet(index, setIndex)} disabled={exercise.sets.length <= 1} style={styles.removeSetButton}><Text style={styles.removeSetText}>−</Text></Pressable></View>)}</View><Pressable onPress={() => addPreviewSet(index)} style={styles.programAddSetButton}><Text style={styles.addSetText}>+ הוסף סט</Text></Pressable>{editingExerciseIndex === index ? <View style={styles.replacementBox}><TextInput value={replacementSearch} onChangeText={setReplacementSearch} placeholder="חפש תרגיל חלופי" placeholderTextColor="#718096" style={styles.replacementInput} textAlign="right" />{filteredReplacementExercises.map((item) => <Pressable key={item.id} onPress={() => replacePreviewExercise(index, item)} style={styles.replacementItem}><Text style={styles.replacementItemText}>{item.name}</Text><Text style={styles.replacementCategory}>{item.category}</Text></Pressable>)}</View> : null}</> : <View style={styles.previewSetRow}>{exercise.sets.map((set, setIndex) => <View key={`${exercise.id}-${setIndex}`} style={styles.previewSet}><Text style={styles.previewSetLabel}>סט {setIndex + 1}</Text><Text style={styles.previewSetTarget}>{set.target}</Text></View>)}</View>}</View>)}</View>{isPreviewEditing ? <><Pressable onPress={() => { setEditingExerciseIndex(-1); setReplacementSearch(""); }} style={styles.addExercisePreviewButton}><Text style={styles.addExercisePreviewText}>+ הוסף תרגיל</Text></Pressable>{editingExerciseIndex === -1 ? <View style={styles.replacementBox}><TextInput value={replacementSearch} onChangeText={setReplacementSearch} placeholder="חפש תרגיל להוספה" placeholderTextColor="#718096" style={styles.replacementInput} textAlign="right" />{filteredReplacementExercises.map((item) => <Pressable key={item.id} onPress={() => addPreviewExercise(item)} style={styles.replacementItem}><Text style={styles.replacementItemText}>{item.name}</Text><Text style={styles.replacementCategory}>{item.category}</Text></Pressable>)}</View> : null}</> : null}
          <View style={styles.previewActions}>{isPreviewEditing ? <><Pressable accessibilityRole="button" onPress={() => { setIsPreviewEditing(false); setEditingExerciseIndex(null); setReplacementSearch(""); }} style={styles.previewBackButton}><Text style={styles.previewBackText}>בטל שינויים</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setIsPreviewEditing(false)} style={[styles.previewStartButton, { backgroundColor: previewTemplate?.accent ?? "#F5B72C" }]}><Text style={styles.previewStartText}>שמור לתצוגה</Text></Pressable></> : <><Pressable accessibilityRole="button" onPress={() => setPreviewTemplate(null)} style={styles.previewBackButton}><Text style={styles.previewBackText}>חזרה</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { if (previewTemplate) finishPreview(previewTemplate.id.startsWith("custom-")); }} style={[styles.previewStartButton, { backgroundColor: previewTemplate?.accent ?? "#F5B72C" }]}><Text style={styles.previewStartText}>התחל אימון</Text></Pressable></>}</View>
        </ScrollView></View></View>
      </Modal>
      <Modal visible={isCreatorOpen} animationType="slide" transparent onRequestClose={() => setIsCreatorOpen(false)}>
        <View style={styles.modalBackdrop}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0} style={styles.keyboardAvoidingView}><View style={styles.creatorModal}><ScrollView style={styles.creatorScroll} nestedScrollEnabled keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={styles.creatorContent}>
          <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>{editingPersonalProgramId ? "עריכת תוכנית אישית" : "צור תוכנית אישית"}</Text><Text style={styles.previewSubtitle}>{editingPersonalProgramId ? "ערוך את התוכנית והאימונים הקיימים, או הוסף אימון חדש" : "שלושה שלבים פשוטים: תוכנית, אימון ותרגילים"}</Text></View><Pressable onPress={() => setIsCreatorOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>
          <Pressable accessibilityRole="button" onPress={() => setIsBuilderStarted(true)} style={({ pressed }) => [styles.creatorBanner, styles.creatorBannerCentered, pressed && styles.pressed]}><Text style={styles.creatorBannerTitle}>{editingPersonalProgramId ? "ערוך את התוכנית" : "בנה תוכנית אישית"}</Text><Text style={styles.creatorBannerText}>{editingPersonalProgramId ? "עדכן את האימונים והתרגילים במקום אחד" : "לחץ כדי להתחיל: שם תוכנית, אימונים ותרגילים"}</Text></Pressable>
          {isBuilderStarted ? <><View style={styles.builderFlowSteps}><Text style={[styles.builderFlowStep, isBuilderProgramNameConfirmed ? styles.builderFlowStepActive : null]}>1 · {editingPersonalProgramId ? "עריכת תוכנית" : "צור תוכנית"}</Text><Text style={styles.builderFlowArrow}>‹</Text><Text style={[styles.builderFlowStep, isActiveBuilderWorkoutConfirmed ? styles.builderFlowStepActive : null]}>2 · צור אימון</Text><Text style={styles.builderFlowArrow}>‹</Text><Text style={[styles.builderFlowStep, isActiveBuilderWorkoutConfirmed && selectedExerciseIds.length ? styles.builderFlowStepActive : null]}>3 · הוסף תרגילים</Text></View><View style={styles.builderStageBlock}><View style={styles.builderStageHeader}><Text style={styles.fieldLabel}>שלב 1 · שם התוכנית</Text><Text style={[styles.builderSavedStatus, isBuilderProgramNameConfirmed && styles.builderSavedStatusActive]}>{isAppendingWorkoutToExistingProgram ? "✓ התוכנית הקיימת מאושרת" : isProgramNameConfirmed ? "✓ נשמר" : "טרם אושר"}</Text></View><TextInput value={customName} editable={!isAppendingWorkoutToExistingProgram} onChangeText={(value) => { setCustomName(value); setIsProgramNameConfirmed(false); }} onSubmitEditing={() => Keyboard.dismiss()} returnKeyType="done" placeholder="לדוגמה: התוכנית של ליהוא" placeholderTextColor="#718096" style={[styles.creatorInput, isAppendingWorkoutToExistingProgram && styles.creatorInputReadonly]} textAlign="right" />{isAppendingWorkoutToExistingProgram ? <View style={styles.builderExistingProgramApproved}><Text style={styles.builderExistingProgramApprovedText}>✓ התוכנית הקיימת מאושרת — ממשיכים לאימון החדש</Text></View> : <Pressable accessibilityRole="button" disabled={!customName.trim()} onPress={() => setIsProgramNameConfirmed((current) => !current)} style={({ pressed }) => [styles.builderConfirmButton, isProgramNameConfirmed && styles.builderConfirmButtonActive, !customName.trim() && styles.disabledButton, pressed && styles.pressed]}><Text style={styles.builderConfirmText}>{isProgramNameConfirmed ? "✓ שם התוכנית אושר · ערוך" : "אשר שם התוכנית"}</Text></Pressable>}</View>
          <View style={styles.builderWorkoutTabs}><Text style={styles.fieldLabel}>שלב 2 · האימונים בתוכנית</Text><Text style={styles.builderSectionHint}>צור אימון ראשון, ולאחר מכן הוסף אימונים נוספים לאותה תוכנית</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.builderWorkoutTabRow}>{builderWorkouts.map((workout, index) => <Pressable key={workout.id} accessibilityRole="button" accessibilityState={{ selected: activeBuilderWorkoutId === workout.id }} onPress={() => selectBuilderWorkout(workout.id)} style={[styles.builderWorkoutTab, activeBuilderWorkoutId === workout.id && { backgroundColor: customColor, borderColor: customColor }]}><Text style={[styles.builderWorkoutTabText, activeBuilderWorkoutId === workout.id && styles.builderWorkoutTabTextActive]}>{workout.name || `אימון ${index + 1}`}</Text></Pressable>)}<Pressable accessibilityRole="button" onPress={addAnotherBuilderWorkout} style={styles.addWorkoutTab}><Text style={styles.addWorkoutTabText}>{builderWorkouts.length > 1 ? "＋ צור אימון נוסף" : "＋ צור אימון"}</Text></Pressable></ScrollView></View>
          <View style={styles.builderStageBlock}><View style={styles.builderStageHeader}><Text style={styles.fieldLabel}>שלב 2 · שם האימון הנוכחי</Text><Text style={[styles.builderSavedStatus, isActiveBuilderWorkoutConfirmed && styles.builderSavedStatusActive]}>{isActiveBuilderWorkoutConfirmed ? "✓ נשמר" : "טרם אושר"}</Text></View><TextInput value={workoutName} onChangeText={updateBuilderWorkoutName} onSubmitEditing={() => Keyboard.dismiss()} returnKeyType="done" placeholder="לדוגמה: אימון ידיים" placeholderTextColor="#718096" style={styles.creatorInput} textAlign="right" /><Pressable accessibilityRole="button" disabled={!workoutName.trim()} onPress={() => { if (isActiveBuilderWorkoutConfirmed) setConfirmedBuilderWorkoutIds((current) => current.filter((id) => id !== activeBuilderWorkoutId)); else confirmBuilderWorkout(); }} style={({ pressed }) => [styles.builderConfirmButton, isActiveBuilderWorkoutConfirmed && styles.builderConfirmButtonActive, !workoutName.trim() && styles.disabledButton, pressed && styles.pressed]}><Text style={styles.builderConfirmText}>{isActiveBuilderWorkoutConfirmed ? "✓ האימון אושר · ערוך" : "אשר את האימון והמשך לתרגילים"}</Text></Pressable></View>
          <View style={styles.builderOptionHeader}><View><Text style={styles.fieldLabel}>בחר אייקון אישי לתוכנית</Text><Text style={styles.builderSelectionHint}>התאם את הסמל למטרה ולסגנון שלך</Text></View><Text style={styles.builderOptionCount}>{builderIconOptions.length} אייקונים זמינים</Text></View><View style={styles.optionRow}>{builderIconOptions.map((icon) => <Pressable key={icon} accessibilityRole="button" accessibilityLabel={`בחר אייקון ${icon}`} onPress={() => setCustomIcon(icon)} style={[styles.iconChoice, customIcon === icon && styles.selectedIconChoice]}><IconSymbol name={icon} size={26} color={customIcon === icon ? "#0B1224" : "#F7F9FC"} /></Pressable>)}</View>
          <View style={styles.builderOptionHeader}><Text style={styles.fieldLabel}>בחר צבע לתוכנית</Text><Text style={styles.builderOptionCount}>{builderColorOptions.length} צבעים זמינים</Text></View><View style={styles.optionRow}>{builderColorOptions.map((color) => <Pressable key={color} accessibilityRole="button" accessibilityLabel={`בחר צבע ${color}`} onPress={() => setCustomColor(color)} style={[styles.colorChoice, { backgroundColor: color }, customColor === color && styles.selectedColorChoice]} />)}</View>
          <View style={styles.builderSelectionHeader}><View><Text style={styles.fieldLabel}>שלב 3 · הוסף תרגילים לאימון</Text><Text style={styles.builderSelectionHint}>כל התרגילים זמינים לבחירה, ללא שיוך מגדרי</Text><Text style={[styles.builderSavedStatus, isActiveBuilderWorkoutConfirmed && styles.builderSavedStatusActive]}>{isActiveBuilderWorkoutConfirmed ? "✓ האימון נשמר ומוכן לבחירת תרגילים" : "אשר את האימון כדי להשלים את השלב"}</Text></View><View style={[styles.builderSelectionBadge, { borderColor: customColor }]}><Text style={[styles.builderSelectionBadgeValue, { color: customColor }]}>{selectedExerciseIds.length}</Text><Text style={styles.builderSelectionBadgeLabel}>נבחרו</Text></View></View>
          <TextInput value={customSearch} onChangeText={setCustomSearch} onSubmitEditing={() => Keyboard.dismiss()} returnKeyType="search" placeholder="חפש תרגיל בעברית, באנגלית או בכינוי" placeholderTextColor="#718096" style={styles.creatorInput} textAlign="right" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorCategoryRow}>{builderCategories.map((category) => <Pressable key={category} accessibilityRole="button" accessibilityState={{ selected: customCategory === category }} onPress={() => setCustomCategory(category)} style={[styles.creatorCategory, customCategory === category && { backgroundColor: customColor, borderColor: customColor }]}><Text style={[styles.creatorCategoryText, customCategory === category && styles.creatorCategoryTextActive]}>{category === "הכול" ? "כל הקטגוריות" : category}</Text></Pressable>)}</ScrollView>
          <View style={styles.exerciseSourceRow}><View style={styles.exerciseSourceTitle}><Text style={styles.fieldLabel}>הוסף תרגילים לאימון</Text><Text style={styles.builderSelectionHint}>בחר מהקטלוג הקיים או צור תרגיל אישי — הכול נכנס לטבלה אחת</Text></View><View style={styles.exerciseSourceBadge}><Text style={styles.exerciseSourceBadgeText}>{selectedExerciseIds.length} נבחרו</Text></View></View>
          <View style={styles.builderSourceFilterRow}>{(["all", "catalog", "personal"] as const).map((filter) => <Pressable key={filter} accessibilityRole="button" accessibilityState={{ selected: builderSourceFilter === filter }} onPress={() => setBuilderSourceFilter(filter)} style={[styles.builderSourceFilter, builderSourceFilter === filter && { backgroundColor: customColor, borderColor: customColor }]}><Text style={[styles.builderSourceFilterText, builderSourceFilter === filter && styles.builderSourceFilterTextActive]}>{builderSourceLabels[filter]} · {builderSourceCounts[filter]}</Text></Pressable>)}</View>
          <View style={styles.customExerciseBox}><Text style={styles.customExerciseTitle}>{editingCustomExerciseId ? "✎ ערוך תרגיל אישי" : "＋ צור תרגיל אישי"}</Text><TextInput value={customExerciseDraftName} onChangeText={setCustomExerciseDraftName} onSubmitEditing={() => Keyboard.dismiss()} returnKeyType="done" placeholder="שם תרגיל בעברית" placeholderTextColor="#718096" style={styles.creatorInput} textAlign="right" /><TextInput value={customExerciseDraftEnglishName} onChangeText={setCustomExerciseDraftEnglishName} onSubmitEditing={() => Keyboard.dismiss()} returnKeyType="done" placeholder="שם באנגלית (אופציונלי)" placeholderTextColor="#718096" style={styles.creatorInput} textAlign="right" /><Pressable accessibilityRole="button" disabled={!customExerciseDraftName.trim()} onPress={addCustomBuilderExercise} style={({ pressed }) => [styles.addCustomExerciseButton, !customExerciseDraftName.trim() && styles.disabledButton, pressed && styles.pressed]}><Text style={styles.addCustomExerciseButtonText}>{editingCustomExerciseId ? "שמור שינוי בתרגיל" : "הוסף תרגיל אישי לאימון"}</Text></Pressable>{editingCustomExerciseId ? <Pressable accessibilityRole="button" onPress={() => { setEditingCustomExerciseId(null); setCustomExerciseDraftName(""); setCustomExerciseDraftEnglishName(""); }} style={styles.cancelEditButton}><Text style={styles.cancelEditText}>בטל עריכה</Text></Pressable> : null}</View>
          <Text style={styles.creatorResultCount}>{filteredCustomExercises.length} תרגילים מוצגים · בחר תרגילים מהקטלוג הקיים</Text>
          <View style={styles.exerciseCategoryList}>{visibleBuilderCategories.map(({ category, exercises }) => { const meta = builderCategoryMeta[category] ?? builderCategoryMeta["כללי"]; const expanded = customCategory !== "הכול" || expandedBuilderCategories.includes(category); return <View key={category} style={[styles.exerciseCategorySection, { borderColor: `${meta.accent}88` }]}><Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${expanded ? "סגור" : "פתח"} קטגוריית ${category}`} onPress={() => { setCustomCategory("הכול"); toggleBuilderCategory(category); }} style={({ pressed }) => [styles.exerciseCategoryHeader, pressed && styles.pressed]}><View style={[styles.exerciseCategoryIcon, { backgroundColor: `${meta.accent}22`, borderColor: meta.accent }]}><IconSymbol name={meta.icon} size={20} color={meta.accent} /></View><View style={styles.exerciseCategoryHeaderCopy}><Text style={styles.exerciseCategoryTitle}>{category}</Text><Text style={styles.exerciseCategorySubtitle}>{meta.subtitle}</Text></View><View style={styles.exerciseCategoryCount}><Text style={[styles.exerciseCategoryCountValue, { color: meta.accent }]}>{exercises.length}</Text><Text style={styles.exerciseCategoryCountLabel}>תרגילים</Text></View><Text style={styles.exerciseCategoryChevron}>{expanded ? "⌃" : "⌄"}</Text></Pressable>{expanded && <View style={styles.exerciseCategoryExercises}>{exercises.map((exercise) => { const selected = isBuilderExerciseSelected(exercise); const alreadyChosen = isBuilderExerciseAlreadyChosen(exercise); return <Pressable key={exercise.id} accessibilityRole="button" accessibilityState={{ selected, disabled: alreadyChosen && !selected }} disabled={alreadyChosen && !selected} onPress={() => requestAddBuilderExercise(exercise.id)} style={({ pressed }) => [styles.exerciseChoice, selected && { borderColor: customColor, backgroundColor: `${customColor}18` }, alreadyChosen && !selected && styles.exerciseChoiceDisabled, pressed && styles.pressed]}><View style={[styles.checkCircle, selected && { backgroundColor: customColor }]}><Text style={styles.checkText}>{selected ? "✓" : ""}</Text></View><View style={styles.exerciseChoiceText}><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseCategory}>{exercise.category} · יעד {exercise.defaultTarget}{exercise.englishName ? ` · ${exercise.englishName}` : ""}</Text><Text style={[styles.builderExerciseSourceTag, isPersonalBuilderExercise(exercise) ? styles.builderExerciseSourceTagPersonal : styles.builderExerciseSourceTagCatalog]}>{isPersonalBuilderExercise(exercise) ? "אישי" : "קטלוג"}</Text></View></Pressable>; })}</View>}</View>; })}</View>
          <View style={styles.builderReviewSection}><View style={styles.builderReviewHeader}><View><Text style={styles.builderReviewTitle}>תרגילי האימון הנוכחי</Text><Text style={styles.builderReviewHint}>בדוק, הסר וערוך את הבחירה לפני השמירה</Text><Text style={[styles.builderDuplicateStatus, builderDuplicateCount > 0 ? styles.builderDuplicateStatusWarning : styles.builderDuplicateStatusClear]}>{builderDuplicateCount > 0 ? `זוהו ${builderDuplicateCount} כפילויות — יש להסיר לפני השמירה` : "✓ אין כפילויות בתרגילים שנבחרו"}</Text></View><View style={[styles.builderReviewBadge, { borderColor: customColor }]}><Text style={[styles.builderReviewBadgeText, { color: customColor }]}>{selectedExerciseIds.length}</Text></View></View>{selectedExerciseIds.length ? selectedExerciseIds.map((id) => { const exercise = allBuilderExercises.find((item) => item.id === id); if (!exercise) return null; return <View key={`builder-review-${id}`} style={[styles.builderReviewRow, { borderColor: `${customColor}66` }]}><Pressable accessibilityRole="button" accessibilityLabel={`הסר ${exercise.name} מהאימון`} onPress={() => requestRemoveBuilderExercise(id)} style={styles.builderReviewRemove}><Text style={styles.builderReviewRemoveText}>×</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`ערוך ${exercise.name}`} onPress={() => beginEditBuilderExercise(exercise)} style={styles.builderReviewEdit}><Text style={styles.builderReviewEditText}>עריכה</Text></Pressable><View style={styles.builderReviewCopy}><Text style={styles.builderReviewName}>{exercise.name}</Text><Text style={styles.builderReviewMeta}>{exercise.category} · {exercise.defaultTarget} · {exercise.note ?? "מתוך הקטלוג"}</Text><Text style={[styles.builderReviewSourceTag, isPersonalBuilderExercise(exercise) ? styles.builderReviewSourceTagPersonal : styles.builderReviewSourceTagCatalog]}>{isPersonalBuilderExercise(exercise) ? "מקור: אישי" : "מקור: קטלוג"}</Text></View><View style={[styles.builderReviewIcon, { backgroundColor: `${customColor}22`, borderColor: customColor }]}><IconSymbol name={builderCategoryMeta[exercise.category]?.icon ?? "dumbbell.fill"} size={18} color={customColor} /></View></View>; }) : <Text style={styles.builderReviewEmpty}>עדיין לא נבחרו תרגילים. בחר מהרשימה או צור תרגיל אישי.</Text>}</View>
          {availableMyExercises.length ? <View style={styles.myExercisesSection}><View style={styles.myExercisesHeader}><View><Text style={styles.myExercisesTitle}>התרגילים שלי לבחירה</Text><Text style={styles.myExercisesHint}>מקור בחירה בלבד · אפשר להוסיף או להסיר כל תרגיל מהרשימה</Text></View><View style={styles.myExercisesIcon}><IconSymbol name="star.fill" size={18} color="#F5B72C" /></View></View>{availableMyExercises.map((exercise) => <View key={`my-exercise-${exercise.id}`} style={styles.myExerciseRow}><View style={styles.myExerciseActions}><Pressable accessibilityRole="button" accessibilityLabel={`הוסף את ${exercise.name} לאימון`} onPress={() => requestAddBuilderExercise(exercise.id)} style={({ pressed }) => [styles.myExerciseAdd, pressed && styles.pressed]}><Text style={styles.myExerciseAddText}>+</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`הסר את ${exercise.name} מרשימת התרגילים האישיים`} onPress={() => requestRemovePersonalBuilderExercise(exercise)} style={({ pressed }) => [styles.myExerciseRemove, pressed && styles.pressed]}><Text style={styles.myExerciseRemoveText}>×</Text></Pressable></View><View style={styles.myExerciseCopy}><Text style={styles.myExerciseName}>{exercise.name}</Text><Text style={styles.myExerciseMeta}>{exercise.category} · {exercise.defaultTarget}</Text></View></View>)}</View> : null}
          <ActionToast message={creatorToastMessage} />
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: isCustomDefault }} onPress={() => setIsCustomDefault((current) => !current)} style={({ pressed }) => [styles.defaultProgramRow, isCustomDefault && styles.defaultProgramRowActive, pressed && styles.pressed]}><View style={[styles.defaultProgramCheck, isCustomDefault && styles.defaultProgramCheckActive]}><Text style={styles.defaultProgramCheckText}>{isCustomDefault ? "✓" : ""}</Text></View><View style={styles.defaultProgramCopy}><Text style={styles.defaultProgramTitle}>הפוך לברירת מחדל בלוח האימונים</Text><Text style={styles.defaultProgramDescription}>התוכנית תופיע בלוח גם אם אינה אחת מחמש התוכניות שנבחרו.</Text></View></Pressable>
                    <View style={styles.finalBuilderCta}><Text style={styles.finalBuilderCtaHint}>{builderSaveHint}</Text><Pressable accessibilityRole="button" accessibilityLabel="הוסף לתוכנית שלי" onPress={handleBuilderSavePress} style={({ pressed }) => [styles.saveCreatorButton, { backgroundColor: canSaveCustomProgram ? customColor : "#334155" }, pressed && styles.pressed]}><Text style={[styles.saveCreatorText, !canSaveCustomProgram && styles.saveCreatorTextDisabled]}>הוסף לתוכנית שלי</Text></Pressable></View>
</> : null}
        </ScrollView>{pendingBuilderExercise ? <View accessibilityRole="alert" style={styles.builderExerciseConfirmBanner}><View style={styles.builderExerciseConfirmCopy}><Text style={styles.builderExerciseConfirmTitle}>אישור הוספת תרגיל</Text><Text style={styles.builderExerciseConfirmText}>להוסיף את „{pendingBuilderExercise.name}” לאימון הנוכחי?</Text></View><View style={styles.builderExerciseConfirmActions}><Pressable accessibilityRole="button" onPress={() => setPendingBuilderExercise(null)} style={({ pressed }) => [styles.builderExerciseCancelButton, pressed && styles.pressed]}><Text style={styles.builderExerciseCancelText}>ביטול</Text></Pressable><Pressable accessibilityRole="button" onPress={confirmPendingBuilderExercise} style={({ pressed }) => [styles.builderExerciseConfirmButton, pressed && styles.pressed]}><Text style={styles.builderExerciseConfirmButtonText}>אישור הוספה</Text></Pressable></View></View> : null}</View></KeyboardAvoidingView></View>
      </Modal>
      <Modal visible={isBuilderReviewOpen} animationType="slide" transparent onRequestClose={() => setIsBuilderReviewOpen(false)}>
        <View style={styles.modalBackdrop}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0} style={styles.keyboardAvoidingView}><View style={styles.builderReviewModal}><ScrollView style={styles.builderReviewScroll} nestedScrollEnabled keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={styles.builderReviewContent}>
          <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>תצוגה מקדימה לפני שמירה</Text><Text style={styles.previewSubtitle}>בדוק את כל התוכנית, האימונים והתרגילים לפני האישור הסופי</Text></View><Pressable accessibilityRole="button" accessibilityLabel="סגור תצוגה מקדימה" onPress={() => setIsBuilderReviewOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>
          <View style={[styles.builderPreviewHero, { borderColor: customColor }]}><View style={[styles.builderPreviewIcon, { backgroundColor: `${customColor}22`, borderColor: customColor }]}><IconSymbol name={customIcon} size={25} color={customColor} /></View><View style={styles.builderPreviewHeroCopy}><Text style={styles.builderPreviewTitle}>{customName.trim()}</Text><Text style={styles.builderPreviewSubtitle}>תוכנית אימונים אישית · מוכנה לאישור</Text></View></View>
          <View style={styles.builderPreviewStats}><View style={styles.builderPreviewStat}><Text style={[styles.builderPreviewStatValue, { color: customColor }]}>{builderPreviewWorkouts.length}</Text><Text style={styles.builderPreviewStatLabel}>אימונים</Text></View><View style={styles.builderPreviewStat}><Text style={[styles.builderPreviewStatValue, { color: customColor }]}>{builderPreviewExerciseTotal}</Text><Text style={styles.builderPreviewStatLabel}>תרגילים</Text></View><View style={styles.builderPreviewStat}><Text style={[styles.builderPreviewStatValue, { color: customColor }]}>{builderPreviewSetTotal}</Text><Text style={styles.builderPreviewStatLabel}>סטים</Text></View></View>
          <View style={styles.builderPreviewSummary}><Text style={styles.builderPreviewSummaryTitle}>סיכום לפני שמירה</Text><Text style={styles.builderPreviewSummaryText}>התוכנית „{customName.trim()}” תישמר עם {builderPreviewWorkouts.length} אימונים, {builderPreviewExerciseTotal} תרגילים ו־{builderPreviewSetTotal} סטים. זמן כולל משוער: כ־{builderPreviewTotalMinutes} דקות. אפשר לחזור לעריכה לפני האישור הסופי.</Text></View>
          <Text style={styles.builderPreviewSectionTitle}>כל התוכן בתוכנית</Text>
          <View style={styles.builderPreviewWorkoutList}>{builderPreviewWorkouts.map((workout, workoutIndex) => <View key={`builder-preview-${workout.id}`} style={[styles.builderPreviewWorkout, { borderColor: `${customColor}66` }]}><View style={styles.builderPreviewWorkoutHeader}><View style={[styles.builderPreviewWorkoutNumber, { backgroundColor: customColor }]}><Text style={styles.builderPreviewWorkoutNumberText}>{workoutIndex + 1}</Text></View><View style={styles.builderPreviewWorkoutCopy}><Text style={styles.builderPreviewWorkoutTitle}>{workout.name}</Text><Text style={styles.builderPreviewWorkoutMeta}>{workout.exercises.length} תרגילים · {workout.exercises.reduce((total, exercise) => total + (exercise.sourceSetCount ?? 2), 0)} סטים · כ־{estimateWorkoutMinutes(workout.exercises.length, workout.exercises.reduce((total, exercise) => total + (exercise.sourceSetCount ?? 2), 0))} דק׳</Text></View></View><View style={styles.builderPreviewExerciseList}>{workout.exercises.map((exercise, exerciseIndex) => { const isFirst = exerciseIndex === 0; const isLast = exerciseIndex === workout.exercises.length - 1; return <View key={`builder-preview-${workout.id}-${exercise.id}`} onTouchStart={(event) => startBuilderExerciseDrag(workout.id, exercise.id, event)} onTouchMove={moveBuilderExerciseDrag} onTouchEnd={endBuilderExerciseDrag} onTouchCancel={endBuilderExerciseDrag} style={[styles.builderPreviewExercise, builderExerciseDrag?.workoutId === workout.id && builderExerciseDrag.exerciseId === exercise.id && styles.builderPreviewExerciseDragging]}><View style={styles.builderPreviewExerciseOrder}><Pressable accessibilityRole="button" accessibilityLabel={`העבר את ${exercise.name} למעלה`} disabled={isFirst} onPress={() => moveBuilderExercise(workout.id, exercise.id, "up")} style={({ pressed }) => [styles.builderPreviewOrderButton, isFirst && styles.builderPreviewOrderDisabled, pressed && styles.pressed]}><Text style={styles.builderPreviewOrderText}>↑</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`העבר את ${exercise.name} למטה`} disabled={isLast} onPress={() => moveBuilderExercise(workout.id, exercise.id, "down")} style={({ pressed }) => [styles.builderPreviewOrderButton, isLast && styles.builderPreviewOrderDisabled, pressed && styles.pressed]}><Text style={styles.builderPreviewOrderText}>↓</Text></Pressable></View><Text style={styles.builderPreviewExerciseIndex}>{exerciseIndex + 1}</Text><View style={styles.builderPreviewExerciseCopy}><Text style={styles.builderPreviewExerciseName}>{exercise.name}</Text><Text style={styles.builderPreviewExerciseMeta}>{exercise.englishName ? `${exercise.englishName} · ` : ""}{exercise.defaultTarget} · {exercise.sourceSetCount ?? 2} סטים</Text><TextInput accessibilityLabel={`הערה עבור ${exercise.name}`} placeholder="הוסף הערה לתרגיל" placeholderTextColor="#7E8DA4" value={exercise.note ?? ""} onChangeText={(note) => updateBuilderExerciseNote(exercise.id, note)} multiline returnKeyType="done" style={styles.builderPreviewExerciseNoteInput} /></View></View>; })}</View></View>)}</View>
          <View style={styles.builderPreviewNotice}><Text style={styles.builderPreviewNoticeText}>{builderReturnToSchedule ? "לאחר האישור האימון יישמר בתוך התוכנית, יתווסף ל„התוכנית שלי” וייפתח בלוח האימונים לשיבוץ." : "לאחר האישור התוכנית תישמר תחת „התוכניות שלי”, ותוכל להוסיף אותה למסך הבית ולתוכנית האימונים."}</Text></View>
          <View style={styles.builderPreviewActions}><Pressable accessibilityRole="button" onPress={() => setIsBuilderReviewOpen(false)} style={({ pressed }) => [styles.builderPreviewBackButton, pressed && styles.pressed]}><Text style={styles.builderPreviewBackText}>חזרה לעריכה</Text></Pressable><Pressable accessibilityRole="button" onPress={() => void createCustomWorkout()} style={({ pressed }) => [styles.builderPreviewConfirmButton, { backgroundColor: customColor }, pressed && styles.pressed]}><Text style={styles.builderPreviewConfirmText}>{builderReturnToSchedule ? "הוסף לתוכנית האימון שלי" : editingPersonalProgramId ? "אשר ושמור שינויים" : "אשר ושמור לתוכנית שלי"}</Text></Pressable></View>
        </ScrollView></View></KeyboardAvoidingView></View>
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

type SelectedProgramItem = { id: string; template?: WorkoutTemplate; templates?: WorkoutTemplate[]; program?: ReturnType<typeof getWorkoutEncyclopediaProgram>; personalProgram?: PersonalProgram };
type AvailablePersonalProgram = { program: PersonalProgram; templates: WorkoutTemplate[] };

function MyProgramsModal({ visible, selectedPrograms, availablePersonalPrograms, selectedProgramIds, onToggleProgram, onRemovePersonalProgram, onUpdatePersonalProgram, onMovePersonalProgramWorkout, onDuplicatePersonalProgram, onUpdateTemplate, onEditPersonalProgram, onAddWorkoutToPersonalProgram, onEditTemplate, onClose, onOpenCatalog }: { visible: boolean; selectedPrograms: SelectedProgramItem[]; availablePersonalPrograms: AvailablePersonalProgram[]; selectedProgramIds: string[]; onToggleProgram: (programId: string) => { selected: boolean; limitReached: boolean }; onRemovePersonalProgram: (programId: string) => void; onUpdatePersonalProgram: (programId: string, patch: Partial<Pick<PersonalProgram, "name" | "accent" | "icon" | "workoutTemplateIds">>) => void; onMovePersonalProgramWorkout: (programId: string, templateId: WorkoutId, direction: -1 | 1) => void; onDuplicatePersonalProgram: (programId: string) => string | null; onUpdateTemplate: (templateId: WorkoutId, patch: Partial<WorkoutTemplate>) => void; onEditPersonalProgram: (program: PersonalProgram) => void; onAddWorkoutToPersonalProgram: (program: PersonalProgram) => void; onEditTemplate: (template: WorkoutTemplate) => void; onClose: () => void; onOpenCatalog: () => void }) {
  const [expandedProgramIds, setExpandedProgramIds] = useState<string[]>([]);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [programNameDraft, setProgramNameDraft] = useState("");
  const [editingExerciseKey, setEditingExerciseKey] = useState<string | null>(null);
  const [exerciseNameDraft, setExerciseNameDraft] = useState("");
  const [exerciseEnglishNameDraft, setExerciseEnglishNameDraft] = useState("");
  const [newExerciseTemplateId, setNewExerciseTemplateId] = useState<WorkoutId | null>(null);
  const [newExerciseNameDraft, setNewExerciseNameDraft] = useState("");
  const [programActionMessage, setProgramActionMessage] = useState<string | null>(null);
  const [pendingProgramRemoval, setPendingProgramRemoval] = useState<AvailablePersonalProgram["program"] | null>(null);
  const availablePrograms = selectedPrograms.filter((item): item is SelectedProgramItem & { template: WorkoutTemplate } => Boolean(item.template));
  const toggle = (id: string) => { const result = onToggleProgram(id); if (result.limitReached) alert(`אפשר לבחור עד ${MAX_SELECTED_PROGRAMS} תוכניות בסך הכול. הסר תוכנית קיימת כדי לבחור אחרת.`); };
  const toggleProgramDetails = (id: string) => setExpandedProgramIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const addProgramToHomeAndSchedule = (program: AvailablePersonalProgram["program"]) => {
    if (selectedProgramIds.includes(program.id)) {
      setProgramActionMessage(`${program.name} כבר נמצאת במסך הבית ובתוכנית האימונים שלי`);
      return;
    }
    const result = onToggleProgram(program.id);
    if (result.limitReached) {
      alert(`אפשר לבחור עד ${MAX_SELECTED_PROGRAMS} תוכניות בסך הכול. הסר תוכנית קיימת כדי לבחור אחרת.`);
      return;
    }
    setProgramActionMessage(`${program.name} נוספה למסך הבית ולתוכנית האימונים שלי`);
  };
  const beginRenameProgram = (program: AvailablePersonalProgram["program"]) => {
    setEditingProgramId(program.id);
    setProgramNameDraft(program.name);
  };
  const cancelRenameProgram = () => {
    setEditingProgramId(null);
    setProgramNameDraft("");
  };
  const saveProgramName = (program: AvailablePersonalProgram["program"]) => {
    const name = programNameDraft.trim();
    if (!name) return;
    onUpdatePersonalProgram(program.id, { name });
    cancelRenameProgram();
    setProgramActionMessage(`שם התוכנית עודכן ל־${name}`);
  };
  const duplicateProgram = (program: AvailablePersonalProgram["program"]) => {
    const duplicateId = onDuplicatePersonalProgram(program.id);
    if (duplicateId) setProgramActionMessage(`${program.name} שוכפלה בהצלחה`);
    else setProgramActionMessage("לא ניתן לשכפל תוכנית ללא אימונים");
  };
  const startExerciseEdit = (template: WorkoutTemplate, exerciseId: string) => {
    const exercise = template.exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    setEditingExerciseKey(`${template.id}:${exercise.id}`);
    setExerciseNameDraft(exercise.name);
    setExerciseEnglishNameDraft(exercise.englishName ?? "");
  };
  const cancelExerciseEdit = () => {
    setEditingExerciseKey(null);
    setExerciseNameDraft("");
    setExerciseEnglishNameDraft("");
  };
  const saveExerciseEdit = (template: WorkoutTemplate, exerciseId: string) => {
    const name = exerciseNameDraft.trim();
    if (!name) return;
    onUpdateTemplate(template.id, { exercises: template.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, name, englishName: exerciseEnglishNameDraft.trim() || undefined } : exercise) });
    cancelExerciseEdit();
    setProgramActionMessage(`התרגיל ${name} עודכן`);
  };
  const updateSetTarget = (template: WorkoutTemplate, exerciseId: string, setIndex: number, target: string) => onUpdateTemplate(template.id, { exercises: template.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, sets: exercise.sets.map((set, index) => index === setIndex ? { ...set, target } : set) } : exercise) });
  const addSetToExercise = (template: WorkoutTemplate, exerciseId: string) => onUpdateTemplate(template.id, { exercises: template.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, sets: [...exercise.sets, { target: "8–12" }] } : exercise) });
  const removeExercise = (template: WorkoutTemplate, exerciseId: string) => {
    onUpdateTemplate(template.id, { exercises: template.exercises.filter((exercise) => exercise.id !== exerciseId) });
    setProgramActionMessage("התרגיל הוסר מהאימון");
  };
  const addExerciseToTemplate = (template: WorkoutTemplate) => {
    const name = newExerciseNameDraft.trim();
    if (!name) return;
    onUpdateTemplate(template.id, { exercises: [...template.exercises, { id: `personal-exercise-${Date.now()}`, name, sets: [{ target: "8–12" }, { target: "10–15" }] }] });
    setNewExerciseNameDraft("");
    setProgramActionMessage(`${name} נוסף לאימון`);
  };
  const shareProgram = async (program: AvailablePersonalProgram["program"], templates: WorkoutTemplate[]) => {
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] ?? character);
    const workoutSections = templates.map((template, index) => `<section><h2>${index + 1}. ${escapeHtml(template.name)}</h2><p>${template.exercises.length ? template.exercises.map((exercise) => `${escapeHtml(exercise.name)} — ${exercise.sets.map((set) => escapeHtml(set.target)).join(" / ")} סטים`).join("<br />") : "אין תרגילים"}</p></section>`).join("");
    const html = `<html lang="he" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(program.name)}</title><style>body{font-family:Arial,sans-serif;color:#17233a;padding:28px;direction:rtl}h1{color:#b47a00;border-bottom:2px solid #f5b72c;padding-bottom:10px}h2{color:#244466;margin-bottom:6px}section{border-bottom:1px solid #cbd5e1;padding:12px 0}p{line-height:1.8}</style></head><body><h1>${escapeHtml(program.name)}</h1><p>תוכנית אימונים אישית · ProLifto</p>${workoutSections}</body></html>`;
    try {
      if (Platform.OS === "web") {
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${program.name.replace(/[^א-תא-תa-zA-Z0-9-]/g, "-") || "prolifto-program"}.html`;
        anchor.click();
        URL.revokeObjectURL(url);
        setProgramActionMessage(`${program.name} יוצאה לקובץ`);
        return;
      }
      const result = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: "application/pdf", dialogTitle: `שיתוף ${program.name}` });
        setProgramActionMessage(`${program.name} מוכנה לשיתוף`);
      } else {
        Alert.alert("הקובץ נוצר", "קובץ PDF של התוכנית נוצר במכשיר.");
      }
    } catch {
      setProgramActionMessage("הייצוא או השיתוף נכשלו. נסה שוב.");
    }
  };
  const removeProgram = (program: AvailablePersonalProgram["program"]) => {
    setPendingProgramRemoval(program);
  };
  const confirmProgramRemoval = () => {
    const program = pendingProgramRemoval;
    if (!program) return;
    onRemovePersonalProgram(program.id);
    setExpandedProgramIds((current) => current.filter((id) => id !== program.id));
    if (editingProgramId === program.id) cancelRenameProgram();
    setProgramActionMessage(`${program.name} הוסרה מהתוכניות שלי`);
    setPendingProgramRemoval(null);
  };
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <View style={styles.myProgramsModal}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>התוכניות שלי</Text>
            <Text style={styles.previewSubtitle}>נבחרו {selectedProgramIds.length}/{MAX_SELECTED_PROGRAMS} תוכניות. אפשר לשלב תוכניות מוכנות ואישיות.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="סגור התוכניות שלי" onPress={onClose} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.myProgramsContent}>
          <View style={styles.programPickerSection}>
            <Text style={styles.selectedProgramsSummaryTitle}>תוכניות אישיות שבנית</Text>
            {availablePersonalPrograms.length ? availablePersonalPrograms.map(({ program, templates }) => { const selected = selectedProgramIds.includes(program.id); const detailsOpen = expandedProgramIds.includes(program.id); const editing = editingProgramId === program.id; return <View key={program.id} style={[styles.programPickerCard, selected && styles.programPickerCardSelected]}>{editing ? <View style={styles.programRenameEditor}><TextInput autoFocus value={programNameDraft} onChangeText={setProgramNameDraft} placeholder="שם התוכנית" placeholderTextColor="#718096" style={styles.programRenameInput} textAlign="right" /><View style={styles.programRenameActions}><Pressable accessibilityRole="button" disabled={!programNameDraft.trim()} onPress={() => saveProgramName(program)} style={({ pressed }) => [styles.programRenameSaveButton, !programNameDraft.trim() && styles.disabledButton, pressed && styles.pressed]}><Text style={styles.programRenameSaveText}>שמור</Text></Pressable><Pressable accessibilityRole="button" onPress={cancelRenameProgram} style={({ pressed }) => [styles.programRenameCancelButton, pressed && styles.pressed]}><Text style={styles.programRenameCancelText}>ביטול</Text></Pressable></View></View> : <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={() => toggle(program.id)} style={({ pressed }) => [styles.programPickerRow, pressed && styles.pressed]}><View style={[styles.programPickerCheck, selected && { backgroundColor: program.accent, borderColor: program.accent }]}><Text style={styles.programPickerCheckText}>{selected ? "✓" : ""}</Text></View><View style={[styles.programPickerIcon, { backgroundColor: `${program.accent}22`, borderColor: `${program.accent}99` }]}><IconSymbol name={(program.icon as IconSymbolName) ?? "dumbbell.fill"} size={20} color={program.accent} /></View><View style={styles.programPickerCopy}><Text style={styles.programPickerTitle}>{program.name}</Text><Text style={styles.programPickerMeta}>{templates.length} אימונים · {templates.reduce((total, template) => total + template.exercises.length, 0)} תרגילים</Text></View></Pressable>}<View style={styles.programPickerActions}><Pressable accessibilityRole="button" accessibilityState={{ expanded: detailsOpen }} accessibilityLabel={`${detailsOpen ? "סגור" : "פתח"} פירוט ${program.name}`} onPress={() => toggleProgramDetails(program.id)} style={({ pressed }) => [styles.programDetailsButton, pressed && styles.pressed]}><Text style={styles.programDetailsButtonText}>{detailsOpen ? "סגור פירוט" : "פירוט האימונים"}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => beginRenameProgram(program)} style={({ pressed }) => [styles.renameProgramButton, pressed && styles.pressed]}><Text style={styles.renameProgramButtonText}>ערוך שם</Text></Pressable><Pressable accessibilityRole="button" onPress={() => onEditPersonalProgram(program)} style={({ pressed }) => [styles.editProgramButton, pressed && styles.pressed]}><Text style={styles.editProgramButtonText}>ערוך תוכנית</Text></Pressable><Pressable accessibilityRole="button" onPress={() => duplicateProgram(program)} style={({ pressed }) => [styles.duplicateProgramButton, pressed && styles.pressed]}><Text style={styles.duplicateProgramButtonText}>שכפל</Text></Pressable><Pressable accessibilityRole="button" onPress={() => void shareProgram(program, templates)} style={({ pressed }) => [styles.shareProgramButton, pressed && styles.pressed]}><Text style={styles.shareProgramButtonText}>ייצא / שתף</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ disabled: selected }} accessibilityLabel={`${selected ? "התוכנית כבר נוספה" : "הוסף"} ${program.name} למסך הבית ולתוכנית האימונים שלי`} disabled={selected} onPress={() => addProgramToHomeAndSchedule(program)} style={({ pressed }) => [styles.addProgramToHomeButton, selected && styles.addProgramToHomeButtonSelected, pressed && styles.pressed]}><Text style={styles.addProgramToHomeButtonText}>{selected ? "✓ נוסף למסך הבית ולתוכנית האימונים שלי" : "הוסף למסך הבית ולתוכנית האימונים שלי"}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`הסר את ${program.name} מהתוכניות שלי`} onPress={() => removeProgram(program)} style={({ pressed }) => [styles.removeProgramButton, pressed && styles.pressed]}><Text style={styles.removeProgramButtonText}>הסר</Text></Pressable></View>{detailsOpen ? <View style={styles.programDetails}>{templates.length ? templates.map((template, index) => <View key={`details-${template.id}`} style={styles.programDetailWorkout}><View style={styles.programDetailHeader}><Text style={styles.programDetailWorkoutTitle}>{index + 1}. {template.name}</Text><View style={styles.programDetailWorkoutActions}><Pressable accessibilityRole="button" onPress={() => onEditTemplate(template)} style={({ pressed }) => [styles.editWorkoutButton, pressed && styles.pressed]}><Text style={styles.editWorkoutButtonText}>ערוך אימון</Text></Pressable><View style={styles.programDetailReorder}><Pressable accessibilityRole="button" accessibilityLabel={`העלה את ${template.name}`} disabled={index === 0} onPress={() => onMovePersonalProgramWorkout(program.id, template.id, -1)} style={({ pressed }) => [styles.reorderButton, index === 0 && styles.reorderButtonDisabled, pressed && styles.pressed]}><Text style={styles.reorderButtonText}>↑</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`הורד את ${template.name}`} disabled={index === templates.length - 1} onPress={() => onMovePersonalProgramWorkout(program.id, template.id, 1)} style={({ pressed }) => [styles.reorderButton, index === templates.length - 1 && styles.reorderButtonDisabled, pressed && styles.pressed]}><Text style={styles.reorderButtonText}>↓</Text></Pressable></View></View></View>{template.exercises.length ? template.exercises.map((exercise, exerciseIndex) => { const exerciseKey = `${template.id}:${exercise.id}`; const editingExercise = editingExerciseKey === exerciseKey; return <View key={`details-${exercise.id}`} style={styles.programDetailExerciseCard}>{editingExercise ? <View style={styles.exerciseEditor}><TextInput value={exerciseNameDraft} onChangeText={setExerciseNameDraft} placeholder="שם התרגיל" placeholderTextColor="#718096" style={styles.exerciseEditorInput} textAlign="right" /><TextInput value={exerciseEnglishNameDraft} onChangeText={setExerciseEnglishNameDraft} placeholder="שם באנגלית (אופציונלי)" placeholderTextColor="#718096" style={styles.exerciseEditorInput} textAlign="right" /><View style={styles.exerciseSetList}>{exercise.sets.map((set, setIndex) => <View key={`${exerciseKey}:set-${setIndex}`} style={styles.exerciseSetRow}><Text style={styles.exerciseSetLabel}>סט {setIndex + 1}</Text><TextInput value={set.target} onChangeText={(target) => updateSetTarget(template, exercise.id, setIndex, target)} placeholder="חזרות / יעד" placeholderTextColor="#718096" style={styles.exerciseSetInput} textAlign="right" /></View>)}</View><View style={styles.exerciseEditActions}><Pressable accessibilityRole="button" onPress={() => addSetToExercise(template, exercise.id)} style={({ pressed }) => [styles.programAddSetButton, pressed && styles.pressed]}><Text style={styles.programAddSetButtonText}>+ הוסף סט</Text></Pressable><Pressable accessibilityRole="button" disabled={!exerciseNameDraft.trim()} onPress={() => saveExerciseEdit(template, exercise.id)} style={({ pressed }) => [styles.exerciseSaveButton, !exerciseNameDraft.trim() && styles.disabledButton, pressed && styles.pressed]}><Text style={styles.exerciseSaveButtonText}>שמור תרגיל</Text></Pressable><Pressable accessibilityRole="button" onPress={cancelExerciseEdit} style={({ pressed }) => [styles.exerciseCancelButton, pressed && styles.pressed]}><Text style={styles.exerciseCancelButtonText}>ביטול</Text></Pressable></View></View> : <View style={styles.programDetailExerciseRow}><View style={styles.programDetailExerciseCopy}><Text style={styles.programDetailExerciseName}>{exerciseIndex + 1}. {exercise.name}</Text><Text style={styles.programDetailExerciseMeta}>{exercise.sets.map((set, setIndex) => `סט ${setIndex + 1}: ${set.target}`).join(" · ")}</Text></View><View style={styles.exerciseEditActions}><Pressable accessibilityRole="button" onPress={() => startExerciseEdit(template, exercise.id)} style={({ pressed }) => [styles.exerciseEditButton, pressed && styles.pressed]}><Text style={styles.exerciseEditButtonText}>ערוך</Text></Pressable><Pressable accessibilityRole="button" onPress={() => removeExercise(template, exercise.id)} style={({ pressed }) => [styles.exerciseRemoveButton, pressed && styles.pressed]}><Text style={styles.exerciseRemoveButtonText}>מחק</Text></Pressable></View></View>}</View>; }) : <Text style={styles.programDetailsEmpty}>אין עדיין תרגילים באימון הזה.</Text>} {newExerciseTemplateId === template.id ? <View style={styles.addExerciseEditor}><TextInput autoFocus value={newExerciseNameDraft} onChangeText={setNewExerciseNameDraft} placeholder="שם התרגיל החדש" placeholderTextColor="#718096" style={styles.exerciseEditorInput} textAlign="right" /><View style={styles.exerciseEditActions}><Pressable accessibilityRole="button" disabled={!newExerciseNameDraft.trim()} onPress={() => addExerciseToTemplate(template)} style={({ pressed }) => [styles.exerciseSaveButton, !newExerciseNameDraft.trim() && styles.disabledButton, pressed && styles.pressed]}><Text style={styles.exerciseSaveButtonText}>הוסף תרגיל</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { setNewExerciseTemplateId(null); setNewExerciseNameDraft(""); }} style={({ pressed }) => [styles.exerciseCancelButton, pressed && styles.pressed]}><Text style={styles.exerciseCancelButtonText}>ביטול</Text></Pressable></View></View> : <Pressable accessibilityRole="button" onPress={() => { setNewExerciseTemplateId(template.id); setNewExerciseNameDraft(""); }} style={({ pressed }) => [styles.addExerciseButton, pressed && styles.pressed]}><Text style={styles.addExerciseButtonText}>+ הוסף תרגיל לאימון</Text></Pressable>}</View>) : <Text style={styles.programDetailsEmpty}>לא נמצאו אימונים בתוכנית.</Text>}</View> : null}</View>; }) : <View style={styles.myProgramsEmpty}><Text style={styles.myProgramsEmptyTitle}>בוא נבנה את התוכנית שלך</Text><Text style={styles.myProgramsEmptyText}>עדיין לא בנית תוכנית אישית. פתח את בניית התוכנית כדי ליצור אחת. הוסף עד 5 תוכניות מועדפות בסך הכול.</Text></View>}
          </View>
          {availablePrograms.length ? <View style={styles.selectedProgramsSummary}>
            <Text style={styles.selectedProgramsSummaryTitle}>התוכניות שנבחרו</Text>
            {availablePrograms.map((item) => <View key={`selected-summary-${item.id}`} style={styles.selectedProgramSummaryCard}>
              <Text style={styles.selectedProgramSummaryTitle}>{item.personalProgram?.name ?? item.program?.title ?? item.template.name}</Text>
              <Text style={styles.selectedProgramSummaryMeta}>{(item.templates ?? [item.template]).map((template) => template.name).join(" · ")}</Text>
            </View>)}
            <Text style={styles.selectedProgramsSummaryHint}>עד 5 תוכניות נשמרות כאן. את שיבוץ הימים מבצעים ביומן האימונים.</Text>
          </View> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="פתח את קטלוג האימונים ובחר תוכנית" onPress={onOpenCatalog} style={({ pressed }) => [styles.myProgramsChooseButton, pressed && styles.pressed]}><Text style={styles.myProgramsChooseButtonText}>בחירת תוכנית אימונים</Text><Text style={styles.myProgramsChooseButtonArrow}>‹</Text></Pressable>
        </ScrollView>
        <ActionToast message={programActionMessage} />
        <Pressable accessibilityRole="button" accessibilityLabel="עבור ליומן האימונים לשיבוץ" onPress={() => { onClose(); router.push("/schedule" as never); }} style={({ pressed }) => [styles.scheduleLink, pressed && styles.pressed]}><View style={styles.scheduleLinkIcon}><Text style={styles.scheduleLinkIconText}>▦</Text></View><View style={styles.scheduleLinkCopy}><Text style={styles.scheduleLinkText}>עבור ליומן האימונים לשיבוץ</Text><Text style={styles.scheduleLinkSubtext}>בחר יום ושבץ את התוכנית שלך</Text></View><Text style={styles.scheduleLinkArrow}>←</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.myProgramsDone}><Text style={styles.myProgramsDoneText}>סגירה</Text></Pressable>
        {pendingProgramRemoval ? <View style={styles.removalBannerOverlay}><View style={styles.removalBanner}><Text style={styles.removalBannerEyebrow}>אישור פעולה</Text><Text style={styles.removalBannerTitle}>הסרת תוכנית</Text><Text style={styles.removalBannerText}>להסיר את „{pendingProgramRemoval.name}” מהתוכניות שלי? כל האימונים שלה יוסרו גם הם מהבחירה.</Text><View style={styles.removalBannerActions}><Pressable accessibilityRole="button" onPress={() => setPendingProgramRemoval(null)} style={({ pressed }) => [styles.removalCancelButton, pressed && styles.pressed]}><Text style={styles.removalCancelButtonText}>ביטול</Text></Pressable><Pressable accessibilityRole="button" onPress={confirmProgramRemoval} style={({ pressed }) => [styles.removalConfirmButton, pressed && styles.pressed]}><Text style={styles.removalConfirmButtonText}>הסר תוכנית</Text></Pressable></View></View></View> : null}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  categoryMenu: { marginTop: 18, gap: 10 }, personalProfilePanel: { backgroundColor: "#16233A", borderColor: "#F5B72C", borderWidth: 1.5, borderRadius: 18, padding: 13, gap: 11 }, personalProfileHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 10 }, personalProfileIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#F5B72C22", borderColor: "#F5B72C88", borderWidth: 1, alignItems: "center", justifyContent: "center" }, personalProfileIconText: { fontSize: 19 }, personalProfileHeading: { flex: 1, alignItems: "flex-end", gap: 2 }, personalProfileTitle: { color: "#F5B72C", fontSize: 20, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, personalProfileSubtitle: { color: "#AAB7C8", fontSize: 11, lineHeight: 16, textAlign: "right", writingDirection: "rtl" }, personalProfileList: { gap: 7 }, personalProfileRow: { flexDirection: "row-reverse", alignItems: "center", gap: 9, borderColor: "#2C3B55", borderWidth: 1, borderRadius: 11, backgroundColor: "#0F1A2E", paddingHorizontal: 10, paddingVertical: 9 }, personalProfileArrow: { width: 27, height: 27, borderRadius: 9, backgroundColor: "#F5B72C22", alignItems: "center", justifyContent: "center" }, personalProfileArrowText: { color: "#F5B72C", fontSize: 22, lineHeight: 22, fontWeight: "900" }, personalProfileRowText: { flex: 1, alignItems: "flex-end", gap: 2 }, personalProfileRowTitle: { color: "#F7F9FC", fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, personalProfileRowDescription: { color: "#AAB7C8", fontSize: 10, lineHeight: 14, textAlign: "right", writingDirection: "rtl" }, categoryMenuHeader: { alignItems: "flex-end", gap: 4, marginBottom: 2 }, categoryMenuTitle: { color: "#F7F9FC", fontSize: 22, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, categoryMenuSubtitle: { color: "#AAB7C8", fontSize: 12, lineHeight: 18, textAlign: "right", writingDirection: "rtl" }, categoryFolder: { backgroundColor: "#111D31", borderWidth: 1, borderRadius: 16, padding: 10, gap: 7 }, audienceFolder: { backgroundColor: "#111D31", borderWidth: 1, borderRadius: 16, padding: 10, gap: 8 }, muscleBuildingFolder: { backgroundColor: "#14243D", borderWidth: 1.5, borderRadius: 16, padding: 10, gap: 8 }, muscleBuildingIcon: { backgroundColor: "#F5B72C22", borderColor: "#F5B72C88" }, nestedFolderList: { gap: 8, paddingTop: 4 }, nestedCategoryFolder: { borderRadius: 13, padding: 8 }, categoryFolderContent: { gap: 7, paddingTop: 3 }, categoryFolderChevron: { fontSize: 22, fontWeight: "900", lineHeight: 22 }, audienceHeaderPressable: { flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 10 }, categoryFolderChevronButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" }, groupSelectButton: { minWidth: 68, minHeight: 30, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }, groupSelectButtonText: { fontSize: 9, fontWeight: "900", textAlign: "center", writingDirection: "rtl" }, categoryEmptyText: { color: "#AAB7C8", fontSize: 11, textAlign: "right", paddingVertical: 7 }, categoryFolderHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 4 }, categoryFolderIcon: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" }, categoryFolderIconText: { fontSize: 11, fontWeight: "900" }, categoryFolderText: { flex: 1, alignItems: "flex-end", gap: 2 }, categoryFolderTitle: { fontSize: 15, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, categoryFolderDescription: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, categoryFolderCount: { fontSize: 12, fontWeight: "900" }, categoryProgramRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8, backgroundColor: "#16233A", borderWidth: 1, borderRadius: 11, padding: 9 }, categoryProgramText: { flex: 1, alignItems: "flex-end", gap: 2 }, categoryProgramTitle: { color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, categoryProgramDescription: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, categoryProgramAction: { fontSize: 10, fontWeight: "900" }, folderWorkoutCard: { backgroundColor: "#0B1224", borderWidth: 1, borderRadius: 13, padding: 11, gap: 9 }, folderWorkoutHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 9 }, folderWorkoutBadge: { width: 34, height: 34, borderWidth: 1, borderRadius: 11, alignItems: "center", justifyContent: "center" }, folderWorkoutBadgeText: { fontSize: 13, fontWeight: "900" }, folderWorkoutHeading: { flex: 1, alignItems: "flex-end", gap: 2 }, folderWorkoutTitle: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, folderWorkoutFocus: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, folderExerciseList: { gap: 5, borderTopColor: "#2C3B55", borderTopWidth: 1, paddingTop: 8 }, folderExerciseRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 7 }, folderExerciseNumber: { minWidth: 15, fontSize: 10, fontWeight: "900", textAlign: "right" }, folderExerciseInfo: { flex: 1, alignItems: "flex-end", gap: 1 }, folderExerciseName: { color: "#EAF1F8", fontSize: 11, fontWeight: "800", textAlign: "right", writingDirection: "rtl" }, folderExerciseMeta: { color: "#7E8DA4", fontSize: 9, lineHeight: 14, textAlign: "right", writingDirection: "rtl" }, folderWorkoutActions: { flexDirection: "row-reverse", gap: 8 }, folderOutlineButton: { flex: 1, minHeight: 37, borderColor: "#52759C", borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }, folderOutlineButtonText: { color: "#A9CFF2", fontSize: 10, fontWeight: "900", textAlign: "center", writingDirection: "rtl" }, folderSelectButton: { flex: 1.45, minHeight: 37, borderColor: "#42D392", borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }, folderSelectButtonText: { color: "#42D392", fontSize: 10, fontWeight: "900", textAlign: "center", writingDirection: "rtl" }, folderStartButton: { flex: 1, minHeight: 37, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }, folderStartButtonText: { color: "#081222", fontSize: 10, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  content: { paddingBottom: 28, gap: 22 },
  // marginTop clears the fixed accessibility pill (top:14, 38 tall) that
  // floats over every screen, so it never covers the greeting title.
  header: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 40 },
  titleBlock: { flex: 1, minWidth: 0, alignItems: "flex-end" },
  title: { color: "#F7F9FC", fontSize: 24, lineHeight: 30, fontWeight: "800", marginTop: 4, textAlign: "right" },
  logoMark: { width: 54, height: 54, borderRadius: 16, backgroundColor: "#F5B72C", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#0B1224", fontSize: 28, fontWeight: "900" },
  todayCard: { backgroundColor: "#1C3152", borderColor: "#F5B72C", borderWidth: 1.5, borderRadius: 18, padding: 16, alignItems: "flex-end", gap: 6 },
  todayEyebrow: { color: "#F5B72C", fontSize: 12, fontWeight: "900", textAlign: "right" },
  todayTitle: { color: "#F7F9FC", fontSize: 20, fontWeight: "900", textAlign: "right" },
  todaySubtitle: { color: "#C6D2E2", fontSize: 12, lineHeight: 17, textAlign: "right" },
  todayButton: { backgroundColor: "#F5B72C", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 22, marginTop: 6, alignSelf: "stretch", alignItems: "center" },
  todayButtonText: { color: "#0B1224", fontSize: 15, fontWeight: "900" },
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
        creatorButton: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#F5B72C", borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: "#FFE29A", shadowColor: "#F5B72C", shadowOpacity: 0.28, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 5 }, creatorBanner: { backgroundColor: "#F5B72C", borderColor: "#FFE29A", borderWidth: 1, borderRadius: 14, padding: 12, gap: 3 }, creatorBannerCentered: { alignItems: "center", justifyContent: "center", textAlign: "center", marginVertical: 6 }, creatorBannerTitle: { color: "#0B1224", fontSize: 18, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, creatorBannerText: { color: "#26334B", fontSize: 11, lineHeight: 16, textAlign: "right", writingDirection: "rtl" }, builderFlowSteps: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 5, backgroundColor: "#0B1224", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 11, paddingVertical: 8, paddingHorizontal: 7 }, builderFlowStep: { color: "#718096", fontSize: 9, fontWeight: "800", textAlign: "center", writingDirection: "rtl" }, builderFlowStepActive: { color: "#F5D27A", fontWeight: "900" }, builderFlowArrow: { color: "#52759C", fontSize: 15, fontWeight: "900" }, builderSectionHint: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, builderWorkoutTabs: { gap: 7 }, builderWorkoutTabRow: { flexDirection: "row-reverse", gap: 7, alignItems: "center" }, builderWorkoutTab: { minHeight: 36, borderColor: "#52759C", borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, alignItems: "center", justifyContent: "center" }, builderWorkoutTabText: { color: "#C7D4E5", fontSize: 10, fontWeight: "900" }, builderWorkoutTabTextActive: { color: "#0B1224" }, addWorkoutTab: { minHeight: 36, borderColor: "#F5B72C", borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, alignItems: "center", justifyContent: "center" }, addWorkoutTabText: { color: "#F5B72C", fontSize: 10, fontWeight: "900" }, exerciseSourceRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 }, exerciseSourceTitle: { flex: 1, alignItems: "flex-end", gap: 2 }, exerciseSourceBadge: { borderColor: "#F5B72C", borderWidth: 1, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 }, exerciseSourceBadgeText: { color: "#F5D27A", fontSize: 10, fontWeight: "900" }, builderSourceFilterRow: { flexDirection: "row-reverse", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 8 }, builderSourceFilter: { minHeight: 34, borderColor: "#2C3B55", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" }, builderSourceFilterText: { color: "#AAB7C8", fontSize: 10, fontWeight: "800" }, builderSourceFilterTextActive: { color: "#0B1224", fontWeight: "900" }, builderExerciseSourceTag: { alignSelf: "flex-end", fontSize: 9, fontWeight: "900", marginTop: 2 }, builderExerciseSourceTagPersonal: { color: "#F5B72C" }, builderExerciseSourceTagCatalog: { color: "#65BDF6" }, builderReviewSourceTag: { alignSelf: "flex-end", fontSize: 9, fontWeight: "900", marginTop: 3 }, builderReviewSourceTagPersonal: { color: "#F5B72C" }, builderReviewSourceTagCatalog: { color: "#65BDF6" }, builderDuplicateStatus: { fontSize: 10, fontWeight: "900", marginTop: 4, textAlign: "right", writingDirection: "rtl" }, builderDuplicateStatusClear: { color: "#42D392" }, builderDuplicateStatusWarning: { color: "#FB7185" }, customExerciseBox: { backgroundColor: "#14243D", borderColor: "#F5B72C88", borderWidth: 1, borderRadius: 13, padding: 10, gap: 7 }, customExerciseTitle: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, addCustomExerciseButton: { minHeight: 40, backgroundColor: "#F5B72C", borderRadius: 10, alignItems: "center", justifyContent: "center" }, addCustomExerciseButtonText: { color: "#0B1224", fontSize: 11, fontWeight: "900" }, disabledButton: { opacity: 0.45 },
      creatorButtonText: { color: "#0B1224", fontSize: 14, fontWeight: "900" },
      builderReviewSection: { backgroundColor: "#0F1A2E", borderColor: "#52759C", borderWidth: 1, borderRadius: 13, padding: 10, gap: 8 }, builderReviewHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 }, builderReviewTitle: { color: "#F7F9FC", fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, builderReviewHint: { color: "#AAB7C8", fontSize: 10, textAlign: "right", writingDirection: "rtl" }, builderReviewBadge: { width: 32, height: 32, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" }, builderReviewBadgeText: { fontSize: 14, fontWeight: "900" }, builderReviewRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 8, backgroundColor: "#16233A" }, builderReviewIcon: { width: 30, height: 30, borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center" }, builderReviewCopy: { flex: 1, alignItems: "flex-end", gap: 2 }, builderReviewName: { color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, builderReviewMeta: { color: "#AAB7C8", fontSize: 9, textAlign: "right", writingDirection: "rtl" }, builderReviewRemove: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#FB718522", alignItems: "center", justifyContent: "center" }, builderReviewRemoveText: { color: "#FB7185", fontSize: 20, fontWeight: "900" }, builderReviewEdit: { borderColor: "#6EA8E7", borderWidth: 1, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 7 }, builderReviewEditText: { color: "#A9D4FF", fontSize: 9, fontWeight: "900" }, cancelEditButton: { alignItems: "center", paddingVertical: 4 }, cancelEditText: { color: "#AAB7C8", fontSize: 10, fontWeight: "800" }, builderReviewEmpty: { color: "#AAB7C8", fontSize: 11, lineHeight: 17, textAlign: "right", writingDirection: "rtl" }, myExercisesSection: { backgroundColor: "#14243D", borderColor: "#F5B72C88", borderWidth: 1, borderRadius: 13, padding: 10, gap: 8 }, myExercisesHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 }, myExercisesTitle: { color: "#F5B72C", fontSize: 15, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, myExercisesHint: { color: "#AAB7C8", fontSize: 10, textAlign: "right", writingDirection: "rtl" }, myExercisesIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#F5B72C22", borderColor: "#F5B72C88", borderWidth: 1, alignItems: "center", justifyContent: "center" }, myExerciseRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, borderColor: "#2C3B55", borderWidth: 1, borderRadius: 9, backgroundColor: "#0F1A2E", padding: 8 }, myExerciseActions: { flexDirection: "row-reverse", alignItems: "center", gap: 6 }, myExerciseRowSelected: { borderColor: "#42D392", backgroundColor: "#42D39216" }, myExerciseAdd: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#F5B72C", alignItems: "center", justifyContent: "center" }, myExerciseAddText: { color: "#0B1224", fontSize: 19, lineHeight: 21, fontWeight: "900" }, myExerciseRemove: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#FB718522", borderColor: "#FB718588", borderWidth: 1, alignItems: "center", justifyContent: "center" }, myExerciseRemoveText: { color: "#FB7185", fontSize: 19, lineHeight: 21, fontWeight: "900" }, myExerciseCopy: { flex: 1, alignItems: "flex-end", gap: 2 }, myExerciseName: { color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, myExerciseMeta: { color: "#AAB7C8", fontSize: 9, textAlign: "right", writingDirection: "rtl" }, myExercisesEmpty: { color: "#AAB7C8", fontSize: 11, lineHeight: 16, textAlign: "right", writingDirection: "rtl" },   builderExerciseConfirmBanner: { position: "absolute", left: 14, right: 14, bottom: 16, zIndex: 30, elevation: 10, flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#1D2A40", borderColor: "#F5B72C99", borderWidth: 1, borderRadius: 13, padding: 11, shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
 builderExerciseConfirmCopy: { flex: 1, alignItems: "flex-end", gap: 3 }, builderExerciseConfirmTitle: { color: "#F5D27A", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, builderExerciseConfirmText: { color: "#D8E5F2", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, builderExerciseConfirmActions: { flexDirection: "row-reverse", alignItems: "center", gap: 6 }, builderExerciseCancelButton: { minHeight: 34, borderRadius: 9, borderColor: "#52759C", borderWidth: 1, paddingHorizontal: 9, alignItems: "center", justifyContent: "center" }, builderExerciseCancelText: { color: "#B7C9DD", fontSize: 10, fontWeight: "800" }, builderExerciseConfirmButton: { minHeight: 34, borderRadius: 9, backgroundColor: "#F5B72C", borderColor: "#FFE29A", borderWidth: 1, paddingHorizontal: 9, alignItems: "center", justifyContent: "center" }, builderExerciseConfirmButtonText: { color: "#0B1224", fontSize: 10, fontWeight: "900" },
      defaultProgramRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, borderColor: "#2C3B55", borderWidth: 1, borderRadius: 12, backgroundColor: "#0F1A2E", padding: 11 },
      defaultProgramRowActive: { borderColor: "#F5B72C", backgroundColor: "#2A2413" },
      defaultProgramCheck: { width: 28, height: 28, borderRadius: 9, borderColor: "#52759C", borderWidth: 1, alignItems: "center", justifyContent: "center" },
      defaultProgramCheckActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
      defaultProgramCheckText: { color: "#0B1224", fontSize: 18, fontWeight: "900" },
      defaultProgramCopy: { flex: 1, alignItems: "flex-end", gap: 2 },
      defaultProgramTitle: { color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
      defaultProgramDescription: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, personalProgramsPanel: { backgroundColor: "#101A2F", borderColor: "#CDA648", borderWidth: 1, borderRadius: 14, padding: 16, gap: 12 }, personalProgramsHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottomColor: "#2C3B55", borderBottomWidth: 1 }, personalProgramsLink: { borderColor: "#F5B72C", borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 }, personalProgramsLinkText: { color: "#F5D27A", fontSize: 10, fontWeight: "900" }, scheduleLink: { backgroundColor: "#F5B72C", borderRadius: 14, borderWidth: 1, borderColor: "#FFE29A", flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 11, shadowColor: "#F5B72C", shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }, scheduleLinkIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#0B1224", alignItems: "center", justifyContent: "center" }, scheduleLinkIconText: { color: "#F5B72C", fontSize: 24, lineHeight: 27, fontWeight: "900" }, scheduleLinkCopy: { flex: 1, alignItems: "flex-end", gap: 2 }, scheduleLinkText: { color: "#0B1224", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, scheduleLinkSubtext: { color: "#3A2A08", fontSize: 10, fontWeight: "700", textAlign: "right", writingDirection: "rtl" }, scheduleLinkArrow: { color: "#0B1224", fontSize: 22, fontWeight: "900" }, personalProgramBlock: { gap: 8, paddingTop: 2 }, personalProgramRow: { backgroundColor: "#121F36", borderColor: "#40506B", borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "flex-end", gap: 4 }, personalProgramActions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, alignItems: "center" }, personalProgramActionButton: { flex: 1, minHeight: 34, borderRadius: 9, borderColor: "#52759C", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, personalProgramActionPrimary: { backgroundColor: "#F5B72C", borderColor: "#FFE29A" }, personalProgramActionText: { color: "#A9CFF2", fontSize: 10, fontWeight: "900", textAlign: "center", writingDirection: "rtl" }, personalProgramActionPrimaryText: { color: "#0B1224", fontSize: 10, fontWeight: "900", textAlign: "center", writingDirection: "rtl" }, personalProgramRowTitle: { color: "#F7F9FC", fontSize: 14, fontWeight: "900", textAlign: "right" }, personalProgramRowMeta: { color: "#AAB7C8", fontSize: 10, textAlign: "right" }, personalProgramsEmpty: { color: "#AAB7C8", fontSize: 11, textAlign: "right", lineHeight: 17 },
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
  myProgramsModal: { position: "relative", maxHeight: "88%", backgroundColor: "#101B31", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: "#334155", padding: 18 }, selectedProgramsSummary: { gap: 8, paddingBottom: 6 }, selectedProgramsSummaryTitle: { color: "#F5B72C", fontSize: 15, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, selectedProgramSummaryCard: { backgroundColor: "#0B1224", borderColor: "#52759C", borderWidth: 1, borderRadius: 11, padding: 9, gap: 3 }, selectedProgramSummaryTitle: { color: "#F7F9FC", fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, selectedProgramSummaryMeta: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, selectedProgramsSummaryHint: { color: "#F2D48A", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, myProgramsContent: { paddingBottom: 16, gap: 9 }, programPickerSection: { backgroundColor: "#0B1224", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 14, padding: 11, gap: 8 }, programPickerCard: { backgroundColor: "#16233A", borderColor: "#52759C", borderWidth: 1, borderRadius: 12, padding: 8, gap: 8 }, programPickerCardSelected: { borderColor: "#F5B72C", backgroundColor: "#2A2413" }, programPickerRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "transparent", padding: 2 }, programPickerRowSelected: { borderColor: "#F5B72C", backgroundColor: "#2A2413" }, programPickerActions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, alignItems: "stretch" }, programDetailsButton: { minHeight: 38, borderRadius: 9, borderColor: "#52759C", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, flexGrow: 1 }, programDetailsButtonText: { color: "#A9CFF2", fontSize: 10, fontWeight: "900", textAlign: "center", writingDirection: "rtl" }, renameProgramButton: { minHeight: 38, borderRadius: 9, borderColor: "#65BDF6", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 9 }, renameProgramButtonText: { color: "#A9D4FF", fontSize: 10, fontWeight: "900" }, editProgramButton: { minHeight: 38, borderRadius: 9, borderColor: "#F5B72C", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 9 }, editProgramButtonText: { color: "#F5D27A", fontSize: 10, fontWeight: "900" }, addWorkoutToProgramButton: { minHeight: 38, borderRadius: 9, backgroundColor: "#42D392", borderColor: "#8BE8B8", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 9 }, addWorkoutToProgramButtonText: { color: "#07111F", fontSize: 10, fontWeight: "900" }, addProgramToHomeButton: { minHeight: 40, borderRadius: 10, backgroundColor: "#F5B72C", borderColor: "#FFE29A", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, flexGrow: 2 }, addProgramToHomeButtonSelected: { backgroundColor: "#42D392", borderColor: "#8BE8B8" }, addProgramToHomeButtonText: { color: "#0B1224", fontSize: 10, fontWeight: "900", textAlign: "center", writingDirection: "rtl" }, removeProgramButton: { minHeight: 36, borderRadius: 8, backgroundColor: "#2A1723", borderColor: "#D66A82", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }, removeProgramButtonText: { color: "#F28AA1", fontSize: 10, fontWeight: "900" }, programRenameEditor: { gap: 8 }, programRenameInput: { minHeight: 42, borderRadius: 10, borderColor: "#65BDF6", borderWidth: 1, backgroundColor: "#0B1224", color: "#F7F9FC", paddingHorizontal: 10, fontSize: 13, writingDirection: "rtl" }, programRenameActions: { flexDirection: "row-reverse", gap: 7 }, programRenameSaveButton: { minHeight: 36, borderRadius: 9, backgroundColor: "#42D392", alignItems: "center", justifyContent: "center", paddingHorizontal: 15 }, programRenameSaveText: { color: "#07111F", fontSize: 10, fontWeight: "900" }, programRenameCancelButton: { minHeight: 36, borderRadius: 9, borderColor: "#52759C", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 }, programRenameCancelText: { color: "#C7D4E5", fontSize: 10, fontWeight: "900" }, duplicateProgramButton: { minHeight: 38, borderRadius: 9, borderColor: "#42D392", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }, duplicateProgramButtonText: { color: "#8BE8B8", fontSize: 10, fontWeight: "900" }, shareProgramButton: { minHeight: 38, borderRadius: 9, borderColor: "#A78BFA", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }, shareProgramButtonText: { color: "#C4B5FD", fontSize: 10, fontWeight: "900" }, programDetails: { gap: 7, borderTopColor: "#2C3B55", borderTopWidth: 1, paddingTop: 8 }, programDetailWorkout: { backgroundColor: "#0B1224", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 9, padding: 8, gap: 4 }, programDetailHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 7 }, programDetailWorkoutActions: { flexDirection: "row-reverse", alignItems: "center", gap: 6 }, editWorkoutButton: { minHeight: 30, borderRadius: 8, backgroundColor: "#1E496B", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, editWorkoutButtonText: { color: "#BEE3FF", fontSize: 9, fontWeight: "900" }, programDetailReorder: { flexDirection: "row-reverse", gap: 4 }, reorderButton: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#16233A", borderColor: "#52759C", borderWidth: 1, alignItems: "center", justifyContent: "center" }, reorderButtonDisabled: { opacity: 0.32 }, reorderButtonText: { color: "#F5B72C", fontSize: 17, fontWeight: "900", lineHeight: 18 }, programDetailWorkoutTitle: { flex: 1, color: "#F5D27A", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, programDetailExerciseText: { color: "#C7D4E5", fontSize: 10, lineHeight: 16, textAlign: "right", writingDirection: "rtl" }, programDetailExerciseCard: { backgroundColor: "#111D31", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 9, padding: 8, gap: 7 }, programDetailExerciseRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 }, programDetailExerciseCopy: { flex: 1, alignItems: "flex-end", gap: 3 }, programDetailExerciseName: { color: "#EAF1F8", fontSize: 11, fontWeight: "800", textAlign: "right", writingDirection: "rtl" }, programDetailExerciseMeta: { color: "#7E8DA4", fontSize: 9, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, exerciseEditButton: { minHeight: 30, borderRadius: 8, backgroundColor: "#1E496B", alignItems: "center", justifyContent: "center", paddingHorizontal: 9 }, exerciseEditButtonText: { color: "#BEE3FF", fontSize: 9, fontWeight: "900" }, exerciseRemoveButton: { minHeight: 30, borderRadius: 8, borderColor: "#FB7185", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 9 }, exerciseRemoveButtonText: { color: "#FB7185", fontSize: 9, fontWeight: "900" }, exerciseEditor: { gap: 7 }, exerciseEditorInput: { minHeight: 38, borderRadius: 9, borderColor: "#52759C", borderWidth: 1, backgroundColor: "#0B1224", color: "#F7F9FC", paddingHorizontal: 9, fontSize: 11, writingDirection: "rtl" }, exerciseSetList: { gap: 6 }, exerciseSetRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 }, exerciseSetLabel: { color: "#AAB7C8", fontSize: 10, fontWeight: "800", minWidth: 45, textAlign: "right" }, exerciseSetInput: { flex: 1, minHeight: 34, borderRadius: 8, borderColor: "#3D587C", borderWidth: 1, backgroundColor: "#101C31", color: "#F7F9FC", paddingHorizontal: 8, fontSize: 10, textAlign: "right" }, exerciseEditActions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 }, programAddSetButton: { minHeight: 34, borderRadius: 8, borderColor: "#52759C", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 9 }, programAddSetButtonText: { color: "#A9CFF2", fontSize: 9, fontWeight: "900" }, exerciseSaveButton: { minHeight: 34, borderRadius: 8, backgroundColor: "#42D392", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }, exerciseSaveButtonText: { color: "#07111F", fontSize: 9, fontWeight: "900" }, exerciseCancelButton: { minHeight: 34, borderRadius: 8, borderColor: "#52759C", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 9 }, exerciseCancelButtonText: { color: "#C7D4E5", fontSize: 9, fontWeight: "900" }, addExerciseEditor: { gap: 7, borderTopColor: "#2C3B55", borderTopWidth: 1, paddingTop: 7 }, addExerciseButton: { minHeight: 34, borderRadius: 8, borderColor: "#42D392", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }, addExerciseButtonText: { color: "#8BE8B8", fontSize: 9, fontWeight: "900", textAlign: "center" }, programDetailsEmpty: { color: "#AAB7C8", fontSize: 10, textAlign: "right", writingDirection: "rtl" }, programPickerCheck: { width: 28, height: 28, borderRadius: 9, borderColor: "#52759C", borderWidth: 1, alignItems: "center", justifyContent: "center" }, programPickerCheckText: { color: "#0B1224", fontSize: 17, fontWeight: "900" }, programPickerIcon: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" }, programPickerCopy: { flex: 1, alignItems: "flex-end", gap: 2 }, programPickerTitle: { color: "#F7F9FC", fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, programPickerMeta: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" }, assignmentCard: { backgroundColor: "#16233A", borderColor: "#3F76A7", borderWidth: 1, borderRadius: 14, padding: 11, gap: 7 }, assignmentHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }, assignmentDate: { color: "#7E8DA4", fontSize: 10 }, assignmentDay: { color: "#F7F9FC", fontSize: 15, fontWeight: "900", textAlign: "right" }, assignmentCurrent: { color: "#AAB7C8", fontSize: 11, textAlign: "right", writingDirection: "rtl" }, assignmentChoices: { flexDirection: "row-reverse", gap: 7, paddingVertical: 2 }, assignmentChoice: { minHeight: 34, borderColor: "#52759C", borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, alignItems: "center", justifyContent: "center" }, assignmentChoiceText: { color: "#C7D4E5", fontSize: 10, fontWeight: "800", textAlign: "center" }, myProgramsEmpty: { alignItems: "flex-end", gap: 10, paddingVertical: 18 }, myProgramsEmptyIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: "#F5B72C22", borderColor: "#F5B72C", borderWidth: 1, alignItems: "center", justifyContent: "center", alignSelf: "center" }, myProgramsEmptyIconText: { color: "#F5B72C", fontSize: 31, lineHeight: 34, fontWeight: "900" }, myProgramsEmptyTitle: { color: "#F5B72C", fontSize: 18, fontWeight: "900", textAlign: "right" }, myProgramsEmptyText: { color: "#C7D4E5", fontSize: 12, lineHeight: 19, textAlign: "right", writingDirection: "rtl" }, myProgramsSteps: { alignSelf: "stretch", backgroundColor: "#0B1224", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 13, padding: 11, gap: 8 }, myProgramsStep: { color: "#EAF1F8", fontSize: 11, lineHeight: 17, textAlign: "right", writingDirection: "rtl" }, myProgramsStepNumber: { color: "#F5B72C", fontWeight: "900" }, myProgramsChooseButton: { alignSelf: "stretch", minHeight: 46, borderRadius: 12, backgroundColor: "#F5B72C", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 2, shadowColor: "#F5B72C", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }, myProgramsChooseButtonText: { color: "#0B1224", fontSize: 13, fontWeight: "900", textAlign: "center" }, myProgramsChooseButtonArrow: { color: "#0B1224", fontSize: 22, lineHeight: 22, fontWeight: "900" }, myProgramsDone: { minHeight: 44, borderRadius: 11, backgroundColor: "#F5B72C", alignItems: "center", justifyContent: "center", marginTop: 8 }, myProgramsDoneText: { color: "#0B1224", fontSize: 12, fontWeight: "900" }, modalBackdrop: { flex: 1, backgroundColor: "rgba(3, 8, 20, 0.78)", justifyContent: "flex-end" }, keyboardAvoidingView: { flex: 1, justifyContent: "flex-end" },
  removalBannerOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 20, backgroundColor: "rgba(3, 8, 20, 0.74)", alignItems: "center", justifyContent: "center", padding: 20 }, removalBanner: { width: "100%", maxWidth: 390, backgroundColor: "#121F36", borderColor: "#C89B3C", borderWidth: 1, borderRadius: 16, padding: 20, gap: 9, shadowColor: "#000000", shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 }, removalBannerEyebrow: { color: "#D9B45B", fontSize: 10, fontWeight: "900", textAlign: "right", letterSpacing: 0.8 }, removalBannerTitle: { color: "#F7F9FC", fontSize: 21, fontWeight: "900", textAlign: "right", writingDirection: "rtl" }, removalBannerText: { color: "#C7D4E5", fontSize: 13, lineHeight: 21, textAlign: "right", writingDirection: "rtl" }, removalBannerActions: { flexDirection: "row-reverse", gap: 9, marginTop: 6 }, removalCancelButton: { flex: 1, minHeight: 42, borderRadius: 10, borderColor: "#52759C", borderWidth: 1, alignItems: "center", justifyContent: "center" }, removalCancelButtonText: { color: "#C7D4E5", fontSize: 12, fontWeight: "800" }, removalConfirmButton: { flex: 1, minHeight: 42, borderRadius: 10, backgroundColor: "#C89B3C", borderColor: "#F1D78C", borderWidth: 1, alignItems: "center", justifyContent: "center" }, removalConfirmButtonText: { color: "#101827", fontSize: 12, fontWeight: "900" }, webCardioPicker: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 999, maxHeight: "88%", overflow: "scroll", backgroundColor: "#101A30", borderColor: "#5278A8", borderWidth: 1, borderRadius: 18, padding: 15, gap: 10 }, cardioPickerModal: { maxHeight: "88%", backgroundColor: "#101B31", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: "#334155", padding: 18 }, cardioPickerContent: { paddingBottom: 20 }, cardioOption: { position: "relative", flexDirection: "row-reverse", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 16, backgroundColor: "#16233A", padding: 14, marginBottom: 10, minHeight: 82 }, cardioOptionIcon: { width: 52, height: 52, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" }, cardioOptionText: { flex: 1, alignItems: "flex-end" }, cardioOptionTitle: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "right" }, cardioOptionSubtitle: { color: "#AAB7C8", fontSize: 11, textAlign: "right", marginTop: 3 }, cardioOptionAction: { fontSize: 11, fontWeight: "900", marginTop: 7 }, cardioMoreCard: { backgroundColor: "#0B1224", borderRadius: 14, padding: 14, marginTop: 2 }, cardioMoreTitle: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" }, cardioMoreText: { color: "#AAB7C8", fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 5 },
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
  creatorContent: { padding: 20, gap: 14, paddingBottom: 34 },
  builderStageBlock: { gap: 7, backgroundColor: "#13243B", borderColor: "#2D4565", borderWidth: 1, borderRadius: 14, padding: 11 },
  builderStageHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  builderSavedStatus: { color: "#8FA4BB", fontSize: 10, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  builderSavedStatusActive: { color: "#42D392" },
  builderExistingProgramApproved: { minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#42D392", backgroundColor: "#173A36", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  builderExistingProgramApprovedText: { color: "#9AF2C7", fontSize: 11, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  builderConfirmButton: { minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#F5B72C", backgroundColor: "#1A2B45", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  builderConfirmButtonActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
  builderConfirmText: { color: "#F5B72C", fontSize: 12, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  builderOptionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  builderOptionCount: { color: "#F5B72C", fontSize: 10, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  builderSelectionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10 }, builderSelectionHint: { color: "#8FA4BB", fontSize: 10, textAlign: "right", marginTop: 3 }, builderSelectionBadge: { minWidth: 54, minHeight: 46, borderWidth: 1, borderRadius: 12, backgroundColor: "#0B1224", alignItems: "center", justifyContent: "center", paddingHorizontal: 7 }, builderSelectionBadgeValue: { fontSize: 18, fontWeight: "900" }, builderSelectionBadgeLabel: { color: "#AAB7C8", fontSize: 9, marginTop: 1 }, creatorCategoryRow: { flexDirection: "row-reverse", gap: 7, paddingVertical: 2 }, creatorCategory: { borderColor: "#48617E", borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8 }, creatorCategoryText: { color: "#C7D4E5", fontSize: 10, fontWeight: "800" }, creatorCategoryTextActive: { color: "#0B1224" },   creatorResultCount: { color: "#8ED8FF", fontSize: 10, textAlign: "right", writingDirection: "rtl" }, exerciseCategoryList: { gap: 9 }, exerciseCategorySection: { backgroundColor: "#16233A", borderWidth: 1, borderRadius: 15, overflow: "hidden" }, exerciseCategoryHeader: { minHeight: 68, flexDirection: "row-reverse", alignItems: "center", gap: 9, padding: 11 }, exerciseCategoryIcon: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" }, exerciseCategoryHeaderCopy: { flex: 1, alignItems: "flex-end" }, exerciseCategoryTitle: { color: "#F7F9FC", fontSize: 14, fontWeight: "900", textAlign: "right" }, exerciseCategorySubtitle: { color: "#AAB7C8", fontSize: 9, lineHeight: 14, textAlign: "right", marginTop: 2 }, exerciseCategoryCount: { minWidth: 42, alignItems: "center" }, exerciseCategoryCountValue: { fontSize: 16, fontWeight: "900" }, exerciseCategoryCountLabel: { color: "#7E8DA4", fontSize: 8, marginTop: 1 }, exerciseCategoryChevron: { color: "#F7F9FC", fontSize: 19, width: 18, textAlign: "center" }, exerciseCategoryExercises: { gap: 7, paddingHorizontal: 9, paddingBottom: 9, borderTopColor: "#2C3B55", borderTopWidth: 1 },
  modalHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  previewHeaderActions: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  editPreviewButton: { backgroundColor: "#253653", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  editPreviewText: { color: "#F5B72C", fontSize: 11, fontWeight: "900" },
  modalTitle: { color: "#F7F9FC", fontSize: 22, fontWeight: "900", textAlign: "right" },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#253653", alignItems: "center", justifyContent: "center" },
  closeText: { color: "#F7F9FC", fontSize: 25, lineHeight: 27 },
  fieldLabel: { color: "#F7F9FC", fontSize: 13, fontWeight: "800", textAlign: "right", marginTop: 4 },
  creatorInput: { backgroundColor: "#16233A", color: "#F7F9FC", borderColor: "#334155", borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 13 },
  creatorInputReadonly: { opacity: 0.72, borderColor: "#42D392" },
  optionRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 12 },
  iconChoice: { width: 58, height: 54, borderRadius: 16, borderWidth: 1, borderColor: "#334155", backgroundColor: "#16233A", alignItems: "center", justifyContent: "center" },
  selectedIconChoice: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
  colorChoice: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "transparent" },
  selectedColorChoice: { borderColor: "#F7F9FC", transform: [{ scale: 1.12 }] },
  exercisePicker: { gap: 8 },
  exerciseChoice: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#16233A", borderWidth: 1, borderColor: "#2C3B55", borderRadius: 12, padding: 11 },
  exerciseChoiceDisabled: { opacity: 0.48, backgroundColor: "#111C30", borderColor: "#334155" },
  exerciseChoiceText: { flex: 1 },
  exerciseName: { color: "#F7F9FC", fontSize: 13, fontWeight: "800", textAlign: "right" },
  exerciseCategory: { color: "#AAB7C8", fontSize: 10, textAlign: "right", marginTop: 3 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: "#64748B", alignItems: "center", justifyContent: "center" },
  checkText: { color: "#0B1224", fontSize: 15, fontWeight: "900" },
  builderReviewModal: { height: "88%", backgroundColor: "#101B31", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: "#334155" },
  builderReviewScroll: { flex: 1 },
  builderReviewContent: { padding: 18, gap: 12, paddingBottom: 28 },
  builderPreviewHero: { flexDirection: "row-reverse", alignItems: "center", gap: 11, borderWidth: 1, borderRadius: 15, backgroundColor: "#16233A", padding: 13 },
  builderPreviewIcon: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  builderPreviewHeroCopy: { flex: 1, alignItems: "flex-end", gap: 3 },
  builderPreviewTitle: { color: "#F7F9FC", fontSize: 19, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  builderPreviewSubtitle: { color: "#AAB7C8", fontSize: 10, textAlign: "right", writingDirection: "rtl" },
  builderPreviewStats: { flexDirection: "row-reverse", gap: 7 },
  builderPreviewStat: { flex: 1, minHeight: 62, backgroundColor: "#0B1224", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 11, alignItems: "center", justifyContent: "center", gap: 2 },
  builderPreviewStatValue: { fontSize: 20, fontWeight: "900" },
  builderPreviewStatLabel: { color: "#AAB7C8", fontSize: 10, fontWeight: "800", textAlign: "center", writingDirection: "rtl" },
  builderPreviewSectionTitle: { color: "#F5D27A", fontSize: 14, fontWeight: "900", textAlign: "right", writingDirection: "rtl", marginTop: 2 },
  builderPreviewSummary: { backgroundColor: "#172B43", borderColor: "#3C6B91", borderWidth: 1, borderRadius: 11, padding: 11, gap: 4 },
  builderPreviewSummaryTitle: { color: "#BEE3FF", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  builderPreviewSummaryText: { color: "#D8E5F2", fontSize: 10, lineHeight: 16, textAlign: "right", writingDirection: "rtl" },
  builderPreviewWorkoutList: { gap: 9 },
  builderPreviewWorkout: { backgroundColor: "#0B1224", borderWidth: 1, borderRadius: 13, padding: 10, gap: 9 },
  builderPreviewWorkoutHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 9 },
  builderPreviewWorkoutNumber: { width: 31, height: 31, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  builderPreviewWorkoutNumberText: { color: "#0B1224", fontSize: 14, fontWeight: "900" },
  builderPreviewWorkoutCopy: { flex: 1, alignItems: "flex-end", gap: 2 },
  builderPreviewWorkoutTitle: { color: "#F7F9FC", fontSize: 14, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  builderPreviewWorkoutMeta: { color: "#AAB7C8", fontSize: 10, textAlign: "right", writingDirection: "rtl" },
  builderPreviewExerciseList: { gap: 6, borderTopColor: "#2C3B55", borderTopWidth: 1, paddingTop: 8 },
  builderPreviewExercise: { flexDirection: "row-reverse", alignItems: "center", gap: 8, backgroundColor: "#111D31", borderColor: "#263B59", borderWidth: 1, borderRadius: 9, padding: 8 },
  builderPreviewExerciseDragging: { borderColor: "#F5B72C", backgroundColor: "#1B2B3C" },
  builderPreviewExerciseOrder: { gap: 3 },
  builderPreviewOrderButton: { width: 24, height: 20, borderRadius: 5, backgroundColor: "#203B5A", alignItems: "center", justifyContent: "center" },
  builderPreviewOrderDisabled: { opacity: 0.28 },
  builderPreviewOrderText: { color: "#BEE3FF", fontSize: 13, fontWeight: "900", lineHeight: 16 },
  builderPreviewExerciseIndex: { width: 24, height: 24, borderRadius: 8, backgroundColor: "#203B5A", color: "#BEE3FF", fontSize: 10, fontWeight: "900", textAlign: "center", lineHeight: 24 },
  builderPreviewExerciseCopy: { flex: 1, alignItems: "flex-end", gap: 2 },
  builderPreviewExerciseName: { color: "#EAF1F8", fontSize: 11, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  builderPreviewExerciseMeta: { color: "#7E8DA4", fontSize: 9, lineHeight: 14, textAlign: "right", writingDirection: "rtl" },
  builderPreviewExerciseNote: { color: "#F2D48A", fontSize: 9, lineHeight: 14, textAlign: "right", writingDirection: "rtl" },
  builderPreviewExerciseNoteInput: { minHeight: 32, maxHeight: 66, borderColor: "#3A506E", borderWidth: 1, borderRadius: 7, color: "#F2D48A", fontSize: 9, lineHeight: 14, textAlign: "right", writingDirection: "rtl", paddingHorizontal: 7, paddingTop: 6, paddingBottom: 6 },
  builderPreviewNotice: { backgroundColor: "#2A2413", borderColor: "#F5B72C66", borderWidth: 1, borderRadius: 11, padding: 10 },
  builderPreviewNoticeText: { color: "#F2D48A", fontSize: 10, lineHeight: 16, textAlign: "right", writingDirection: "rtl" },
  builderPreviewActions: { flexDirection: "row-reverse", gap: 8, marginTop: 2 },
  builderPreviewBackButton: { flex: 1, minHeight: 45, borderRadius: 11, borderColor: "#52759C", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  builderPreviewBackText: { color: "#C7D4E5", fontSize: 11, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  builderPreviewConfirmButton: { flex: 1.35, minHeight: 45, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 9 },
  builderPreviewConfirmText: { color: "#0B1224", fontSize: 11, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  finalBuilderCta: { gap: 7, marginTop: 4 },
  finalBuilderCtaHint: { color: "#AAB9CC", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" },
  saveCreatorButton: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveCreatorText: { color: "#0B1224", fontSize: 14, fontWeight: "900" },
  saveCreatorTextDisabled: { color: "#9BA9BB" },
});
