import { supplements as referenceSupplements } from "./supplements";

export type SupplementUnit = "מנה" | "גרם" | "מ״ל" | "כמוסה" | "טבליה";

export type MealSupplementEntry = {
  name: string;
  taken: boolean;
  takenAt: string;
  quantity: string;
  unit: SupplementUnit;
};

export type MealSupplementSelections = Record<string, MealSupplementEntry[]>;

export type MealMenuSupplement = {
  name: string;
  purpose: string;
  evidence?: "גבוהה" | "בינונית" | "מוגבלת";
  whenToConsider?: string;
  caution: string;
  source?: string;
  trackingOnly?: boolean;
};

export const supplementUnits: SupplementUnit[] = ["מנה", "גרם", "מ״ל", "כמוסה", "טבליה"];

export function createMealSupplementEntry(
  name: string,
  values: Partial<Omit<MealSupplementEntry, "name">> = {},
): MealSupplementEntry {
  return {
    name,
    taken: values.taken ?? true,
    takenAt: values.takenAt ?? "",
    quantity: values.quantity ?? "",
    unit: values.unit ?? "מנה",
  };
}

/** Supports both the previous string[] format and the current detailed entry format. */
export function normalizeMealSupplementSelections(input: unknown): MealSupplementSelections {
  if (!input || typeof input !== "object") return {};
  const source = input as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(source).map(([mealId, rawEntries]) => {
      const entries = Array.isArray(rawEntries)
        ? rawEntries
            .map((raw) => {
              if (typeof raw === "string") return createMealSupplementEntry(raw);
              if (!raw || typeof raw !== "object") return null;
              const item = raw as Partial<MealSupplementEntry>;
              if (typeof item.name !== "string" || !item.name.trim()) return null;
              const unit = supplementUnits.includes(item.unit as SupplementUnit)
                ? (item.unit as SupplementUnit)
                : "מנה";
              return createMealSupplementEntry(item.name, {
                taken: item.taken !== false,
                takenAt: typeof item.takenAt === "string" ? item.takenAt : "",
                quantity: typeof item.quantity === "string" ? item.quantity : "",
                unit,
              });
            })
            .filter((entry): entry is MealSupplementEntry => Boolean(entry))
        : [];
      const unique = entries.filter((entry, index, all) => all.findIndex((candidate) => candidate.name === entry.name) === index);
      return [mealId, unique];
    }),
  );
}

/**
 * Supplements shown from the meal menu.
 * The existing reference list keeps its source and safety notes.
 * Personal tracking items intentionally have no invented dosage or nutrition values.
 */
export const mealMenuSupplements: MealMenuSupplement[] = [
  ...referenceSupplements,
  {
    name: "GH",
    purpose: "מעקב אישי בלבד — אינו מזון ואינו מקבל ערכי מאקרו במסך הארוחה.",
    caution: "אין כאן המלצת מינון או הנחיה לשימוש; יש להתייעץ עם רופא מוסמך.",
    trackingOnly: true,
  },
  {
    name: "טודקה (TUDCA)",
    purpose: "מעקב אישי בלבד — אינו מזון ואינו מקבל ערכי מאקרו במסך הארוחה.",
    caution: "אין כאן המלצת מינון או הנחיה לשימוש; יש להתייעץ עם רופא מוסמך.",
    trackingOnly: true,
  },
  {
    name: "מולטי־ויטמין",
    purpose: "מעקב אישי בלבד — הרכב וערכים תלויים בתווית המוצר.",
    caution: "יש לבדוק את תווית המוצר ולהתייעץ עם איש מקצוע במקרה של תרופות או מצב רפואי.",
    trackingOnly: true,
  },
  {
    name: "BCAA",
    purpose: "מעקב אישי בלבד — אינו מזון ואינו מקבל ערכי מאקרו במסך הארוחה.",
    caution: "אין כאן המלצת מינון או הנחיה לשימוש; יש לבדוק את תווית המוצר.",
    trackingOnly: true,
  },
  {
    name: "סיטרוס ברגמוט",
    purpose: "מעקב אישי בלבד — הרכב וערכים תלויים בתווית המוצר.",
    caution: "יש לבדוק אינטראקציות אפשריות עם תרופות מול איש מקצוע רפואי.",
    trackingOnly: true,
  },
  {
    name: "NUC",
    purpose: "מעקב אישי בלבד — נשמר בשם שסופק ללא פירוש או ערכי מאקרו.",
    caution: "יש לבדוק את זהות המוצר, התווית וההתאמה האישית לפני שימוש.",
    trackingOnly: true,
  },
  {
    name: "ברבמין",
    purpose: "מעקב אישי בלבד — נשמר בשם שסופק ללא ערכי מאקרו.",
    caution: "יש לבדוק את תווית המוצר ולהתייעץ עם איש מקצוע במקרה של תרופות או מצב רפואי.",
    trackingOnly: true,
  },
  {
    name: "CoQ10",
    purpose: "מעקב אישי בלבד — הרכב וערכים תלויים בתווית המוצר.",
    caution: "יש להתייעץ עם איש מקצוע רפואי במקרה של תרופות או מצב רפואי.",
    trackingOnly: true,
  },
  {
    name: "אוביטרל",
    purpose: "תיעוד אישי בלבד — אינו מקבל ערכי מאקרו או הנחיית שימוש באפליקציה.",
    caution: "יש להשתמש רק לפי הוראה ומעקב של רופא מוסמך.",
    trackingOnly: true,
  },
  {
    name: "ארמדיקס",
    purpose: "תיעוד אישי בלבד — אינו מקבל ערכי מאקרו או הנחיית שימוש באפליקציה.",
    caution: "יש להשתמש רק לפי הוראה ומעקב של רופא מוסמך.",
    trackingOnly: true,
  },
];

/** מחזיר את תוספי היום בלבד, או את כל הרשימה כאשר המשתמש עובר לתצוגה מלאה. */
export function filterSupplementsForDay<T extends { name: string }>(
  supplements: readonly T[],
  selectedNames: readonly string[],
  showAll: boolean,
  pinnedNames: readonly string[] = [],
): T[] {
  if (showAll) return [...supplements];
  if (selectedNames.length === 0 && pinnedNames.length === 0) return [];
  const byName = new Map(supplements.map((supplement) => [supplement.name, supplement]));
  const seen = new Set<string>();
  const orderedNames = [...pinnedNames, ...selectedNames];
  return orderedNames.reduce<T[]>((result, name) => {
    if (seen.has(name)) return result;
    seen.add(name);
    const supplement = byName.get(name);
    if (supplement) result.push(supplement);
    return result;
  }, []);
}

/** מנרמל שמות אישיים שנשמרו במכשיר, בלי כפילויות ובלי ערכים ריקים. */
export function normalizeCustomSupplementNames(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const unique = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const name = raw.trim().slice(0, 50);
    if (name) unique.add(name);
  }
  return [...unique];
}

/** מנרמל את שמות הקיצורים הקבועים, ללא כפילויות ובלי לשנות היסטוריית צריכה יומית. */
export function normalizePinnedSupplementNames(input: unknown): string[] {
  return normalizeCustomSupplementNames(input);
}

/** מאחד בחירות רבות לרשימת הקיצורים הקבועים, ללא כפילויות וללא שינוי תיעוד יומי. */
export function mergePinnedSupplementNames(
  currentNames: readonly string[],
  namesToAdd: readonly string[],
): string[] {
  return normalizePinnedSupplementNames([...currentNames, ...namesToAdd]);
}

/** מסיר תוסף מכל ארוחות היום, בלי לשנות תיעוד של תאריכים אחרים. */
export function removeSupplementFromMealSelections(
  selections: MealSupplementSelections,
  supplementName: string,
): MealSupplementSelections {
  const targetName = supplementName.trim();
  if (!targetName) return selections;

  return Object.fromEntries(
    Object.entries(selections).map(([mealId, entries]) => [
      mealId,
      entries.filter((entry) => entry.name !== targetName),
    ]),
  );
}

/** ייצוג תיעודי בלבד לשם אישי; אין כאן מינון, ערכי מאקרו או המלצת שימוש. */
export function createCustomSupplementDefinition(name: string): MealMenuSupplement {
  return {
    name: name.trim().slice(0, 50),
    purpose: "תיעוד אישי בלבד — ללא ערכי מאקרו או המלצת שימוש.",
    caution: "יש לבדוק את זהות המוצר ולהתייעץ עם איש מקצוע רפואי לפי הצורך.",
    trackingOnly: true,
  };
}
