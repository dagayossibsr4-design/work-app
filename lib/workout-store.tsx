import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getTemplate, replaceExerciseInTemplate, workoutTemplates, type ExerciseTemplate, type WorkoutId, type WorkoutTemplate } from "./workout-data";
import type { ExerciseLibraryItem } from "./exercise-library";
import type { FoodItem } from "./food-nutrition";
import { supabase } from "./supabase";

function hydrateWorkoutTemplates(saved: WorkoutTemplate[]): WorkoutTemplate[] {
  return saved.map((template) => {
    const fallback = workoutTemplates.find((candidate) => candidate.id === template.id);
    const savedExercises = Array.isArray(template.exercises) ? template.exercises : [];
    const normalizeExercise = (exercise: ExerciseTemplate, fallbackExercise?: ExerciseTemplate): ExerciseTemplate => ({
      ...exercise,
      name: typeof exercise.name === "string" && exercise.name.trim() ? exercise.name : fallbackExercise?.name ?? exercise.id ?? "תרגיל ללא שם",
      englishName: exercise.englishName || fallbackExercise?.englishName,
      sets: Array.isArray(exercise.sets) && exercise.sets.length > 0 ? exercise.sets : fallbackExercise?.sets ?? [{ target: "8–12" }],
    });
    const hasCanonicalSet = Boolean(fallback && fallback.exercises.every((candidate) => savedExercises.some((exercise) => exercise.id === candidate.id)));
    const customExercises = savedExercises
      .filter((exercise) => exercise.id.startsWith("custom-exercise-") || exercise.id.startsWith("custom-active-exercise-") || exercise.id.includes("-custom-"))
      .map((exercise) => normalizeExercise(exercise));
    const exercises = fallback
      ? [
          ...fallback.exercises.map((fallbackExercise) => normalizeExercise(
            savedExercises.find((exercise) => exercise.id === fallbackExercise.id) ?? fallbackExercise,
            fallbackExercise,
          )),
          ...(hasCanonicalSet
            ? savedExercises
                .filter((exercise) => !fallback.exercises.some((candidate) => candidate.id === exercise.id))
                .map((exercise) => normalizeExercise(exercise))
            : customExercises),
        ]
      : savedExercises.map((exercise) => normalizeExercise(exercise));
    return { ...template, exercises: exercises.length > 0 ? exercises : fallback?.exercises ?? [] };
  });
}

export type SetLog = {
  id: string;
  exerciseId: string;
  setNumber: number;
  weight: string;
  reps: string;
  completed: boolean;
  target?: string;
  note?: string;
};

export type CardioLog = { id: string; date: string; type: string; durationMinutes: string; distanceKm: string; caloriesBurned?: string; intensity: string; note: string };
export type NutritionGoal = "מסה" | "חיטוב" | "ניטרלי";
export type NutritionProfile = { goal: NutritionGoal; weightKg: string; heightCm: string; age: string; sex: "זכר" | "נקבה"; activity: "נמוכה" | "בינונית" | "גבוהה"; proteinPerKg: string; fatPerKg: string; calorieTarget?: string; proteinTarget?: string; carbohydratesTarget?: string; fatsTarget?: string; autoMacroField?: "protein" | "carbohydrates" | "fats"; customFoods?: FoodItem[] };

export type RecoveryLog = {
  id: string;
  date: string;
  sleepHours: string;
  sleepQuality: number;
  fatigue: number;
  soreness: number;
  restingHeartRate: string;
  note: string;
};

export type WorkoutSession = {
  id: string;
  templateId: WorkoutId;
  startedAt: string;
  finishedAt?: string;
  sets: SetLog[];
};

export type AccountState = { sessions: WorkoutSession[]; templates: WorkoutTemplate[]; recoveryLogs: RecoveryLog[]; cardioLogs: CardioLog[]; nutritionProfile: NutritionProfile };

type WorkoutContextValue = {
  sessions: WorkoutSession[];
  recoveryLogs: RecoveryLog[];
  cardioLogs: CardioLog[];
  nutritionProfile: NutritionProfile;
  templates: WorkoutTemplate[];
  activeSession: WorkoutSession | null;
  activeTemplate: WorkoutTemplate | null;
  hydrated: boolean;
  startWorkout: (templateId: WorkoutId, copyPrevious?: boolean) => void;
  startWorkoutFromTemplate: (template: WorkoutTemplate) => void;
  updateSet: (setId: string, patch: Partial<SetLog>) => void;
  updateActiveSession: (patch: Partial<WorkoutSession>) => void;
  finishWorkout: () => void;
  updateSession: (sessionId: string, patch: Partial<WorkoutSession>) => void;
  deleteSession: (sessionId: string) => void;
  discardActiveWorkout: () => void;
  recentSessionFor: (templateId: WorkoutId) => WorkoutSession | undefined;
  saveRecoveryLog: (log: Omit<RecoveryLog, "id">) => void;
  recentRecovery: () => RecoveryLog | undefined;
  updateTemplate: (templateId: WorkoutId, patch: Partial<WorkoutTemplate>) => void;
  addCustomTemplate: (template: WorkoutTemplate) => void;
  addExercise: (templateId: WorkoutId) => void;
  addCustomExercise: (templateId: WorkoutId, name: string, englishName?: string) => void;
  addExerciseFromLibrary: (templateId: WorkoutId, item: ExerciseLibraryItem) => void;
  replaceExerciseFromLibrary: (templateId: WorkoutId, exerciseId: string, item: ExerciseLibraryItem) => void;
  replaceActiveExerciseFromLibrary: (exerciseId: string, item: ExerciseLibraryItem) => void;
  addExerciseToActiveWorkout: (item: ExerciseLibraryItem) => void;
  addCustomExerciseToActiveWorkout: (name: string, englishName?: string) => void;
  duplicateActiveExercise: (exerciseId: string) => void;
  addSetToActiveExercise: (exerciseId: string) => void;
  duplicateActiveSet: (setId: string) => void;
  removeSetFromActiveExercise: (setId: string) => void;
  removeExerciseFromActiveWorkout: (exerciseId: string) => void;
  saveCardioLog: (log: Omit<CardioLog, "id">) => void;
  updateNutritionProfile: (profile: NutritionProfile) => void;
  updateExercise: (templateId: WorkoutId, exerciseId: string, patch: Partial<ExerciseTemplate>) => void;
  deleteExercise: (templateId: WorkoutId, exerciseId: string) => void;
  moveExercise: (templateId: WorkoutId, exerciseId: string, direction: -1 | 1) => void;
  getAccountState: () => AccountState;
  applyAccountState: (state: Partial<AccountState>) => void;
};

const SESSION_KEY = "workout-tracker-sessions-v1";
const TEMPLATE_KEY = "workout-tracker-templates-v1";
const RECOVERY_KEY = "workout-tracker-recovery-v1";
const CARDIO_KEY = "workout-tracker-cardio-v1";
const NUTRITION_KEY = "workout-tracker-nutrition-v1";
const cloneTemplates = () => JSON.parse(JSON.stringify(workoutTemplates)) as WorkoutTemplate[];

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

function createSession(template: WorkoutTemplate): WorkoutSession {
  return {
    id: `${template.id}-${Date.now()}`,
    templateId: template.id,
    startedAt: new Date().toISOString(),
    sets: template.exercises.flatMap((exercise) => exercise.sets.map((_, index) => ({
      id: `${template.id}-${exercise.id}-${index}-${Date.now()}`,
      exerciseId: exercise.id,
      setNumber: index + 1,
      weight: exercise.sets[index]?.suggestedWeight ?? "",
      reps: "",
      completed: false,
      target: exercise.sets[index]?.target,
    }))),
  };
}

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [recoveryLogs, setRecoveryLogs] = useState<RecoveryLog[]>([]);
  const [cardioLogs, setCardioLogs] = useState<CardioLog[]>([]);
  const [nutritionProfile, setNutritionProfile] = useState<NutritionProfile>({ goal: "ניטרלי", weightKg: "", heightCm: "", age: "", sex: "זכר", activity: "בינונית", proteinPerKg: "1.8", fatPerKg: "0.8", calorieTarget: "2500", proteinTarget: "240", carbohydratesTarget: "150", fatsTarget: "", autoMacroField: "fats", customFoods: [] });
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(cloneTemplates);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [sessionValue, templateValue, recoveryValue, cardioValue, nutritionValue] = await Promise.all([
          AsyncStorage.getItem(SESSION_KEY),
          AsyncStorage.getItem(TEMPLATE_KEY),
          AsyncStorage.getItem(RECOVERY_KEY),
          AsyncStorage.getItem(CARDIO_KEY),
          AsyncStorage.getItem(NUTRITION_KEY),
        ]);

        if (sessionValue) {
          const savedSessions = (JSON.parse(sessionValue) as WorkoutSession[])
            .filter((session) => !session.id.startsWith("demo-legs-") && !session.id.startsWith("imported-"))
            .map((session) => ({
              ...session,
              sets: session.sets.map((set) => set.exerciseId === "לחיצת רגליים" ? { ...set, exerciseId: "לג פרס" } : set),
            }));
          setSessions(savedSessions);
        } else {
          setSessions([]);
        }

        if (templateValue) setTemplates(hydrateWorkoutTemplates(JSON.parse(templateValue) as WorkoutTemplate[]));
        if (recoveryValue) setRecoveryLogs(JSON.parse(recoveryValue));
        if (cardioValue) setCardioLogs(JSON.parse(cardioValue));
        if (nutritionValue) {
          const savedNutrition = JSON.parse(nutritionValue) as NutritionProfile;
          setNutritionProfile((current) => ({ ...current, ...savedNutrition, customFoods: savedNutrition.customFoods ?? [] }));
        }

        // סנכרון נתונים מענן Supabase אם קיים משתמש
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("account_state")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile?.account_state) {
            const remoteState = profile.account_state as Partial<AccountState>;
            if (Array.isArray(remoteState.sessions)) {
              setSessions(remoteState.sessions.filter((s) => !s.id.startsWith("demo-legs-") && !s.id.startsWith("imported-")));
            }
            if (Array.isArray(remoteState.templates)) setTemplates(hydrateWorkoutTemplates(remoteState.templates));
            if (Array.isArray(remoteState.recoveryLogs)) setRecoveryLogs(remoteState.recoveryLogs);
            if (Array.isArray(remoteState.cardioLogs)) setCardioLogs(remoteState.cardioLogs);
            if (remoteState.nutritionProfile) setNutritionProfile((current) => ({ ...current, ...remoteState.nutritionProfile }));
          }
        }
      } catch (e) {
        console.error("Failed to load workout store data", e);
      } finally {
        setHydrated(true);
      }
    }

    loadData();
  }, []);

  // שמירה מקומית
  useEffect(() => { if (hydrated) AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessions)); }, [sessions, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates)); }, [templates, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(RECOVERY_KEY, JSON.stringify(recoveryLogs)); }, [recoveryLogs, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(CARDIO_KEY, JSON.stringify(cardioLogs)); }, [cardioLogs, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(NUTRITION_KEY, JSON.stringify(nutritionProfile)); }, [nutritionProfile, hydrated]);

  // סנכרון אוטומטי לענן של Supabase
  useEffect(() => {
    if (!hydrated) return;
    const syncTimeout = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const accountState: AccountState = {
            sessions,
            templates,
            recoveryLogs,
            cardioLogs,
            nutritionProfile,
          };
          await supabase.from("user_profiles").upsert({
            id: session.user.id,
            email: session.user.email,
            account_state: accountState,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Cloud sync error:", err);
      }
    }, 1500);

    return () => clearTimeout(syncTimeout);
  }, [sessions, templates, recoveryLogs, cardioLogs, nutritionProfile, hydrated]);

  const startWorkout = (templateId: WorkoutId, copyPrevious = false) => {
    const template = templates.find((item) => item.id === templateId) ?? getTemplate(templateId);
    const fresh = createSession(template);
    if (!copyPrevious) {
      setActiveSession(fresh);
      return;
    }
    const previous = sessions.find((session) => session.templateId === templateId);
    const copied = fresh.sets.map((set) => {
      const source = previous?.sets.find((candidate) => candidate.exerciseId === set.exerciseId && candidate.setNumber === set.setNumber);
      return source ? { ...set, weight: source.weight, reps: source.reps } : set;
    });
    setActiveSession({ ...fresh, sets: copied });
  };
  const startWorkoutFromTemplate = (template: WorkoutTemplate) => setActiveSession(createSession(template));
  const updateSet = (setId: string, patch: Partial<SetLog>) => setActiveSession((current) => current ? ({ ...current, sets: current.sets.map((set) => set.id === setId ? { ...set, ...patch } : set) }) : current);
  const updateActiveSession = (patch: Partial<WorkoutSession>) => setActiveSession((current) => current ? { ...current, ...patch } : current);
  const finishWorkout = () => { if (!activeSession) return; setSessions((current) => [{ ...activeSession, finishedAt: new Date().toISOString() }, ...current]); setActiveSession(null); };
  const updateSession = (sessionId: string, patch: Partial<WorkoutSession>) => setSessions((current) => current.map((session) => session.id === sessionId ? { ...session, ...patch } : session));
  const deleteSession = (sessionId: string) => setSessions((current) => current.filter((session) => session.id !== sessionId));
  const recentSessionFor = (templateId: WorkoutId) => sessions.find((session) => session.templateId === templateId);
  const saveRecoveryLog = (log: Omit<RecoveryLog, "id">) => setRecoveryLogs((current) => [{ ...log, id: `recovery-${Date.now()}` }, ...current.filter((item) => item.date !== log.date)]);
  const recentRecovery = () => recoveryLogs[0];
  const updateTemplate = (templateId: WorkoutId, patch: Partial<WorkoutTemplate>) => setTemplates((current) => current.map((template) => template.id === templateId ? { ...template, ...patch } : template));
  const addCustomTemplate = (template: WorkoutTemplate) => setTemplates((current) => [...current, template]);
  const addExercise = (templateId: WorkoutId) => setTemplates((current) => current.map((template) => template.id === templateId ? { ...template, exercises: [...template.exercises, { id: `exercise-${Date.now()}`, name: "תרגיל חדש", englishName: "New Exercise", sets: [{ target: "8–12" }, { target: "10–15" }] }] } : template));
  const addCustomExercise = (templateId: WorkoutId, name: string, englishName = "") => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setTemplates((current) => current.map((template) => template.id === templateId ? { ...template, exercises: [...template.exercises, { id: `custom-exercise-${Date.now()}`, name: trimmedName, englishName: englishName.trim() || undefined, note: "תרגיל מותאם אישית", sets: [{ target: "8–12" }, { target: "10–15" }] }] } : template));
  };
  const addExerciseFromLibrary = (templateId: WorkoutId, item: ExerciseLibraryItem) => setTemplates((current) => current.map((template) => template.id === templateId ? { ...template, exercises: [...template.exercises, { id: `${item.id}-${Date.now()}`, name: item.name, englishName: item.englishName, note: item.note, sets: [{ target: item.defaultTarget }, { target: item.defaultTarget }] }] } : template));
  const replaceExerciseFromLibrary = (templateId: WorkoutId, exerciseId: string, item: ExerciseLibraryItem) => setTemplates((current) => current.map((template) => template.id !== templateId ? template : replaceExerciseInTemplate(template, exerciseId, { name: item.name, englishName: item.englishName, note: item.note })));
  const replaceActiveExerciseFromLibrary = (exerciseId: string, item: ExerciseLibraryItem) => {
    if (!activeSession) return;
    replaceExerciseFromLibrary(activeSession.templateId, exerciseId, item);
  };
  const addExerciseToActiveWorkout = (item: ExerciseLibraryItem) => {
    if (!activeSession) return;
    const exerciseId = `${item.id}-active-${Date.now()}`;
    setTemplates((current) => current.map((template) => template.id !== activeSession.templateId ? template : { ...template, exercises: [...template.exercises, { id: exerciseId, name: item.name, englishName: item.englishName, note: item.note, sets: [{ target: item.defaultTarget }, { target: item.defaultTarget }] }] }));
    setActiveSession((current) => current ? { ...current, sets: [...current.sets, ...[1, 2].map((setNumber) => ({ id: `${current.id}-${exerciseId}-${setNumber}`, exerciseId, setNumber, weight: "", reps: "", completed: false }))] } : current);
  };
  const addCustomExerciseToActiveWorkout = (name: string, englishName = "") => {
    const trimmedName = name.trim();
    if (!activeSession || !trimmedName) return;
    const exerciseId = `custom-active-exercise-${Date.now()}`;
    const nextExercise = { id: exerciseId, name: trimmedName, englishName: englishName.trim() || undefined, note: "תרגיל מותאם אישית", sets: [{ target: "8–12" }, { target: "10–15" }] };
    setTemplates((current) => current.map((template) => template.id === activeSession.templateId ? { ...template, exercises: [...template.exercises, nextExercise] } : template));
    setActiveSession((current) => current ? { ...current, sets: [...current.sets, ...nextExercise.sets.map((set, index) => ({ id: `${current.id}-${exerciseId}-${index + 1}`, exerciseId, setNumber: index + 1, weight: "", reps: "", completed: false, target: set.target }))] } : current);
  };
  const removeSetFromActiveExercise = (setId: string) => {
    if (!activeSession) return;
    const setToRemove = activeSession.sets.find((set) => set.id === setId);
    if (!setToRemove) return;
    const exerciseSets = activeSession.sets.filter((set) => set.exerciseId === setToRemove.exerciseId);
    setTemplates((current) => current.map((item) => item.id !== activeSession.templateId ? item : { ...item, exercises: item.exercises.map((candidate) => candidate.id !== setToRemove.exerciseId ? candidate : { ...candidate, sets: candidate.sets.filter((_, index) => index !== setToRemove.setNumber - 1) }) }));
    setActiveSession((current) => current ? { ...current, sets: current.sets.filter((set) => set.id !== setId).map((set) => set.exerciseId === setToRemove.exerciseId && set.setNumber > setToRemove.setNumber ? { ...set, setNumber: set.setNumber - 1 } : set) } : current);
  };
  const removeExerciseFromActiveWorkout = (exerciseId: string) => {
    if (!activeSession) return;
    setTemplates((current) => current.map((item) => item.id !== activeSession.templateId ? item : { ...item, exercises: item.exercises.filter((exercise) => exercise.id !== exerciseId) }));
    setActiveSession((current) => current ? { ...current, sets: current.sets.filter((set) => set.exerciseId !== exerciseId) } : current);
  };
  const duplicateActiveExercise = (exerciseId: string) => {
    if (!activeSession) return;
    const template = templates.find((item) => item.id === activeSession.templateId);
    const source = template?.exercises.find((exercise) => exercise.id === exerciseId);
    if (!source) return;
    const newExerciseId = `${exerciseId}-copy-${Date.now()}`;
    const sourceSets = activeSession.sets.filter((set) => set.exerciseId === exerciseId);
    const clonedTemplate = { ...source, id: newExerciseId, name: `${source.name} (עותק)`, sets: source.sets.map((set) => ({ ...set })) };
    setTemplates((current) => current.map((item) => item.id !== activeSession.templateId ? item : { ...item, exercises: [...item.exercises, clonedTemplate] }));
    setActiveSession((current) => current ? { ...current, sets: [...current.sets, ...sourceSets.map((set) => ({ ...set, id: `${current.id}-${newExerciseId}-${set.setNumber}`, exerciseId: newExerciseId, completed: false }))] } : current);
  };
  const addSetToActiveExercise = (exerciseId: string) => {
    if (!activeSession) return;
    const exerciseSets = activeSession.sets.filter((set) => set.exerciseId === exerciseId);
    const setNumber = exerciseSets.length ? Math.max(...exerciseSets.map((set) => set.setNumber)) + 1 : 1;
    const template = templates.find((item) => item.id === activeSession.templateId);
    const exercise = template?.exercises.find((item) => item.id === exerciseId);
    const target = exercise?.sets[exercise.sets.length - 1]?.target ?? "8–12";
    setTemplates((current) => current.map((item) => item.id !== activeSession.templateId ? item : { ...item, exercises: item.exercises.map((candidate) => candidate.id === exerciseId ? { ...candidate, sets: [...candidate.sets, { target }] } : candidate) }));
    setActiveSession((current) => current ? { ...current, sets: [...current.sets, { id: `${current.id}-${exerciseId}-${setNumber}-${Date.now()}`, exerciseId, setNumber, weight: "", reps: "", completed: false, target }] } : current);
  };
  const duplicateActiveSet = (setId: string) => {
    if (!activeSession) return;
    const source = activeSession.sets.find((set) => set.id === setId);
    if (!source) return;
    const exerciseSets = activeSession.sets.filter((set) => set.exerciseId === source.exerciseId);
    const nextNumber = exerciseSets.length ? Math.max(...exerciseSets.map((set) => set.setNumber)) + 1 : 1;
    const template = templates.find((item) => item.id === activeSession.templateId);
    const exercise = template?.exercises.find((item) => item.id === source.exerciseId);
    const target = exercise?.sets[exercise.sets.length - 1]?.target ?? "8–12";
    setTemplates((current) => current.map((item) => item.id !== activeSession.templateId ? item : { ...item, exercises: item.exercises.map((candidate) => candidate.id !== source.exerciseId ? candidate : { ...candidate, sets: [...candidate.sets, { target }] }) }));
    setActiveSession((current) => current ? { ...current, sets: [...current.sets, { ...source, id: `${current.id}-${source.exerciseId}-${nextNumber}-${Date.now()}`, setNumber: nextNumber, completed: false }] } : current);
  };
  const saveCardioLog = (log: Omit<CardioLog, "id">) => setCardioLogs((current) => [{ ...log, id: `cardio-${Date.now()}` }, ...current]);
  const updateNutritionProfile = (profile: NutritionProfile) => setNutritionProfile(profile);
  const updateExercise = (templateId: WorkoutId, exerciseId: string, patch: Partial<ExerciseTemplate>) => setTemplates((current) => current.map((template) => template.id === templateId ? { ...template, exercises: template.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, ...patch } : exercise) } : template));
  const deleteExercise = (templateId: WorkoutId, exerciseId: string) => setTemplates((current) => current.map((template) => template.id === templateId ? { ...template, exercises: template.exercises.filter((exercise) => exercise.id !== exerciseId) } : template));
  const getAccountState = useCallback((): AccountState => ({ sessions, templates, recoveryLogs, cardioLogs, nutritionProfile }), [sessions, templates, recoveryLogs, cardioLogs, nutritionProfile]);
  const applyAccountState = useCallback((state: Partial<AccountState>) => {
    if (Array.isArray(state.sessions)) {
      setSessions(state.sessions.filter((session) => !session.id.startsWith("demo-legs-") && !session.id.startsWith("imported-")));
    }
    if (Array.isArray(state.templates)) setTemplates(hydrateWorkoutTemplates(state.templates));
    if (Array.isArray(state.recoveryLogs)) setRecoveryLogs(state.recoveryLogs);
    if (Array.isArray(state.cardioLogs)) setCardioLogs(state.cardioLogs);
    if (state.nutritionProfile) setNutritionProfile((current) => ({ ...current, ...state.nutritionProfile }));
  }, []);
  const moveExercise = (templateId: WorkoutId, exerciseId: string, direction: -1 | 1) => setTemplates((current) => current.map((template) => {
    if (template.id !== templateId) return template;
    const index = template.exercises.findIndex((exercise) => exercise.id === exerciseId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= template.exercises.length) return template;
    const exercises = [...template.exercises];
    [exercises[index], exercises[targetIndex]] = [exercises[targetIndex], exercises[index]];
    return { ...template, exercises };
  }));

  const value = useMemo(() => ({
    sessions, recoveryLogs, cardioLogs, nutritionProfile, templates, activeSession, activeTemplate: activeSession ? templates.find((template) => template.id === activeSession.templateId) ?? null : null, hydrated,
    startWorkout, startWorkoutFromTemplate, updateSet, updateActiveSession, finishWorkout, updateSession, deleteSession, discardActiveWorkout: () => setActiveSession(null), recentSessionFor, saveRecoveryLog, recentRecovery, saveCardioLog, updateNutritionProfile,
    updateTemplate, addCustomTemplate, addExercise, addCustomExercise, addExerciseFromLibrary, replaceExerciseFromLibrary, replaceActiveExerciseFromLibrary, addExerciseToActiveWorkout, addCustomExerciseToActiveWorkout, duplicateActiveExercise, addSetToActiveExercise, duplicateActiveSet, removeSetFromActiveExercise, removeExerciseFromActiveWorkout, updateExercise, deleteExercise, moveExercise, getAccountState, applyAccountState,
  }), [sessions, recoveryLogs, cardioLogs, nutritionProfile, templates, activeSession, hydrated]);
  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkoutStore() { const value = useContext(WorkoutContext); if (!value) throw new Error("useWorkoutStore must be used inside WorkoutProvider"); return value; }
export function calculateVolume(session: WorkoutSession) { return session.sets.reduce((sum, set) => sum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0); }

export function sortWorkoutSessionsNewestFirst(sessions: WorkoutSession[]) {
  return [...sessions].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}