export type WeeklyGoals = {
  workouts: number;
  strengthVolume: number;
  load: number;
  cardioDistance: number;
  cardioCalories: number;
  sleepHours: number;
  recoveryScore: number;
};

export const WEEKLY_GOALS_KEY = "workout-tracker-weekly-goals-v1";

export const DEFAULT_WEEKLY_GOALS: WeeklyGoals = {
  workouts: 4,
  strengthVolume: 40000,
  load: 120,
  cardioDistance: 20,
  cardioCalories: 1500,
  sleepHours: 56,
  recoveryScore: 525,
};

export function normalizeWeeklyGoals(value: Partial<WeeklyGoals> | null | undefined): WeeklyGoals {
  return Object.fromEntries(Object.entries(DEFAULT_WEEKLY_GOALS).map(([key, fallback]) => {
    const candidate = Number(value?.[key as keyof WeeklyGoals]);
    return [key, Number.isFinite(candidate) && candidate >= 0 ? candidate : fallback];
  })) as WeeklyGoals;
}
