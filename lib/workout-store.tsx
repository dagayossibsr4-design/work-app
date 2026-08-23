import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getTemplate, replaceExerciseInTemplate, workoutTemplates, type ExerciseTemplate, type WorkoutId, type WorkoutTemplate } from "./workout-data";
import type { ExerciseLibraryItem } from "./exercise-library";
import type { FoodItem } from "./food-nutrition";
import { defaultMeals, type Meal } from "./meal-plan";

const SUPABASE_URL = "https://sovkcnzxystytgczpzic.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_RloyhngS45WwfOTnuBCk-Q_v4yYW048";

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

export type AccountState = {
  sessions: WorkoutSession[];
  templates: WorkoutTemplate[];
  recoveryLogs: RecoveryLog[];
  cardioLogs: CardioLog[];
  nutritionProfile: NutritionProfile;
  meals: Meal[];
  accountName: string;
};

type WorkoutContextValue = {
  sessions: WorkoutSession[];
  recoveryLogs: RecoveryLog[];
  cardioLogs: CardioLog[];
  nutritionProfile: NutritionProfile;
  meals: Meal[];
  templates: WorkoutTemplate[];
  activeSession: WorkoutSession | null;
  activeTemplate: WorkoutTemplate | null;
  hydrated: boolean;
  accountName: string;
  setAccountName: (name: string) => Promise<void>;
  syncAccount: (name?: string) => Promise<void>;
  backupToCloud: () => Promise<void>;
  updateMeals: (meals: Meal[]) => void;
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
const MEALS_KEY = "workout-tracker-meals-v1";
const ACCOUNT_KEY = "workout-tracker-account-name-v1";

const cloneTemplates = () => JSON.parse(JSON.stringify(workoutTemplates)) as WorkoutTemplate[];

function demoSet(exerciseId: string, setNumber: number, weight: number, reps: number, date: string, note?: string, restSeconds?: number): SetLog {
  return {
    id: `demo-${date}-${exerciseId}-${setNumber}`,
    exerciseId,
    setNumber,
    weight: String(weight),
    reps: String(reps),
    completed: true,
    note,
    restSeconds,
  };
}

type ImportedSet = [exerciseId: string, weight: number, reps: number, note?: string, restSeconds?: number];

export function createImportedWorkoutSessions(): WorkoutSession[] {
  const build = (id: string, templateId: WorkoutId, date: string, values: ImportedSet[], finishHour: number): WorkoutSession => {
    const counters: Record<string, number> = {};
    return {
      id,
      templateId,
      startedAt: `${date}T18:00:00.000Z`,
      finishedAt: `${date}T${String(finishHour).padStart(2, "0")}:30:00.000Z`,
      sets: values.map(([exerciseId, weight, reps, note, restSeconds]) => {
        counters[exerciseId] = (counters[exerciseId] ?? 0) + 1;
        return demoSet(exerciseId, counters[exerciseId], weight, reps, date, note, restSeconds);
      }),
    };
  };

  return [
    build("imported-pull1-2026-08-22", "pull1", "2026-08-22", [
      ["חתירה גבוהה במכונה", 100, 10, undefined, 57], ["חתירה גבוהה במכונה", 80, 12, undefined, 59], ["חתירה גבוהה במכונה", 75, 16, "Rest & Pause: 3 דקות", 92],
      ["חתירה במכונה עם תמיכה לחזה", 100, 9, undefined, 58], ["חתירה במכונה עם תמיכה לחזה", 80, 11, undefined, 48],
      ["חתירה על ספסל דאמבל מסור", 70, 8, undefined, 59], ["חתירה על ספסל דאמבל מסור", 60, 12, undefined, 65],
      ["פולי רחב", 80, 9, undefined, 25], ["פולי רחב", 70, 13, undefined, 33],
      ["פול־אובר בכבלים", 28, 8, undefined, 28], ["פול־אובר בכבלים", 24, 9, undefined, 28], ["פול־אובר בכבלים", 20, 12, undefined, 30],
      ["כתף אחורית במכונה ייעודית", 60, 10, undefined, 23], ["כתף אחורית במכונה ייעודית", 50, 12, undefined, 44], ["כתף אחורית במכונה ייעודית", 45, 15, undefined, 28],
      ["שרגים", 70, 9, undefined, 31], ["שרגים", 65, 12, undefined, 36], ["שרגים", 60, 12, undefined, 34],
      ["יד קדמית בהאמר", 45, 8, undefined, 24], ["יד קדמית בהאמר", 40, 8, undefined, 23], ["יד קדמית בהאמר", 35, 9, undefined, 27],
      ["יד קדמית דאמבלים בישיבה קרוב מרפקים", 25, 8, undefined, 26], ["יד קדמית דאמבלים בישיבה קרוב מרפקים", 20, 10, undefined, 29], ["יד קדמית דאמבלים בישיבה קרוב מרפקים", 16, 10, undefined, 34],
      ["יד קדמית פולי תחתון עם כבל", 25, 10], ["יד קדמית פולי תחתון עם כבל", 20, 10], ["יד קדמית פולי תחתון עם כבל", 17.5, 10],
    ], 20),
    build("imported-pull1-2026-08-13", "pull1", "2026-08-13", [
      ["חתירה גבוהה במכונה/כבל", 100, 8, "Rest & Pause: 3 דקות"], ["חתירה גבוהה במכונה/כבל", 90, 11], ["חתירה גבוהה במכונה/כבל", 70, 17],
      ["חתירה במכונה עם תמיכה לחזה", 100, 7], ["חתירה במכונה עם תמיכה לחזה", 80, 10],
      ["חתירה על ספסל עם דאמבל", 65, 9], ["חתירה על ספסל עם דאמבל", 55, 10],
      ["עליות מתח / משיכה עליונה", 70, 9], ["עליות מתח / משיכה עליונה", 60, 12],
      ["פול־אובר בכבלים בעמידה", 26, 12], ["פול־אובר בכבלים בעמידה", 24, 15], ["פול־אובר בכבלים בעמידה", 20, 18],
      ["פרפר הפוך במכונה", 50, 12], ["פרפר הפוך במכונה", 40, 14], ["פרפר הפוך במכונה", 30, 16],
      ["שרג עם דאמבלים", 70, 10], ["שרג עם דאמבלים", 60, 12], ["שרג עם דאמבלים", 50, 15],
      ["יד קדמית במכונת האמר", 30, 10], ["יד קדמית במכונת האמר", 25, 12],
      ["יד קדמית בישיבה עם 2 דאמבלים", 16, 10], ["יד קדמית בישיבה עם 2 דאמבלים", 14, 12], ["יד קדמית בישיבה עם 2 דאמבלים", 12, 14],
      ["יד קדמית בפולי עליון", 20, 12], ["יד קדמית בפולי עליון", 15, 15],
    ], 20),
    build("imported-pull2-2026-08-18", "pull2", "2026-08-18", [
      ["פולי עליון אחיזה צרה", 95, 7, "Rest & Pause: 3 דקות"], ["פולי עליון אחיזה צרה", 75, 12], ["פולי עליון אחיזה צרה", 65, 17],
      ["חתירת T-Bar", 70, 10], ["חתירת T-Bar", 60, 15],
      ["פולי עליון אחיזה רחבה", 70, 9], ["פולי עליון אחיזה רחבה", 60, 18],
      ["כבל ראו בישיבה — אחיזה צרה", 65, 9], ["כבל ראו בישיבה — אחיזה צרה", 55, 12],
      ["חתירה פולי תחתון עם כבל", 32.5, 9], ["חתירה פולי תחתון עם כבל", 27.5, 14],
      ["שרגים", 65, 9], ["שרגים", 55, 13], ["שרגים", 50, 12],
      ["יד קדמית האמר", 35, 9], ["יד קדמית האמר", 30, 12], ["יד קדמית האמר", 25, 15], ["יד קדמית האמר", 20, 18],
      ["יד קדמית מוט W / SZ", 30, 9], ["יד קדמית מוט W / SZ", 25, 7], ["יד קדמית מוט W / SZ", 20, 14],
      ["זוקפי גב", 92, 15], ["זוקפי גב", 96, 15], ["זוקפי גב", 92, 15],
    ], 20),
    build("imported-push2-2026-08-19", "push2", "2026-08-19", [
      ["לחיצת חזה עליון במוט חופשי", 100, 6], ["לחיצת חזה עליון במוט חופשי", 85, 9], ["לחיצת חזה עליון במוט חופשי", 80, 10],
      ["לחיצת חזה בשיפוע עם משקולות", 90, 8], ["לחיצת חזה בשיפוע עם משקולות", 80, 10], ["לחיצת חזה בשיפוע עם משקולות", 65, 12],
      ["לחיצת חזה תחתון במכשיר", 98, 8], ["לחיצת חזה תחתון במכשיר", 78, 13],
      ["פרפר חופשי בכבלים", 30, 8], ["פרפר חופשי בכבלים", 25, 12],
      ["פרפר במכשיר ייעודי", 65, 18, "Rest & Pause"],
      ["לחיצת כתפיים במכונת האמר", 80, 9], ["לחיצת כתפיים במכונת האמר", 70, 10],
      ["הרחקת כתפיים לצדדים", 25, 7], ["הרחקת כתפיים לצדדים", 20, 12],
      ["כתף קדמית בפולי תחתון", 15, 12], ["כתף קדמית בפולי תחתון", 10, 12], ["כתף קדמית בפולי תחתון", 10, 8],
      ["פשיטת מרפקים כנגד כבל", 24, 14], ["פשיטת מרפקים כנגד כבל", 22, 12], ["פשיטת מרפקים כנגד כבל", 18, 12],
      ["פשיטת מרפקים בהצלבה", 12, 8], ["פשיטת מרפקים בהצלבה", 8, 11],
    ], 20),
    build("imported-legs1-2026-08-16", "legs1", "2026-08-16", [
      ["סקוואט חופשי", 120, 6], ["סקוואט חופשי", 100, 10], ["סקוואט חופשי", 90, 15],
      ["לג פרס", 262.5, 8], ["לג פרס", 282.5, 8], ["לג פרס", 292.5, 7],
      ["כפיפת ברכיים בשכיבה", 70, 10], ["כפיפת ברכיים בשכיבה", 65, 12],
      ["כפיפת ברכיים בעמידה", 50, 16], ["כפיפת ברכיים בעמידה", 40, 22],
      ["פשיטת ברכיים במכונה", 120, 9], ["פשיטת ברכיים במכונה", 110, 12], ["פשיטת ברכיים במכונה", 95, 20, "Rest & Pause: 3 דקות"],
      ["מקרבי ירך במכונה", 90, 11], ["מקרבי ירך במכונה", 80, 12],
      ["מרחיקי ירך במכונה", 90, 9], ["מרחיקי ירך במכונה", 70, 12],
      ["תאומים בישיבה", 30, 12], ["תאומים בישיבה", 30, 11],
    ], 20),
    build("imported-legs2-2026-08-20", "legs2", "2026-08-20", [
      ["האק סקוואט-legs2", 170, 8, "Rest & Pause: 3 דקות"], ["האק סקוואט-legs2", 150, 9], ["האק סקוואט-legs2", 120, 14], ["האק סקוואט-legs2", 90, 20],
      ["מכרעים", 80, 20], ["מכרעים", 35, 18],
      ["כפיפת ברך-ירך-legs2", 25, 24],
      ["פשיטת ברכיים-legs2", 105, 12], ["פשיטת ברכיים-legs2", 100, 10], ["פשיטת ברכיים-legs2", 90, 12],
      ["כפיפת ירך בעמידה-legs2", 20, 14],
      ["מקרבי ירך-legs2", 90, 11], ["מקרבי ירך-legs2", 75, 12],
      ["תאומים-legs2", 30, 10], ["תאומים-legs2", 30, 10],
    ], 20),
  ];
}

export function mergeImportedWorkoutSessions(savedSessions: WorkoutSession[]): WorkoutSession[] {
  const importedSessions = createImportedWorkoutSessions();
  const importedIds = new Set(importedSessions.map((session) => session.id));
  return [
    ...importedSessions,
    ...savedSessions.filter((session) => !session.id.startsWith("demo-legs-") && !importedIds.has(session.id)),
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
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [recoveryLogs, setRecoveryLogs] = useState<RecoveryLog[]>([]);
  const [cardioLogs, setCardioLogs] = useState<CardioLog[]>([]);
  const [nutritionProfile, setNutritionProfile] = useState<NutritionProfile>({ goal: "ניטרלי", weightKg: "", heightCm: "", age: "", sex: "זכר", activity: "בינונית", proteinPerKg: "1.8", fatPerKg: "0.8", calorieTarget: "2500", proteinTarget: "240", carbohydratesTarget: "150", fatsTarget: "", autoMacroField: "fats", customFoods: [] });
  const [meals, setMeals] = useState<Meal[]>(defaultMeals);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(cloneTemplates);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [accountName, setAccountNameState] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  // סנכרון וגיבוי מלא לענן ב-Supabase
  const backupToCloud = useCallback(async () => {
    if (!accountName) return;
    try {
      const payload = {
        user_id: accountName.trim().toLowerCase(),
        data: {
          sessions,
          templates,
          recoveryLogs,
          cardioLogs,
          nutritionProfile,
          meals,
        },
        updated_at: new Date().toISOString(),
      };
      await fetch(`${SUPABASE_URL}/rest/v1/user_backups`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(payload),
      });
    } catch {}
  }, [accountName, sessions, templates, recoveryLogs, cardioLogs, nutritionProfile, meals]);

  const syncAccount = useCallback(async (name?: string) => {
    const userToSync = (name || accountName || "").trim().toLowerCase();
    if (!userToSync) return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/user_backups?user_id=eq.${encodeURIComponent(userToSync)}&select=data`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0 && json[0].data) {
        const remoteData = json[0].data;
        if (Array.isArray(remoteData.sessions)) setSessions(mergeImportedWorkoutSessions(remoteData.sessions));
        if (Array.isArray(remoteData.templates)) setTemplates(hydrateWorkoutTemplates(remoteData.templates));
        if (Array.isArray(remoteData.recoveryLogs)) setRecoveryLogs(remoteData.recoveryLogs);
        if (Array.isArray(remoteData.cardioLogs)) setCardioLogs(remoteData.cardioLogs);
        if (remoteData.nutritionProfile) setNutritionProfile(remoteData.nutritionProfile);
        if (Array.isArray(remoteData.meals) && remoteData.meals.length > 0) setMeals(remoteData.meals);
      }
    } catch {}
  }, [accountName]);

  const setAccountName = async (name: string) => {
    setAccountNameState(name);
    await AsyncStorage.setItem(ACCOUNT_KEY, name);
    await syncAccount(name);
  };

  const updateMeals = (newMeals: Meal[]) => {
    setMeals(newMeals);
    AsyncStorage.setItem(MEALS_KEY, JSON.stringify(newMeals));
  };

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(SESSION_KEY),
      AsyncStorage.getItem(TEMPLATE_KEY),
      AsyncStorage.getItem(RECOVERY_KEY),
      AsyncStorage.getItem(CARDIO_KEY),
      AsyncStorage.getItem(NUTRITION_KEY),
      AsyncStorage.getItem(MEALS_KEY),
      AsyncStorage.getItem(ACCOUNT_KEY),
    ]).then(([sessionValue, templateValue, recoveryValue, cardioValue, nutritionValue, mealsValue, accountValue]) => {
      if (sessionValue) {
        const savedSessions = (JSON.parse(sessionValue) as WorkoutSession[])
          .filter((session) => !session.id.startsWith("demo-legs-"))
          .map((session) => ({
            ...session,
            sets: session.sets.map((set) => set.exerciseId === "לחיצת רגליים" ? { ...set, exerciseId: "לג פרס" } : set),
          }));
        setSessions(mergeImportedWorkoutSessions(savedSessions));
      } else {
        setSessions(createImportedWorkoutSessions());
      }
      if (templateValue) setTemplates(hydrateWorkoutTemplates(JSON.parse(templateValue) as WorkoutTemplate[]));
      if (recoveryValue) setRecoveryLogs(JSON.parse(recoveryValue));
      if (cardioValue) setCardioLogs(JSON.parse(cardioValue));
      if (nutritionValue) {
        const savedNutrition = JSON.parse(nutritionValue) as NutritionProfile;
        setNutritionProfile((current) => ({ ...current, ...savedNutrition, customFoods: savedNutrition.customFoods ?? [] }));
      }
      if (mealsValue) {
        try {
          const parsedMeals = JSON.parse(mealsValue);
          if (Array.isArray(parsedMeals) && parsedMeals.length > 0) setMeals(parsedMeals);
        } catch {}
      }
      if (accountValue) {
        setAccountNameState(accountValue);
        void syncAccount(accountValue);
      }
      setHydrated(true);
    }).catch(() => setHydrated(true));
  }, [syncAccount]);

  useEffect(() => {
    if (hydrated) {
      AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
      AsyncStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
      AsyncStorage.setItem(RECOVERY_KEY, JSON.stringify(recoveryLogs));
      AsyncStorage.setItem(CARDIO_KEY, JSON.stringify(cardioLogs));
      AsyncStorage.setItem(NUTRITION_KEY, JSON.stringify(nutritionProfile));
      AsyncStorage.setItem(MEALS_KEY, JSON.stringify(meals));
      void backupToCloud();
    }
  }, [sessions, templates, recoveryLogs, cardioLogs, nutritionProfile, meals, hydrated, backupToCloud]);

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
  const getAccountState = useCallback((): AccountState => ({ sessions, templates, recoveryLogs, cardioLogs, nutritionProfile, meals, accountName }), [sessions, templates, recoveryLogs, cardioLogs, nutritionProfile, meals, accountName]);
  const applyAccountState = useCallback((state: Partial<AccountState>) => {
    if (Array.isArray(state.sessions)) {
      const remoteSessions = state.sessions.filter((session) => !session.id.startsWith("demo-legs-"));
      setSessions(mergeImportedWorkoutSessions(remoteSessions));
    }
    if (Array.isArray(state.templates)) setTemplates(hydrateWorkoutTemplates(state.templates));
    if (Array.isArray(state.recoveryLogs)) setRecoveryLogs(state.recoveryLogs);
    if (Array.isArray(state.cardioLogs)) setCardioLogs(state.cardioLogs);
    if (state.nutritionProfile) setNutritionProfile((current) => ({ ...current, ...state.nutritionProfile }));
    if (Array.isArray(state.meals) && state.meals.length > 0) setMeals(state.meals);
    if (state.accountName) setAccountNameState(state.accountName);
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
    sessions, recoveryLogs, cardioLogs, nutritionProfile, meals, templates, activeSession, activeTemplate: activeSession ? templates.find((template) => template.id === activeSession.templateId) ?? null : null, hydrated, accountName,
    setAccountName, syncAccount, backupToCloud, updateMeals,
    startWorkout, startWorkoutOnDate, startWorkoutFromTemplate, updateSet, updateActiveSession, finishWorkout, updateSession, deleteSession, discardActiveWorkout: () => setActiveSession(null), recentSessionFor, saveRecoveryLog, recentRecovery, saveCardioLog, updateNutritionProfile,
    updateTemplate, addCustomTemplate, addExercise, addCustomExercise, addExerciseFromLibrary, replaceExerciseFromLibrary, replaceActiveExerciseFromLibrary, addExerciseToActiveWorkout, addCustomExerciseToActiveWorkout, duplicateActiveExercise, addSetToActiveExercise, duplicateActiveSet, removeSetFromActiveExercise, removeExerciseFromActiveWorkout, updateExercise, deleteExercise, moveExercise, getAccountState, applyAccountState,
  }), [sessions, recoveryLogs, cardioLogs, nutritionProfile, meals, templates, activeSession, hydrated, accountName, backupToCloud, syncAccount]);

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkoutStore() { const value = useContext(WorkoutContext); if (!value) throw new Error("useWorkoutStore must be used inside WorkoutProvider"); return value; }
export function calculateVolume(session: WorkoutSession) { return session.sets.reduce((sum, set) => sum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0); }

export function sortWorkoutSessionsNewestFirst(sessions: WorkoutSession[]) {
  return [...sessions].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}