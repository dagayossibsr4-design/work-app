import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WorkoutTemplate } from "./workout-data";
import {
  enqueueAsyncStorageRemove,
  enqueueAsyncStorageSet,
} from "./storage-write-queue";

export const WORKOUT_SCHEDULE_KEY = "workout-schedule-overrides-v1";
export const DEFAULT_WORKOUT_TEMPLATE_KEY =
  "workout-schedule-default-template-v1";

export type ScheduleOverride = {
  kind?: "workout" | "cardio" | "rest";
  templateId?: string;
  label?: string;
  focus?: string;
  cardioTemplateId?: string;
};

export type ScheduleOverrides = Record<string, ScheduleOverride>;

export function getAllowedScheduleTemplates(
  templates: WorkoutTemplate[],
  selectedProgramIds: string[],
  defaultTemplateId: string | null,
  cardioTemplateIds: ReadonlySet<string>,
): WorkoutTemplate[] {
  const allowedStrengthIds = new Set(selectedProgramIds);
  if (defaultTemplateId) allowedStrengthIds.add(defaultTemplateId);

  return templates.filter(
    (template) =>
      cardioTemplateIds.has(template.id) ||
      allowedStrengthIds.has(template.id),
  );
}

export async function readDefaultWorkoutTemplateId(): Promise<string | null> {
  return AsyncStorage.getItem(DEFAULT_WORKOUT_TEMPLATE_KEY);
}

export async function setDefaultWorkoutTemplateId(
  templateId: string | null,
): Promise<void> {
  if (templateId) {
    await enqueueAsyncStorageSet(DEFAULT_WORKOUT_TEMPLATE_KEY, templateId);
  } else {
    await enqueueAsyncStorageRemove(DEFAULT_WORKOUT_TEMPLATE_KEY);
  }
}

export async function readWorkoutScheduleOverrides(): Promise<ScheduleOverrides> {
  const value = await AsyncStorage.getItem(WORKOUT_SCHEDULE_KEY);
  if (!value) return {};

  try {
    return JSON.parse(value) as ScheduleOverrides;
  } catch {
    return {};
  }
}

export async function assignWorkoutTemplateToDate(
  date: string,
  template: Pick<WorkoutTemplate, "id" | "name" | "focus">,
  kind: ScheduleOverride["kind"] = "workout",
): Promise<ScheduleOverrides> {
  const overrides = await readWorkoutScheduleOverrides();
  overrides[date] = {
    ...overrides[date],
    kind,
    templateId: template.id,
    label: template.name,
    focus: template.focus,
  };

  await enqueueAsyncStorageSet(
    WORKOUT_SCHEDULE_KEY,
    JSON.stringify(overrides),
  );
  return overrides;
}
