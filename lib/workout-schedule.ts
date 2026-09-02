import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WorkoutTemplate } from "./workout-data";
import type { PersonalProgram } from "./workout-store";
import { enqueueAsyncStorageRemove, enqueueAsyncStorageSet } from "./storage-write-queue";
import { muscleBuildingFolderTemplateIds } from "./muscle-building-content";

export const WORKOUT_SCHEDULE_KEY = "workout-schedule-overrides-v1";
export const DEFAULT_WORKOUT_TEMPLATE_KEY = "workout-schedule-default-template-v1";

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
  personalPrograms: PersonalProgram[] = [],
): WorkoutTemplate[] {
  const personalTemplateIds = new Set(
    personalPrograms
      .filter((program) => selectedProgramIds.includes(program.id))
      .flatMap((program) => program.workoutTemplateIds),
  );
  const allowedStrengthIds = new Set(
    selectedProgramIds.flatMap((id) =>
      muscleBuildingFolderTemplateIds[id as keyof typeof muscleBuildingFolderTemplateIds] ?? [id],
    ),
  );
  personalTemplateIds.forEach((id) => allowedStrengthIds.add(id));
  if (defaultTemplateId) allowedStrengthIds.add(defaultTemplateId);
  return templates.filter((template) => cardioTemplateIds.has(template.id) || allowedStrengthIds.has(template.id));
}

export async function readDefaultWorkoutTemplateId(): Promise<string | null> {
  return AsyncStorage.getItem(DEFAULT_WORKOUT_TEMPLATE_KEY);
}

export async function setDefaultWorkoutTemplateId(templateId: string | null): Promise<void> {
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

export async function assignWorkoutTemplateToDate(date: string, template: Pick<WorkoutTemplate, "id" | "name" | "focus">, kind: ScheduleOverride["kind"] = "workout") {
  const overrides = await readWorkoutScheduleOverrides();
  overrides[date] = {
    ...overrides[date],
    kind,
    templateId: template.id,
    label: template.name,
    focus: template.focus,
  };
  await AsyncStorage.setItem(WORKOUT_SCHEDULE_KEY, JSON.stringify(overrides));
  return overrides;
}
