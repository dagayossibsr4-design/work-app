import { describe, expect, it } from "vitest";
import { workoutCategoryTemplateIds } from "../lib/workout-category-content";
import { workoutGuideTemplates } from "../lib/workout-guide-templates";
import { workoutTemplates } from "../lib/workout-data";

const requiredGuideFolders = [
  "women-lower-body",
  "longevity",
  "kids-youth",
  "powerlifting",
  "olympic",
  "calisthenics",
  "functional-hybrid",
  "pilates-barre",
  "yoga-mobility",
  "combat",
  "rehab",
  "cardio-endurance",
  "kettlebell-trx",
] as const;

describe("workout guide content", () => {
  it("maps every guide folder to at least one concrete workout template", () => {
    requiredGuideFolders.forEach((folderId) => {
      const templateIds = workoutCategoryTemplateIds[folderId] ?? [];
      expect(templateIds.length).toBeGreaterThan(0);
      templateIds.forEach((templateId) => {
        expect(workoutTemplates.some((template) => template.id === templateId)).toBe(true);
      });
    });
  });

  it("keeps every added guide workout populated with exercises and targets", () => {
    expect(workoutGuideTemplates.length).toBeGreaterThanOrEqual(35);
    workoutGuideTemplates.forEach((template) => {
      expect(template.exercises.length).toBeGreaterThan(0);
      template.exercises.forEach((exercise) => {
        expect(exercise.sets.length).toBeGreaterThan(0);
        expect(exercise.sets[0]?.target.trim().length).toBeGreaterThan(0);
      });
    });
  });

  it("keeps PPL mapped to its seven existing complete workout cards", () => {
    expect(workoutCategoryTemplateIds.ppl).toEqual(["push1", "pull1", "legs1", "push2", "pull2", "legs2", "arms"]);
  });
});
