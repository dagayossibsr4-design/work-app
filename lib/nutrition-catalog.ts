import { caloriesPer100g, foodSubgroupFor, type FoodGroup, type FoodItem, type FoodSubgroup } from "./food-nutrition";

export const nutritionSubgroupOrder: FoodSubgroup[] = [
  "עופות",
  "בשר",
  "דגים",
  "גבינות ומוצרי חלב",
  "ביצים",
  "קטניות ותחליפים",
  "משקאות חלבון",
  "אבקות חלבון",
  "חטיפי חלבון",
  "חטיפי בריאות ודגנים",
  "לחמים ומאפים",
  "פסטות ודגנים",
  "סלטים קנויים",
  "ממרחים ורטבים",
  "שמנים, אגוזים וזרעים",
  "חטיפים ומוצרים מוכנים",
  "פחמימות",
  "פירות וירקות",
  "שונות",
];

export type NutritionCatalogFilters = {
  query?: string;
  group?: FoodGroup | "הכול";
  subgroup?: FoodSubgroup | "הכול";
};

export function filterAndSortNutritionFoods(foods: FoodItem[], filters: NutritionCatalogFilters = {}) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const group = filters.group ?? "הכול";
  const subgroup = filters.subgroup ?? "הכול";

  return foods
    .filter((food) => {
      const searchable = `${food.name} ${food.group} ${foodSubgroupFor(food)} ${food.reference}`.toLowerCase();
      return (
        (!query || searchable.includes(query)) &&
        (group === "הכול" || food.group === group) &&
        (subgroup === "הכול" || foodSubgroupFor(food) === subgroup)
      );
    })
    .sort((a, b) =>
      (nutritionSubgroupOrder.indexOf(foodSubgroupFor(a)) - nutritionSubgroupOrder.indexOf(foodSubgroupFor(b))) ||
      (caloriesPer100g(a) - caloriesPer100g(b)) ||
      a.name.localeCompare(b.name, "he"),
    );
}

export function upsertCustomFood(foods: FoodItem[], item: FoodItem, editingId?: string | null) {
  return editingId ? foods.map((food) => (food.id === editingId ? item : food)) : [item, ...foods];
}

export function removeCustomFood(foods: FoodItem[], id: string) {
  return foods.filter((food) => food.id !== id);
}

export function duplicateCustomFood(item: FoodItem, id = `custom-food-copy-${Date.now()}`): FoodItem {
  return { ...item, id, name: `${item.name} — עותק`, sourceType: "אישי", changeHistory: undefined };
}
