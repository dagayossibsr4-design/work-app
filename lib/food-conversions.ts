export type ConversionGroup = "חלבון" | "פחמימה" | "שומן";
export type ConversionFood = { id: string; name: string; group: ConversionGroup; calories: number; protein: number; carbohydrates: number; fats: number };

export const conversionFoods: ConversionFood[] = [
  { id: "chicken-cooked", name: "חזה עוף", group: "חלבון", calories: 165, protein: 31, carbohydrates: 0, fats: 3.6 },
  { id: "turkey-cooked", name: "חזה הודו", group: "חלבון", calories: 135, protein: 29, carbohydrates: 0, fats: 1.6 },
  { id: "baramundi-cooked", name: "ברמונדי", group: "חלבון", calories: 113, protein: 24, carbohydrates: 0, fats: 2 },
  { id: "tilapia-cooked", name: "מושט", group: "חלבון", calories: 128, protein: 26, carbohydrates: 0, fats: 2.7 },
  { id: "sirloin-cooked", name: "שייטל", group: "חלבון", calories: 206, protein: 27, carbohydrates: 0, fats: 10 },
  { id: "lean-beef", name: "בקר רזה", group: "חלבון", calories: 175, protein: 26, carbohydrates: 0, fats: 7 },
  { id: "tuna-water", name: "טונה במים", group: "חלבון", calories: 116, protein: 26, carbohydrates: 0, fats: 0.8 },
  { id: "salmon-cooked", name: "סלמון", group: "חלבון", calories: 206, protein: 22, carbohydrates: 0, fats: 12 },
  { id: "eggs", name: "ביצים", group: "חלבון", calories: 143, protein: 13, carbohydrates: 1.1, fats: 9.5 },
  { id: "cottage", name: "קוטג׳ 5%", group: "חלבון", calories: 95, protein: 11, carbohydrates: 1.5, fats: 5 },
  { id: "greek-yogurt", name: "יוגורט יווני", group: "חלבון", calories: 73, protein: 9.9, carbohydrates: 3.9, fats: 2 },
  { id: "protein-powder", name: "אבקת חלבון", group: "חלבון", calories: 390, protein: 70, carbohydrates: 8, fats: 8 },
  { id: "protein-pudding", name: "מעדן חלבון", group: "חלבון", calories: 70, protein: 10, carbohydrates: 3.4, fats: 1.5 },
  { id: "tofu", name: "טופו", group: "חלבון", calories: 144, protein: 17.3, carbohydrates: 2.8, fats: 8.7 },
  { id: "rice-cooked", name: "אורז מבושל", group: "פחמימה", calories: 130, protein: 2.7, carbohydrates: 28.2, fats: 0.3 },
  { id: "potato-cooked", name: "תפוח אדמה מבושל", group: "פחמימה", calories: 87, protein: 1.9, carbohydrates: 20.1, fats: 0.1 },
  { id: "sweet-potato-cooked", name: "בטטה מבושלת", group: "פחמימה", calories: 86, protein: 1.6, carbohydrates: 20.1, fats: 0.1 },
  { id: "bread-whole", name: "לחם מלא", group: "פחמימה", calories: 247, protein: 13, carbohydrates: 41, fats: 4.2 },
  { id: "pasta-cooked", name: "פסטה מבושלת", group: "פחמימה", calories: 157, protein: 5.8, carbohydrates: 30.9, fats: 0.9 },
  { id: "oats", name: "שיבולת שועל", group: "פחמימה", calories: 389, protein: 16.9, carbohydrates: 66.3, fats: 6.9 },
  { id: "quinoa-cooked", name: "קינואה מבושלת", group: "פחמימה", calories: 120, protein: 4.4, carbohydrates: 21.3, fats: 1.9 },
  { id: "couscous-cooked", name: "קוסקוס מבושל", group: "פחמימה", calories: 112, protein: 3.8, carbohydrates: 23.2, fats: 0.2 },
  { id: "corn", name: "תירס", group: "פחמימה", calories: 96, protein: 3.4, carbohydrates: 21, fats: 1.5 },
  { id: "banana", name: "בננה", group: "פחמימה", calories: 89, protein: 1.1, carbohydrates: 22.8, fats: 0.3 },
  { id: "tahini", name: "טחינה", group: "שומן", calories: 595, protein: 17, carbohydrates: 21, fats: 53 },
  { id: "egg-yolk", name: "חלמון", group: "שומן", calories: 322, protein: 15.9, carbohydrates: 3.6, fats: 26.5 },
  { id: "avocado", name: "אבוקדו", group: "שומן", calories: 160, protein: 2, carbohydrates: 8.5, fats: 14.7 },
  { id: "almonds", name: "שקדים", group: "שומן", calories: 579, protein: 21.2, carbohydrates: 21.6, fats: 49.9 },
  { id: "cashews", name: "קשיו", group: "שומן", calories: 553, protein: 18.2, carbohydrates: 30.2, fats: 43.8 },
  { id: "peanut-butter", name: "חמאת בוטנים", group: "שומן", calories: 588, protein: 25, carbohydrates: 20, fats: 50 },
  { id: "olive-oil", name: "שמן זית", group: "שומן", calories: 884, protein: 0, carbohydrates: 0, fats: 100 },
  { id: "walnuts", name: "אגוזי מלך", group: "שומן", calories: 654, protein: 15.2, carbohydrates: 13.7, fats: 65.2 },
  { id: "pumpkin-seeds", name: "גרעיני דלעת", group: "שומן", calories: 559, protein: 30.2, carbohydrates: 10.7, fats: 49 },
  { id: "flax-seeds", name: "זרעי פשתן", group: "שומן", calories: 534, protein: 18.3, carbohydrates: 28.9, fats: 42.2 },
  { id: "butter", name: "חמאה", group: "שומן", calories: 717, protein: 0.9, carbohydrates: 0.1, fats: 81 },
];

const aliases: Record<string, string[]> = {
  "chicken-cooked": ["עוף", "חזה עוף"], "turkey-cooked": ["הודו"], "baramundi-cooked": ["ברמונדי"], "tilapia-cooked": ["מושט"], "sirloin-cooked": ["שייטל", "סינטה"], "lean-beef": ["בקר"], "tuna-water": ["טונה"], "salmon-cooked": ["סלמון", "פילה סלמון"], "eggs": ["ביצים"], "cottage": ["קוטג"], "greek-yogurt": ["יוגורט"], "protein-powder": ["אבקת חלבון"], "protein-pudding": ["מעדן חלבון"], "tofu": ["טופו"],
  "rice-cooked": ["אורז", "אורז לבן"], "potato-cooked": ["תפוח אדמה", "תפוא"], "sweet-potato-cooked": ["בטטה", "תפוח אדמה מתוק"], "bread-whole": ["לחם", "לחם מלא"], "pasta-cooked": ["פסטה"], "oats": ["שיבולת שועל"], "quinoa-cooked": ["קינואה"], "couscous-cooked": ["קוסקוס"], "corn": ["תירס"], "banana": ["בננה"],
  "tahini": ["טחינה"], "egg-yolk": ["חלמון"], "avocado": ["אבוקדו"], "almonds": ["שקדים"], "cashews": ["קשיו"], "peanut-butter": ["חמאת בוטנים"], "olive-oil": ["שמן זית"], "walnuts": ["אגוזי מלך", "אגוזים"], "pumpkin-seeds": ["גרעיני דלעת"], "flax-seeds": ["פשתן"], "butter": ["חמאה"],
};

export function sourceForFood(name: string) { return conversionFoods.find((food) => (aliases[food.id] ?? []).some((alias) => name.includes(alias))) ?? null; }
export function alternativesFor(source: ConversionFood) { return conversionFoods.filter((food) => food.group === source.group && food.id !== source.id); }
export function recommendSwap(source: ConversionFood, target: ConversionFood, grams: number) {
  const preserve = source.group === "חלבון" ? "protein" : source.group === "פחמימה" ? "carbohydrates" : "fats";
  const sourceValue = source[preserve]; const targetValue = target[preserve];
  const newGrams = sourceValue > 0 && targetValue > 0 ? grams * sourceValue / targetValue : grams;
  const factor = newGrams / 100;
  return { grams: Math.round(newGrams), calories: Math.round(target.calories * factor), protein: Math.round(target.protein * factor * 10) / 10, carbohydrates: Math.round(target.carbohydrates * factor * 10) / 10, fats: Math.round(target.fats * factor * 10) / 10, preserved: preserve === "protein" ? "חלבון" : preserve === "carbohydrates" ? "פחמימות" : "שומן" };
}
