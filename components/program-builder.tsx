import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { useState } from "react";

import { categoryForExercise, exerciseLibrary } from "@/lib/exercise-library";
import { useWorkoutStore, type PersonalProgram } from "@/lib/workout-store";
import { getTemplate, type WorkoutId, type WorkoutTemplate } from "@/lib/workout-data";
import { setDefaultWorkoutTemplateId } from "@/lib/workout-schedule";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import { ActionToast } from "@/components/action-toast";

type CreatorExercise = { id: string; name: string; englishName: string; aliases?: string[]; category: string; defaultTarget: string; note?: string; sourceTemplateId?: WorkoutId; sourceExerciseId?: string; sourceSetCount?: number };
type BuilderWorkoutDraft = { id: string; name: string; exerciseIds: string[]; sourceTemplateId?: WorkoutId };

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

function buildInitialBuilderState(initialProgram: PersonalProgram | undefined, appendWorkout: boolean, templates: WorkoutTemplate[]) {
  if (!initialProgram) {
    const firstWorkoutId = `draft-workout-${Date.now()}`;
    return {
      editingPersonalProgramId: null as string | null,
      builderReturnToSchedule: false,
      confirmedBuilderWorkoutIds: [] as string[],
      customName: "",
      customColor: "#F5B72C",
      customIcon: "dumbbell.fill" as IconSymbolName,
      customBuilderExercises: [] as CreatorExercise[],
      builderWorkouts: [{ id: firstWorkoutId, name: "", exerciseIds: [] }] as BuilderWorkoutDraft[],
      activeBuilderWorkoutId: firstWorkoutId,
      workoutName: "",
      selectedExerciseIds: [] as string[],
      isBuilderStarted: false,
    };
  }
  const program = initialProgram;
  const programTemplates = program.workoutTemplateIds.map((templateId) => templates.find((template) => template.id === templateId) ?? getTemplate(templateId)).filter((template): template is WorkoutTemplate => Boolean(template));
  const editorExercises: CreatorExercise[] = programTemplates.flatMap((template) => template.exercises.map((exercise) => ({ id: `existing-exercise-${template.id}-${exercise.id}`, name: exercise.name, englishName: exercise.englishName ?? "", note: exercise.note, category: categoryForExercise(`${exercise.name} ${exercise.englishName ?? ""}`) ?? "כללי", defaultTarget: exercise.sets[0]?.target ?? "8–12", sourceTemplateId: template.id, sourceExerciseId: exercise.id, sourceSetCount: exercise.sets.length })));
  const drafts: BuilderWorkoutDraft[] = programTemplates.map((template) => ({ id: `existing-workout-${template.id}`, name: template.name, exerciseIds: editorExercises.filter((exercise) => exercise.sourceTemplateId === template.id).map((exercise) => exercise.id), sourceTemplateId: template.id }));
  const firstWorkoutId = appendWorkout ? `draft-workout-${Date.now()}` : drafts[0]?.id ?? `draft-workout-${Date.now()}`;
  const nextDrafts = appendWorkout || !drafts.length ? [...drafts, { id: firstWorkoutId, name: "", exerciseIds: [] }] : drafts;
  const activeDraft = nextDrafts.find((draft) => draft.id === firstWorkoutId) ?? nextDrafts[0];
  return {
    editingPersonalProgramId: program.id as string | null,
    builderReturnToSchedule: appendWorkout,
    confirmedBuilderWorkoutIds: drafts.filter((draft) => Boolean(draft.name.trim())).map((draft) => draft.id),
    customName: program.name,
    customColor: program.accent,
    customIcon: (program.icon as IconSymbolName) || "dumbbell.fill",
    customBuilderExercises: editorExercises,
    builderWorkouts: nextDrafts,
    activeBuilderWorkoutId: activeDraft.id,
    workoutName: activeDraft.name,
    selectedExerciseIds: activeDraft.exerciseIds,
    isBuilderStarted: true,
  };
}

export type ProgramBuilderDoneResult = { shouldGoToSchedule: boolean; isEditingProgram: boolean; firstTemplateId: string | null };

export type ProgramBuilderProps = {
  initialProgram?: PersonalProgram;
  appendWorkout?: boolean;
  onDone: (result: ProgramBuilderDoneResult) => void;
  onCancel: () => void;
};

export function ProgramBuilder({ initialProgram, appendWorkout = false, onDone, onCancel }: ProgramBuilderProps) {
  const { templates, addCustomTemplate, addPersonalProgram, updatePersonalProgram, updateTemplate, selectedProgramIds, toggleSelectedProgram, personalPrograms } = useWorkoutStore();
  const [seed] = useState(() => buildInitialBuilderState(initialProgram, appendWorkout, templates));
  const [isBuilderStarted, setIsBuilderStarted] = useState(seed.isBuilderStarted);
  const [isCustomDefault, setIsCustomDefault] = useState(false);
  const [customName, setCustomName] = useState(seed.customName);
  const [customSearch, setCustomSearch] = useState("");
  const [customCategory, setCustomCategory] = useState("הכול");
  const [builderSourceFilter, setBuilderSourceFilter] = useState<"all" | "catalog" | "personal">("all");
  const [customIcon, setCustomIcon] = useState<IconSymbolName>(seed.customIcon);
  const [customColor, setCustomColor] = useState(seed.customColor);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>(seed.selectedExerciseIds);
  const [customBuilderExercises, setCustomBuilderExercises] = useState<CreatorExercise[]>(seed.customBuilderExercises);
  const [builderExerciseOverrides, setBuilderExerciseOverrides] = useState<Record<string, Partial<CreatorExercise>>>({});
  const [customExerciseDraftName, setCustomExerciseDraftName] = useState("");
  const [customExerciseDraftEnglishName, setCustomExerciseDraftEnglishName] = useState("");
  const [creatorToastMessage, setCreatorToastMessage] = useState<string | null>(null);
  const [editingCustomExerciseId, setEditingCustomExerciseId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState(seed.workoutName);
  const [editingPersonalProgramId, setEditingPersonalProgramId] = useState<string | null>(seed.editingPersonalProgramId);
  const [builderReturnToSchedule, setBuilderReturnToSchedule] = useState(seed.builderReturnToSchedule);
  const [isBuilderReviewOpen, setIsBuilderReviewOpen] = useState(false);
  const [isProgramNameConfirmed, setIsProgramNameConfirmed] = useState(false);
  const [confirmedBuilderWorkoutIds, setConfirmedBuilderWorkoutIds] = useState<string[]>(seed.confirmedBuilderWorkoutIds);
  const [builderExerciseDrag, setBuilderExerciseDrag] = useState<{ workoutId: string; exerciseId: string; lastY: number } | null>(null);
  const [pendingBuilderExercise, setPendingBuilderExercise] = useState<CreatorExercise | null>(null);
  const [hiddenPersonalExerciseKeys, setHiddenPersonalExerciseKeys] = useState<string[]>([]);
  const [builderWorkouts, setBuilderWorkouts] = useState<BuilderWorkoutDraft[]>(seed.builderWorkouts);
  const [activeBuilderWorkoutId, setActiveBuilderWorkoutId] = useState(seed.activeBuilderWorkoutId);
  const [expandedBuilderCategories, setExpandedBuilderCategories] = useState<string[]>([]);

  const allBuilderExercises: CreatorExercise[] = (() => {
    const templateExercises = templates.flatMap((template) => template.exercises.map((exercise) => ({ id: `template-${exercise.id}`, name: exercise.name, englishName: exercise.englishName ?? "", note: exercise.note, category: categoryForExercise(`${exercise.name} ${exercise.englishName ?? ""}`) ?? "כללי", defaultTarget: exercise.sets[0]?.target ?? "8–12" })));
    const savedPersonalExercises = templates.flatMap((template) => template.exercises.filter((exercise) => exercise.note === "תרגיל מותאם אישית" || exercise.id.startsWith("custom-")).map((exercise) => ({ id: `saved-${exercise.id}`, name: exercise.name, englishName: exercise.englishName ?? "", note: exercise.note, category: categoryForExercise(`${exercise.name} ${exercise.englishName ?? ""}`) ?? "כללי", defaultTarget: exercise.sets[0]?.target ?? "8–12" })));
    const merged = [...customBuilderExercises, ...savedPersonalExercises, ...exerciseLibrary, ...templateExercises].map((item) => builderExerciseOverrides[item.id] ? { ...item, ...builderExerciseOverrides[item.id] } : item);
    const seen = new Set<string>();
    return merged.filter((item) => { const key = "sourceExerciseId" in item && item.sourceExerciseId ? item.id : `${item.name.trim().toLowerCase()}|${item.englishName.trim().toLowerCase()}`; if (seen.has(key)) return false; seen.add(key); return Boolean(item.name.trim()); });
  })();
  const builderCategories = ["הכול", ...builderCategoryOrder.filter((category) => allBuilderExercises.some((item) => item.category === category)), ...Array.from(new Set(allBuilderExercises.map((item) => item.category))).filter((category) => !builderCategoryOrder.includes(category))];
  const builderMatchesSourceFilter = (exercise: CreatorExercise) => builderSourceFilter === "all" || (builderSourceFilter === "personal" ? isPersonalBuilderExercise(exercise) : !isPersonalBuilderExercise(exercise));
  const filteredCustomExercises = allBuilderExercises.filter(builderMatchesSourceFilter).filter((item) => customCategory === "הכול" || item.category === customCategory).filter((item) => `${item.name} ${item.englishName} ${(item.aliases ?? []).join(" ")}`.toLowerCase().includes(customSearch.toLowerCase()));
  const visibleBuilderCategories = builderCategories.filter((category) => category !== "הכול").map((category) => ({ category, exercises: filteredCustomExercises.filter((item) => item.category === category) })).filter(({ exercises }) => exercises.length > 0);
  const myExercises = (() => {
    const customFromTemplates = templates.flatMap((template) => template.exercises.filter((exercise) => exercise.note === "תרגיל מותאם אישית" || exercise.id.startsWith("custom-")).map((exercise) => ({ id: `saved-${exercise.id}`, name: exercise.name, englishName: exercise.englishName ?? "", category: categoryForExercise(`${exercise.name} ${exercise.englishName ?? ""}`) ?? "כללי", defaultTarget: exercise.sets[0]?.target ?? "8–12", note: exercise.note })));
    const merged = [...customBuilderExercises, ...customFromTemplates];
    const seen = new Set<string>();
    return merged.filter((exercise) => { const key = `${exercise.name.trim().toLowerCase()}|${exercise.englishName.trim().toLowerCase()}`; if (seen.has(key) || hiddenPersonalExerciseKeys.includes(key)) return false; seen.add(key); return true; });
  })();
  const selectedBuilderExerciseIdentities = new Set(selectedExerciseIds.map((id) => allBuilderExercises.find((exercise) => exercise.id === id)).filter((exercise): exercise is CreatorExercise => Boolean(exercise)).map(builderExerciseIdentity));
  const isBuilderExerciseSelected = (exercise: CreatorExercise) => selectedExerciseIds.includes(exercise.id);
  const isBuilderExerciseAlreadyChosen = (exercise: CreatorExercise) => isBuilderExerciseSelected(exercise) || selectedBuilderExerciseIdentities.has(builderExerciseIdentity(exercise));
  const availableMyExercises = myExercises.filter((exercise) => !isBuilderExerciseAlreadyChosen(exercise));
  const builderSourceCounts = { all: allBuilderExercises.length, catalog: allBuilderExercises.filter((exercise) => !isPersonalBuilderExercise(exercise)).length, personal: allBuilderExercises.filter((exercise) => isPersonalBuilderExercise(exercise)).length };
  const builderDuplicateCount = selectedExerciseIds.length - new Set(selectedExerciseIds.map((id) => { const exercise = allBuilderExercises.find((item) => item.id === id); return exercise ? builderExerciseIdentity(exercise) : id; })).size;

  const activeBuilderWorkout = builderWorkouts.find((workout) => workout.id === activeBuilderWorkoutId) ?? builderWorkouts[0];
  const currentBuilderDrafts = () => builderWorkouts.map((workout) => workout.id === activeBuilderWorkoutId ? { ...workout, name: workoutName.trim(), exerciseIds: selectedExerciseIds } : workout);
  const confirmBuilderAction = (title: string, message: string, confirmText: string, onConfirm: () => void, destructive = false) => {
    if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.confirm === "function") { if (window.confirm(`${title}\n\n${message}`)) onConfirm(); return; }
    Alert.alert(title, message, [{ text: "ביטול", style: "cancel" }, { text: confirmText, style: destructive ? "destructive" : "default", onPress: onConfirm }]);
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
    }
    const shouldAutoSelectProgram = Boolean(savedProgramId) && (!isEditingProgram || builderReturnToSchedule);
    const selectionResult = shouldAutoSelectProgram && savedProgramId && !selectedProgramIds.includes(savedProgramId) ? toggleSelectedProgram(savedProgramId) : { selected: Boolean(savedProgramId), limitReached: false };
    const shouldGoToSchedule = shouldAutoSelectProgram && Boolean(savedProgramId) && !selectionResult.limitReached;
    if (shouldAutoSelectProgram && selectionResult.limitReached) Alert.alert("האימון נשמר", "התוכנית נשמרה, אך לא ניתן להוסיף אותה ללוח כי כבר נבחרו 5 תוכניות. הסר תוכנית קיימת כדי להוסיף אותה.");
    onDone({ shouldGoToSchedule, isEditingProgram, firstTemplateId: createdTemplates[0]?.id ?? null });
  };

  return (
    <>
      <View style={styles.modalBackdrop}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0} style={styles.keyboardAvoidingView}><View style={styles.creatorModal}><ScrollView style={styles.creatorScroll} nestedScrollEnabled keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={styles.creatorContent}>
        <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>{editingPersonalProgramId ? "עריכת תוכנית אישית" : "צור תוכנית אישית"}</Text><Text style={styles.previewSubtitle}>{editingPersonalProgramId ? "ערוך את התוכנית והאימונים הקיימים, או הוסף אימון חדש" : "שלושה שלבים פשוטים: תוכנית, אימון ותרגילים"}</Text></View><Pressable onPress={onCancel} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable></View>
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
    </>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: "rgba(3, 8, 20, 0.78)", justifyContent: "flex-end" },
  keyboardAvoidingView: { flex: 1, justifyContent: "flex-end" },
  creatorModal: { height: "92%", backgroundColor: "#101B31", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: "#334155" },
  creatorScroll: { flex: 1 },
  creatorContent: { padding: 20, gap: 14, paddingBottom: 34 },
  modalHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { color: "#F7F9FC", fontSize: 22, fontWeight: "900", textAlign: "right" },
  previewSubtitle: { color: "#AAB7C8", fontSize: 11, textAlign: "right", marginTop: 4 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#253653", alignItems: "center", justifyContent: "center" },
  closeText: { color: "#F7F9FC", fontSize: 25, lineHeight: 27 },
  creatorBanner: { backgroundColor: "#F5B72C", borderColor: "#FFE29A", borderWidth: 1, borderRadius: 14, padding: 12, gap: 3 },
  creatorBannerCentered: { alignItems: "center", justifyContent: "center", textAlign: "center", marginVertical: 6 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  creatorBannerTitle: { color: "#0B1224", fontSize: 18, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  creatorBannerText: { color: "#26334B", fontSize: 11, lineHeight: 16, textAlign: "right", writingDirection: "rtl" },
  builderFlowSteps: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 5, backgroundColor: "#0B1224", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 11, paddingVertical: 8, paddingHorizontal: 7 },
  builderFlowStep: { color: "#718096", fontSize: 9, fontWeight: "800", textAlign: "center", writingDirection: "rtl" },
  builderFlowStepActive: { color: "#F5D27A", fontWeight: "900" },
  builderFlowArrow: { color: "#52759C", fontSize: 15, fontWeight: "900" },
  builderStageBlock: { gap: 7, backgroundColor: "#13243B", borderColor: "#2D4565", borderWidth: 1, borderRadius: 14, padding: 11 },
  builderStageHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  fieldLabel: { color: "#F7F9FC", fontSize: 13, fontWeight: "800", textAlign: "right", marginTop: 4 },
  builderSavedStatus: { color: "#8FA4BB", fontSize: 10, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  builderSavedStatusActive: { color: "#42D392" },
  creatorInput: { backgroundColor: "#16233A", color: "#F7F9FC", borderColor: "#334155", borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 13 },
  creatorInputReadonly: { opacity: 0.72, borderColor: "#42D392" },
  builderExistingProgramApproved: { minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#42D392", backgroundColor: "#173A36", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  builderExistingProgramApprovedText: { color: "#9AF2C7", fontSize: 11, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  builderConfirmButton: { minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#F5B72C", backgroundColor: "#1A2B45", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  builderConfirmButtonActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
  disabledButton: { opacity: 0.45 },
  builderConfirmText: { color: "#F5B72C", fontSize: 12, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  builderWorkoutTabs: { gap: 7 },
  builderSectionHint: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" },
  builderWorkoutTabRow: { flexDirection: "row-reverse", gap: 7, alignItems: "center" },
  builderWorkoutTab: { minHeight: 36, borderColor: "#52759C", borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, alignItems: "center", justifyContent: "center" },
  builderWorkoutTabText: { color: "#C7D4E5", fontSize: 10, fontWeight: "900" },
  builderWorkoutTabTextActive: { color: "#0B1224" },
  addWorkoutTab: { minHeight: 36, borderColor: "#F5B72C", borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, alignItems: "center", justifyContent: "center" },
  addWorkoutTabText: { color: "#F5B72C", fontSize: 10, fontWeight: "900" },
  builderOptionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  builderSelectionHint: { color: "#8FA4BB", fontSize: 10, textAlign: "right", marginTop: 3 },
  builderOptionCount: { color: "#F5B72C", fontSize: 10, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  optionRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 12 },
  iconChoice: { width: 58, height: 54, borderRadius: 16, borderWidth: 1, borderColor: "#334155", backgroundColor: "#16233A", alignItems: "center", justifyContent: "center" },
  selectedIconChoice: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
  colorChoice: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "transparent" },
  selectedColorChoice: { borderColor: "#F7F9FC", transform: [{ scale: 1.12 }] },
  builderSelectionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10 },
  builderSelectionBadge: { minWidth: 54, minHeight: 46, borderWidth: 1, borderRadius: 12, backgroundColor: "#0B1224", alignItems: "center", justifyContent: "center", paddingHorizontal: 7 },
  builderSelectionBadgeValue: { fontSize: 18, fontWeight: "900" },
  builderSelectionBadgeLabel: { color: "#AAB7C8", fontSize: 9, marginTop: 1 },
  creatorCategoryRow: { flexDirection: "row-reverse", gap: 7, paddingVertical: 2 },
  creatorCategory: { borderColor: "#48617E", borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8 },
  creatorCategoryText: { color: "#C7D4E5", fontSize: 10, fontWeight: "800" },
  creatorCategoryTextActive: { color: "#0B1224" },
  exerciseSourceRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  exerciseSourceTitle: { flex: 1, alignItems: "flex-end", gap: 2 },
  exerciseSourceBadge: { borderColor: "#F5B72C", borderWidth: 1, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  exerciseSourceBadgeText: { color: "#F5D27A", fontSize: 10, fontWeight: "900" },
  builderSourceFilterRow: { flexDirection: "row-reverse", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 8 },
  builderSourceFilter: { minHeight: 34, borderColor: "#2C3B55", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  builderSourceFilterText: { color: "#AAB7C8", fontSize: 10, fontWeight: "800" },
  builderSourceFilterTextActive: { color: "#0B1224", fontWeight: "900" },
  customExerciseBox: { backgroundColor: "#14243D", borderColor: "#F5B72C88", borderWidth: 1, borderRadius: 13, padding: 10, gap: 7 },
  customExerciseTitle: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  addCustomExerciseButton: { minHeight: 40, backgroundColor: "#F5B72C", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addCustomExerciseButtonText: { color: "#0B1224", fontSize: 11, fontWeight: "900" },
  cancelEditButton: { alignItems: "center", paddingVertical: 4 },
  cancelEditText: { color: "#AAB7C8", fontSize: 10, fontWeight: "800" },
  creatorResultCount: { color: "#8ED8FF", fontSize: 10, textAlign: "right", writingDirection: "rtl" },
  exerciseCategoryList: { gap: 9 },
  exerciseCategorySection: { backgroundColor: "#16233A", borderWidth: 1, borderRadius: 15, overflow: "hidden" },
  exerciseCategoryHeader: { minHeight: 68, flexDirection: "row-reverse", alignItems: "center", gap: 9, padding: 11 },
  exerciseCategoryIcon: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  exerciseCategoryHeaderCopy: { flex: 1, alignItems: "flex-end" },
  exerciseCategoryTitle: { color: "#F7F9FC", fontSize: 14, fontWeight: "900", textAlign: "right" },
  exerciseCategorySubtitle: { color: "#AAB7C8", fontSize: 9, lineHeight: 14, textAlign: "right", marginTop: 2 },
  exerciseCategoryCount: { minWidth: 42, alignItems: "center" },
  exerciseCategoryCountValue: { fontSize: 16, fontWeight: "900" },
  exerciseCategoryCountLabel: { color: "#7E8DA4", fontSize: 8, marginTop: 1 },
  exerciseCategoryChevron: { color: "#F7F9FC", fontSize: 19, width: 18, textAlign: "center" },
  exerciseCategoryExercises: { gap: 7, paddingHorizontal: 9, paddingBottom: 9, borderTopColor: "#2C3B55", borderTopWidth: 1 },
  exerciseChoice: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#16233A", borderWidth: 1, borderColor: "#2C3B55", borderRadius: 12, padding: 11 },
  exerciseChoiceDisabled: { opacity: 0.48, backgroundColor: "#111C30", borderColor: "#334155" },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: "#64748B", alignItems: "center", justifyContent: "center" },
  checkText: { color: "#0B1224", fontSize: 15, fontWeight: "900" },
  exerciseChoiceText: { flex: 1 },
  exerciseName: { color: "#F7F9FC", fontSize: 13, fontWeight: "800", textAlign: "right" },
  exerciseCategory: { color: "#AAB7C8", fontSize: 10, textAlign: "right", marginTop: 3 },
  builderExerciseSourceTag: { alignSelf: "flex-end", fontSize: 9, fontWeight: "900", marginTop: 2 },
  builderExerciseSourceTagPersonal: { color: "#F5B72C" },
  builderExerciseSourceTagCatalog: { color: "#65BDF6" },
  builderReviewSection: { backgroundColor: "#0F1A2E", borderColor: "#52759C", borderWidth: 1, borderRadius: 13, padding: 10, gap: 8 },
  builderReviewHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  builderReviewTitle: { color: "#F7F9FC", fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  builderReviewHint: { color: "#AAB7C8", fontSize: 10, textAlign: "right", writingDirection: "rtl" },
  builderDuplicateStatus: { fontSize: 10, fontWeight: "900", marginTop: 4, textAlign: "right", writingDirection: "rtl" },
  builderDuplicateStatusWarning: { color: "#FB7185" },
  builderDuplicateStatusClear: { color: "#42D392" },
  builderReviewBadge: { width: 32, height: 32, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  builderReviewBadgeText: { fontSize: 14, fontWeight: "900" },
  builderReviewRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 8, backgroundColor: "#16233A" },
  builderReviewRemove: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#FB718522", alignItems: "center", justifyContent: "center" },
  builderReviewRemoveText: { color: "#FB7185", fontSize: 20, fontWeight: "900" },
  builderReviewEdit: { borderColor: "#6EA8E7", borderWidth: 1, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 7 },
  builderReviewEditText: { color: "#A9D4FF", fontSize: 9, fontWeight: "900" },
  builderReviewCopy: { flex: 1, alignItems: "flex-end", gap: 2 },
  builderReviewName: { color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  builderReviewMeta: { color: "#AAB7C8", fontSize: 9, textAlign: "right", writingDirection: "rtl" },
  builderReviewSourceTag: { alignSelf: "flex-end", fontSize: 9, fontWeight: "900", marginTop: 3 },
  builderReviewSourceTagPersonal: { color: "#F5B72C" },
  builderReviewSourceTagCatalog: { color: "#65BDF6" },
  builderReviewIcon: { width: 30, height: 30, borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  builderReviewEmpty: { color: "#AAB7C8", fontSize: 11, lineHeight: 17, textAlign: "right", writingDirection: "rtl" },
  myExercisesSection: { backgroundColor: "#14243D", borderColor: "#F5B72C88", borderWidth: 1, borderRadius: 13, padding: 10, gap: 8 },
  myExercisesHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  myExercisesTitle: { color: "#F5B72C", fontSize: 15, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  myExercisesHint: { color: "#AAB7C8", fontSize: 10, textAlign: "right", writingDirection: "rtl" },
  myExercisesIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#F5B72C22", borderColor: "#F5B72C88", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  myExerciseRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, borderColor: "#2C3B55", borderWidth: 1, borderRadius: 9, backgroundColor: "#0F1A2E", padding: 8 },
  myExerciseActions: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  myExerciseAdd: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#F5B72C", alignItems: "center", justifyContent: "center" },
  myExerciseAddText: { color: "#0B1224", fontSize: 19, lineHeight: 21, fontWeight: "900" },
  myExerciseRemove: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#FB718522", borderColor: "#FB718588", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  myExerciseRemoveText: { color: "#FB7185", fontSize: 19, lineHeight: 21, fontWeight: "900" },
  myExerciseCopy: { flex: 1, alignItems: "flex-end", gap: 2 },
  myExerciseName: { color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  myExerciseMeta: { color: "#AAB7C8", fontSize: 9, textAlign: "right", writingDirection: "rtl" },
  defaultProgramRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, borderColor: "#2C3B55", borderWidth: 1, borderRadius: 12, backgroundColor: "#0F1A2E", padding: 11 },
  defaultProgramRowActive: { borderColor: "#F5B72C", backgroundColor: "#2A2413" },
  defaultProgramCheck: { width: 28, height: 28, borderRadius: 9, borderColor: "#52759C", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  defaultProgramCheckActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
  defaultProgramCheckText: { color: "#0B1224", fontSize: 18, fontWeight: "900" },
  defaultProgramCopy: { flex: 1, alignItems: "flex-end", gap: 2 },
  defaultProgramTitle: { color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  defaultProgramDescription: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" },
  finalBuilderCta: { gap: 7, marginTop: 4 },
  finalBuilderCtaHint: { color: "#AAB9CC", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" },
  saveCreatorButton: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveCreatorText: { color: "#0B1224", fontSize: 14, fontWeight: "900" },
  saveCreatorTextDisabled: { color: "#9BA9BB" },
  builderExerciseConfirmBanner: { position: "absolute", left: 14, right: 14, bottom: 16, zIndex: 30, elevation: 10, flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#1D2A40", borderColor: "#F5B72C99", borderWidth: 1, borderRadius: 13, padding: 11, shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  builderExerciseConfirmCopy: { flex: 1, alignItems: "flex-end", gap: 3 },
  builderExerciseConfirmTitle: { color: "#F5D27A", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  builderExerciseConfirmText: { color: "#D8E5F2", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" },
  builderExerciseConfirmActions: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  builderExerciseCancelButton: { minHeight: 34, borderRadius: 9, borderColor: "#52759C", borderWidth: 1, paddingHorizontal: 9, alignItems: "center", justifyContent: "center" },
  builderExerciseCancelText: { color: "#B7C9DD", fontSize: 10, fontWeight: "800" },
  builderExerciseConfirmButton: { minHeight: 34, borderRadius: 9, backgroundColor: "#F5B72C", borderColor: "#FFE29A", borderWidth: 1, paddingHorizontal: 9, alignItems: "center", justifyContent: "center" },
  builderExerciseConfirmButtonText: { color: "#0B1224", fontSize: 10, fontWeight: "900" },
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
  builderPreviewSummary: { backgroundColor: "#172B43", borderColor: "#3C6B91", borderWidth: 1, borderRadius: 11, padding: 11, gap: 4 },
  builderPreviewSummaryTitle: { color: "#BEE3FF", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  builderPreviewSummaryText: { color: "#D8E5F2", fontSize: 10, lineHeight: 16, textAlign: "right", writingDirection: "rtl" },
  builderPreviewSectionTitle: { color: "#F5D27A", fontSize: 14, fontWeight: "900", textAlign: "right", writingDirection: "rtl", marginTop: 2 },
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
  builderPreviewExerciseNoteInput: { minHeight: 32, maxHeight: 66, borderColor: "#3A506E", borderWidth: 1, borderRadius: 7, color: "#F2D48A", fontSize: 9, lineHeight: 14, textAlign: "right", writingDirection: "rtl", paddingHorizontal: 7, paddingTop: 6, paddingBottom: 6 },
  builderPreviewNotice: { backgroundColor: "#2A2413", borderColor: "#F5B72C66", borderWidth: 1, borderRadius: 11, padding: 10 },
  builderPreviewNoticeText: { color: "#F2D48A", fontSize: 10, lineHeight: 16, textAlign: "right", writingDirection: "rtl" },
  builderPreviewActions: { flexDirection: "row-reverse", gap: 8, marginTop: 2 },
  builderPreviewBackButton: { flex: 1, minHeight: 45, borderRadius: 11, borderColor: "#52759C", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  builderPreviewBackText: { color: "#C7D4E5", fontSize: 11, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  builderPreviewConfirmButton: { flex: 1.35, minHeight: 45, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 9 },
  builderPreviewConfirmText: { color: "#0B1224", fontSize: 11, fontWeight: "900", textAlign: "center", writingDirection: "rtl" }
});
