import { foodItems, macrosForGrams, type FoodGroup, type FoodItem } from "./food-nutrition";
import type { WeightMode } from "./cooking-weight";

export type MealFood = {
  id: string;
  name: string;
  quantity: string;
  reference: string;
  /** קבוצת המזון המקורית, כדי שכלי התאמת מאקרו יוכל להבחין בין ירק לבין מקור פחמימה. */
  foodGroup?: FoodGroup;
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
  weightMode?: WeightMode;
  /** משקל הבסיס שאליו שייכים ערכי המאקרו שנשמרו ברכיב. */
  servingGrams?: number;
  /** ערכים שהוזנו ידנית עבור הכמות השמורה בכרטיס. */
  manualNutrition?: boolean;
  /** הכמות שהמשתמש שמר בפועל; גוברת על ערכי בסיס של קטלוג המזון. */
  quantityGrams?: number;
  /** מסמן שהכמות נוקתה באיפוס היומי, כדי שאפס יישמר גם לאחר הידרציה. */
  dailyQuantityCleared?: boolean;
};
export type MealMacroTargets = Partial<{
  protein: number;
  carbohydrates: number;
  fats: number;
}>;
export type Meal = { id: string; title: string; foods: MealFood[]; targetMacros?: MealMacroTargets };

/** מחלץ את מספר הגרמים מתווית כמות ומחזיר fallback בטוח רק כשהתווית אינה תקינה. */
export function gramsFromMealQuantity(quantity: string, fallback = 100): number {
  const parsed = Number(quantity.trim().replace(",", ".").match(/^([0-9]+(?:\.[0-9]+)?)/)?.[1]);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed * 10) / 10;
}

/** מאפס את הכמויות היומיות אך משאיר את שמות הארוחות, הרכיבים והקטלוג במקומם. */
export function clearMealPlanQuantities(meals: Meal[]): Meal[] {
  return meals.map((meal) => ({
    ...meal,
    foods: (Array.isArray(meal.foods) ? meal.foods : []).map((food) => ({
      ...food,
      quantity: /^\s*[0-9]+(?:[.,][0-9]+)?\s*(?:יחידות?|כמוסות?|מנות?|מ״ל|מ"ל|מיליליטר)/.test(food.quantity)
        ? "0 יחידות"
        : "0 גרם",
      quantityGrams: 0,
      dailyQuantityCleared: true,
    })),
  }));
}

/** חישוב מקומי חסין ל־SSR עבור רכיבי ארוחה; תומך ב־100 גרם, יחידה, גביע, מנה ואריזה. */
function mealMacrosForFoodQuantity(food: FoodItem, grams: number) {
  const basis = food.nutritionBasis ?? "100g";
  if (basis === "100g") return macrosForGrams(food, grams);
  const referenceGrams = food.unitGrams ?? food.servingGrams;
  const referenceAmount = food.referenceAmount ?? 1;
  if (!Number.isFinite(referenceGrams) || referenceGrams <= 0 || referenceAmount <= 0) {
    return macrosForGrams(food, grams);
  }
  const factor = (grams / referenceGrams) / referenceAmount;
  return {
    calories: Math.round(food.calories * factor),
    protein: Math.round(food.protein * factor * 10) / 10,
    carbohydrates: Math.round(food.carbohydrates * factor * 10) / 10,
    fats: Math.round(food.fats * factor * 10) / 10,
  };
}

/**
 * יוצר עותק עצמאי של ארוחה. הסיומת ניתנת מבחוץ כדי לאפשר בדיקה דטרמיניסטית,
 * ובמסך עצמו היא נוצרת עם חותמת זמן ומחרוזת אקראית קצרה.
 */
export function cloneMeal(meal: Meal, suffix: string): Meal {
  const safeSuffix = suffix.trim() || "copy";
  const mealId = `${meal.id}-copy-${safeSuffix}`;
  return {
    ...meal,
    id: mealId,
    title: `${meal.title} — עותק`,
    foods: meal.foods.map((food, index) => ({
      ...food,
      id: `${food.id}-copy-${safeSuffix}-${index + 1}`,
    })),
  };
}

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

const legacyProducePattern = /ירקות?|סלט\s*ירקות|עגבנ|מלפפון|חסה|גזר|ברוקולי|כרוב|קישוא|פלפל|בצל|פטרי|תרד|אספרגוס|קולורבי|סלק|סלרי|צנון|בננה|תפוח(?:\s*עץ)?|פירות|תות|אוכמנ|ענב|מנגו|קיווי|אבטיח|מלון|אננס|אפרסק|אגס|תפוז|קלמנטינה|אשכולית|שזיף|נקטרינה|vegetable|tomato|cucumber|lettuce|broccoli|zucchini|cabbage|carrot|spinach|banana|apple|berries|fruit|grape|mango|kiwi|watermelon|pineapple|orange|pear|peach/i;

/** מחזיר את קבוצת המזון המקורית של רכיב בארוחה, גם עבור ארוחות ישנות שלא שמרו אותה במפורש. */
export function foodGroupForMealFood(food: MealFood): FoodGroup | undefined {
  const savedOrCatalogGroup = food.foodGroup ?? sourceForMealFood(food)?.group;
  if (savedOrCatalogGroup) return savedOrCatalogGroup;
  const legacyText = `${food.id} ${food.name} ${food.reference}`;
  return legacyProducePattern.test(legacyText) ? "ירק ופרי" : undefined;
}

function explicitGramsFromQuantity(quantity: string): number | undefined {
  const match = quantity.match(/^\s*([0-9]+(?:[.,][0-9]+)?)\s*גרם/);
  if (!match) return undefined;
  const grams = Number(match[1].replace(",", "."));
  return Number.isFinite(grams) && grams > 0 ? grams : undefined;
}

function safeSavedGrams(food: MealFood): number | undefined {
  const stored = Number(food.quantityGrams);
  if (Number.isFinite(stored) && stored >= 1 && stored <= 5000) return stored;
  const explicit = explicitGramsFromQuantity(food.quantity);
  return explicit !== undefined && explicit >= 1 && explicit <= 5000 ? explicit : undefined;
}

export function normalizeMealsTo100Grams(meals: Meal[]): Meal[] {
  return meals.map((meal) => ({
    ...meal,
    foods: (Array.isArray(meal.foods) ? meal.foods : []).map((food) => {
      const explicitGrams = explicitGramsFromQuantity(food.quantity);
      const explicitIsSane = explicitGrams !== undefined && explicitGrams >= 1 && explicitGrams <= 5000;
      if (food.manualNutrition) {
        const currentGrams = explicitIsSane ? explicitGrams : safeSavedGrams(food);
        return {
          ...food,
          servingGrams: food.servingGrams ?? currentGrams ?? 100,
          ...(currentGrams !== undefined ? { quantityGrams: currentGrams } : {}),
        };
      }
      const source = sourceForMealFood(food);
      if (source) {
        const storedGrams = Number(food.quantityGrams);
        const storedIsSane = Number.isFinite(storedGrams) && storedGrams >= 1 && storedGrams <= 5000;
        const portionGrams = storedIsSane ? storedGrams : (explicitIsSane ? explicitGrams! : source.servingGrams);
        const quantityIsGrams = storedIsSane || explicitIsSane;
        if (!quantityIsGrams && !explicitGrams) {
          return { ...food, name: source.name, reference: source.reference, weightMode: food.weightMode ?? "cooked" };
        }
        return {
          ...food,
          name: source.name,
          quantity: `${portionGrams} גרם`,
          reference: source.reference,
          foodGroup: food.foodGroup ?? source.group,
          weightMode: food.weightMode ?? "cooked",
          servingGrams: portionGrams,
          quantityGrams: portionGrams,
          ...mealMacrosForFoodQuantity(source, portionGrams),
        };
      }
      // מזון אישי או שורה ביחידה שאינה גרם נשמרים כפי שהוזנו. אין להמיר
      // ערך מאקרו ל־100 גרם, כי פעולה זו גרמה בעבר ל־0.2 ולערכי ענק.
      const storedGrams = safeSavedGrams(food);
      return {
        ...food,
        ...(storedGrams !== undefined ? { quantityGrams: storedGrams, servingGrams: food.servingGrams ?? storedGrams } : {}),
        weightMode: food.weightMode ?? "cooked",
      };
    }),
  }));
}

export const defaultMeals: Meal[] = normalizeMealsTo100Grams(rawDefaultMeals);

/**
 * משחזר רק ארוחות מובנות שנשמרו בטעות בלי רכיבים. ארוחה אישית נשארת כפי
 * שהמשתמש יצר אותה, ולכן אין כאן יצירה אוטומטית של רכיבים בארוחות חדשות.
 */
export function restoreDefaultMealFoods(meals: Meal[]): Meal[] {
  const defaultsById = new Map(defaultMeals.map((meal) => [meal.id, meal]));
  return meals.map((meal) => {
    const foods = Array.isArray(meal.foods) ? meal.foods : [];
    const fallback = defaultsById.get(meal.id);
    if (foods.length > 0 || !fallback) return { ...meal, foods };
    return {
      ...meal,
      title: meal.title?.trim() || fallback.title,
      foods: fallback.foods.map((food) => ({ ...food })),
    };
  });
}

/** מתקן רק שמירה ישנה וחלקית שבה חסרות ארוחות ברירת מחדל. */
export function restoreMissingDefaultMealSlots(meals: Meal[]): Meal[] {
  const existingById = new Map(meals.map((meal) => [meal.id, meal]));
  const defaultIds = new Set(defaultMeals.map((meal) => meal.id));
  const restoredDefaults = defaultMeals.map(
    (defaultMeal) =>
      existingById.get(defaultMeal.id) ?? {
        ...defaultMeal,
        foods: defaultMeal.foods.map((food) => ({ ...food })),
      },
  );
  return [...restoredDefaults, ...meals.filter((meal) => !defaultIds.has(meal.id))];
}

/** מנרמל ארוחות קיימות ומתקן מידע פגום לפני שהוא מגיע למסך או לשמירה. */
export function hydrateMealPlan(meals: Meal[]): Meal[] {
  return restoreDefaultMealFoods(normalizeMealsTo100Grams(meals));
}

export function mealFoodTotals(food: MealFood) {
  if (food.dailyQuantityCleared) {
    return { calories: 0, protein: 0, carbohydrates: 0, fats: 0 };
  }
  const quantityMatch = food.quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)/);
  const currentGrams = Number.isFinite(food.quantityGrams) ? Number(food.quantityGrams) : quantityMatch ? Number(quantityMatch[1]) : null;
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
    return mealMacrosForFoodQuantity(source, currentGrams);
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

/** מחשב רק רכיבים שסומנו כנאכלו, בלי לשנות את ארוחות התכנון עצמן. */
export function eatenMealTotals(meals: Meal[], eaten: Record<string, boolean>) {
  return meals
    .flatMap((meal) => meal.foods.map((food) => ({ meal, food })))
    // תומך גם בנתונים חדשים לפי רכיב וגם בנתונים היסטוריים שסימנו ארוחה שלמה.
    .filter(({ meal, food }) => eaten[food.id] || eaten[meal.id])
    .map(({ food }) => food)
    .reduce(
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
