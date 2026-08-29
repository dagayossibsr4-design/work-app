export type FoodGroup = "חלבון" | "פחמימה" | "שומן" | "ירק ופרי" | "שונות";
export type FoodSubgroup = "עופות" | "בשר" | "דגים" | "גבינות ומוצרי חלב" | "ביצים" | "קטניות ותחליפים" | "פחמימות" | "לחמים ומאפים" | "פסטות ודגנים" | "חטיפי בריאות ודגנים" | "חטיפי חלבון" | "משקאות חלבון" | "אבקות חלבון" | "סלטים קנויים" | "ממרחים ורטבים" | "שמנים, אגוזים וזרעים" | "חטיפים ומוצרים מוכנים" | "פירות וירקות" | "שונות";
export type FatLevel = "דל שומן" | "בינוני" | "שומני";
export type NutritionBasis = "100g" | "unit" | "cup" | "package" | "serving";
export type FoodChangeSnapshot = { name: string; brand?: string; group: FoodGroup; servingGrams: number; calories: number; protein: number; carbohydrates: number; fats: number; reference: string; subgroup?: FoodSubgroup; fatLevel?: FatLevel; unitGrams?: number; referenceAmount?: number; referenceUnit?: string; nutritionBasis?: NutritionBasis };
export type FoodChangeEvent = { id: string; action: "יצירה" | "עריכה" | "שחזור"; at: string; before?: FoodChangeSnapshot; after: FoodChangeSnapshot };

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
  subgroup?: FoodSubgroup;
  fatLevel?: FatLevel;
  unitGrams?: number;
  referenceAmount?: number;
  referenceUnit?: string;
  nutritionBasis?: NutritionBasis;
  aliases?: string[];
  sourceType?: "בסיס" | "מסחרי" | "אישי";
  changeHistory?: FoodChangeEvent[];
};

// ערכי בסיס ממוצעים ל־100 גרם. במוצר מסחרי יש להעדיף את תווית האריזה, כי הערכים עשויים להשתנות בין מותגים ואצוות.
const base = (item: Omit<FoodItem, "sourceType">): FoodItem => ({ ...item, sourceType: "בסיס" });
const commercial = (item: Omit<FoodItem, "sourceType">): FoodItem => ({ ...item, sourceType: "מסחרי" });

export const foodItems: FoodItem[] = [
  base({ id: "chicken", name: "חזה עוף מבושל", group: "חלבון", reference: "מבושל, ללא עור", servingGrams: 150, calories: 165, protein: 31, carbohydrates: 0, fats: 3.6, subgroup: "עופות", fatLevel: "דל שומן", aliases: ["עוף", "חזה עוף", "פרגית רזה"] }),
  base({ id: "turkey", name: "חזה הודו מבושל", group: "חלבון", reference: "מבושל, רזה", servingGrams: 150, calories: 135, protein: 29, carbohydrates: 0, fats: 1.6, subgroup: "עופות", fatLevel: "דל שומן", aliases: ["הודו"] }),
  base({ id: "turkey-steak", name: "שייטל בקר רזה", group: "חלבון", reference: "מבושל, רזה", servingGrams: 150, calories: 170, protein: 29, carbohydrates: 0, fats: 6, subgroup: "בשר", fatLevel: "דל שומן", aliases: ["שייטל", "בקר"] }),
  base({ id: "lean-beef", name: "בקר טחון רזה", group: "חלבון", reference: "מבושל, כ־10% שומן", servingGrams: 150, calories: 217, protein: 26, carbohydrates: 0, fats: 12, subgroup: "בשר", fatLevel: "בינוני", aliases: ["בשר טחון"] }),
  base({ id: "tuna", name: "טונה במים", group: "חלבון", reference: "מסוננת", servingGrams: 120, calories: 116, protein: 26, carbohydrates: 0, fats: 0.8, subgroup: "דגים", fatLevel: "דל שומן", aliases: ["טונה קופסה"] }),
  base({ id: "salmon", name: "סלמון", group: "חלבון", reference: "מבושל", servingGrams: 150, calories: 206, protein: 22, carbohydrates: 0, fats: 12, subgroup: "דגים", fatLevel: "בינוני" }),
  base({ id: "baramundi", name: "ברמונדי", group: "חלבון", reference: "מבושל", servingGrams: 150, calories: 113, protein: 24, carbohydrates: 0, fats: 2, subgroup: "דגים", fatLevel: "דל שומן", aliases: ["דג ברמונדי"] }),
  base({ id: "tilapia", name: "מושט", group: "חלבון", reference: "מבושל", servingGrams: 150, calories: 128, protein: 26, carbohydrates: 0, fats: 2.7, subgroup: "דגים", fatLevel: "דל שומן", aliases: ["אמנון"] }),
  base({ id: "cod", name: "בקלה", group: "חלבון", reference: "מבושל", servingGrams: 150, calories: 105, protein: 23, carbohydrates: 0, fats: 0.9, subgroup: "דגים", fatLevel: "דל שומן" }),
  base({ id: "sardines", name: "סרדינים", group: "חלבון", reference: "במים, מסוננים", servingGrams: 100, calories: 185, protein: 25, carbohydrates: 0, fats: 8.5, subgroup: "דגים", fatLevel: "בינוני" }),
  base({ id: "egg", name: "ביצה", group: "חלבון", reference: "ביצה גדולה, כ־50 גרם", servingGrams: 50, calories: 143, protein: 12.6, carbohydrates: 0.7, fats: 9.5, subgroup: "ביצים", fatLevel: "בינוני", aliases: ["ביצים"] }),
  base({ id: "egg-whites", name: "חלבון ביצה ללא חלמון", group: "חלבון", reference: "נוזלי או מבושל · ללא חלמון · ערכים ל־100 גרם", servingGrams: 33, calories: 52, protein: 10.9, carbohydrates: 0.7, fats: 0.2, subgroup: "ביצים", fatLevel: "דל שומן", aliases: ["חלבון ביצה", "ביצה ללא חלמון", "לבן ביצה", "חלבוני ביצה"] }),
  base({ id: "greek-yogurt-0", name: "יוגורט יווני 0%", group: "חלבון", reference: "ל־100 גרם", servingGrams: 200, calories: 55, protein: 9, carbohydrates: 4, fats: 0.2, subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן", aliases: ["יוגורט יווני"] }),
  base({ id: "greek-yogurt", name: "יוגורט יווני 2%", group: "חלבון", reference: "ללא תוספת סוכר · ל־100 גרם", servingGrams: 200, calories: 73, protein: 9.9, carbohydrates: 3.9, fats: 2, subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן", aliases: ["יוגורט"] }),
  base({ id: "bio-yogurt-15", name: "יוגורט ביו 1.5%", group: "חלבון", reference: "ל־100 גרם · גביע 200 גרם = 96 קק״ל", servingGrams: 200, calories: 48, protein: 4.2, carbohydrates: 4.5, fats: 1.5, subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן" }),
  commercial({ id: "cottage", name: "קוטג׳ 5%", group: "חלבון", reference: "ל־100 גרם · גביע 250 גרם = 232 קק״ל", servingGrams: 250, calories: 93, protein: 10.5, carbohydrates: 1.8, fats: 5, subgroup: "גבינות ומוצרי חלב", fatLevel: "בינוני", aliases: ["קוטג", "גבינה"] }),
  commercial({ id: "cottage-1", name: "קוטג׳ 1%", group: "חלבון", reference: "ל־100 גרם · גביע 250 גרם = 170 קק״ל ו־29 ג׳ חלבון", servingGrams: 250, calories: 68, protein: 11.5, carbohydrates: 2.5, fats: 1, subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן", aliases: ["קוטג 1%"] }),
  commercial({ id: "cottage-3", name: "קוטג׳ 3%", group: "חלבון", reference: "ל־100 גרם", servingGrams: 250, calories: 80, protein: 11, carbohydrates: 2, fats: 3, subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן", aliases: ["קוטג 3%"] }),
  commercial({ id: "cottage-9", name: "קוטג׳ 9%", group: "חלבון", reference: "ל־100 גרם", servingGrams: 250, calories: 125, protein: 10, carbohydrates: 1.5, fats: 9, subgroup: "גבינות ומוצרי חלב", fatLevel: "שומני", aliases: ["קוטג 9%"] }),
  base({ id: "white-cheese-05", name: "גבינה לבנה 0.5%", group: "חלבון", reference: "ל־100 גרם", servingGrams: 150, calories: 58, protein: 10.5, carbohydrates: 3.5, fats: 0.5, subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן" }),
  base({ id: "white-cheese-3", name: "גבינה לבנה 3%", group: "חלבון", reference: "ל־100 גרם", servingGrams: 150, calories: 73, protein: 10, carbohydrates: 3.5, fats: 3, subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן" }),
  base({ id: "white-cheese", name: "גבינה לבנה 5%", group: "חלבון", reference: "ל־100 גרם", servingGrams: 150, calories: 90, protein: 9.5, carbohydrates: 3.5, fats: 5, subgroup: "גבינות ומוצרי חלב", fatLevel: "בינוני" }),
  base({ id: "white-cheese-9", name: "גבינה לבנה 9%", group: "חלבון", reference: "ל־100 גרם", servingGrams: 150, calories: 128, protein: 9, carbohydrates: 3.5, fats: 9, subgroup: "גבינות ומוצרי חלב", fatLevel: "שומני" }),
  base({ id: "good-taste-cheese", name: "גבינת טוב טעם 3%", group: "חלבון", reference: "ל־100 גרם · חבילה 250 גרם = 37.5 ג׳ חלבון", servingGrams: 250, calories: 90, protein: 15, carbohydrates: 3.5, fats: 3, subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן" }),
  base({ id: "ricotta-5", name: "ריקוטה 5%", group: "חלבון", reference: "ל־100 גרם", servingGrams: 100, calories: 110, protein: 8.5, carbohydrates: 4.5, fats: 5, subgroup: "גבינות ומוצרי חלב", fatLevel: "בינוני" }),
  base({ id: "labneh-5", name: "לאבנה 5%", group: "חלבון", reference: "ל־100 גרם", servingGrams: 100, calories: 95, protein: 7, carbohydrates: 4.5, fats: 5, subgroup: "גבינות ומוצרי חלב", fatLevel: "בינוני" }),
  base({ id: "skyr", name: "סקיר טבעי", group: "חלבון", reference: "דל שומן", servingGrams: 150, calories: 63, protein: 11, carbohydrates: 4, fats: 0.2, subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן" }),
  base({ id: "tofu", name: "טופו קשה", group: "חלבון", reference: "מוכן", servingGrams: 150, calories: 144, protein: 17.3, carbohydrates: 2.8, fats: 8.7, subgroup: "קטניות ותחליפים", fatLevel: "בינוני" }),
  base({ id: "lentils", name: "עדשים מבושלות", group: "חלבון", reference: "מבושלות", servingGrams: 150, calories: 116, protein: 9, carbohydrates: 20, fats: 0.4, subgroup: "קטניות ותחליפים", fatLevel: "דל שומן" }),
  base({ id: "chickpeas", name: "חומוס גרגרים מבושל", group: "חלבון", reference: "מבושל ללא שמן", servingGrams: 150, calories: 164, protein: 8.9, carbohydrates: 27.4, fats: 2.6, subgroup: "קטניות ותחליפים", fatLevel: "דל שומן", aliases: ["גרגירי חומוס"] }),
  base({ id: "white-red-beans", name: "שעועית לבנה / אדומה מבושלת", group: "חלבון", reference: "מבושלת · מדריך הערכים", servingGrams: 150, calories: 130, protein: 8.7, carbohydrates: 23, fats: 0.5, subgroup: "קטניות ותחליפים", fatLevel: "דל שומן", aliases: ["שעועית לבנה", "שעועית אדומה"] }),
  commercial({ id: "protein-powder", name: "אבקת חלבון Dymatize Elite Whey", group: "חלבון", reference: "תווית מוצר + מדידה אישית שסופקה · 46 גרם אבקה = 30 ג׳ חלבון", servingGrams: 46, calories: 389, protein: 65.2, carbohydrates: 8.4, fats: 8.4, brand: "Dymatize Elite Whey", subgroup: "אבקות חלבון", fatLevel: "בינוני", aliases: ["אבקת חלבון", "whey", "דיימטייז"] }),
  commercial({ id: "protein-pudding", name: "מעדן חלבון", group: "חלבון", reference: "תווית מוצר שסופקה · ל־100 גרם: 70 קק״ל, 10 ג׳ חלבון, 3.4 ג׳ פחמימות ו־1.5 ג׳ שומן; גביע 198 גרם", servingGrams: 198, calories: 70, protein: 10, carbohydrates: 3.4, fats: 1.5, subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן", aliases: ["מעדן", "פודינג חלבון"] }),
  commercial({ id: "protein-bar", name: "חטיף חלבון", group: "חלבון", reference: "ממוצע חטיפים; ערכים משתנים לפי מותג", servingGrams: 60, calories: 350, protein: 30, carbohydrates: 35, fats: 12, subgroup: "חטיפי חלבון", fatLevel: "בינוני", aliases: ["חטיף"] }),
  commercial({ id: "milk-1", name: "חלב 1%", group: "חלבון", reference: "נוזלי", servingGrams: 200, calories: 42, protein: 3.4, carbohydrates: 5, fats: 1, subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן" }),
  commercial({ id: "milk-3", name: "חלב 3%", group: "חלבון", reference: "נוזלי", servingGrams: 200, calories: 60, protein: 3.2, carbohydrates: 4.8, fats: 3, subgroup: "גבינות ומוצרי חלב", fatLevel: "בינוני" }),
  commercial({ id: "danone-pro", name: "דנונה PRO טבעי 0%", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן", reference: "לגביע שלם 200 גרם · ערכי המדריך ניתנים ליחידה", servingGrams: 200, unitGrams: 200, referenceAmount: 1, referenceUnit: "גביע", nutritionBasis: "unit", calories: 120, protein: 20, carbohydrates: 8, fats: 0.4, brand: "Danone", aliases: ["Danone PRO", "דנונה פרו", "פרו"] }),
  commercial({ id: "protein-yogurt-natural", name: "תנובה GO יוגורט 20g", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן", reference: "לגביע שלם 200 גרם · טווח פחמימות 9–13 ג׳ לפי המדריך", servingGrams: 200, unitGrams: 200, referenceAmount: 1, referenceUnit: "גביע", nutritionBasis: "unit", calories: 130, protein: 20, carbohydrates: 11, fats: 0.5, brand: "תנובה GO", aliases: ["GO", "יוגורט חלבון"] }),

  base({ id: "rice", name: "אורז לבן מבושל", group: "פחמימה", reference: "מבושל", servingGrams: 180, calories: 130, protein: 2.7, carbohydrates: 28.2, fats: 0.3, aliases: ["אורז"] }),
  base({ id: "brown-rice", name: "אורז מלא מבושל", group: "פחמימה", reference: "מבושל · מדריך הערכים", servingGrams: 180, calories: 112, protein: 2.6, carbohydrates: 23.5, fats: 0.9 }),
  base({ id: "potato", name: "תפוח אדמה אפוי", group: "פחמימה", reference: "מבושל / אפוי · מדריך הערכים", servingGrams: 250, calories: 85, protein: 2, carbohydrates: 18.5, fats: 0.1, aliases: ["תפוא", "תפוח אדמה"] }),
  base({ id: "sweet-potato", name: "בטטה אפויה", group: "פחמימה", reference: "מבושלת / אפויה · מדריך הערכים", servingGrams: 200, calories: 85, protein: 2, carbohydrates: 18.5, fats: 0.1 }),
  commercial({ id: "oats", name: "שיבולת שועל / קוואקר", group: "פחמימה", reference: "יבש לפני בישול · מדריך הערכים", servingGrams: 60, calories: 375, protein: 13.5, carbohydrates: 62, fats: 7, brand: "Quaker", aliases: ["קוואקר"] }),
  base({ id: "quinoa", name: "קינואה מבושלת", group: "פחמימה", reference: "מבושלת", servingGrams: 185, calories: 120, protein: 4.4, carbohydrates: 21.3, fats: 1.9 }),
  base({ id: "pasta", name: "פסטה רגילה מבושלת", group: "פחמימה", reference: "מבושלת · מדריך הערכים", servingGrams: 180, calories: 145, protein: 4.8, carbohydrates: 29, fats: 0.8, aliases: ["פסטה מבושלת", "פסטה רגילה"] }),
  base({ id: "couscous", name: "קוסקוס מבושל", group: "פחמימה", reference: "מבושל · מדריך הערכים", servingGrams: 180, calories: 115, protein: 3.8, carbohydrates: 23.5, fats: 0.2 }),
  base({ id: "bulgur", name: "בורגול מבושל", group: "פחמימה", reference: "מבושל · מדריך הערכים", servingGrams: 180, calories: 85, protein: 3.1, carbohydrates: 18.6, fats: 0.2 }),
  commercial({ id: "whole-bread", name: "לחם מלא", group: "פחמימה", reference: "תווית מוצר שסופקה · 233 קק״ל, 35.2 ג׳ פחמימה, 10.8 ג׳ חלבון ו־2.9 ג׳ שומן ל־100 גרם", servingGrams: 70, calories: 233, protein: 10.8, carbohydrates: 35.2, fats: 2.9, aliases: ["לחם"] }),
  base({ id: "white-bread", name: "לחם לבן", group: "פחמימה", reference: "ממוצע מוצרי מאפה", servingGrams: 70, calories: 266, protein: 8.9, carbohydrates: 49, fats: 3.2 }),
  commercial({ id: "rice-cakes", name: "פריכיות אורז", group: "פחמימה", reference: "ל־100 גרם · מדריך הערכים", servingGrams: 30, calories: 375, protein: 7.5, carbohydrates: 81, fats: 1.5, aliases: ["פריכיות"] }),
  base({ id: "dates", name: "תמרים מיובשים", group: "פחמימה", reference: "מיובשים", servingGrams: 40, calories: 282, protein: 2.5, carbohydrates: 75, fats: 0.4, aliases: ["תמר"] }),
  base({ id: "corn", name: "תירס מבושל", group: "פחמימה", reference: "גרגרים מבושלים", servingGrams: 150, calories: 96, protein: 3.4, carbohydrates: 21, fats: 1.5 }),
  base({ id: "peas", name: "אפונה מבושלת", group: "פחמימה", reference: "מבושלת", servingGrams: 150, calories: 84, protein: 5.4, carbohydrates: 15.6, fats: 0.4 }),

  base({ id: "olive-oil", name: "שמן זית", group: "שומן", reference: "כף כ־14 גרם", servingGrams: 14, calories: 884, protein: 0, carbohydrates: 0, fats: 100, aliases: ["שמן"] }),
  commercial({ id: "tahini", name: "טחינה גולמית", group: "שומן", reference: "תווית מוצר שסופקה · 699 קק״ל, 62.8 ג׳ שומן ו־20.5 ג׳ חלבון ל־100 גרם", servingGrams: 15, calories: 699, protein: 20.5, carbohydrates: 13.3, fats: 62.8, brand: "טחינה לפי התווית שסופקה", aliases: ["טחינה"] }),
  base({ id: "avocado", name: "אבוקדו", group: "שומן", reference: "חלק אכיל · מדריך הערכים", servingGrams: 100, calories: 160, protein: 2, carbohydrates: 8.5, fats: 14.7, aliases: ["אבוקדו טרי"] }),
  base({ id: "almonds", name: "שקדים", group: "שומן", reference: "טבעיים · מדריך הערכים", servingGrams: 30, calories: 585, protein: 21, carbohydrates: 21.5, fats: 50, aliases: ["שקדים טבעיים"] }),
  base({ id: "walnuts", name: "אגוזי מלך", group: "שומן", reference: "טבעיים", servingGrams: 30, calories: 654, protein: 15.2, carbohydrates: 13.7, fats: 65.2 }),
  base({ id: "cashews", name: "קשיו", group: "שומן", reference: "טבעיים · מדריך הערכים", servingGrams: 30, calories: 553, protein: 18.2, carbohydrates: 30.2, fats: 43.8, aliases: ["אגוזי קשיו", "קשיו טבעי"] }),
  base({ id: "peanut-butter", name: "חמאת בוטנים", group: "שומן", reference: "ללא תוספת סוכר", servingGrams: 15, calories: 588, protein: 25, carbohydrates: 20, fats: 50 }),
  base({ id: "egg-yolk", name: "חלמון", group: "שומן", reference: "חלמון ביצה", servingGrams: 18, calories: 322, protein: 15.9, carbohydrates: 3.6, fats: 26.5 }),

  base({ id: "banana", name: "בננה", group: "ירק ופרי", reference: "חלק אכיל", servingGrams: 120, calories: 89, protein: 1.1, carbohydrates: 22.8, fats: 0.3 }),
  base({ id: "apple", name: "תפוח", group: "ירק ופרי", reference: "חלק אכיל · מדריך הערכים", servingGrams: 150, calories: 52, protein: 0.3, carbohydrates: 13.8, fats: 0.2, aliases: ["תפוח עץ"] }),
  base({ id: "berries", name: "פירות יער", group: "ירק ופרי", reference: "טריים או קפואים ללא סוכר", servingGrams: 150, calories: 57, protein: 0.7, carbohydrates: 13.7, fats: 0.3 }),
  base({ id: "tomato", name: "עגבנייה", group: "ירק ופרי", reference: "טרייה", servingGrams: 150, calories: 18, protein: 0.9, carbohydrates: 3.9, fats: 0.2 }),
  base({ id: "cucumber", name: "מלפפון", group: "ירק ופרי", reference: "טרי", servingGrams: 150, calories: 15, protein: 0.7, carbohydrates: 3.6, fats: 0.1 }),
  base({ id: "vegetables", name: "ירקות מעורבים", group: "ירק ופרי", reference: "ללא שמן", servingGrams: 250, calories: 35, protein: 2, carbohydrates: 7, fats: 0.3, subgroup: "פירות וירקות", fatLevel: "דל שומן" }),

  base({ id: "chicken-raw-guide", name: "חזה עוף נא", group: "חלבון", subgroup: "עופות", fatLevel: "דל שומן", reference: "לפני בישול · מדריך הערכים", servingGrams: 150, calories: 115, protein: 23, carbohydrates: 0, fats: 2, aliases: ["חזה עוף נא"] }),
  base({ id: "turkey-raw-guide", name: "חזה הודו נא", group: "חלבון", subgroup: "עופות", fatLevel: "דל שומן", reference: "לפני בישול · מדריך הערכים", servingGrams: 150, calories: 110, protein: 24, carbohydrates: 0, fats: 1, aliases: ["הודו נא"] }),
  base({ id: "turkey-cooked-guide", name: "חזה הודו מבושל/צלוי", group: "חלבון", subgroup: "עופות", fatLevel: "דל שומן", reference: "מוכן לאכילה · מדריך הערכים", servingGrams: 150, calories: 155, protein: 32, carbohydrates: 0, fats: 2 }),
  base({ id: "turkey-thigh", name: "שווארמה הודו נקבה / ירך הודו", group: "חלבון", subgroup: "עופות", fatLevel: "בינוני", reference: "נא · מדריך הערכים", servingGrams: 150, calories: 145, protein: 20, carbohydrates: 0, fats: 6.5 }),
  base({ id: "pargit", name: "פרגית / ירך עוף ללא עור", group: "חלבון", subgroup: "עופות", fatLevel: "בינוני", reference: "נא לפני צלייה · מדריך הערכים", servingGrams: 150, calories: 155, protein: 19, carbohydrates: 0, fats: 8.5 }),
  base({ id: "chicken-drumsticks", name: "כרעיים / שוקיים עם עור", group: "חלבון", subgroup: "עופות", fatLevel: "שומני", reference: "נא · מדריך הערכים", servingGrams: 150, calories: 215, protein: 17, carbohydrates: 0, fats: 16 }),
  base({ id: "sirloin-guide", name: "סינטה בקר", group: "חלבון", subgroup: "בשר", fatLevel: "דל שומן", reference: "נתח 11 · נא, מנוקה משומן חיצוני · מדריך הערכים", servingGrams: 150, calories: 135, protein: 22.5, carbohydrates: 0, fats: 4.5 }),
  base({ id: "beef-filet", name: "פילה בקר", group: "חלבון", subgroup: "בשר", fatLevel: "דל שומן", reference: "נתח 12 · נא · מדריך הערכים", servingGrams: 150, calories: 155, protein: 22, carbohydrates: 0, fats: 7.5 }),
  base({ id: "beef-shoulder", name: "כתף מרכזי / פילה מדומה", group: "חלבון", subgroup: "בשר", fatLevel: "בינוני", reference: "נתחים 4–6 · נא · מדריך הערכים", servingGrams: 150, calories: 145, protein: 21.5, carbohydrates: 0, fats: 6 }),
  base({ id: "lean-ground-beef-guide", name: "בשר בקר טחון רזה", group: "חלבון", subgroup: "בשר", fatLevel: "דל שומן", reference: "5%–7% שומן · נא · מדריך הערכים", servingGrams: 150, calories: 140, protein: 21.5, carbohydrates: 0, fats: 5.5 }),
  base({ id: "regular-ground-beef", name: "בשר בקר טחון רגיל", group: "חלבון", subgroup: "בשר", fatLevel: "שומני", reference: "15%–20% שומן · נא · מדריך הערכים", servingGrams: 150, calories: 240, protein: 17.5, carbohydrates: 0, fats: 19 }),
  base({ id: "entrecote", name: "אנטרקוט", group: "חלבון", subgroup: "בשר", fatLevel: "שומני", reference: "נתח 1 · נא ומשויש · מדריך הערכים", servingGrams: 150, calories: 270, protein: 19, carbohydrates: 0, fats: 21 }),
  base({ id: "turkey-pastrami", name: "פסטרמה הודו דלת שומן", group: "חלבון", subgroup: "בשר", fatLevel: "דל שומן", reference: "1%–2% שומן · פרוסה כ־20 גרם · מדריך הערכים", servingGrams: 20, calories: 90, protein: 18, carbohydrates: 2.5, fats: 1.5 }),
  base({ id: "chicken-pastrami", name: "פסטרמה עוף דבש/גריל", group: "חלבון", subgroup: "בשר", fatLevel: "בינוני", reference: "פרוסה כ־20 גרם · מדריך הערכים", servingGrams: 20, calories: 115, protein: 16, carbohydrates: 5, fats: 3 }),
  base({ id: "salami", name: "סלמי איטלקי", group: "חלבון", subgroup: "בשר", fatLevel: "שומני", reference: "מעובד · ל־100 גרם · מדריך הערכים", servingGrams: 100, calories: 400, protein: 18, carbohydrates: 1.5, fats: 36 }),
  base({ id: "kabanos", name: "קבנוס", group: "חלבון", subgroup: "בשר", fatLevel: "שומני", reference: "יחידה כ־30 גרם · מדריך הערכים", servingGrams: 30, calories: 400, protein: 16, carbohydrates: 2, fats: 36 }),
  base({ id: "tzfatit-5", name: "גבינה צפתית 5%", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "בינוני", reference: "ל־100 גרם", servingGrams: 100, calories: 115, protein: 15, carbohydrates: 1.5, fats: 5 }),
  base({ id: "bulgarian-5", name: "גבינה בולגרית 5%", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "בינוני", reference: "ל־100 גרם", servingGrams: 100, calories: 115, protein: 14.5, carbohydrates: 2, fats: 5 }),
  base({ id: "bulgarian-16", name: "גבינה בולגרית 16%", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "שומני", reference: "ל־100 גרם", servingGrams: 100, calories: 210, protein: 15, carbohydrates: 1.5, fats: 16 }),
  base({ id: "yellow-cheese-9", name: "גבינה צהובה 9%", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "בינוני", reference: "ל־100 גרם · פרוסה כ־28 גרם = 55 קק״ל", servingGrams: 28, calories: 195, protein: 29, carbohydrates: 1.5, fats: 9 }),
  base({ id: "yellow-cheese-15", name: "גבינה צהובה 15%", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "בינוני", reference: "ל־100 גרם · פרוסה כ־28 גרם = 70 קק״ל", servingGrams: 28, calories: 250, protein: 29, carbohydrates: 1, fats: 15 }),
  base({ id: "yellow-cheese", name: "גבינה צהובה 28%", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "שומני", reference: "ל־100 גרם · פרוסה כ־28 גרם = 98 קק״ל", servingGrams: 28, calories: 350, protein: 24.5, carbohydrates: 0.5, fats: 28 }),
  base({ id: "mozzarella", name: "מוצרלה מגוררת / כדורים", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "בינוני", reference: "18%–20% שומן · מדריך הערכים", servingGrams: 100, calories: 260, protein: 21, carbohydrates: 1.5, fats: 19 }),
  base({ id: "halloumi", name: "גבינת חלומי", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "שומני", reference: "לטיגון/צלייה · מדריך הערכים", servingGrams: 100, calories: 330, protein: 21, carbohydrates: 1.5, fats: 26 }),
  base({ id: "parmesan", name: "פרמז׳ן / גרנה פדנו", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "שומני", reference: "גבינה קשה מגוררת · מדריך הערכים", servingGrams: 100, calories: 395, protein: 34, carbohydrates: 0.5, fats: 29 }),
  base({ id: "gouda", name: "גאודה / אמנטל / צ׳דר", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "שומני", reference: "מדריך הערכים", servingGrams: 100, calories: 375, protein: 25, carbohydrates: 0.5, fats: 30 }),
  base({ id: "camembert", name: "קממבר / ברי", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "שומני", reference: "מדריך הערכים", servingGrams: 100, calories: 300, protein: 18, carbohydrates: 0.5, fats: 25 }),
  base({ id: "hummus-ready", name: "חומוס קנוי קלאסי", group: "שונות", subgroup: "ממרחים ורטבים", fatLevel: "בינוני", reference: "כף כ־30 גרם · מדריך הערכים", servingGrams: 30, calories: 310, protein: 7.5, carbohydrates: 13.5, fats: 27 }),
  base({ id: "hummus-light", name: "חומוס קל / מופחת שומן", group: "שונות", subgroup: "ממרחים ורטבים", fatLevel: "דל שומן", reference: "כף כ־30 גרם · מדריך הערכים", servingGrams: 30, calories: 160, protein: 6.5, carbohydrates: 13, fats: 9 }),
  base({ id: "ready-tahini", name: "טחינה מוכנה קנויה", group: "שונות", subgroup: "ממרחים ורטבים", fatLevel: "בינוני", reference: "כף כ־30 גרם · מדריך הערכים", servingGrams: 30, calories: 265, protein: 6.5, carbohydrates: 8, fats: 23.5 }),
  base({ id: "mayonnaise", name: "מיונז רגיל", group: "שונות", subgroup: "ממרחים ורטבים", fatLevel: "שומני", reference: "כף כ־15 גרם · מדריך הערכים", servingGrams: 15, calories: 695, protein: 1, carbohydrates: 2, fats: 75 }),
  base({ id: "ketchup", name: "קטשופ", group: "שונות", subgroup: "ממרחים ורטבים", fatLevel: "דל שומן", reference: "כף כ־15 גרם · מדריך הערכים", servingGrams: 15, calories: 110, protein: 1.2, carbohydrates: 25, fats: 0.1 }),
  base({ id: "mustard", name: "חרדל דיז׳ון", group: "שונות", subgroup: "ממרחים ורטבים", fatLevel: "דל שומן", reference: "כפית כ־5 גרם · מדריך הערכים", servingGrams: 5, calories: 110, protein: 6, carbohydrates: 5, fats: 7 }),
  base({ id: "chicken-schnitzel", name: "שניצל עוף מוכן קפוא", group: "שונות", subgroup: "חטיפים ומוצרים מוכנים", fatLevel: "בינוני", reference: "יחידה כ־110 גרם · מדריך הערכים", servingGrams: 110, calories: 220, protein: 13.5, carbohydrates: 16, fats: 11.5 }),
  base({ id: "beef-burger-frozen", name: "המבורגר בקר קפוא", group: "שונות", subgroup: "חטיפים ומוצרים מוכנים", fatLevel: "שומני", reference: "יחידה כ־100 גרם · מדריך הערכים", servingGrams: 100, calories: 270, protein: 16, carbohydrates: 2.5, fats: 22 }),
  base({ id: "corn-schnitzel", name: "שניצל תירס טבעול", group: "שונות", subgroup: "חטיפים ומוצרים מוכנים", fatLevel: "בינוני", reference: "יחידה כ־90 גרם · מדריך הערכים", servingGrams: 90, calories: 210, protein: 7, carbohydrates: 23, fats: 9.5 }),
  commercial({ id: "barebells-bar", name: "Barebells חטיף חלבון", group: "שונות", subgroup: "חטיפים ומוצרים מוכנים", fatLevel: "בינוני", reference: "לחטיף שלם 55 גרם · ערכי המדריך ניתנים ליחידה", servingGrams: 55, unitGrams: 55, referenceAmount: 1, referenceUnit: "חטיף", nutritionBasis: "unit", calories: 200, protein: 20, carbohydrates: 15, fats: 8, brand: "Barebells", aliases: ["ברבלס", "חטיף Barebells"] }),
  commercial({ id: "pro-allin-bar", name: "Pro Allin חטיף חלבון", group: "שונות", subgroup: "חטיפים ומוצרים מוכנים", fatLevel: "בינוני", reference: "לחטיף שלם 60 גרם · ערכי המדריך ניתנים ליחידה", servingGrams: 60, unitGrams: 60, referenceAmount: 1, referenceUnit: "חטיף", nutritionBasis: "unit", calories: 215, protein: 20, carbohydrates: 19, fats: 7.5, brand: "Pro Allin", aliases: ["פרו אלין"] }),
  commercial({ id: "quest-bar", name: "Quest Bar חטיף חלבון", group: "שונות", subgroup: "חטיפי חלבון", fatLevel: "בינוני", reference: "לחטיף שלם 60 גרם · ערכי המדריך ניתנים ליחידה", servingGrams: 60, unitGrams: 60, referenceAmount: 1, referenceUnit: "חטיף", nutritionBasis: "unit", calories: 195, protein: 21, carbohydrates: 21, fats: 7, brand: "Quest", aliases: ["קווסט", "חטיף Quest"] }),

  commercial({ id: "ricotta-9", name: "גבינת ריקוטה 9%", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "שומני", reference: "ל־100 גרם · מדריך הערכים", servingGrams: 100, calories: 145, protein: 8.5, carbohydrates: 3.5, fats: 9 }),
  commercial({ id: "cream-cheese-25", name: "גבינת שמנת 25%–30%", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "שומני", reference: "נפוליאון / פילדלפיה · טווח ערכים ל־100 גרם", servingGrams: 30, calories: 275, protein: 5.5, carbohydrates: 3.5, fats: 27.5 }),
  commercial({ id: "labneh-9", name: "לאבנה 9%–11%", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "שומני", reference: "לאבנה דרוזית / אסלית · טווח ערכים ל־100 גרם", servingGrams: 100, calories: 142, protein: 7, carbohydrates: 4, fats: 10 }),
  commercial({ id: "greek-yogurt-high-fat", name: "יוגורט יווני 7%–10%", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "שומני", reference: "טווח ערכים ל־100 גרם", servingGrams: 200, calories: 122, protein: 5.5, carbohydrates: 4, fats: 8.5 }),
  commercial({ id: "bio-yogurt-3", name: "יוגורט ביו לבן 3%", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "בינוני", reference: "ל־100 גרם · גביע 200 גרם = 120 קק״ל", servingGrams: 200, calories: 60, protein: 4, carbohydrates: 4.5, fats: 3 }),
  commercial({ id: "bulgarian-24", name: "גבינה בולגרית 24%", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "שומני", reference: "ל־100 גרם", servingGrams: 100, calories: 265, protein: 14, carbohydrates: 1, fats: 24 }),
  commercial({ id: "feta-18", name: "גבינת פטה 16%–20%", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "שומני", reference: "עיזים / כבשים / בקר · טווח ערכים ל־100 גרם", servingGrams: 100, calories: 245, protein: 14, carbohydrates: 1, fats: 19 }),
  commercial({ id: "danone-pro-flavor", name: "דנונה PRO בטעמים", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן", reference: "לגביע שלם 200 גרם · תות/וניל · ערכים ליחידה", servingGrams: 200, unitGrams: 200, referenceAmount: 1, referenceUnit: "גביע", nutritionBasis: "unit", calories: 140, protein: 20, carbohydrates: 12, fats: 0.4, brand: "Danone", aliases: ["דנונה PRO תות", "דנונה PRO וניל"] }),
  commercial({ id: "go-pudding", name: "תנובה GO פודינג חלבון", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "בינוני", reference: "גביע 200 גרם · שוקולד/וניל · ערכים ליחידה", servingGrams: 200, unitGrams: 200, referenceAmount: 1, referenceUnit: "גביע", nutritionBasis: "unit", calories: 160, protein: 20, carbohydrates: 14, fats: 3, brand: "תנובה GO" }),
  commercial({ id: "muller-active", name: "מולר Active חלבון 20g", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "דל שומן", reference: "לגביע שלם 200 גרם · טווח פחמימות 10–13 ג׳", servingGrams: 200, unitGrams: 200, referenceAmount: 1, referenceUnit: "גביע", nutritionBasis: "unit", calories: 138, protein: 20, carbohydrates: 11.5, fats: 0.4, brand: "Müller" }),
  commercial({ id: "yolo-pro", name: "PRO YOLO שוקולד 15g", group: "חלבון", subgroup: "גבינות ומוצרי חלב", fatLevel: "בינוני", reference: "גביע 150 גרם · ערכים ליחידה", servingGrams: 150, unitGrams: 150, referenceAmount: 1, referenceUnit: "גביע", nutritionBasis: "unit", calories: 135, protein: 15, carbohydrates: 12.5, fats: 2.5, brand: "YOLO" }),
  commercial({ id: "go-pro-drink", name: "משקה חלבון GO", group: "חלבון", subgroup: "משקאות חלבון", fatLevel: "דל שומן", reference: "בקבוק 350 מ״ל · טווח ערכים ליחידה", servingGrams: 350, unitGrams: 350, referenceAmount: 1, referenceUnit: "בקבוק", nutritionBasis: "unit", calories: 200, protein: 26, carbohydrates: 18, fats: 1.5, brand: "תנובה GO", aliases: ["משקה GO", "בקבוק חלבון"] }),
  commercial({ id: "yotvata-pro-drink", name: "משקה יוטבתה PRO", group: "חלבון", subgroup: "משקאות חלבון", fatLevel: "דל שומן", reference: "בקבוק 350 מ״ל · ערכים ליחידה", servingGrams: 350, unitGrams: 350, referenceAmount: 1, referenceUnit: "בקבוק", nutritionBasis: "unit", calories: 225, protein: 32, carbohydrates: 18, fats: 1.5, brand: "יוטבתה PRO" }),
  commercial({ id: "egg-large-pdf", name: "ביצה שלמה L", group: "חלבון", subgroup: "ביצים", fatLevel: "בינוני", reference: "יחידה כ־60 גרם · ערכים ליחידה", servingGrams: 60, unitGrams: 60, referenceAmount: 1, referenceUnit: "ביצה", nutritionBasis: "unit", calories: 78, protein: 6.8, carbohydrates: 0.5, fats: 5.5 }),

  commercial({ id: "allin-crispy", name: "Allin Crispy / Crunch", group: "שונות", subgroup: "חטיפי חלבון", fatLevel: "בינוני", reference: "חטיף 60 גרם · ערכים ליחידה", servingGrams: 60, unitGrams: 60, referenceAmount: 1, referenceUnit: "חטיף", nutritionBasis: "unit", calories: 210, protein: 20, carbohydrates: 18, fats: 7, brand: "Allin" }),
  commercial({ id: "grenade-carb-killa", name: "Grenade Carb Killa", group: "שונות", subgroup: "חטיפי חלבון", fatLevel: "בינוני", reference: "חטיף 60 גרם · ערכים ליחידה", servingGrams: 60, unitGrams: 60, referenceAmount: 1, referenceUnit: "חטיף", nutritionBasis: "unit", calories: 220, protein: 21, carbohydrates: 18, fats: 9.5, brand: "Grenade" }),
  commercial({ id: "fitness-protein-bar", name: "פיטנס בר חלבון", group: "שונות", subgroup: "חטיפי חלבון", fatLevel: "דל שומן", reference: "חטיף 35 גרם · ערכים ליחידה", servingGrams: 35, unitGrams: 35, referenceAmount: 1, referenceUnit: "חטיף", nutritionBasis: "unit", calories: 135, protein: 8.5, carbohydrates: 14.5, fats: 3.8, brand: "Fitness" }),
  commercial({ id: "nature-valley-pair", name: "Nature Valley זוג חטיפים", group: "שונות", subgroup: "חטיפי בריאות ודגנים", fatLevel: "בינוני", reference: "אריזה 42 גרם · שיבולת שועל ודבש · ערכים ליחידה", servingGrams: 42, unitGrams: 42, referenceAmount: 1, referenceUnit: "אריזה", nutritionBasis: "package", calories: 190, protein: 4, carbohydrates: 28, fats: 7, brand: "Nature Valley" }),
  commercial({ id: "nature-valley-single", name: "Nature Valley חטיף בודד", group: "שונות", subgroup: "חטיפי בריאות ודגנים", fatLevel: "דל שומן", reference: "יחידה 21 גרם · ערכים ליחידה", servingGrams: 21, unitGrams: 21, referenceAmount: 1, referenceUnit: "חטיף", nutritionBasis: "unit", calories: 95, protein: 2, carbohydrates: 14, fats: 3.5, brand: "Nature Valley" }),
  commercial({ id: "energy-chocolate-bar", name: "חטיף אנרג׳י שוקולד", group: "שונות", subgroup: "חטיפי בריאות ודגנים", fatLevel: "דל שומן", reference: "חטיף דגנים 25 גרם · ערכים ליחידה", servingGrams: 25, unitGrams: 25, referenceAmount: 1, referenceUnit: "חטיף", nutritionBasis: "unit", calories: 99, protein: 1.5, carbohydrates: 16.5, fats: 3, brand: "Energy" }),
  commercial({ id: "fitness-cereal-bar", name: "חטיף פיטנס שוקולד", group: "שונות", subgroup: "חטיפי בריאות ודגנים", fatLevel: "דל שומן", reference: "חטיף דגנים 23.5 גרם · ערכים ליחידה", servingGrams: 23.5, unitGrams: 23.5, referenceAmount: 1, referenceUnit: "חטיף", nutritionBasis: "unit", calories: 90, protein: 1.4, carbohydrates: 16, fats: 2.1, brand: "Fitness" }),
  commercial({ id: "corny-big-chocolate", name: "חטיף Corny ביג שוקולד", group: "שונות", subgroup: "חטיפי בריאות ודגנים", fatLevel: "בינוני", reference: "חטיף 50 גרם · ערכים ליחידה", servingGrams: 50, unitGrams: 50, referenceAmount: 1, referenceUnit: "חטיף", nutritionBasis: "unit", calories: 225, protein: 3, carbohydrates: 33, fats: 8.5, brand: "Corny" }),
  commercial({ id: "free-date-fruit-bar", name: "חטיף תמרים ופירות Free", group: "שונות", subgroup: "חטיפי בריאות ודגנים", fatLevel: "דל שומן", reference: "חטיף 40 גרם · ללא תוספת סוכר · ערכים ליחידה", servingGrams: 40, unitGrams: 40, referenceAmount: 1, referenceUnit: "חטיף", nutritionBasis: "unit", calories: 145, protein: 2.5, carbohydrates: 25, fats: 3.5 }),
  commercial({ id: "bran-flakes", name: "ברנפלקס ללא סוכר", group: "שונות", subgroup: "חטיפי בריאות ודגנים", fatLevel: "דל שומן", reference: "ל־100 גרם · 25 גרם סיבים", servingGrams: 30, calories: 300, protein: 12, carbohydrates: 50, fats: 2.5, brand: "תלמה" }),
  commercial({ id: "cornflakes", name: "קורנפלקס תלמה אלופים", group: "שונות", subgroup: "חטיפי בריאות ודגנים", fatLevel: "דל שומן", reference: "ל־100 גרם", servingGrams: 30, calories: 370, protein: 8, carbohydrates: 82, fats: 1, brand: "תלמה" }),
  commercial({ id: "fitness-classic", name: "פיטנס קלאסי", group: "שונות", subgroup: "חטיפי בריאות ודגנים", fatLevel: "דל שומן", reference: "ל־100 גרם", servingGrams: 30, calories: 365, protein: 9, carbohydrates: 74, fats: 2, brand: "Nestlé" }),
  commercial({ id: "nougat-pillows", name: "כריות נוגט", group: "שונות", subgroup: "חטיפי בריאות ודגנים", fatLevel: "שומני", reference: "ל־100 גרם · 35 גרם סוכר", servingGrams: 30, calories: 450, protein: 6, carbohydrates: 72, fats: 15, brand: "תלמה" }),
  commercial({ id: "crunch-granola", name: "גרנולה קראנץ׳ אפויה", group: "שונות", subgroup: "חטיפי בריאות ודגנים", fatLevel: "שומני", reference: "ל־100 גרם · עם שקדים וצימוקים", servingGrams: 40, calories: 455, protein: 10, carbohydrates: 60, fats: 18 }),

  commercial({ id: "eggplant-mayo-salad", name: "סלט חציל במיונז", group: "שונות", subgroup: "סלטים קנויים", fatLevel: "שומני", reference: "כף כ־30 גרם · ערכים ל־100 גרם", servingGrams: 30, calories: 255, protein: 1.5, carbohydrates: 6, fats: 25 }),
  commercial({ id: "eggplant-fire-salad", name: "סלט חציל על האש / בטחינה", group: "שונות", subgroup: "סלטים קנויים", fatLevel: "דל שומן", reference: "ללא מיונז · ל־100 גרם", servingGrams: 100, calories: 65, protein: 1.5, carbohydrates: 6, fats: 4 }),
  commercial({ id: "red-cabbage-mayo", name: "סלט כרוב אדום במיונז", group: "שונות", subgroup: "סלטים קנויים", fatLevel: "בינוני", reference: "ל־100 גרם", servingGrams: 100, calories: 195, protein: 1.2, carbohydrates: 8, fats: 18.5 }),
  commercial({ id: "egg-salad-mayo", name: "סלט ביצים במיונז קנוי", group: "שונות", subgroup: "סלטים קנויים", fatLevel: "שומני", reference: "ל־100 גרם", servingGrams: 100, calories: 250, protein: 9, carbohydrates: 3.5, fats: 22 }),
  commercial({ id: "tuna-mayo-salad", name: "סלט טונה במיונז קנוי", group: "שונות", subgroup: "סלטים קנויים", fatLevel: "בינוני", reference: "ל־100 גרם", servingGrams: 100, calories: 235, protein: 14, carbohydrates: 4, fats: 18 }),
  commercial({ id: "matbucha-ready", name: "סלט מטבוחה קנוי", group: "שונות", subgroup: "סלטים קנויים", fatLevel: "דל שומן", reference: "ל־100 גרם", servingGrams: 100, calories: 120, protein: 1.5, carbohydrates: 10, fats: 7.5 }),
  commercial({ id: "turkish-salad-ready", name: "סלט טורקי קנוי", group: "שונות", subgroup: "סלטים קנויים", fatLevel: "דל שומן", reference: "ל־100 גרם", servingGrams: 100, calories: 130, protein: 1.5, carbohydrates: 11, fats: 8.5 }),
  commercial({ id: "guacamole-ready", name: "גוואקמולי / ממרח אבוקדו קנוי", group: "שונות", subgroup: "סלטים קנויים", fatLevel: "בינוני", reference: "ל־100 גרם", servingGrams: 100, calories: 195, protein: 2, carbohydrates: 6, fats: 18 }),
  commercial({ id: "mayonnaise-light", name: "מיונז קל", group: "שונות", subgroup: "ממרחים ורטבים", fatLevel: "בינוני", reference: "כף כ־15 גרם · ערכים ל־100 גרם", servingGrams: 15, calories: 300, protein: 0.8, carbohydrates: 6, fats: 30 }),
  commercial({ id: "mayonnaise-5", name: "מיונז לייט 5%", group: "שונות", subgroup: "ממרחים ורטבים", fatLevel: "דל שומן", reference: "כף כ־15 גרם · ערכים ל־100 גרם", servingGrams: 15, calories: 95, protein: 0.5, carbohydrates: 9, fats: 5 }),
  commercial({ id: "thousand-island", name: "רוטב אלף האיים רגיל", group: "שונות", subgroup: "ממרחים ורטבים", fatLevel: "שומני", reference: "כף כ־15 גרם · ערכים ל־100 גרם", servingGrams: 15, calories: 375, protein: 0.7, carbohydrates: 15, fats: 34 }),
  commercial({ id: "thousand-island-light", name: "רוטב אלף האיים לייט 5%", group: "שונות", subgroup: "ממרחים ורטבים", fatLevel: "דל שומן", reference: "כף כ־15 גרם · ערכים ל־100 גרם", servingGrams: 15, calories: 120, protein: 0.5, carbohydrates: 14, fats: 5 }),
  commercial({ id: "garlic-vinaigrette", name: "רוטב שום / וינגרט קנוי", group: "שונות", subgroup: "ממרחים ורטבים", fatLevel: "שומני", reference: "ל־100 גרם", servingGrams: 15, calories: 340, protein: 0.8, carbohydrates: 12, fats: 32 }),
  commercial({ id: "teriyaki-chili", name: "רוטב טריאקי / צ׳ילי מתוק", group: "שונות", subgroup: "ממרחים ורטבים", fatLevel: "דל שומן", reference: "ל־100 גרם", servingGrams: 15, calories: 190, protein: 2, carbohydrates: 46, fats: 0.1 }),

  base({ id: "romanian-pastrami", name: "פסטרמה רומנית / כתף בקר", group: "חלבון", subgroup: "בשר", fatLevel: "בינוני", reference: "ל־100 גרם · מדריך הערכים", servingGrams: 100, calories: 140, protein: 16.5, carbohydrates: 3, fats: 7 }),
  commercial({ id: "chicken-beef-sausages", name: "נקניקיות עוף / בקר", group: "שונות", subgroup: "חטיפים ומוצרים מוכנים", fatLevel: "שומני", reference: "יחידה כ־40 גרם · ערכים ל־100 גרם", servingGrams: 40, calories: 250, protein: 11, carbohydrates: 5, fats: 20 }),
  commercial({ id: "soy-schnitzel", name: "שניצל סויה / צמחי טבעול", group: "שונות", subgroup: "חטיפים ומוצרים מוכנים", fatLevel: "בינוני", reference: "יחידה כ־90 גרם · ערכים ל־100 גרם", servingGrams: 90, calories: 190, protein: 13.5, carbohydrates: 15, fats: 8.5, brand: "טבעול" }),
  commercial({ id: "beyond-burger", name: "בורגר Beyond Meat", group: "שונות", subgroup: "חטיפים ומוצרים מוכנים", fatLevel: "שומני", reference: "יחידה 113 גרם · 250 קק״ל ליחידה", servingGrams: 113, unitGrams: 113, referenceAmount: 1, referenceUnit: "יחידה", nutritionBasis: "unit", calories: 250, protein: 17.7, carbohydrates: 4.5, fats: 15, brand: "Beyond Meat" }),
  base({ id: "seitan", name: "סייטן / חלבון חיטה", group: "חלבון", subgroup: "קטניות ותחליפים", fatLevel: "דל שומן", reference: "ל־100 גרם", servingGrams: 150, calories: 170, protein: 26, carbohydrates: 5, fats: 2.5 }),
  base({ id: "tvp-dry", name: "שבבי סויה יבשים TVP", group: "חלבון", subgroup: "קטניות ותחליפים", fatLevel: "דל שומן", reference: "יבש לפני השרייה ובישול · ל־100 גרם", servingGrams: 50, calories: 335, protein: 50, carbohydrates: 28, fats: 1.5 }),
  base({ id: "edamame", name: "פולי סויה / אדממה", group: "חלבון", subgroup: "קטניות ותחליפים", fatLevel: "בינוני", reference: "מבושל / מופשר · ל־100 גרם", servingGrams: 150, calories: 120, protein: 11.5, carbohydrates: 8.5, fats: 5 }),

  base({ id: "tuna-oil", name: "טונה בהירה בשמן", group: "חלבון", subgroup: "דגים", fatLevel: "בינוני", reference: "מסוננת מקופסה · ל־100 גרם", servingGrams: 120, calories: 195, protein: 25, carbohydrates: 0, fats: 10.5 }),
  base({ id: "smoked-salmon", name: "סלמון מעושן פרוס", group: "חלבון", subgroup: "דגים", fatLevel: "בינוני", reference: "ארוז מוכן לאכילה · ל־100 גרם", servingGrams: 100, calories: 175, protein: 21, carbohydrates: 0, fats: 10 }),
  base({ id: "sea-bream", name: "פילה דניס / לברק", group: "חלבון", subgroup: "דגים", fatLevel: "דל שומן", reference: "נא · ל־100 גרם", servingGrams: 150, calories: 125, protein: 19.5, carbohydrates: 0, fats: 5 }),
  base({ id: "sardines-tomato", name: "סרדינים ברוטב עגבניות", group: "חלבון", subgroup: "דגים", fatLevel: "בינוני", reference: "מקופסה · ל־100 גרם", servingGrams: 100, calories: 150, protein: 19, carbohydrates: 3.5, fats: 7 }),
  base({ id: "herring", name: "הרינג / מטיאס בשמן", group: "חלבון", subgroup: "דגים", fatLevel: "שומני", reference: "מסונן · ל־100 גרם", servingGrams: 100, calories: 240, protein: 16, carbohydrates: 1, fats: 19 }),
  base({ id: "smoked-mackerel", name: "מקרל מעושן", group: "חלבון", subgroup: "דגים", fatLevel: "שומני", reference: "ל־100 גרם", servingGrams: 100, calories: 260, protein: 19, carbohydrates: 0, fats: 20.5 }),
  base({ id: "anchovy", name: "אנשובי משומר בשמן", group: "חלבון", subgroup: "דגים", fatLevel: "בינוני", reference: "מסונן · ל־100 גרם", servingGrams: 50, calories: 210, protein: 28, carbohydrates: 0, fats: 10 }),

  base({ id: "white-pita", name: "פיתה לבנה רגילה", group: "פחמימה", subgroup: "לחמים ומאפים", fatLevel: "דל שומן", reference: "יחידה כ־100 גרם · ל־100 גרם", servingGrams: 100, calories: 260, protein: 8.5, carbohydrates: 53, fats: 1.2 }),
  base({ id: "whole-pita", name: "פיתה מקמח מלא / כוסמין", group: "פחמימה", subgroup: "לחמים ומאפים", fatLevel: "דל שומן", reference: "יחידה כ־90–100 גרם · ל־100 גרם", servingGrams: 95, calories: 225, protein: 9.5, carbohydrates: 44, fats: 1.8 }),
  base({ id: "mini-pita", name: "מיני פיתה ביס", group: "פחמימה", subgroup: "לחמים ומאפים", fatLevel: "דל שומן", reference: "יחידה כ־40 גרם · ל־100 גרם", servingGrams: 40, calories: 105, protein: 3.4, carbohydrates: 21, fats: 0.5 }),
  base({ id: "laffa", name: "לאפה עיראקית", group: "פחמימה", subgroup: "לחמים ומאפים", fatLevel: "דל שומן", reference: "יחידה כ־190 גרם · כ־500 קק״ל ליחידה", servingGrams: 190, calories: 265, protein: 8.5, carbohydrates: 54, fats: 1.5 }),
  base({ id: "shabbat-challah", name: "חלת שבת רגילה / מתוקה", group: "פחמימה", subgroup: "לחמים ומאפים", fatLevel: "בינוני", reference: "ל־100 גרם", servingGrams: 60, calories: 290, protein: 8.5, carbohydrates: 52, fats: 5.5 }),
  base({ id: "white-bread-sliced", name: "לחם לבן / אחיד פרוס", group: "פחמימה", subgroup: "לחמים ומאפים", fatLevel: "דל שומן", reference: "פרוסה כ־35 גרם · ל־100 גרם", servingGrams: 35, calories: 245, protein: 7.8, carbohydrates: 49, fats: 1.8 }),
  base({ id: "sourdough-whole-bread", name: "לחם מלא / שיפון / מחמצת", group: "פחמימה", subgroup: "לחמים ומאפים", fatLevel: "דל שומן", reference: "פרוסה כ־35 גרם · ל־100 גרם", servingGrams: 35, calories: 220, protein: 8.8, carbohydrates: 42, fats: 2 }),
  base({ id: "light-bread", name: "לחם קל", group: "פחמימה", subgroup: "לחמים ומאפים", fatLevel: "דל שומן", reference: "פרוסה כ־28 גרם · ל־100 גרם", servingGrams: 28, calories: 170, protein: 8.5, carbohydrates: 30, fats: 1.2 }),
  base({ id: "hamburger-bun", name: "לחמניית המבורגר רגילה", group: "פחמימה", subgroup: "לחמים ומאפים", fatLevel: "בינוני", reference: "יחידה כ־80 גרם · ל־100 גרם", servingGrams: 80, calories: 270, protein: 8.5, carbohydrates: 51, fats: 3 }),
  base({ id: "bagel", name: "בייגל אמריקאי / טוסט", group: "פחמימה", subgroup: "לחמים ומאפים", fatLevel: "בינוני", reference: "יחידה כ־120 גרם · כ־330 קק״ל ליחידה", servingGrams: 120, calories: 275, protein: 9.5, carbohydrates: 54, fats: 2 }),
  base({ id: "tortilla", name: "טורטייה רגילה", group: "פחמימה", subgroup: "לחמים ומאפים", fatLevel: "בינוני", reference: "יחידה כ־40 גרם · ל־100 גרם", servingGrams: 40, calories: 300, protein: 7.5, carbohydrates: 52, fats: 6.5 }),
  base({ id: "whole-tortilla", name: "טורטייה כוסמין / מלאה", group: "פחמימה", subgroup: "לחמים ומאפים", fatLevel: "בינוני", reference: "יחידה כ־40 גרם · ל־100 גרם", servingGrams: 40, calories: 265, protein: 8.5, carbohydrates: 46, fats: 4.5 }),
  commercial({ id: "cheese-bourekas", name: "בורקס גבינה", group: "שונות", subgroup: "חטיפים ומוצרים מוכנים", fatLevel: "שומני", reference: "יחידה בינונית כ־80 גרם · כ־270 קק״ל ליחידה", servingGrams: 80, unitGrams: 80, referenceAmount: 1, referenceUnit: "יחידה", nutritionBasis: "unit", calories: 340, protein: 8, carbohydrates: 30, fats: 21 }),
  commercial({ id: "potato-bourekas", name: "בורקס תפוח אדמה", group: "שונות", subgroup: "חטיפים ומוצרים מוכנים", fatLevel: "שומני", reference: "יחידה בינונית כ־80 גרם · כ־250 קק״ל ליחידה", servingGrams: 80, unitGrams: 80, referenceAmount: 1, referenceUnit: "יחידה", nutritionBasis: "unit", calories: 315, protein: 4.5, carbohydrates: 36, fats: 17 }),
  commercial({ id: "malawach", name: "מלאווח קפוא", group: "שונות", subgroup: "חטיפים ומוצרים מוכנים", fatLevel: "שומני", reference: "יחידה כ־140 גרם · כ־460 קק״ל ליחידה", servingGrams: 140, unitGrams: 140, referenceAmount: 1, referenceUnit: "יחידה", nutritionBasis: "unit", calories: 460, protein: 6, carbohydrates: 57.4, fats: 22.4 }),
  commercial({ id: "jachnun", name: "ג׳חנון קפוא", group: "שונות", subgroup: "חטיפים ומוצרים מוכנים", fatLevel: "שומני", reference: "יחידה כ־120 גרם · כ־420 קק״ל ליחידה", servingGrams: 120, unitGrams: 120, referenceAmount: 1, referenceUnit: "יחידה", nutritionBasis: "unit", calories: 420, protein: 6.5, carbohydrates: 52.8, fats: 19.8 }),
  base({ id: "matzah", name: "מצה רגילה", group: "פחמימה", subgroup: "לחמים ומאפים", fatLevel: "דל שומן", reference: "ל־100 גרם · יחידה כ־30 גרם", servingGrams: 30, calories: 380, protein: 10, carbohydrates: 80, fats: 1 }),

  base({ id: "rice-noodles", name: "אטריות אורז", group: "פחמימה", subgroup: "פסטות ודגנים", fatLevel: "דל שומן", reference: "מבושלות · ל־100 גרם", servingGrams: 180, calories: 110, protein: 1, carbohydrates: 24.5, fats: 0.2 }),
  base({ id: "whole-pasta", name: "פסטה מקמח מלא", group: "פחמימה", subgroup: "פסטות ודגנים", fatLevel: "דל שומן", reference: "מבושלת · ל־100 גרם", servingGrams: 180, calories: 135, protein: 5.8, carbohydrates: 27, fats: 1 }),
  base({ id: "baked-ptitim", name: "פתיתים אפויים", group: "פחמימה", subgroup: "פסטות ודגנים", fatLevel: "דל שומן", reference: "מבושלים · ל־100 גרם", servingGrams: 180, calories: 145, protein: 4.8, carbohydrates: 29, fats: 1.2 }),
  base({ id: "buckwheat", name: "כוסמת מבושלת", group: "פחמימה", subgroup: "פסטות ודגנים", fatLevel: "דל שומן", reference: "מבושלת · ל־100 גרם", servingGrams: 180, calories: 92, protein: 3.4, carbohydrates: 20, fats: 0.6 }),
  commercial({ id: "medjool-date", name: "תמר מג׳הול", group: "פחמימה", subgroup: "פירות וירקות", fatLevel: "דל שומן", reference: "יחידה כ־22 גרם · כ־62 קק״ל ליחידה", servingGrams: 22, unitGrams: 22, referenceAmount: 1, referenceUnit: "תמר", nutritionBasis: "unit", calories: 62, protein: 0.5, carbohydrates: 15.6, fats: 0.2 }),
  commercial({ id: "honey-silan", name: "דבש / סילאן טבעי", group: "פחמימה", subgroup: "פחמימות", fatLevel: "דל שומן", reference: "כף כ־20 גרם · כ־60 קק״ל לכף", servingGrams: 20, unitGrams: 20, referenceAmount: 1, referenceUnit: "כף", nutritionBasis: "unit", calories: 60, protein: 0, carbohydrates: 76, fats: 0 }),

  base({ id: "canola-oil", name: "שמן קנולה", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", reference: "כף כ־10 גרם · ל־100 גרם", servingGrams: 10, calories: 884, protein: 0, carbohydrates: 0, fats: 100 }),
  base({ id: "soy-oil", name: "שמן סויה", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", reference: "כף כ־10 גרם · ל־100 גרם", servingGrams: 10, calories: 884, protein: 0, carbohydrates: 0, fats: 100 }),
  base({ id: "coconut-oil", name: "שמן קוקוס", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", reference: "כף כ־10 גרם · 86 קק״ל לכף", servingGrams: 10, calories: 860, protein: 0, carbohydrates: 0, fats: 100 }),
  base({ id: "butter-82", name: "חמאה 82%", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", reference: "ל־100 גרם", servingGrams: 10, calories: 730, protein: 0.7, carbohydrates: 0.7, fats: 82 }),
  base({ id: "tahini-regular-pdf", name: "טחינה גולמית רגילה", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", reference: "כף כ־15 גרם · ל־100 גרם", servingGrams: 15, calories: 645, protein: 18, carbohydrates: 11.5, fats: 57 }),
  base({ id: "tahini-whole-pdf", name: "טחינה גולמית משומשום מלא", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", reference: "כף כ־15 גרם · ל־100 גרם", servingGrams: 15, calories: 620, protein: 20, carbohydrates: 9, fats: 56 }),
  base({ id: "natural-peanut-butter", name: "חמאת בוטנים 100% טבעית", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", reference: "כף כ־15 גרם · ל־100 גרם", servingGrams: 15, calories: 590, protein: 25, carbohydrates: 19, fats: 50 }),
  base({ id: "natural-almond-butter", name: "חמאת שקדים 100% טבעית", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", reference: "כף כ־15 גרם · ל־100 גרם", servingGrams: 15, calories: 610, protein: 21, carbohydrates: 18, fats: 54 }),
  base({ id: "pecans", name: "אגוזי פקאן טבעיים", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", reference: "חופן כ־30 גרם · ל־100 גרם", servingGrams: 30, calories: 690, protein: 9, carbohydrates: 14, fats: 72 }),
  base({ id: "pumpkin-seeds", name: "גרעיני דלעת קלופים", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", reference: "חופן כ־30 גרם · 9 ג׳ חלבון למנה", servingGrams: 30, calories: 560, protein: 30, carbohydrates: 13, fats: 49 }),
  base({ id: "sunflower-seeds", name: "גרעיני חמניה קלופים", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", reference: "חופן כ־30 גרם · ל־100 גרם", servingGrams: 30, calories: 584, protein: 20.8, carbohydrates: 20, fats: 51.5 }),
  base({ id: "chia-seeds", name: "זרעי צ׳יה יבשים", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", reference: "כף כ־12 גרם · 4 ג׳ סיבים למנה", servingGrams: 12, calories: 486, protein: 16.5, carbohydrates: 42, fats: 30.7 }),
  base({ id: "olives", name: "זיתים ירוקים / שחורים", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "בינוני", reference: "מסוננים מקופסה · ל־100 גרם", servingGrams: 30, calories: 145, protein: 1, carbohydrates: 3.8, fats: 15 }),
  commercial({ id: "dark-chocolate-70", name: "שוקולד מריר 70%", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", reference: "קובייה כ־6 גרם · כ־35 קק״ל לקובייה", servingGrams: 6, unitGrams: 6, referenceAmount: 1, referenceUnit: "קובייה", nutritionBasis: "unit", calories: 35, protein: 0.6, carbohydrates: 2.8, fats: 2.5 }),
  commercial({ id: "dark-chocolate-85", name: "שוקולד מריר 85%", group: "שומן", subgroup: "שמנים, אגוזים וזרעים", fatLevel: "שומני", reference: "קובייה כ־6 גרם · כ־36 קק״ל לקובייה", servingGrams: 6, unitGrams: 6, referenceAmount: 1, referenceUnit: "קובייה", nutritionBasis: "unit", calories: 36, protein: 0.6, carbohydrates: 1.9, fats: 2.9 }),
];

export function foodSubgroupFor(food: Pick<FoodItem, "group" | "subgroup" | "name">): FoodSubgroup {
  if (food.subgroup) return food.subgroup;
  const name = food.name;
  if (food.group === "חלבון") {
    if (name.includes("עוף") || name.includes("הודו") || name.includes("פרגית") || name.includes("שוק")) return "עופות";
    if (name.includes("אבקת") || name.includes("whey")) return "אבקות חלבון";
    if (name.includes("גבינה") || name.includes("קוטג") || name.includes("יוגורט") || name.includes("סקיר") || name.includes("חלב")) return "גבינות ומוצרי חלב";
    if (name.includes("ביצה") || name.includes("חלמון")) return "ביצים";
    if (name.includes("טונה") || name.includes("סלמון") || name.includes("דג") || name.includes("מושט") || name.includes("ברמונדי") || name.includes("בקלה") || name.includes("סרדין")) return "דגים";
    if (name.includes("טופו") || name.includes("עדשים") || name.includes("חומוס")) return "קטניות ותחליפים";
    return "בשר";
  }
  if (food.group === "פחמימה") {
    if (/לחם|פיתה|לאפה|חלה|פוקצ׳ה|טורטייה|בורקס|מלאווח|ג׳חנון|בייגל|מצה/.test(name)) return "לחמים ומאפים";
    if (/פסטה|פתיתים|אורז|קוסקוס|אטריות|קינואה|כוסמת|בורגול/.test(name)) return "פסטות ודגנים";
    if (/קורנפלקס|ברנפלקס|פיטנס|כריות|גרנולה|שיבולת/.test(name)) return "חטיפי בריאות ודגנים";
    return "פחמימות";
  }
  if (food.group === "ירק ופרי") return "פירות וירקות";
  if (food.group === "שומן") return "שמנים, אגוזים וזרעים";
  if (food.group === "שונות") {
    if (/סלט/.test(name)) return "סלטים קנויים";
    if (/משקה|דנונה|תנובה GO|מולר|יוטבתה/.test(name)) return "משקאות חלבון";
    if (/חטיף/.test(name)) return "חטיפי חלבון";
    if (/רוטב|חומוס|מיונז|קטשופ|חרדל|טחינה|גוואקמולי/.test(name)) return "ממרחים ורטבים";
    return "חטיפים ומוצרים מוכנים";
  }
  return "שונות";
}

function scaleFoodValues(food: FoodItem, factor: number) {
  return { calories: Math.round(food.calories * factor), protein: Math.round(food.protein * factor * 10) / 10, carbohydrates: Math.round(food.carbohydrates * factor * 10) / 10, fats: Math.round(food.fats * factor * 10) / 10 };
}

export function macrosForGrams(food: FoodItem, grams: number) {
  return scaleFoodValues(food, grams / 100);
}

/** מחשב ערכים לפי כמות בגרמים, תוך כיבוד בסיס הנתונים של מוצרי יחידה/גביע/אריזה. */
export function macrosForFoodQuantity(food: FoodItem, grams: number) {
  const basis = food.nutritionBasis ?? "100g";
  if (basis === "100g") return macrosForGrams(food, grams);
  const referenceGrams = food.unitGrams ?? food.servingGrams;
  const referenceAmount = food.referenceAmount ?? 1;
  if (!Number.isFinite(referenceGrams) || referenceGrams <= 0 || referenceAmount <= 0) return macrosForGrams(food, grams);
  return scaleFoodValues(food, (grams / referenceGrams) / referenceAmount);
}

/** ערכי הייחוס המוצגים בכרטיס: 100 גרם או יחידה/גביע/מנה כפי שנקבעו במקור. */
/** קלוריות מנורמלות ל־100 גרם לצורך השוואה ומיון בין מוצרים עם בסיסי מנה שונים. */
export function caloriesPer100g(food: FoodItem) {
  return macrosForFoodQuantity(food, 100).calories;
}

export function macrosForReference(food: FoodItem) {
  const basis = food.nutritionBasis ?? "100g";
  return basis === "100g" ? macrosForGrams(food, 100) : scaleFoodValues(food, 1 / (food.referenceAmount ?? 1));
}

export function nutritionReferenceLabel(food: FoodItem) {
  const basis = food.nutritionBasis ?? "100g";
  if (basis === "100g") return "ל־100 ג׳";
  const unit = food.referenceUnit ?? (basis === "cup" ? "כוס" : basis === "package" ? "אריזה" : basis === "serving" ? "מנה" : "יחידה");
  const grams = food.unitGrams ?? food.servingGrams;
  return `${unit}${grams ? ` · ${grams} ג׳` : ""}`;
}
