export type WorkoutAudienceSection = {
  id: "men" | "women" | "kids" | "seniors" | "cardio";
  title: string;
  description: string;
  accent: string;
  /** קטגוריות מדריך שמכוסות בקבוצה, לצורך סידור ללא כפילויות. */
  categoryIds: string[];
  /** תבניות שמוצגות ישירות ככרטיסים מלאים בתוך הקבוצה. */
  templateIds?: string[];
};

/**
 * סדר הקבוצות במסך הבית. קבוצת בניית מסת השריר נשארת נפרדת וראשונה;
 * אחריה מגיעות קבוצות הקהל, ואירובי משוחזר אחרי גיל שלישי.
 */
export const workoutAudienceSections: WorkoutAudienceSection[] = [
  {
    id: "men",
    title: "אימוני גברים",
    description: "כוח, פאוורליפטינג, הרמות אולימפיות, כושר פונקציונלי, קרבי, סבולת ותרגול משלים.",
    accent: "#65BDF6",
    categoryIds: [
      "powerlifting",
      "olympic",
      "calisthenics",
      "functional-hybrid",
      "combat",
      "rehab",
      "cardio-endurance",
      "kettlebell-trx",
    ],
  },
  {
    id: "women",
    title: "נשים",
    description: "ישבן, קו מותניים, פלג גוף עליון, יציבה והתאמות סביב הריון ולאחר לידה.",
    accent: "#E38BFF",
    categoryIds: ["women-lower-body", "pilates-barre", "yoga-mobility"],
  },
  {
    id: "kids",
    title: "ילדים",
    description: "מיומנויות תנועה, זריזות, קואורדינציה והתנגדות המותאמות לילדים ולנוער.",
    accent: "#42D392",
    categoryIds: ["kids-youth"],
  },
  {
    id: "seniors",
    title: "גיל שלישי",
    description: "שיווי משקל, מניעת נפילות, תרגול בישיבה, צפיפות עצם ותנועתיות מפרקים.",
    accent: "#F5B72C",
    categoryIds: ["longevity"],
  },
  {
    id: "cardio",
    title: "אירובי",
    description: "אירובי כללי, אופניים, אליפטי, מדרגות, הליכון, ריצה, הליכה, חתירה, שחייה ואינטרוולים.",
    accent: "#38BDF8",
    categoryIds: [],
    templateIds: ["cardio", "cycling", "elliptical", "stairs", "treadmill", "outdoor-run", "walking", "rowing", "swimming", "hiit"],
  },
];
