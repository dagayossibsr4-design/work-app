import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getTemplate, replaceExerciseInTemplate, workoutTemplates, type ExerciseTemplate, type WorkoutId, type WorkoutTemplate } from "./workout-data";
import type { ExerciseLibraryItem } from "./exercise-library";
import type { FoodItem } from "./food-nutrition";

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
  restSeconds?: number;
  cardio?: {
    speedKph?: string;
    incline?: string;
    intensity?: "קלילה" | "בינונית" | "גבוהה";
    heartRate?: string;
  };
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

export const CARDIO_WORKOUT_TEMPLATE_IDS = new Set(["cardio", "cycling", "elliptical", "stairs", "treadmill", "outdoor-run", "walking", "rowing", "swimming", "hiit"]);

export function isCardioWorkoutTemplate(templateId: WorkoutId) {
  return CARDIO_WORKOUT_TEMPLATE_IDS.has(templateId);
}

export function sessionsForWorkoutDate(sessions: WorkoutSession[], date: string) {
  return sessions
    .filter((session) => session.startedAt.slice(0, 10) === date)
    .sort((left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt));
}

export function splitSessionsForWorkoutDate(sessions: WorkoutSession[], date: string) {
  const all = sessionsForWorkoutDate(sessions, date);
  return {
    all,
    strength: all.filter((session) => !isCardioWorkoutTemplate(session.templateId)),
    cardio: all.filter((session) => isCardioWorkoutTemplate(session.templateId)),
  };
}

export type AccountState = { sessions: WorkoutSession[]; templates: WorkoutTemplate[]; recoveryLogs: RecoveryLog[]; cardioLogs: CardioLog[]; nutritionProfile: NutritionProfile; activeSession: WorkoutSession | null };

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
  startWorkoutOnDate: (templateId: WorkoutId, date: string, copyPrevious?: boolean) => void;
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
export const ACTIVE_SESSION_STORAGE_KEY = "workout-tracker-active-session-v1";
const cloneTemplates = () => JSON.parse(JSON.stringify(workoutTemplates)) as WorkoutTemplate[];

export function normalizeWorkoutSessions(savedSessions: WorkoutSession[]): WorkoutSession[] {
  return savedSessions
    .filter((session) => !session.id.startsWith("demo-"))
    .map((session) => ({
      ...session,
      sets: session.sets.map((set) => set.exerciseId === "לחיצת רגליים" ? { ...set, exerciseId: "לג פרס" } : set),
    }));
}

/**
 * מאחד אימונים מהמכשיר ומהענן בלי למחוק אימון מקומי חדש שעוד לא הספיק להסתנכרן.
 * במקרה של אותו מזהה, העותק המקומי מקבל עדיפות כי הוא עשוי לכלול שינוי שנעשה זה עתה.
 */
export function mergeWorkoutSessions(localSessions: WorkoutSession[], cloudSessions: WorkoutSession[]): WorkoutSession[] {
  const merged = new Map<string, WorkoutSession>();
  normalizeWorkoutSessions(cloudSessions).forEach((session) => merged.set(session.id, session));
  normalizeWorkoutSessions(localSessions).forEach((session) => merged.set(session.id, session));
  return sortWorkoutSessionsNewestFirst([...merged.values()]);
}

export function restoreActiveWorkout(raw: string | null): WorkoutSession | null {
  if (!raw) return null;
  try {
    const candidate = JSON.parse(raw) as Partial<WorkoutSession>;
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.templateId !== "string" ||
      typeof candidate.startedAt !== "string" ||
      !Array.isArray(candidate.sets)
    ) {
      return null;
    }
    return candidate as WorkoutSession;
  } catch {
    return null;
  }
}

export function isDemoCompletedPreview() {
  return typeof document !== "undefined" && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demoCompleted") === "1";
}

export function createDemoCompletedSessions(templates: WorkoutTemplate[]): WorkoutSession[] {
  const make = (template: WorkoutTemplate, id: string, startedAt: string, baseWeight: number): WorkoutSession => ({
    ...createSession(template, startedAt.slice(0, 10)),
    id,
    startedAt,
    finishedAt: startedAt,
    sets: createSession(template, startedAt.slice(0, 10)).sets.map((set, index) => ({
      ...set,
      id: `${id}-set-${index}`,
      weight: String(Math.max(0, baseWeight - (index % 4) * 5)),
      reps: String(8 + (index % 2) * 2),
      completed: true,
      restSeconds: index % 2 ? 90 : 0,
      note: index === 0 ? "סט חימום" : undefined,
    })),
  });
  const push = templates.find((template) => template.id === "push1") ?? templates[0];
  const pull = templates.find((template) => template.id === "pull1") ?? templates[1] ?? templates[0];
  if (!push) return [];
  return [
    make(push, "demo-completed-push-current", "2026-08-25T20:01:00.000Z", 100),
    make(push, "demo-completed-push-previous", "2026-08-18T18:30:00.000Z", 85),
    ...(pull ? [make(pull, "demo-completed-pull", "2026-08-20T19:15:00.000Z", 70)] : []),
  ];
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

function createSession(template: WorkoutTemplate, scheduledDate?: string): WorkoutSession {
  const startedAt = scheduledDate && /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)
    ? `${scheduledDate}T${new Date().toISOString().slice(11)}`
    : new Date().toISOString();
  return {
    id: `${template.id}-${Date.now()}`,
    templateId: template.id,
    startedAt,
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
  const demoCompletedPreview = isDemoCompletedPreview();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [recoveryLogs, setRecoveryLogs] = useState<RecoveryLog[]>([]);
  const [cardioLogs, setCardioLogs] = useState<CardioLog[]>([]);
  const [nutritionProfile, setNutritionProfile] = useState<NutritionProfile>({ goal: "ניטרלי", weightKg: "", heightCm: "", age: "", sex: "זכר", activity: "בינונית", proteinPerKg: "1.8", fatPerKg: "0.8", calorieTarget: "2500", proteinTarget: "240", carbohydratesTarget: "150", fatsTarget: "", autoMacroField: "fats", customFoods: [] });
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(cloneTemplates);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(SESSION_KEY), AsyncStorage.getItem(TEMPLATE_KEY), AsyncStorage.getItem(RECOVERY_KEY), AsyncStorage.getItem(CARDIO_KEY), AsyncStorage.getItem(NUTRITION_KEY), AsyncStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)]).then(([sessionValue, templateValue, recoveryValue, cardioValue, nutritionValue, activeSessionValue]) => {
      if (demoCompletedPreview) {
        const demoTemplates = templateValue ? hydrateWorkoutTemplates(JSON.parse(templateValue) as WorkoutTemplate[]) : cloneTemplates();
        setSessions(createDemoCompletedSessions(demoTemplates));
      } else if (sessionValue) {
        setSessions(normalizeWorkoutSessions(JSON.parse(sessionValue) as WorkoutSession[]));
      } else {
        setSessions([]);
      }
      if (templateValue) setTemplates(hydrateWorkoutTemplates(JSON.parse(templateValue) as WorkoutTemplate[]));
      if (recoveryValue) setRecoveryLogs(JSON.parse(recoveryValue));
      if (cardioValue) setCardioLogs(JSON.parse(cardioValue));
      if (nutritionValue) { const savedNutrition = JSON.parse(nutritionValue) as NutritionProfile; setNutritionProfile((current) => ({ ...current, ...savedNutrition, customFoods: savedNutrition.customFoods ?? [] })); }
      if (!demoCompletedPreview) setActiveSession(restoreActiveWorkout(activeSessionValue));
      setHydrated(true);
    }).catch(() => setHydrated(true));
  }, [demoCompletedPreview]);

  useEffect(() => { if (hydrated && !demoCompletedPreview) AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessions)); }, [sessions, hydrated, demoCompletedPreview]);
  useEffect(() => {
    if (!hydrated || demoCompletedPreview) return;
    if (activeSession) {
      void AsyncStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(activeSession));
      return;
    }
    void AsyncStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  }, [activeSession, hydrated, demoCompletedPreview]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates)); }, [templates, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(RECOVERY_KEY, JSON.stringify(recoveryLogs)); }, [recoveryLogs, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(CARDIO_KEY, JSON.stringify(cardioLogs)); }, [cardioLogs, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(NUTRITION_KEY, JSON.stringify(nutritionProfile)); }, [nutritionProfile, hydrated]);


  const startWorkoutOnDate = (templateId: WorkoutId, date: string, copyPrevious = false) => {
    const template = templates.find((item) => item.id === templateId) ?? getTemplate(templateId);
    const fresh = createSession(template, date);
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
  const startWorkout = (templateId: WorkoutId, copyPrevious = false) => startWorkoutOnDate(templateId, new Date().toISOString().slice(0, 10), copyPrevious);
  const startWorkoutFromTemplate = (template: WorkoutTemplate) => setActiveSession(createSession(template));
  const persistActiveSessionImmediately = (next: WorkoutSession | null) => {
    const operation = next
      ? AsyncStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(next))
      : AsyncStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    void operation.catch(() => undefined);
  };
  const updateSet = (setId: string, patch: Partial<SetLog>) => setActiveSession((current) => {
    if (!current) return current;
    const next = { ...current, sets: current.sets.map((set) => set.id === setId ? { ...set, ...patch } : set) };
    persistActiveSessionImmediately(next);
    return next;
  });
  const updateActiveSession = (patch: Partial<WorkoutSession>) => setActiveSession((current) => {
    if (!current) return current;
    const next = { ...current, ...patch };
    persistActiveSessionImmediately(next);
    return next;
  });
  const persistSessionsImmediately = (nextSessions: WorkoutSession[]) => {
    void AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextSessions)).catch(() => undefined);
  };
  const finishWorkout = () => {
    if (!activeSession) return;
    const completed = { ...activeSession, finishedAt: new Date().toISOString() };
    setSessions((current) => {
      const next = [completed, ...current.filter((session) => session.id !== completed.id)];
      persistSessionsImmediately(next);
      return next;
    });
    persistActiveSessionImmediately(null);
    setActiveSession(null);
  };
  const updateSession = (sessionId: string, patch: Partial<WorkoutSession>) => setSessions((current) => {
    const next = current.map((session) => session.id === sessionId ? { ...session, ...patch } : session);
    persistSessionsImmediately(next);
    return next;
  });
  const deleteSession = (sessionId: string) => setSessions((current) => {
    const next = current.filter((session) => session.id !== sessionId);
    persistSessionsImmediately(next);
    return next;
  });
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
  const getAccountState = useCallback((): AccountState => ({ sessions, templates, recoveryLogs, cardioLogs, nutritionProfile, activeSession }), [sessions, templates, recoveryLogs, cardioLogs, nutritionProfile, activeSession]);
  const applyAccountState = useCallback((state: Partial<AccountState>) => {
    if (Array.isArray(state.sessions)) {
      setSessions((current) => mergeWorkoutSessions(current, state.sessions ?? []));
    }
    if (Array.isArray(state.templates)) setTemplates(hydrateWorkoutTemplates(state.templates));
    if (Array.isArray(state.recoveryLogs)) setRecoveryLogs(state.recoveryLogs);
    if (Array.isArray(state.cardioLogs)) setCardioLogs(state.cardioLogs);
    if (state.nutritionProfile) setNutritionProfile((current) => ({ ...current, ...state.nutritionProfile }));
    if ("activeSession" in state) setActiveSession((current) => current ?? state.activeSession ?? null);
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
    startWorkout, startWorkoutOnDate, startWorkoutFromTemplate, updateSet, updateActiveSession, finishWorkout, updateSession, deleteSession, discardActiveWorkout: () => setActiveSession(null), recentSessionFor, saveRecoveryLog, recentRecovery, saveCardioLog, updateNutritionProfile,
    updateTemplate, addCustomTemplate, addExercise, addCustomExercise, addExerciseFromLibrary, replaceExerciseFromLibrary, replaceActiveExerciseFromLibrary, addExerciseToActiveWorkout, addCustomExerciseToActiveWorkout, duplicateActiveExercise, addSetToActiveExercise, duplicateActiveSet, removeSetFromActiveExercise, removeExerciseFromActiveWorkout, updateExercise, deleteExercise, moveExercise, getAccountState, applyAccountState,
  }), [sessions, recoveryLogs, cardioLogs, nutritionProfile, templates, activeSession, hydrated]);
  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkoutStore() { const value = useContext(WorkoutContext); if (!value) throw new Error("useWorkoutStore must be used inside WorkoutProvider"); return value; }
export function calculateVolume(session: WorkoutSession) { return session.sets.reduce((sum, set) => sum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0); }

export function sortWorkoutSessionsNewestFirst(sessions: WorkoutSession[]) {
  return [...sessions].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}
