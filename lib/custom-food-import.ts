import type { FoodGroup, FoodItem, FoodSubgroup, NutritionBasis } from "./food-nutrition";

export type CustomFoodImportResult = {
  items: FoodItem[];
  errors: string[];
};

const groupAliases: Record<string, FoodGroup> = {
  חלבון: "חלבון",
  protein: "חלבון",
  פחמימה: "פחמימה",
  carbohydrate: "פחמימה",
  carbs: "פחמימה",
  שומן: "שומן",
  fat: "שומן",
  "ירק ופרי": "ירק ופרי",
  ירקות: "ירק ופרי",
  פירות: "ירק ופרי",
  fruit: "ירק ופרי",
  vegetables: "ירק ופרי",
  שונות: "שונות",
  misc: "שונות",
  miscellaneous: "שונות",
};

const subgroupAliases: Record<string, FoodSubgroup> = {
  עופות: "עופות",
  poultry: "עופות",
  בשר: "בשר",
  meat: "בשר",
  דגים: "דגים",
  fish: "דגים",
  "גבינות ומוצרי חלב": "גבינות ומוצרי חלב",
  חלב: "גבינות ומוצרי חלב",
  dairy: "גבינות ומוצרי חלב",
  ביצים: "ביצים",
  eggs: "ביצים",
  "קטניות ותחליפים": "קטניות ותחליפים",
  legumes: "קטניות ותחליפים",
  "משקאות חלבון": "משקאות חלבון",
  "protein drinks": "משקאות חלבון",
  "אבקות חלבון": "אבקות חלבון",
  "protein powders": "אבקות חלבון",
  "חטיפי חלבון": "חטיפי חלבון",
  "protein bars": "חטיפי חלבון",
  "לחמים ומאפים": "לחמים ומאפים",
  breads: "לחמים ומאפים",
  "פסטות ודגנים": "פסטות ודגנים",
  grains: "פסטות ודגנים",
  "סלטים קנויים": "סלטים קנויים",
  "ממרחים ורטבים": "ממרחים ורטבים",
  sauces: "ממרחים ורטבים",
  "שמנים, אגוזים וזרעים": "שמנים, אגוזים וזרעים",
  oils: "שמנים, אגוזים וזרעים",
  "חטיפים ומוצרים מוכנים": "חטיפים ומוצרים מוכנים",
  snacks: "חטיפים ומוצרים מוכנים",
  "פחמימות": "פחמימות",
  "פירות וירקות": "פירות וירקות",
  "שונות": "שונות",
  misc: "שונות",
};

const basisAliases: Record<string, { basis: NutritionBasis; label: string }> = {
  "100": { basis: "100g", label: "ל־100 גרם" },
  "100g": { basis: "100g", label: "ל־100 גרם" },
  "100 גרם": { basis: "100g", label: "ל־100 גרם" },
  גרם: { basis: "100g", label: "ל־100 גרם" },
  מנה: { basis: "serving", label: "לפי מנה" },
  serving: { basis: "serving", label: "לפי מנה" },
  יחידה: { basis: "unit", label: "לפי יחידה" },
  unit: { basis: "unit", label: "לפי יחידה" },
  גביע: { basis: "unit", label: "לפי גביע" },
  כוס: { basis: "cup", label: "לפי כוס" },
  cup: { basis: "cup", label: "לפי כוס" },
  אריזה: { basis: "package", label: "לפי אריזה" },
  package: { basis: "package", label: "לפי אריזה" },
};

const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/[״'’]/g, "").replace(/\s+/g, " ");
const parseNumber = (value: string | undefined) => {
  const normalized = (value ?? "").trim().replace(/,/g, ".").replace(/[^0-9.-]/g, "");
  if (!normalized) return NaN;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
};

export function parseCsvLine(line: string, delimiter = ",") {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  cells.push(value.trim());
  return cells;
}

function detectDelimiter(header: string) {
  const candidates = [",", ";", "\t"];
  return candidates.sort((a, b) => parseCsvLine(header, b).length - parseCsvLine(header, a).length)[0];
}

function headerKey(value: string) {
  const key = normalizeKey(value).replace(/\(.*?\)/g, "");
  if (["name", "product", "food", "שם", "שם מוצר", "שם המוצר", "מוצר"].includes(key)) return "name";
  if (["group", "category", "קבוצה", "קטגוריה"].includes(key)) return "group";
  if (["subgroup", "subcategory", "sub category", "תת קטגוריה", "תת־קטגוריה"].includes(key)) return "subgroup";
  if (["reference", "source", "מקור", "מותג", "brand"].includes(key)) return key === "brand" || key === "מותג" ? "brand" : "reference";
  if (["basis", "בסיס", "יחידת בסיס", "בסיס חישוב"].includes(key)) return "basis";
  if (["servinggrams", "serving grams", "grams", "גרם", "גודל מנה", "משקל מנה"].includes(key)) return "servingGrams";
  if (["calories", "kcal", "קלוריות", "קלוריות קק\"ל", "קק\"ל"].includes(key)) return "calories";
  if (["protein", "חלבון", "חלבון גרם"].includes(key)) return "protein";
  if (["carbohydrates", "carbs", "פחמימות", "פחמימות גרם"].includes(key)) return "carbohydrates";
  if (["fats", "fat", "שומן", "שומן גרם"].includes(key)) return "fats";
  if (["barcode", "ברקוד"].includes(key)) return "barcode";
  return normalizeKey(value);
}

export function parseCustomFoodsCsv(csv: string, idPrefix = "csv-food") : CustomFoodImportResult {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return { items: [], errors: ["הקובץ חייב לכלול שורת כותרות ולפחות מוצר אחד."] };
  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(headerKey);
  if (!headers.includes("name")) return { items: [], errors: ["חסרה עמודת שם מוצר: name או שם מוצר."] };

  const items: FoodItem[] = [];
  const errors: string[] = [];
  lines.slice(1).forEach((line, lineIndex) => {
    const rowNumber = lineIndex + 2;
    const values = parseCsvLine(line, delimiter);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const name = String(row.name ?? "").trim();
    const group = groupAliases[normalizeKey(String(row.group ?? "שונות"))] ?? "שונות";
    const subgroupValue = normalizeKey(String(row.subgroup ?? ""));
    const subgroup = subgroupAliases[subgroupValue];
    const servingGrams = parseNumber(String(row.servingGrams ?? "100"));
    const numericFields = ["calories", "protein", "carbohydrates", "fats"] as const;
    const numbers = Object.fromEntries(numericFields.map((field) => [field, parseNumber(String(row[field] ?? ""))])) as Record<(typeof numericFields)[number], number>;
    const basisValue = normalizeKey(String(row.basis ?? "100"));
    const basisInfo = basisAliases[basisValue] ?? basisAliases["100"];

    if (!name) errors.push(`שורה ${rowNumber}: חסר שם מוצר.`);
    if (!subgroup && subgroupValue) errors.push(`שורה ${rowNumber}: תת־הקטגוריה „${row.subgroup}” אינה מוכרת.`);
    if (!Number.isFinite(servingGrams) || servingGrams <= 0) errors.push(`שורה ${rowNumber}: גודל מנה חייב להיות מספר חיובי.`);
    numericFields.forEach((field) => {
      if (!Number.isFinite(numbers[field]) || numbers[field] < 0) errors.push(`שורה ${rowNumber}: הערך ${field} חייב להיות מספר שאינו שלילי.`);
    });
    if (!name || !Number.isFinite(servingGrams) || servingGrams <= 0 || !numericFields.every((field) => Number.isFinite(numbers[field]) && numbers[field] >= 0) || (subgroupValue && !subgroup)) return;

    const safeId = `${idPrefix}-${rowNumber}-${normalizeKey(name).replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 30)}`;
    items.push({
      id: safeId,
      name,
      group,
      subgroup,
      reference: String(row.reference || row.brand || "ייבוא CSV").trim(),
      servingGrams,
      unitGrams: basisInfo.basis === "100g" ? undefined : servingGrams,
      referenceAmount: basisInfo.basis === "100g" ? undefined : 1,
      referenceUnit: basisInfo.basis === "100g" ? undefined : basisInfo.label.replace("לפי ", ""),
      nutritionBasis: basisInfo.basis,
      calories: numbers.calories,
      protein: numbers.protein,
      carbohydrates: numbers.carbohydrates,
      fats: numbers.fats,
      brand: String(row.brand || "").trim() || undefined,
      barcode: String(row.barcode || "").trim() || undefined,
      sourceType: "אישי",
    });
  });
  return { items, errors };
}
