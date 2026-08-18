export type FoodGroup = "חלבון" | "פחמימה" | "שומן" | "ירק ופרי";
export type FoodItem = {
  id: string;
  name: string;
  group: FoodGroup;
  reference: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fats: number;
  brand?: string;
  barcode?: string;
  aliases?: string[];
  sourceType?: "בסיס" | "מסחרי" | "אישי";
};

// ערכי בסיס ממוצעים ל־100 גרם. במוצר מסחרי יש להעדיף את תווית האריזה, כי הערכים עשויים להשתנות בין מותגים ואצוות.
const base = (item: Omit<FoodItem, "sourceType">): FoodItem => ({ ...item, sourceType: "בסיס" });
const commercial = (item: Omit<FoodItem, "sourceType">): FoodItem => ({ ...item, sourceType: "מסחרי" });

export const foodItems: FoodItem[] = [
  base({ id: "chicken", name: "חזה עוף מבושל", group: "חלבון", reference: "מבושל, ללא עור", servingGrams: 150, calories: 165, protein: 31, carbohydrates: 0, fats: 3.6, aliases: ["עוף", "חזה עוף", "פרגית רזה"] }),
  base({ id: "turkey", name: "חזה הודו מבושל", group: "חלבון", reference: "מבושל, רזה", servingGrams: 150, calories: 135, protein: 29, carbohydrates: 0, fats: 1.6, aliases: ["הודו"] }),
  base({ id: "turkey-steak", name: "שייטל בקר רזה", group: "חלבון", reference: "מבושל, רזה", servingGrams: 150, calories: 170, protein: 29, carbohydrates: 0, fats: 6, aliases: ["שייטל", "בקר"] }),
  base({ id: "lean-beef", name: "בקר טחון רזה", group: "חלבון", reference: "מבושל, כ־10% שומן", servingGrams: 150, calories: 217, protein: 26, carbohydrates: 0, fats: 12, aliases: ["בשר טחון"] }),
  base({ id: "tuna", name: "טונה במים", group: "חלבון", reference: "מסוננת", servingGrams: 120, calories: 116, protein: 26, carbohydrates: 0, fats: 0.8, aliases: ["טונה קופסה"] }),
  base({ id: "salmon", name: "סלמון", group: "חלבון", reference: "מבושל", servingGrams: 150, calories: 206, protein: 22, carbohydrates: 0, fats: 12 }),
  base({ id: "baramundi", name: "ברמונדי", group: "חלבון", reference: "מבושל", servingGrams: 150, calories: 113, protein: 24, carbohydrates: 0, fats: 2, aliases: ["דג ברמונדי"] }),
  base({ id: "tilapia", name: "מושט", group: "חלבון", reference: "מבושל", servingGrams: 150, calories: 128, protein: 26, carbohydrates: 0, fats: 2.7, aliases: ["אמנון"] }),
  base({ id: "cod", name: "בקלה", group: "חלבון", reference: "מבושל", servingGrams: 150, calories: 105, protein: 23, carbohydrates: 0, fats: 0.9 }),
  base({ id: "sardines", name: "סרדינים", group: "חלבון", reference: "במים, מסוננים", servingGrams: 100, calories: 185, protein: 25, carbohydrates: 0, fats: 8.5 }),
  base({ id: "egg", name: "ביצה", group: "חלבון", reference: "ביצה גדולה, כ־50 גרם", servingGrams: 50, calories: 143, protein: 12.6, carbohydrates: 0.7, fats: 9.5, aliases: ["ביצים"] }),
  base({ id: "egg-whites", name: "חלבון ביצה", group: "חלבון", reference: "נוזלי או מבושל", servingGrams: 100, calories: 52, protein: 10.9, carbohydrates: 0.7, fats: 0.2 }),
  base({ id: "greek-yogurt", name: "יוגורט יווני 2%", group: "חלבון", reference: "ללא תוספת סוכר", servingGrams: 200, calories: 73, protein: 9.9, carbohydrates: 3.9, fats: 2, aliases: ["יוגורט"] }),
  base({ id: "cottage", name: "קוטג׳ 5%", group: "חלבון", reference: "ממוצע מוצרי קוטג׳ בישראל", servingGrams: 150, calories: 98, protein: 11.1, carbohydrates: 3.4, fats: 4.3, aliases: ["קוטג", "גבינה"] }),
  base({ id: "white-cheese", name: "גבינה לבנה 5%", group: "חלבון", reference: "ממוצע מוצר ארוז", servingGrams: 150, calories: 98, protein: 8.5, carbohydrates: 4, fats: 5 }),
  base({ id: "skyr", name: "סקיר טבעי", group: "חלבון", reference: "דל שומן", servingGrams: 150, calories: 63, protein: 11, carbohydrates: 4, fats: 0.2 }),
  base({ id: "tofu", name: "טופו קשה", group: "חלבון", reference: "מוכן", servingGrams: 150, calories: 144, protein: 17.3, carbohydrates: 2.8, fats: 8.7 }),
  base({ id: "lentils", name: "עדשים מבושלות", group: "חלבון", reference: "מבושלות", servingGrams: 150, calories: 116, protein: 9, carbohydrates: 20, fats: 0.4 }),
  base({ id: "chickpeas", name: "חומוס גרגרים מבושל", group: "חלבון", reference: "מבושל ללא שמן", servingGrams: 150, calories: 164, protein: 8.9, carbohydrates: 27.4, fats: 2.6 }),
  commercial({ id: "protein-powder", name: "אבקת חלבון מי גבינה", group: "חלבון", reference: "ממוצע אבקות; חובה לבדוק תווית מותג", servingGrams: 30, calories: 400, protein: 75, carbohydrates: 10, fats: 7, aliases: ["אבקת חלבון", "whey"] }),
  commercial({ id: "protein-pudding", name: "מעדן חלבון", group: "חלבון", reference: "ממוצע מוצר ארוז; חובה לבדוק תווית", servingGrams: 200, calories: 75, protein: 10, carbohydrates: 5, fats: 1.5, aliases: ["מעדן", "פודינג חלבון"] }),
  commercial({ id: "protein-bar", name: "חטיף חלבון", group: "חלבון", reference: "ממוצע חטיפים; ערכים משתנים לפי מותג", servingGrams: 60, calories: 350, protein: 30, carbohydrates: 35, fats: 12, aliases: ["חטיף"] }),
  commercial({ id: "milk-1", name: "חלב 1%", group: "חלבון", reference: "נוזלי", servingGrams: 200, calories: 42, protein: 3.4, carbohydrates: 5, fats: 1 }),
  commercial({ id: "milk-3", name: "חלב 3%", group: "חלבון", reference: "נוזלי", servingGrams: 200, calories: 60, protein: 3.2, carbohydrates: 4.8, fats: 3 }),

  base({ id: "rice", name: "אורז לבן מבושל", group: "פחמימה", reference: "מבושל", servingGrams: 180, calories: 130, protein: 2.7, carbohydrates: 28.2, fats: 0.3, aliases: ["אורז"] }),
  base({ id: "brown-rice", name: "אורז מלא מבושל", group: "פחמימה", reference: "מבושל", servingGrams: 180, calories: 123, protein: 2.7, carbohydrates: 25.6, fats: 1 }),
  base({ id: "potato", name: "תפוח אדמה אפוי", group: "פחמימה", reference: "ללא שמן", servingGrams: 250, calories: 93, protein: 2.5, carbohydrates: 21.2, fats: 0.1, aliases: ["תפוא", "תפוח אדמה"] }),
  base({ id: "sweet-potato", name: "בטטה אפויה", group: "פחמימה", reference: "אפויה", servingGrams: 200, calories: 90, protein: 2, carbohydrates: 20.7, fats: 0.2 }),
  base({ id: "oats", name: "שיבולת שועל", group: "פחמימה", reference: "יבשה", servingGrams: 60, calories: 389, protein: 16.9, carbohydrates: 66.3, fats: 6.9, aliases: ["קוואקר"] }),
  base({ id: "quinoa", name: "קינואה מבושלת", group: "פחמימה", reference: "מבושלת", servingGrams: 185, calories: 120, protein: 4.4, carbohydrates: 21.3, fats: 1.9 }),
  base({ id: "pasta", name: "פסטה מבושלת", group: "פחמימה", reference: "מבושלת", servingGrams: 180, calories: 157, protein: 5.8, carbohydrates: 30.9, fats: 0.9 }),
  base({ id: "couscous", name: "קוסקוס מבושל", group: "פחמימה", reference: "מבושל", servingGrams: 180, calories: 112, protein: 3.8, carbohydrates: 23.2, fats: 0.2 }),
  base({ id: "bulgur", name: "בורגול מבושל", group: "פחמימה", reference: "מבושל", servingGrams: 180, calories: 83, protein: 3.1, carbohydrates: 18.6, fats: 0.2 }),
  base({ id: "whole-bread", name: "לחם מלא", group: "פחמימה", reference: "ממוצע, 2 פרוסות כ־70 גרם", servingGrams: 70, calories: 247, protein: 13, carbohydrates: 41, fats: 4.2, aliases: ["לחם"] }),
  base({ id: "white-bread", name: "לחם לבן", group: "פחמימה", reference: "ממוצע מוצרי מאפה", servingGrams: 70, calories: 266, protein: 8.9, carbohydrates: 49, fats: 3.2 }),
  commercial({ id: "rice-cakes", name: "פריכיות אורז", group: "פחמימה", reference: "מוצר יבש; חובה לבדוק תווית", servingGrams: 30, calories: 387, protein: 8, carbohydrates: 81, fats: 3, aliases: ["פריכיות"] }),
  base({ id: "dates", name: "תמרים מיובשים", group: "פחמימה", reference: "מיובשים", servingGrams: 40, calories: 282, protein: 2.5, carbohydrates: 75, fats: 0.4, aliases: ["תמר"] }),
  base({ id: "corn", name: "תירס מבושל", group: "פחמימה", reference: "גרגרים מבושלים", servingGrams: 150, calories: 96, protein: 3.4, carbohydrates: 21, fats: 1.5 }),
  base({ id: "peas", name: "אפונה מבושלת", group: "פחמימה", reference: "מבושלת", servingGrams: 150, calories: 84, protein: 5.4, carbohydrates: 15.6, fats: 0.4 }),

  base({ id: "olive-oil", name: "שמן זית", group: "שומן", reference: "כף כ־14 גרם", servingGrams: 14, calories: 884, protein: 0, carbohydrates: 0, fats: 100, aliases: ["שמן"] }),
  base({ id: "tahini", name: "טחינה גולמית", group: "שומן", reference: "כף כ־15 גרם", servingGrams: 15, calories: 595, protein: 17, carbohydrates: 21, fats: 53, aliases: ["טחינה"] }),
  base({ id: "avocado", name: "אבוקדו", group: "שומן", reference: "חלק אכיל", servingGrams: 100, calories: 160, protein: 2, carbohydrates: 8.5, fats: 14.7 }),
  base({ id: "almonds", name: "שקדים", group: "שומן", reference: "טבעיים", servingGrams: 30, calories: 579, protein: 21.2, carbohydrates: 21.6, fats: 49.9 }),
  base({ id: "walnuts", name: "אגוזי מלך", group: "שומן", reference: "טבעיים", servingGrams: 30, calories: 654, protein: 15.2, carbohydrates: 13.7, fats: 65.2 }),
  base({ id: "cashews", name: "קשיו", group: "שומן", reference: "טבעיים", servingGrams: 30, calories: 553, protein: 18.2, carbohydrates: 30.2, fats: 43.9 }),
  base({ id: "peanut-butter", name: "חמאת בוטנים", group: "שומן", reference: "ללא תוספת סוכר", servingGrams: 15, calories: 588, protein: 25, carbohydrates: 20, fats: 50 }),
  base({ id: "egg-yolk", name: "חלמון", group: "שומן", reference: "חלמון ביצה", servingGrams: 18, calories: 322, protein: 15.9, carbohydrates: 3.6, fats: 26.5 }),

  base({ id: "banana", name: "בננה", group: "ירק ופרי", reference: "חלק אכיל", servingGrams: 120, calories: 89, protein: 1.1, carbohydrates: 22.8, fats: 0.3 }),
  base({ id: "apple", name: "תפוח", group: "ירק ופרי", reference: "חלק אכיל", servingGrams: 150, calories: 52, protein: 0.3, carbohydrates: 13.8, fats: 0.2 }),
  base({ id: "berries", name: "פירות יער", group: "ירק ופרי", reference: "טריים או קפואים ללא סוכר", servingGrams: 150, calories: 57, protein: 0.7, carbohydrates: 13.7, fats: 0.3 }),
  base({ id: "tomato", name: "עגבנייה", group: "ירק ופרי", reference: "טרייה", servingGrams: 150, calories: 18, protein: 0.9, carbohydrates: 3.9, fats: 0.2 }),
  base({ id: "cucumber", name: "מלפפון", group: "ירק ופרי", reference: "טרי", servingGrams: 150, calories: 15, protein: 0.7, carbohydrates: 3.6, fats: 0.1 }),
  base({ id: "vegetables", name: "ירקות מעורבים", group: "ירק ופרי", reference: "ללא שמן", servingGrams: 250, calories: 35, protein: 2, carbohydrates: 7, fats: 0.3 }),
];

export function macrosForGrams(food: FoodItem, grams: number) {
  const factor = grams / 100;
  return { calories: Math.round(food.calories * factor), protein: Math.round(food.protein * factor * 10) / 10, carbohydrates: Math.round(food.carbohydrates * factor * 10) / 10, fats: Math.round(food.fats * factor * 10) / 10 };
}
