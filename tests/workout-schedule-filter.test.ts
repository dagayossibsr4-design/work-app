import { describe, expect, it } from "vitest";
import { workoutAudienceSections } from "../lib/workout-audience-sections";
import { workoutEncyclopediaCategories } from "../lib/workout-encyclopedia";
import { workoutTemplates } from "../lib/workout-data";


describe("workout audience sections", () => {
  it("keeps muscle-building outside and first, then men, women, kids and seniors", () => {
    expect(workoutAudienceSections.map((section) => section.id)).toEqual(["men", "women", "kids", "seniors", "cardio"]);
    expect(workoutAudienceSections.map((section) => section.title)).toEqual(["אימוני גברים", "נשים", "ילדים", "גיל שלישי", "אירובי"]);
  });

  it("covers every non-bodybuilding encyclopedia category exactly once", () => {
    const assignedCategoryIds = workoutAudienceSections.flatMap((section) => section.categoryIds);
    const expectedCategoryIds = workoutEncyclopediaCategories
      .filter((category) => category.id !== "bodybuilding")
      .map((category) => category.id);

    expect(new Set(assignedCategoryIds).size).toBe(assignedCategoryIds.length);
    expect(new Set(assignedCategoryIds)).toEqual(new Set(expectedCategoryIds));
  });

  it("places pilates and yoga under women rather than men", () => {
    const men = workoutAudienceSections.find((section) => section.id === "men");
    const women = workoutAudienceSections.find((section) => section.id === "women");
    expect(men?.categoryIds).not.toContain("pilates-barre");
    expect(men?.categoryIds).not.toContain("yoga-mobility");
    expect(women?.categoryIds).toEqual(["women-lower-body", "pilates-barre", "yoga-mobility"]);
  });

  it("keeps the women and cardio sections connected to full existing templates", () => {
    const directTemplateIds = workoutAudienceSections.flatMap((section) => section.templateIds ?? []);
    expect(directTemplateIds.length).toBe(10);
    expect(new Set(directTemplateIds).size).toBe(directTemplateIds.length);
    expect(directTemplateIds.every((id) => workoutTemplates.some((template) => template.id === id))).toBe(true);
  });
});
