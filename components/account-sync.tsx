import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { hydrateMealPlan, type Meal } from "@/lib/meal-plan";
import { useWorkoutStore, type AccountState } from "@/lib/workout-store";
import {
  NUTRITION_PERSISTENCE_KEYS,
  setNutritionCloudSaveStatus,
  subscribeNutritionCloudSave,
} from "@/lib/nutrition-persistence";

const LOCAL_KEYS = [
  ...NUTRITION_PERSISTENCE_KEYS,
  "workout-schedule-overrides-v1",
  "weekly-goals-v1",
] as const;

type StoredAccountState = Partial<AccountState> & {
  localStorage?: Record<string, string>;
};

function repairCloudMealStorage(localStorage: Record<string, string>) {
  const repaired = { ...localStorage };
  try {
    const state = JSON.parse(repaired["meal-plan-state"] ?? "{}") as { meals?: Meal[] };
    if (Array.isArray(state.meals)) {
      repaired["meal-plan-state"] = JSON.stringify({ ...state, meals: hydrateMealPlan(state.meals) });
    }
  } catch {
    // שמירת ענן פגומה לא תעצור את טעינת שאר הנתונים המקומיים.
  }
  try {
    const history = JSON.parse(repaired["meal-plan-day-history"] ?? "{}") as Record<string, { meals?: Meal[]; eaten?: Record<string, boolean> }>;
    repaired["meal-plan-day-history"] = JSON.stringify(Object.fromEntries(Object.entries(history).map(([date, snapshot]) => [date, {
      ...snapshot,
      meals: Array.isArray(snapshot?.meals) ? hydrateMealPlan(snapshot.meals) : [],
    }])));
  } catch {
    // אין היסטוריה תקינה לתיקון.
  }
  return repaired;
}

/** Saves each authenticated Supabase user's workout account independently. */
export function AccountSync() {
  const { hydrated, getAccountState, applyAccountState } = useWorkoutStore();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [syncReady, setSyncReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabase) {
      setNutritionCloudSaveStatus("failed");
      setSyncReady(true);
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setAccountId(data.session?.user.id ?? null);
      setSyncReady(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccountId(session?.user.id ?? null);
      setSyncReady(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!supabase || !accountId) {
      setNutritionCloudSaveStatus("idle");
      setSyncReady(true);
      return;
    }
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("account_state")
        .select("payload")
        .eq("account_id", accountId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        console.warn("Unable to load cloud account state", error.message);
        setNutritionCloudSaveStatus("failed");
      } else if (data?.payload && typeof data.payload === "object") {
        const remote = data.payload as StoredAccountState;
        applyAccountState(remote);
        if (remote.localStorage) await AsyncStorage.multiSet(Object.entries(repairCloudMealStorage(remote.localStorage)));
      }
      setSyncReady(true);
    })();
    return () => {
      active = false;
    };
  }, [accountId, applyAccountState, hydrated]);

  const saveSnapshot = useCallback(async () => {
    if (!supabase || !accountId) return false;
    setNutritionCloudSaveStatus("saving");
    try {
      const pairs = await AsyncStorage.multiGet([...LOCAL_KEYS]);
      const localStorage = Object.fromEntries(pairs.filter(([, value]) => value !== null)) as Record<string, string>;
      const { error } = await supabase.from("account_state").upsert(
        { account_id: accountId, payload: { ...getAccountState(), localStorage }, updated_at: new Date().toISOString() },
        { onConflict: "account_id" },
      );
      if (error) {
        console.warn("Unable to save cloud account state", error.message);
        setNutritionCloudSaveStatus("failed");
        return false;
      }
      setNutritionCloudSaveStatus("saved");
      return true;
    } catch (error) {
      console.warn("Unexpected cloud account save failure", error);
      setNutritionCloudSaveStatus("failed");
      return false;
    }
  }, [accountId, getAccountState]);

  useEffect(() => subscribeNutritionCloudSave(() => {
    if (!hydrated || !syncReady || !accountId) return;
    void saveSnapshot();
  }), [accountId, hydrated, saveSnapshot, syncReady]);

  useEffect(() => {
    if (!hydrated || !syncReady || !accountId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void saveSnapshot(); }, 900);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [accountId, hydrated, saveSnapshot, syncReady]);

  useEffect(() => {
    if (!hydrated || !syncReady || !accountId) return;
    const timer = setInterval(() => { void saveSnapshot(); }, 4000);
    return () => clearInterval(timer);
  }, [accountId, hydrated, saveSnapshot, syncReady]);

  return null;
}
