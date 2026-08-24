import { foodItems, macrosForGrams } from "./food-nutrition";
import type { WeightMode } from "./cooking-weight";

export type MealFood = {
  id: string;
  name: string;
  quantity: string;
  reference: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
  weightMode?: WeightMode;
  /** משקל הבסיס שאליו שייכים ערכי המאקרו שנשמרו ברכיב. */
  servingGrams?: number;
  /** ערכים שהוזנו ידנית עבור הכמות השמורה בכרטיס. */
  manualNutrition?: boolean;
};
export type Meal = { id: string; title: string; foods: MealFood[] };

const rawDefaultMeals: Meal[] = [
  {
    id: "meal-1",
    title: "ארוחה 1 — בוקר",
    foods: [
      {
        id: "protein-pudding",
        name: "מעדן חלבון",
        quantity: "200 גרם",
        reference: "מוצר מסחרי — לפי תווית",
        calories: 140,
        protein: 20,
        carbohydrates: 6.8,
        fats: 3,
      },
      {
        id: "protein-powder-1",
        name: "אבקת חלבון",
        quantity: "36 גרם (כף 1)",
        reference: "לפי תווית המוצר",
        calories: 140,
        protein: 25,
        carbohydrates: 3,
        fats: 3,
      },
      {
        id: "whole-bread-1",
        name: "לחם מלא אקטיבי",
        quantity: "108 גרם",
        reference: "לפי תווית המוצר",
        calories: 252,
        protein: 11.7,
        carbohydrates: 38,
        fats: 3.1,
      },
      {
        id: "tahini-1",
        name: "טחינה גולמית",
        quantity: "25 גרם",
        reference: "מזון ייחוס",
        calories: 175,
        protein: 5.1,
        carbohydrates: 3.3,
        fats: 15.7,
      },
    ],
  },
  {
    id: "meal-2",
    title: "ארוחה 2 — ביניים",
    foods: [
      {
        id: "protein-powder-2",
        name: "אבקת חלבון",
        quantity: "46 גרם",
        reference: "תווית Dymatize + מדידה אישית · 46 גרם אבקה = 30 ג׳ חלבון",
        servingGrams: 46,
        calories: 179,
        protein: 30,
        carbohydrates: 3.9,
        fats: 3.9,
      },
      {
        id: "oats-2",
        name: "שיבולת שועל",
        quantity: "14 גרם",
        reference: "יבשה",
        calories: 52,
        protein: 1.5,
        carbohydrates: 9.7,
        fats: 1.1,
      },
      {
        id: "walnuts-2",
        name: "אגוזי מלך",
        quantity: "25 גרם",
        reference: "מזון ייחוס",
        calories: 164,
        protein: 3.8,
        carbohydrates: 3.4,
        fats: 16.3,
      },
    ],
  },
  {
    id: "meal-3",
    title: "ארוחה 3 — צהריים",
    foods: [
      {
        id: "chicken-3",
        name: "חזה עוף מבושל",
        quantity: "200 גרם",
        reference: "לאחר בישול",
        calories: 330,
        protein: 62,
        carbohydrates: 0,
        fats: 7.2,
      },
      {
        id: "rice-3",
        name: "אורז לבן מבושל",
        quantity: "152 גרם",
        reference: "לאחר בישול",
        calories: 175,
        protein: 3.4,
        carbohydrates: 36.6,
        fats: 0.4,
      },
      {
        id: "vegetables-3",
        name: "ירקות",
        quantity: "150 גרם",
        reference: "ללא שמן",
        calories: 30,
        protein: 2,
        carbohydrates: 4,
        fats: 0,
      },
    ],
  },
  {
    id: "meal-4",
    title: "ארוחה 4 — אחר הצהריים",
    foods: [
      {
        id: "chicken-4",
        name: "חזה עוף מבושל",
        quantity: "110 גרם",
        reference: "לאחר בישול",
        calories: 181,
        protein: 33.1,
        carbohydrates: 0,
        fats: 4,
      },
      {
        id: "rice-4",
        name: "אורז לבן מבושל",
        quantity: "46 גרם",
        reference: "לאחר בישול",
        calories: 49,
        protein: 1,
        carbohydrates: 11.1,
        fats: 0,
      },
    ],
  },
  {
    id: "meal-5",
    title: "ארוחה 5 — ערב",
    foods: [
      {
        id: "salmon-5",
        name: "פילה סלמון",
        quantity: "4 יחידות / לפי משקל",
        reference: "לאחר בישול או לפי תווית",
        calories: 206,
        protein: 27.3,
        carbohydrates: 0,
        fats: 20,
      },
      {
        id: "cottage-5",
        name: "קוטג׳ 5%",
        quantity: "100 גרם",
        reference: "לפי תווית המוצר",
        calories: 95,
        protein: 11,
        carbohydrates: 1.5,
        fats: 5,
      },
      {
        id: "sweet-potato-5",
        name: "תפוח אדמה מתוק מבושל",
        quantity: "166 גרם",
        reference: "לאחר בישול",
        calories: 144,
        protein: 3,
        carbohydrates: 30.1,
        fats: 0,
      },
      {
        id: "omega-3-5",
        name: "כמוסות אומגה 3",
        quantity: "3 כמוסות",
        reference: "לפי תווית התוסף",
        calories: 34,
        protein: 0,
        carbohydrates: 0,
        fats: 3.8,
      },
    ],
  },
];

function sourceForMealFood(food: MealFood) {
  const normalizedName = food.name.trim().toLowerCase();
  const byName = foodItems.find(
    (item) =>
      item.name.trim().toLowerCase() === normalizedName ||
      (item.aliases ?? []).some(
        (alias) => alias.trim().toLowerCase() === normalizedName,
      ),
  );
  // שם התווית המוצג למשתמש הוא מקור האמת במיגרציה: בגרסאות ישנות
  // נשמר לעתים מזהה של חזה עוף תחת השם "מעדן חלבון".
  if (byName) return byName;
  const byId = foodItems.find(
    (item) => food.id === item.id || food.id.startsWith(`${item.id}-`),
  );
  return byId;
}

export function normalizeMealsTo100Grams(meals: Meal[]): Meal[] {
  return meals.map((meal) => ({
    ...meal,
    foods: meal.foods.map((food) => {
      if (food.manualNutrition) {
        const gramsMatch = food.quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)\s*גרם/);
        const currentGrams = gramsMatch ? Number(gramsMatch[1]) : undefined;
        return {
          ...food,
          servingGrams: food.servingGrams ?? currentGrams ?? 100,
        };
      }
      const source = sourceForMealFood(food);
      if (source) {
        const explicitGrams = food.quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)\s*גרם/)?.[1];
        const portionGrams = Number(explicitGrams ?? source.servingGrams ?? 100);
        return {
          ...food,
          name: source.name,
          quantity: `${portionGrams} גרם`,
          reference: source.reference,
          weightMode: food.weightMode ?? "cooked",
          servingGrams: portionGrams,
          ...macrosForGrams(source, portionGrams),
        };
      }
      const gramsMatch = food.quantity.match(/^\\s*([0-9]+(?:\\.[0-9]+)?)\\s*גרם/);
      const savedGrams = gramsMatch ? Number(gramsMatch[1]) : 0;
      if (!savedGrams || savedGrams === 100) return { ...food, servingGrams: food.servingGrams ?? 100 };
      const factor = 100 / savedGrams;
      return {
        ...food,
        quantity: "100 גרם",
        weightMode: food.weightMode ?? "cooked",
        calories: Math.round(food.calories * factor),
        protein: Math.round(food.protein * factor * 10) / 10,
        carbohydrates: Math.round(food.carbohydrates * factor * 10) / 10,
        fats: Math.round(food.fats * factor * 10) / 10,
      };
    }),
  }));
}

export const defaultMeals: Meal[] = normalizeMealsTo100Grams(rawDefaultMeals);

export function mealFoodTotals(food: MealFood) {
  const quantityMatch = food.quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)/);
  const currentGrams = quantityMatch ? Number(quantityMatch[1]) : null;
  if (food.manualNutrition) {
    const baseGrams = food.servingGrams ?? currentGrams;
    const factor = baseGrams && currentGrams ? currentGrams / baseGrams : 1;
    return {
      calories: Math.round(food.calories * factor),
      protein: Math.round(food.protein * factor * 10) / 10,
      carbohydrates: Math.round(food.carbohydrates * factor * 10) / 10,
      fats: Math.round(food.fats * factor * 10) / 10,
    };
  }
  const source = sourceForMealFood(food);
  if (source && currentGrams) {
    return macrosForGrams(source, currentGrams);
  }
  const baseGrams = food.servingGrams ?? currentGrams;
  const factor = baseGrams && currentGrams ? currentGrams / baseGrams : 1;
  return {
    calories: Math.round(food.calories * factor),
    protein: Math.round(food.protein * factor * 10) / 10,
    carbohydrates: Math.round(food.carbohydrates * factor * 10) / 10,
    fats: Math.round(food.fats * factor * 10) / 10,
  };
}
export function mealTotals(meal: Meal) {
  return meal.foods.reduce(
    (sum, food) => {
      const current = mealFoodTotals(food);
      return {
        calories: sum.calories + current.calories,
        protein: sum.protein + current.protein,
        carbohydrates: sum.carbohydrates + current.carbohydrates,
        fats: sum.fats + current.fats,
      };
    },
    { calories: 0, protein: 0, carbohydrates: 0, fats: 0 },
  );
}
export function dailyMealTotals(meals: Meal[]) {
  return meals.reduce(
    (sum, meal) => {
      const t = mealTotals(meal);
      return {
        calories: sum.calories + t.calories,
        protein: sum.protein + t.protein,
        carbohydrates: sum.carbohydrates + t.carbohydrates,
        fats: sum.fats + t.fats,
      };
    },
    { calories: 0, protein: 0, carbohydrates: 0, fats: 0 },
  );
}
