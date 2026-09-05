import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WorkoutTemplate } from "./workout-data";
import type { PersonalProgram } from "./workout-store";
import { enqueueAsyncStorageRemove, enqueueAsyncStorageSet } from "./storage-write-queue";
import { muscleBuildingFolderTemplateIds } from "./muscle-building-content";
import { canonicalProgramSelectionId } from "./workout-program-selection";
import { getWorkoutEncyclopediaProgram } from "./workout-encyclopedia";

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
    selectedProgramIds.flatMap((id) => {
      const canonicalId = canonicalProgramSelectionId(id);
      return muscleBuildingFolderTemplateIds[canonicalId as keyof typeof muscleBuildingFolderTemplateIds] ?? [canonicalId];
    }),
  );
  personalTemplateIds.forEach((id) => allowedStrengthIds.add(id));
  if (defaultTemplateId) allowedStrengthIds.add(defaultTemplateId);
  return templates.filter((template) => cardioTemplateIds.has(template.id) || allowedStrengthIds.has(template.id));
}

export function getScheduleProgramTitle(templateId: string, selectedProgramIds: readonly string[], personalPrograms: PersonalProgram[] = []): string | undefined {
  const personalProgram = personalPrograms.find((program) => program.workoutTemplateIds.includes(templateId));
  if (personalProgram) return personalProgram.name;

  const parentId = selectedProgramIds.map(canonicalProgramSelectionId).find((id) => {
    const childTemplateIds = muscleBuildingFolderTemplateIds[id as keyof typeof muscleBuildingFolderTemplateIds];
    return childTemplateIds?.includes(templateId) ?? false;
  });
  if (!parentId) return undefined;
  return getWorkoutEncyclopediaProgram(parentId)?.title ?? parentId.toUpperCase();
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

export type TodaySchedule =
  | { status: "none" }
  | { status: "rest" }
  | { status: "workout"; templateId: string; label: string; focus: string };

/**
 * Resolves what today's schedule card should show, given the raw override
 * for today's date (from readWorkoutScheduleOverrides) and the templates
 * currently allowed by the user's selected programs (from
 * getAllowedScheduleTemplates) - the same validation the schedule screen
 * itself applies, so a stale templateId from a since-removed program never
 * renders as "today's workout".
 */
export function resolveTodaySchedule(
  override: ScheduleOverride | undefined,
  allowedTemplates: Pick<WorkoutTemplate, "id" | "name" | "focus">[],
): TodaySchedule {
  if (!override) return { status: "none" };
  if (override.kind === "rest") return { status: "rest" };
  const templateId = override.templateId ?? override.cardioTemplateId;
  const template = templateId ? allowedTemplates.find((item) => item.id === templateId) : undefined;
  if (!template) return { status: "none" };
  return { status: "workout", templateId: template.id, label: template.name, focus: template.focus };
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
