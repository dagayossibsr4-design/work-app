import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useWorkoutStore, type AccountState } from "@/lib/workout-store";

const LOCAL_KEYS = [
  "meal-plan-state",
  "meal-plan-eaten-history",
  "meal-plan-favorite",
  "meal-plan-profiles",
  "meal-plan-versions",
  "nutrition-water-history",
  "nutrition-water-events",
  "nutrition-daily-history",
  "workout-schedule-overrides-v1",
  "weekly-goals-v1",
] as const;

/** Synchronizes the core workout state for the authenticated user. */
export function AccountSync() {
  const { isAuthenticated } = useAuth();
  const { hydrated, getAccountState, applyAccountState } = useWorkoutStore();
  const remoteState = trpc.appState.get.useQuery(undefined, { enabled: isAuthenticated });
  const saveRemoteState = trpc.appState.save.useMutation();
  const remoteApplied = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveSnapshot = useCallback(async () => {
    const pairs = await AsyncStorage.multiGet([...LOCAL_KEYS]);
    const localStorage = Object.fromEntries(
      pairs.filter(([, value]) => value !== null),
    ) as Record<string, string>;
    saveRemoteState.mutate({ payload: { ...getAccountState(), localStorage } });
  }, [getAccountState, saveRemoteState]);

  useEffect(() => {
    if (!isAuthenticated) {
      remoteApplied.current = false;
      return;
    }
    if (!remoteState.isSuccess || remoteApplied.current) return;
    if (remoteState.data) {
      const remote = remoteState.data as Partial<AccountState> & {
        localStorage?: Record<string, string>;
      };
      applyAccountState(remote);
      if (remote.localStorage) void AsyncStorage.multiSet(Object.entries(remote.localStorage));
    }
    remoteApplied.current = true;
  }, [applyAccountState, isAuthenticated, remoteState.data, remoteState.isSuccess]);

  useEffect(() => {
    if (!isAuthenticated || !hydrated || !remoteApplied.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void saveSnapshot(); }, 900);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hydrated, isAuthenticated, saveSnapshot]);

  useEffect(() => {
    if (!isAuthenticated || !hydrated || !remoteApplied.current) return;
    const timer = setInterval(() => { void saveSnapshot(); }, 4000);
    return () => clearInterval(timer);
  }, [hydrated, isAuthenticated, saveSnapshot]);

  return null;
}
