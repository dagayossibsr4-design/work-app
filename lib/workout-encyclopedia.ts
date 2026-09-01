export type WorkoutEncyclopediaCategory = {
  id: string;
  title: string;
  englishTitle: string;
  description: string;
  accent: string;
  programIds: string[];
  sourcePages: number[];
};

export type WorkoutEncyclopediaProgram = {
  id: string;
  categoryId: string;
  title: string;
  englishTitle: string;
  description: string;
  sourcePages: number[];
  selectable: boolean;
};

export const workoutEncyclopediaCategories: WorkoutEncyclopediaCategory[] = [
  { id: "bodybuilding", title: "תוכניות לפיתוח גוף", englishTitle: "Bodybuilding", description: "היפרטרופיה, מסת שריר, כוח, צפיפות ופיתוח קבוצות שרירים.", accent: "#F5B72C", programIds: ["ppl", "ab", "abc", "abcd", "mass-power"], sourcePages: [1, 2, 3] },
  { id: "women-lower-body", title: "נשים, ישבן ויציבה", englishTitle: "Women's Toning, Glutes & Posture", description: "בניית ועיצוב הישבן, קו מותניים, פלג גוף עליון ויציבה.", accent: "#F97316", programIds: ["glute-shape", "glute-medius-waist", "upper-body-posture", "prenatal-postnatal"], sourcePages: [4, 5] },
  { id: "longevity", title: "גיל שלישי, אריכות ימים ותנועתיות", englishTitle: "Seniors, Longevity & Mobility", description: "שיווי משקל, מניעת נפילות, עבודה על כיסא, צפיפות עצם ותנועתיות מפרקים.", accent: "#42D392", programIds: ["fall-prevention", "chair-based", "bone-density", "joint-mobility-seniors"], sourcePages: [6, 7] },
  { id: "kids-youth", title: "ילדים ונוער", englishTitle: "Kids, Youth & Athletic Development", description: "מיומנויות תנועה בסיסיות, זריזות, קואורדינציה ואימוני התנגדות מותאמים.", accent: "#65BDF6", programIds: ["fms-youth", "youth-agility", "youth-resistance"], sourcePages: [7, 8] },
  { id: "powerlifting", title: "פאוורליפטינג, סטרונגמן וכוח מרבי", englishTitle: "Powerlifting, Strongman & Max Strength", description: "שלושת הגדולים, תרגילי עזר, נשיאת משאות ואירועי סטרונגמן.", accent: "#FB7185", programIds: ["powerlifting-big-3", "powerlifting-accessories", "strongman-events"], sourcePages: [8, 9] },
  { id: "olympic", title: "הרמת משקולות אולימפית", englishTitle: "Olympic Weightlifting & Explosive Power", description: "תרגילי הנפה, דחיקה והפקת כוח מתפרץ.", accent: "#F59E0B", programIds: ["snatch-variations", "clean-jerk"], sourcePages: [9, 10] },
  { id: "calisthenics", title: "קליסטניקס והתעמלות מכשירים", englishTitle: "Calisthenics, Street Workout & Gymnastics", description: "אלמנטים סטטיים מתקדמים, אלמנטים דינמיים ותרגילי בסיס במשקל גוף.", accent: "#A78BFA", programIds: ["calisthenics-basics", "calisthenics-static-dynamic"], sourcePages: [10] },
  { id: "functional-hybrid", title: "קרוספיט, כושר פונקציונלי ו־HYROX", englishTitle: "CrossFit, Functional Fitness & HYROX", description: "תנועות פונקציונליות, WOD, תחנות HYROX ואימונים היברידיים.", accent: "#F97316", programIds: ["crossfit-wod", "hyrox-hybrid"], sourcePages: [11] },
  { id: "pilates-barre", title: "פילאטיס ובר", englishTitle: "Pilates Mat, Apparatus & Barre", description: "פילאטיס מזרן, רפורמר, קדילאק, צ׳ייר ושיטת Barre.", accent: "#F0ABFC", programIds: ["classical-mat-pilates", "apparatus-pilates", "barre"], sourcePages: [13, 14] },
  { id: "yoga-mobility", title: "יוגה, מוביליטי ונשימה", englishTitle: "Yoga, Mobility & Breath", description: "תנוחות, כוח, שיווי משקל, גמישות, CARs, שחרור מיופציאלי ונשימה.", accent: "#2DD4BF", programIds: ["yoga-asanas", "joint-cars", "myofascial-breathwork"], sourcePages: [14, 15] },
  { id: "combat", title: "אמנויות לחימה וספורט קרבי", englishTitle: "Combat Sports Conditioning", description: "איגרוף, MMA, BJJ, היאבקות, ג׳יו ג׳יטסו, קיקבוקסינג ומואי תאי.", accent: "#EF4444", programIds: ["boxing-muay-thai", "mma-bjj", "grappling-wrestling"], sourcePages: [15, 16] },
  { id: "rehab", title: "שיקום, מניעה ופיזיותרפיה", englishTitle: "Rehab, Prehab & Postural Correction", description: "כתפיים, מסובבי כתף, ברכיים, ירכיים, קרסוליים, גב תחתון ופרוטוקול McGill.", accent: "#84CC16", programIds: ["shoulder-prehab", "knee-hip-ankle-rehab", "mcgill-big-3"], sourcePages: [16, 17] },
  { id: "cardio-endurance", title: "אירובי, סיבולת ושחייה", englishTitle: "Cardio, Endurance & Aquatic Fitness", description: "הליכה, ריצה, מדרגות, אופניים, שחייה ואימוני מים.", accent: "#38BDF8", programIds: ["cardio-endurance", "aquatic-fitness"], sourcePages: [5, 8] },
  { id: "kettlebell-trx", title: "קטלבלס ורצועות תלייה", englishTitle: "Kettlebells & TRX", description: "כוח, יציבות, שליטה ותנועה פונקציונלית עם קטלבלס ורצועות.", accent: "#F97316", programIds: ["kettlebell-training", "trx-training"], sourcePages: [7] },
];

export const workoutEncyclopediaPrograms: WorkoutEncyclopediaProgram[] = [
  { id: "ppl", categoryId: "bodybuilding", title: "PPL", englishTitle: "Push Pull Legs", description: "חלוקה למחזורי Push, Pull ו־Legs עם ימי אימון נפרדים.", sourcePages: [1, 2, 3], selectable: true },
  { id: "ab", categoryId: "bodybuilding", title: "AB", englishTitle: "Upper / Lower Split", description: "חלוקה בין אימון פלג גוף עליון לאימון פלג גוף תחתון.", sourcePages: [1], selectable: true },
  { id: "abc", categoryId: "bodybuilding", title: "ABC", englishTitle: "Three-Day Split", description: "חלוקה לשלושה ימי אימון לפי קבוצות שרירים.", sourcePages: [1], selectable: true },
  { id: "abcd", categoryId: "bodybuilding", title: "ABCD", englishTitle: "Four-Day Split", description: "חלוקה לארבעה ימי אימון ממוקדים.", sourcePages: [1], selectable: true },
  { id: "mass-power", categoryId: "bodybuilding", title: "מסת שריר וכוח", englishTitle: "Mass & Power", description: "מיקוד משולב במסת שריר, כוח וצפיפות.", sourcePages: [1, 2], selectable: true },
  { id: "glute-shape", categoryId: "women-lower-body", title: "בניית ועיצוב הישבן", englishTitle: "Glute Hypertrophy & Shape", description: "מיקוד בגדילה, צורה ושליטה בשרירי הישבן.", sourcePages: [4], selectable: true },
  { id: "glute-medius-waist", categoryId: "women-lower-body", title: "ישבן וקו מותניים", englishTitle: "Glute Medius & Waist Sculpt", description: "מיקוד בשריר העכוז האמצעי ובקו המותניים.", sourcePages: [4], selectable: true },
  { id: "upper-body-posture", categoryId: "women-lower-body", title: "פלג גוף עליון ויציבה", englishTitle: "Upper Body & Posture", description: "חיזוק פלג הגוף העליון ויציבה זקופה.", sourcePages: [5], selectable: true },
  { id: "prenatal-postnatal", categoryId: "women-lower-body", title: "הריון, לאחר לידה ורצפת אגן", englishTitle: "Prenatal, Postnatal & Pelvic Floor", description: "קטגוריה ייעודית להתאמה מקצועית סביב הריון ולאחר לידה.", sourcePages: [5], selectable: true },
  { id: "fall-prevention", categoryId: "longevity", title: "מניעת נפילות ושיווי משקל", englishTitle: "Fall Prevention & Balance", description: "יציבות, שיווי משקל וביטחון תנועתי.", sourcePages: [6], selectable: true },
  { id: "chair-based", categoryId: "longevity", title: "אימונים בישיבה על כיסא", englishTitle: "Chair-Based Workouts", description: "תרגול מותאם בישיבה על כיסא.", sourcePages: [6], selectable: true },
  { id: "bone-density", categoryId: "longevity", title: "צפיפות עצם ואריכות ימים", englishTitle: "Bone Density & Sarcopenia Prevention", description: "חיזוק ושימור תפקוד לאורך זמן.", sourcePages: [7], selectable: true },
  { id: "joint-mobility-seniors", categoryId: "longevity", title: "תנועתיות מפרקים ושיכוך כאב", englishTitle: "Joint Mobility & Pain Relief", description: "טווחי תנועה, שימור מפרקים ושיכוך כאב.", sourcePages: [7], selectable: true },
  { id: "fms-youth", categoryId: "kids-youth", title: "מיומנויות תנועה בסיסיות", englishTitle: "Fundamental Movement Skills", description: "בסיס תנועתי לילדים ולנוער.", sourcePages: [7], selectable: true },
  { id: "youth-agility", categoryId: "kids-youth", title: "זריזות, קואורדינציה ומהירות", englishTitle: "Agility, Balance & Coordination", description: "פיתוח יכולת אתלטית לטווח ארוך.", sourcePages: [8], selectable: true },
  { id: "youth-resistance", categoryId: "kids-youth", title: "התנגדות מותאמת לנוער", englishTitle: "Youth Resistance Training", description: "אימוני כוח והתנגדות מותאמים לגיל.", sourcePages: [8], selectable: true },
  { id: "powerlifting-big-3", categoryId: "powerlifting", title: "שלושת הגדולים", englishTitle: "The Big 3: Squat, Bench, Deadlift", description: "סקוואט, לחיצת חזה ודדליפט.", sourcePages: [8], selectable: true },
  { id: "powerlifting-accessories", categoryId: "powerlifting", title: "תרגילי עזר לפאוורליפטינג", englishTitle: "Powerlifting Accessories", description: "תרגילי עזר לתמיכה בשלושת הגדולים.", sourcePages: [9], selectable: true },
  { id: "strongman-events", categoryId: "powerlifting", title: "אירועי סטרונגמן ונשיאת משאות", englishTitle: "Strongman Events", description: "נשיאה, הרמה ומשימות כוח ייעודיות.", sourcePages: [9], selectable: true },
  { id: "snatch-variations", categoryId: "olympic", title: "הנפה ווריאציות", englishTitle: "The Snatch & Variations", description: "תרגילי הנפה ווריאציות טכניות.", sourcePages: [9], selectable: true },
  { id: "clean-jerk", categoryId: "olympic", title: "קלין ודחיקה", englishTitle: "Clean & Jerk", description: "תרגילי הדחיקה והנפה האולימפיים.", sourcePages: [10], selectable: true },
  { id: "calisthenics-basics", categoryId: "calisthenics", title: "בסיס משקל גוף", englishTitle: "Bodyweight Fundamentals", description: "תרגילי בסיס בקליסטניקס ומשקל גוף.", sourcePages: [10], selectable: true },
  { id: "calisthenics-static-dynamic", categoryId: "calisthenics", title: "אלמנטים סטטיים ודינמיים", englishTitle: "Static & Dynamic Skills", description: "אלמנטים מתקדמים בקליסטניקס והתעמלות.", sourcePages: [10], selectable: true },
  { id: "crossfit-wod", categoryId: "functional-hybrid", title: "קרוספיט ו־WOD", englishTitle: "CrossFit Functional Movements", description: "תנועות פונקציונליות ואימוני היום.", sourcePages: [11], selectable: true },
  { id: "hyrox-hybrid", categoryId: "functional-hybrid", title: "HYROX ואימון היברידי", englishTitle: "HYROX Stations & Hybrid Racing", description: "תחנות HYROX ושילוב כוח וסבולת.", sourcePages: [11], selectable: true },
  { id: "classical-mat-pilates", categoryId: "pilates-barre", title: "פילאטיס מזרן קלאסי", englishTitle: "Classical Mat Pilates", description: "סדרת תרגילי פילאטיס מזרן.", sourcePages: [13], selectable: true },
  { id: "apparatus-pilates", categoryId: "pilates-barre", title: "פילאטיס מכשירים", englishTitle: "Apparatus Pilates", description: "רפורמר, קדילאק וצ׳ייר.", sourcePages: [13], selectable: true },
  { id: "barre", categoryId: "pilates-barre", title: "שיטת בר", englishTitle: "Barre Method", description: "אימון בר עם דגש על שליטה ויציבה.", sourcePages: [14], selectable: true },
  { id: "yoga-asanas", categoryId: "yoga-mobility", title: "תנוחות יוגה", englishTitle: "Yoga Asanas", description: "כוח, שיווי משקל וגמישות.", sourcePages: [14], selectable: true },
  { id: "joint-cars", categoryId: "yoga-mobility", title: "מוביליטי ו־CARs", englishTitle: "Joint Mobility & CARs", description: "שימור טווחי תנועה ושליטה במפרקים.", sourcePages: [15], selectable: true },
  { id: "myofascial-breathwork", categoryId: "yoga-mobility", title: "שחרור מיופציאלי ונשימה", englishTitle: "Myofascial Release & Breathwork", description: "שחרור רקמות ותרגילי נשימה.", sourcePages: [15], selectable: true },
  { id: "boxing-muay-thai", categoryId: "combat", title: "איגרוף וקיקבוקסינג", englishTitle: "Boxing & Muay Thai", description: "התניה לספורט מכות, איגרוף ומואי תאי.", sourcePages: [15], selectable: true },
  { id: "mma-bjj", categoryId: "combat", title: "MMA ו־BJJ", englishTitle: "MMA & Brazilian Jiu-Jitsu", description: "התניה לספורט קרבי משולב וג׳יו ג׳יטסו.", sourcePages: [15, 16], selectable: true },
  { id: "grappling-wrestling", categoryId: "combat", title: "היאבקות וגראפלינג", englishTitle: "Grappling & Wrestling Conditioning", description: "כוח, סבולת ותנועה להיאבקות וגראפלינג.", sourcePages: [16], selectable: true },
  { id: "shoulder-prehab", categoryId: "rehab", title: "שיקום כתף ומסובבי הכתף", englishTitle: "Rotator Cuff & Shoulder Prehab", description: "מניעה וחיזוק סביב הכתף ומסובבי הכתף.", sourcePages: [16], selectable: true },
  { id: "knee-hip-ankle-rehab", categoryId: "rehab", title: "שיקום ברכיים, ירכיים וקרסוליים", englishTitle: "Knee, Hip & Ankle Rehab", description: "תרגול שיקומי לאזורי הגוף התחתון.", sourcePages: [16], selectable: true },
  { id: "mcgill-big-3", categoryId: "rehab", title: "פרוטוקול מקגיל", englishTitle: "McGill Big 3", description: "פרוטוקול שיקום גב תחתון לפי מקור האנציקלופדיה.", sourcePages: [17], selectable: true },
  { id: "cardio-endurance", categoryId: "cardio-endurance", title: "אירובי וסיבולת", englishTitle: "Cardio & Endurance", description: "הליכון, מדרגות, אופניים, ריצה ושחייה.", sourcePages: [5], selectable: true },
  { id: "aquatic-fitness", categoryId: "cardio-endurance", title: "שחייה ואימוני מים", englishTitle: "Aquatic Fitness & Swimming", description: "סגנונות שחייה ואירובי במים.", sourcePages: [8], selectable: true },
  { id: "kettlebell-training", categoryId: "kettlebell-trx", title: "אימוני קטלבלס", englishTitle: "Kettlebell Training", description: "הנפות, קימה טורקית, קלין ופרס ונשיאות.", sourcePages: [7], selectable: true },
  { id: "trx-training", categoryId: "kettlebell-trx", title: "אימוני TRX", englishTitle: "TRX Suspension Training", description: "משיכה, דחיפה, ליבה, רגליים וזרועות ברצועות.", sourcePages: [7], selectable: true },
];

export const getWorkoutEncyclopediaCategory = (id: string) => workoutEncyclopediaCategories.find((category) => category.id === id);
export const getWorkoutEncyclopediaProgram = (id: string) => workoutEncyclopediaPrograms.find((program) => program.id === id);
