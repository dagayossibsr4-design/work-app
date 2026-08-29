import {
  foodItems,
  foodSubgroupFor,
  macrosForFoodQuantity,
  type FatLevel,
  type FoodItem,
  type FoodSubgroup,
  type NutritionBasis,
} from "./food-nutrition";

export type ConversionGroup = "חלבון" | "פחמימה" | "שומן";

export type ConversionFood = {
  id: string;
  sourceFoodId?: string;
  name: string;
  group: ConversionGroup;
  subgroup?: FoodSubgroup;
  fatLevel?: FatLevel;
  reference?: string;
  servingGrams?: number;
  nutritionBasis?: NutritionBasis;
  unitGrams?: number;
  referenceAmount?: number;
  referenceUnit?: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
  aliases?: string[];
};

/**
 * רשימת התאימות הישנה נשמרת כדי לא לשנות היסטוריית המרות או בדיקות קיימות.
 * המסכים החדשים משתמשים ב־catalogConversionFoods, שמבוסס על כל מאגר המזון.
 */
export const conversionFoods: ConversionFood[] = [
  { id: "chicken-cooked", name: "חזה עוף", group: "חלבון", subgroup: "עופות", fatLevel: "דל שומן", calories: 165, protein: 31, carbohydrates: 0, fats: 3.6 },
  { id: "turkey-cooked", name: "חזה הודו", group: "חלבון", subgroup: "עופות", fatLevel: "דל שומן", calories: 135, protein: 29, carbohydrates: 0, fats: 1.6 },
  { id: "baramundi-cooked", name: "ברמונדי", group: "חלבון", subgroup: "דגים", fatLevel: "דל שומן", calories: 113, protein: 24, carbohydrates: 0, fats: 2 },
  { id: "tilapia-cooked", name: "מושט", group: "חלבון", subgroup: "דגים", fatLevel: "דל שומן", calories: 128, protein: 26, carbohydrates: 0, fats: 2.7 },
  { id: "sirloin-cooked", name: "שייטל", group: "חלבון", subgroup: "בשר", fatLevel: "בינוני", calories: 206, protein: 27, carbohydrates: 0, fats: 10 },
  { id: "lean-beef", name: "בקר רזה", group: "חלבון", subgroup: "בשר", fatLevel: "דל שומן", calories: 175, protein: 26, carbohydrates: 0, fats: 7 },
  { id: "tuna-water", name: "טונה במים", group: "חלבון", subgroup: "דגים", fatLevel: "דל שומן", calories: 116, protein: 26, carbohydrates: 0, fats: 0.8 },
  { id: "salmon-cooked", name: "סלמון", group: "חלבון", subgroup: "דגים", fatLevel: "בינוני", calories: 206, protein: 22, carbohydrates: 0, fats: 12 },
  { id: "eggs", name: "ביצים", group: "חלבון", subgroup: "ביצים", fatLevel: "בינוני", calories: 143, protein: 13, carbohydrates: 1.1, fats: 9.5 },
  { id: "egg-whites", name: "חלבון ביצה ללא חלמון", group: "חלבון", subgroup: "ביצים", fatLevel: "דל שומן", calories: 52, protein: 10.9, carbohydrates: 0.7, fats: 0.2 },
  { id: "cottage", name: "קוטג׳ 5% לפי תווית", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "בינוני", calories: 95, protein: 11, carbohydrates: 1.5, fats: 5 },
  { id: "greek-yogurt", name: "יוגורט יווני", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן", calories: 73, protein: 9.9, carbohydrates: 3.9, fats: 2 },
  { id: "protein-powder", name: "אבקת חלבון Dymatize", group: "חלבון", subgroup: "אבקות חלבון", fatLevel: "בינוני", calories: 389, protein: 65.2, carbohydrates: 8.4, fats: 8.4 },
  { id: "protein-pudding", name: "מעדן חלבון", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן", calories: 70, protein: 10, carbohydrates: 3.4, fats: 1.5 },
  { id: "tofu", name: "טופו", group: "חלבון", subgroup: "קטניות ותחליפים", fatLevel: "בינוני", calories: 144, protein: 17.3, carbohydrates: 2.8, fats: 8.7 },
  { id: "rice-cooked", name: "אורז מבושל", group: "פחמימה", subgroup: "פסטות ודגנים", fatLevel: "דל שומן", calories: 130, protein: 2.7, carbohydrates: 28.2, fats: 0.3 },
  { id: "potato-cooked", name: "תפוח אדמה מבושל", group: "פחמימה", subgroup: "פחמימות", fatLevel: "דל שומן", calories: 87, protein: 1.9, carbohydrates: 20.1, fats: 0.1 },
  { id: "sweet-potato-cooked", name: "בטטה מבושלת", group: "פחמימה", subgroup: "פחמימות", fatLevel: "דל שומן", calories: 86, protein: 1.6, carbohydrates: 20.1, fats: 0.1 },
  { id: "bread-whole", name: "לחם מלא לפי תווית", group: "פחמימה", subgroup: "לחמים ומאפים", fatLevel: "דל שומן", calories: 233, protein: 10.8, carbohydrates: 35.2, fats: 2.9 },
  { id: "pasta-cooked", name: "פסטה מבושלת", group: "פחמימה", subgroup: "פסטות ודגנים", fatLevel: "דל שומן", calories: 157, protein: 5.8, carbohydrates: 30.9, fats: 0.9 },
  { id: "oats", name: "שיבולת שועל Quaker", group: "פחמימה", subgroup: "חטיפי בריאות ודגנים", fatLevel: "בינוני", calories: 374, protein: 11, carbohydrates: 69, fats: 8 },
  { id: "quinoa-cooked", name: "קינואה מבושלת", group: "פחמימה", subgroup: "פסטות ודגנים", fatLevel: "דל שומן", calories: 120, protein: 4.4, carbohydrates: 21.3, fats: 1.9 },
  { id: "couscous-cooked", name: "קוסקוס מבושל", group: "פחמימה", subgroup: "פסטות ודגנים", fatLevel: "דל שומן", calories: 112, protein: 3.8, carbohydrates: 23.2, fats: 0.2 },
  { id: "corn", name: "תירס", group: "פחמימה", subgroup: "פחמימות", fatLevel: "דל שומן", calories: 96, protein: 3.4, carbohydrates: 21, fats: 1.5 },
  { id: "banana", name: "בננה", group: "פחמימה", subgroup: "פירות וירקות", fatLevel: "דל שומן", calories: 89, protein: 1.1, carbohydrates: 22.8, fats: 0.3 },
  { id: "tahini", name: "טחינה לפי תווית", group: "שומן", subgroup: "ממרחים ורטבים", fatLevel: "שומני", calories: 699, protein: 20.5, carbohydrates: 13.3, fats: 62.8 },
  { id: "egg-yolk", name: "חלמון", group: "שומן", subgroup: "ביצים", fatLevel: "שומני", calories: 322, protein: 15.9, carbohydrates: 3.6, fats: 26.5 },
  { id: "avocado", name: "אבוקדו", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "בינוני", calories: 160, protein: 2, carbohydrates: 8.5, fats: 14.7 },
  { id: "almonds", name: "שקדים", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", calories: 579, protein: 21.2, carbohydrates: 21.6, fats: 49.9 },
  { id: "cashews", name: "קשיו", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", calories: 553, protein: 18.2, carbohydrates: 30.2, fats: 43.8 },
  { id: "peanut-butter", name: "חמאת בוטנים", group: "שומן", subgroup: "ממרחים ורטבים", fatLevel: "שומני", calories: 588, protein: 25, carbohydrates: 20, fats: 50 },
  { id: "olive-oil", name: "שמן זית", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", calories: 884, protein: 0, carbohydrates: 0, fats: 100 },
  { id: "walnuts", name: "אגוזי מלך", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", calories: 654, protein: 15.2, carbohydrates: 13.7, fats: 65.2 },
  { id: "pumpkin-seeds", name: "גרעיני דלעת", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", calories: 559, protein: 30.2, carbohydrates: 10.7, fats: 49 },
  { id: "flax-seeds", name: "זרעי פשתן", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", calories: 534, protein: 18.3, carbohydrates: 28.9, fats: 42.2 },
  { id: "butter", name: "חמאה", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", calories: 717, protein: 0.9, carbohydrates: 0.1, fats: 81 },
];

const aliases: Record<string, string[]> = {
  "chicken-cooked": ["עוף", "חזה עוף"],
  "turkey-cooked": ["הודו"],
  "baramundi-cooked": ["ברמונדי"],
  "tilapia-cooked": ["מושט"],
  "sirloin-cooked": ["שייטל", "סינטה"],
  "lean-beef": ["בקר"],
  "tuna-water": ["טונה"],
  "salmon-cooked": ["סלמון", "פילה סלמון"],
  "eggs": ["ביצים"],
  "egg-whites": ["חלבון ביצה", "ביצה ללא חלמון", "לבן ביצה", "חלבוני ביצה"],
  cottage: ["קוטג"],
  "greek-yogurt": ["יוגורט"],
  "protein-powder": ["אבקת חלבון"],
  "protein-pudding": ["מעדן חלבון"],
  tofu: ["טופו"],
  "rice-cooked": ["אורז", "אורז לבן"],
  "potato-cooked": ["תפוח אדמה", "תפוא"],
  "sweet-potato-cooked": ["בטטה", "תפוח אדמה מתוק"],
  "bread-whole": ["לחם", "לחם מלא"],
  "pasta-cooked": ["פסטה"],
  oats: ["שיבולת שועל"],
  "quinoa-cooked": ["קינואה"],
  "couscous-cooked": ["קוסקוס"],
  corn: ["תירס"],
  banana: ["בננה"],
  tahini: ["טחינה"],
  "egg-yolk": ["חלמון"],
  avocado: ["אבוקדו"],
  almonds: ["שקדים"],
  cashews: ["קשיו"],
  "peanut-butter": ["חמאת בוטנים"],
  "olive-oil": ["שמן זית"],
  walnuts: ["אגוזי מלך", "אגוזים"],
  "pumpkin-seeds": ["גרעיני דלעת"],
  "flax-seeds": ["פשתן"],
  butter: ["חמאה"],
};

function conversionGroupForFood(food: FoodItem): ConversionGroup {
  if (food.group === "חלבון") return "חלבון";
  if (food.group === "שומן") return "שומן";
  if (food.group === "פחמימה" || food.group === "ירק ופרי") return "פחמימה";
  const values: [ConversionGroup, number][] = [
    ["חלבון", food.protein],
    ["פחמימה", food.carbohydrates],
    ["שומן", food.fats],
  ];
  return values.sort((a, b) => b[1] - a[1])[0][0];
}

/** הופך כל FoodItem לישות המרות עם מאקרו מנורמל ל־100 גרם. */
export function conversionFoodFromFoodItem(food: FoodItem): ConversionFood {
  const macros = macrosForFoodQuantity(food, 100);
  return {
    id: `catalog-${food.id}`,
    sourceFoodId: food.id,
    name: food.name,
    group: conversionGroupForFood(food),
    subgroup: foodSubgroupFor(food),
    fatLevel: food.fatLevel,
    reference: food.reference,
    servingGrams: food.servingGrams,
    nutritionBasis: food.nutritionBasis,
    unitGrams: food.unitGrams,
    referenceAmount: food.referenceAmount,
    referenceUnit: food.referenceUnit,
    calories: macros.calories,
    protein: macros.protein,
    carbohydrates: macros.carbohydrates,
    fats: macros.fats,
    aliases: food.aliases,
  };
}

/** קטלוג ההחלפות המלא: כל מאכלי המאגר, כולל מוצרים מסחריים ופריטי PDF. */
export const catalogConversionFoods: ConversionFood[] = foodItems.map(conversionFoodFromFoodItem);

export function sourceForFood(name: string) {
  const legacy = conversionFoods.find((food) => (aliases[food.id] ?? []).some((alias) => name.includes(alias)));
  if (legacy) return legacy;
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  return catalogConversionFoods.find((food) => food.name.toLowerCase() === normalized || food.name.toLowerCase().includes(normalized) || (food.aliases ?? []).some((alias) => name.includes(alias))) ?? null;
}

export function alternativesFor(source: ConversionFood) {
  const pool = source.sourceFoodId ? catalogConversionFoods : conversionFoods;
  return pool
    .filter((food) => food.group === source.group && food.id !== source.id)
    .sort((a, b) => (a.calories - b.calories) || a.name.localeCompare(b.name, "he"));
}

export type ConversionMacro = "protein" | "carbohydrates" | "fats";

export function gramsForMacroTarget(target: ConversionFood, macro: ConversionMacro, targetGrams: number) {
  return target[macro] > 0 ? Math.round((targetGrams / target[macro]) * 100) : 0;
}

export function recommendSwap(source: ConversionFood, target: ConversionFood, grams: number, sourceMacroAtQuantity?: number) {
  const preserve = source.group === "חלבון" ? "protein" : source.group === "פחמימה" ? "carbohydrates" : "fats";
  const sourceValue = source[preserve];
  const targetValue = target[preserve];
  const sourceMacro = sourceMacroAtQuantity ?? (grams * sourceValue / 100);
  const newGrams = sourceMacro > 0 && targetValue > 0 ? sourceMacro / (targetValue / 100) : grams;
  const factor = newGrams / 100;
  return {
    grams: Math.round(newGrams),
    calories: Math.round(target.calories * factor),
    protein: Math.round(target.protein * factor * 10) / 10,
    carbohydrates: Math.round(target.carbohydrates * factor * 10) / 10,
    fats: Math.round(target.fats * factor * 10) / 10,
    preserved: preserve === "protein" ? "חלבון" : preserve === "carbohydrates" ? "פחמימות" : "שומן",
  };
}
