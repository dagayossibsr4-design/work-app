import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getTemplate, replaceExerciseInTemplate, workoutTemplates, type ExerciseTemplate, type WorkoutId, type WorkoutTemplate } from "./workout-data";
import type { ExerciseLibraryItem } from "./exercise-library";
import type { FoodItem } from "./food-nutrition";

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
  addExerciseFromLibrary: (templateId: WorkoutId, item: ExerciseLibraryItem) => void;
  replaceExerciseFromLibrary: (templateId: WorkoutId, exerciseId: string, item: ExerciseLibraryItem) => void;
  replaceActiveExerciseFromLibrary: (exerciseId: string, item: ExerciseLibraryItem) => void;
  addExerciseToActiveWorkout: (item: ExerciseLibraryItem) => void;
  addSetToActiveExercise: (exerciseId: string) => void;
  removeSetFromActiveExercise: (setId: string) => void;
  removeExerciseFromActiveWorkout: (exerciseId: string) => void;
  saveCardioLog: (log: Omit<CardioLog, "id">) => void;
  updateNutritionProfile: (profile: NutritionProfile) => void;
  updateExercise: (templateId: WorkoutId, exerciseId: string, patch: Partial<ExerciseTemplate>) => void;
  deleteExercise: (templateId: WorkoutId, exerciseId: string) => void;
  moveExercise: (templateId: WorkoutId, exerciseId: string, direction: -1 | 1) => void;
};

const SESSION_KEY = "workout-tracker-sessions-v1";
const TEMPLATE_KEY = "workout-tracker-templates-v1";
const RECOVERY_KEY = "workout-tracker-recovery-v1";
const CARDIO_KEY = "workout-tracker-cardio-v1";
const NUTRITION_KEY = "workout-tracker-nutrition-v1";
const cloneTemplates = () => JSON.parse(JSON.stringify(workoutTemplates)) as WorkoutTemplate[];

function demoSet(exerciseId: string, setNumber: number, weight: number, reps: number, date: string): SetLog {
  return {
    id: `demo-${date}-${exerciseId}-${setNumber}`,
    exerciseId,
    setNumber,
    weight: String(weight),
    reps: String(reps),
    completed: true,
  };
}

function createDemoLegsSessions(): WorkoutSession[] {
  const today = "2026-08-16";
  const wednesday = "2026-08-12";
  const build = (date: string, values: Array<[string, number, number]>): WorkoutSession => {
    const counters: Record<string, number> = {};
    return {
      id: `demo-legs-${date}`,
      templateId: "legs1" as WorkoutId,
      startedAt: `${date}T18:00:00.000Z`,
      finishedAt: `${date}T19:25:00.000Z`,
      sets: values.map(([exerciseId, weight, reps]) => {
        counters[exerciseId] = (counters[exerciseId] ?? 0) + 1;
        return demoSet(exerciseId, counters[exerciseId], weight, reps, date);
      }),
    };
  };
  const todayValues: Array<[string, number, number]> = [
    ["סקוואט חופשי", 120, 6], ["סקוואט חופשי", 100, 10], ["סקוואט חופשי", 90, 15],
    ["לג פרס", 262.5, 8], ["לג פרס", 282.5, 8], ["לג פרס", 292.5, 7],
    ["כפיפת ברכיים בשכיבה", 70, 10], ["כפיפת ברכיים בשכיבה", 65, 12], ["כפיפת ברכיים בשכיבה", 50, 10],
    ["כפיפת ברכיים בעמידה", 40, 16], ["כפיפת ברכיים בעמידה", 30, 22],
    ["פשיטת ברכיים במכונה", 120, 9], ["פשיטת ברכיים במכונה", 110, 12], ["פשיטת ברכיים במכונה", 95, 20],
    ["מקרבי ירך במכונה", 90, 11], ["מקרבי ירך במכונה", 80, 10],
    ["מרחיקי ירך במכונה", 90, 9], ["מרחיקי ירך במכונה", 70, 12],
    ["תאומים בישיבה", 30, 12], ["תאומים בישיבה", 30, 11],
  ];
  const previousValues: Array<[string, number, number]> = [
    ["סקוואט חופשי", 115, 6], ["סקוואט חופשי", 95, 10], ["סקוואט חופשי", 85, 14],
    ["לג פרס", 250, 8], ["לג פרס", 270, 8], ["לג פרס", 280, 7],
    ["כפיפת ברכיים בשכיבה", 65, 10], ["כפיפת ברכיים בשכיבה", 60, 12], ["כפיפת ברכיים בשכיבה", 45, 10],
    ["כפיפת ברכיים בעמידה", 35, 15], ["כפיפת ברכיים בעמידה", 27.5, 20],
    ["פשיטת ברכיים במכונה", 110, 9], ["פשיטת ברכיים במכונה", 100, 12], ["פשיטת ברכיים במכונה", 90, 18],
    ["מקרבי ירך במכונה", 85, 11], ["מקרבי ירך במכונה", 75, 10],
    ["מרחיקי ירך במכונה", 85, 9], ["מרחיקי ירך במכונה", 65, 12],
    ["תאומים בישיבה", 27.5, 12], ["תאומים בישיבה", 27.5, 10],
  ];
  return [build(today, todayValues), build(wednesday, previousValues)];
}

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
    Promise.all([AsyncStorage.getItem(SESSION_KEY), AsyncStorage.getItem(TEMPLATE_KEY), AsyncStorage.getItem(RECOVERY_KEY), AsyncStorage.getItem(CARDIO_KEY), AsyncStorage.getItem(NUTRITION_KEY)]).then(([sessionValue, templateValue, recoveryValue, cardioValue, nutritionValue]) => {
      const demoSessions = createDemoLegsSessions();
      if (sessionValue) {
        const savedSessions = (JSON.parse(sessionValue) as WorkoutSession[]).map((session) => ({
          ...session,
          sets: session.sets.map((set) => set.exerciseId === "לחיצת רגליים" ? { ...set, exerciseId: "לג פרס" } : set),
        }));
        const hasDemo = savedSessions.some((session) => session.id.startsWith("demo-legs-"));
        setSessions(process.env.NODE_ENV === "development" && !hasDemo ? [...demoSessions, ...savedSessions] : savedSessions);
      } else {
        setSessions(demoSessions);
      }
      if (templateValue) setTemplates(JSON.parse(templateValue));
      if (recoveryValue) setRecoveryLogs(JSON.parse(recoveryValue));
      if (cardioValue) setCardioLogs(JSON.parse(cardioValue));
      if (nutritionValue) { const savedNutrition = JSON.parse(nutritionValue) as NutritionProfile; setNutritionProfile((current) => ({ ...current, ...savedNutrition, customFoods: savedNutrition.customFoods ?? [] })); }
      setHydrated(true);
    }).catch(() => setHydrated(true));
  }, []);

  useEffect(() => { if (hydrated) AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessions)); }, [sessions, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates)); }, [templates, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(RECOVERY_KEY, JSON.stringify(recoveryLogs)); }, [recoveryLogs, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(CARDIO_KEY, JSON.stringify(cardioLogs)); }, [cardioLogs, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(NUTRITION_KEY, JSON.stringify(nutritionProfile)); }, [nutritionProfile, hydrated]);

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
  const finishWorkout = () => { if (!activeSession) return; setSessions((current) => [{ ...activeSession, finishedAt: new Date().toISOString() }, ...current]); setActiveSession(null); };
  const updateSession = (sessionId: string, patch: Partial<WorkoutSession>) => setSessions((current) => current.map((session) => session.id === sessionId ? { ...session, ...patch } : session));
  const deleteSession = (sessionId: string) => setSessions((current) => current.filter((session) => session.id !== sessionId));
  const recentSessionFor = (templateId: WorkoutId) => sessions.find((session) => session.templateId === templateId);
  const saveRecoveryLog = (log: Omit<RecoveryLog, "id">) => setRecoveryLogs((current) => [{ ...log, id: `recovery-${Date.now()}` }, ...current.filter((item) => item.date !== log.date)]);
  const recentRecovery = () => recoveryLogs[0];
  const updateTemplate = (templateId: WorkoutId, patch: Partial<WorkoutTemplate>) => setTemplates((current) => current.map((template) => template.id === templateId ? { ...template, ...patch } : template));
  const addCustomTemplate = (template: WorkoutTemplate) => setTemplates((current) => [...current, template]);
  const addExercise = (templateId: WorkoutId) => setTemplates((current) => current.map((template) => template.id === templateId ? { ...template, exercises: [...template.exercises, { id: `exercise-${Date.now()}`, name: "תרגיל חדש", englishName: "New Exercise", sets: [{ target: "8–12" }, { target: "10–15" }] }] } : template));
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
  const removeSetFromActiveExercise = (setId: string) => {
    if (!activeSession) return;
    const setToRemove = activeSession.sets.find((set) => set.id === setId);
    if (!setToRemove) return;
    const exerciseSets = activeSession.sets.filter((set) => set.exerciseId === setToRemove.exerciseId);
    if (exerciseSets.length <= 1) return;
    setTemplates((current) => current.map((item) => item.id !== activeSession.templateId ? item : { ...item, exercises: item.exercises.map((candidate) => candidate.id !== setToRemove.exerciseId || candidate.sets.length <= 1 ? candidate : { ...candidate, sets: candidate.sets.filter((_, index) => index !== setToRemove.setNumber - 1) }) }));
    setActiveSession((current) => current ? { ...current, sets: current.sets.filter((set) => set.id !== setId).map((set) => set.exerciseId === setToRemove.exerciseId && set.setNumber > setToRemove.setNumber ? { ...set, setNumber: set.setNumber - 1 } : set) } : current);
  };
  const removeExerciseFromActiveWorkout = (exerciseId: string) => {
    if (!activeSession) return;
    setTemplates((current) => current.map((item) => item.id !== activeSession.templateId ? item : { ...item, exercises: item.exercises.filter((exercise) => exercise.id !== exerciseId) }));
    setActiveSession((current) => current ? { ...current, sets: current.sets.filter((set) => set.exerciseId !== exerciseId) } : current);
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
  const saveCardioLog = (log: Omit<CardioLog, "id">) => setCardioLogs((current) => [{ ...log, id: `cardio-${Date.now()}` }, ...current]);
  const updateNutritionProfile = (profile: NutritionProfile) => setNutritionProfile(profile);
  const updateExercise = (templateId: WorkoutId, exerciseId: string, patch: Partial<ExerciseTemplate>) => setTemplates((current) => current.map((template) => template.id === templateId ? { ...template, exercises: template.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, ...patch } : exercise) } : template));
  const deleteExercise = (templateId: WorkoutId, exerciseId: string) => setTemplates((current) => current.map((template) => template.id === templateId ? { ...template, exercises: template.exercises.filter((exercise) => exercise.id !== exerciseId) } : template));
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
    startWorkout, startWorkoutFromTemplate, updateSet, finishWorkout, updateSession, deleteSession, discardActiveWorkout: () => setActiveSession(null), recentSessionFor, saveRecoveryLog, recentRecovery, saveCardioLog, updateNutritionProfile,
    updateTemplate, addCustomTemplate, addExercise, addExerciseFromLibrary, replaceExerciseFromLibrary, replaceActiveExerciseFromLibrary, addExerciseToActiveWorkout, addSetToActiveExercise, removeSetFromActiveExercise, removeExerciseFromActiveWorkout, updateExercise, deleteExercise, moveExercise,
  }), [sessions, recoveryLogs, cardioLogs, nutritionProfile, templates, activeSession, hydrated]);
  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkoutStore() { const value = useContext(WorkoutContext); if (!value) throw new Error("useWorkoutStore must be used inside WorkoutProvider"); return value; }
export function calculateVolume(session: WorkoutSession) { return session.sets.reduce((sum, set) => sum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0); }
