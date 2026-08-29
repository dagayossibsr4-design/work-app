export type WorkoutId = string;

export type SetTarget = {
  target: string;
  restPause?: string;
  note?: string;
  suggestedWeight?: string;
};

export type ExerciseTemplate = {
  id: string;
  name: string;
  englishName?: string;
  sets: SetTarget[];
  note?: string;
  /** שיטת ביצוע מובנית להשוואה ולהצגה במסך האימון. */
  technique?: string;
};

export type WorkoutTemplate = {
  id: WorkoutId;
  name: string;
  focus: string;
  accent: string;
  icon?: string;
  exercises: ExerciseTemplate[];
  /** תבנית מקור שממנה נוצרה תבנית מותאמת, לצורך השוואה בלבד. */
  derivedFromTemplateId?: WorkoutId;
  /** שילוב השיטות שנבחר בעת יצירת התבנית המותאמת. */
  derivedMethodCombinationId?: string;
};

const standardTwoSet = (name: string, englishName: string, note?: string): ExerciseTemplate => ({
  id: name,
  name,
  englishName,
  sets: [{ target: "5–9" }, { target: "10–15" }],
  note,
});

export const workoutTemplates: WorkoutTemplate[] = [
  {
    id: "push1",
    name: "Push 1",
    focus: "חזה, כתפיים, יד אחורית ובטן",
    accent: "#F5B72C",
    exercises: [
      standardTwoSet("לחיצת חזה בשיפוע חיובי עם משקולות", "Incline Dumbbell Press"),
      standardTwoSet("לחיצת חזה במכונה שטוחה", "Flat Chest Press Machine"),
      standardTwoSet("לחיצת כתפיים בישיבה במכונת סמית", "Seated Military Press Smith"),
      { ...standardTwoSet("חתירה אנכית לכתפיים", "Upright Rows"), note: "Rest Pause: 12–15" },
      standardTwoSet("פרפר בכבלים בשיפוע חיובי", "Cable Flies"),
      standardTwoSet("הרחקת זרועות לצדדים עם משקולות", "Side Laterals Dumbbell"),
      { id: "מקבילים במשקל גוף", name: "מקבילים במשקל גוף", englishName: "Dips Bodyweight", sets: [{ target: "מקסימום" }, { target: "מקסימום" }] },
      standardTwoSet("פשיטת מרפקים כנגד חבל", "Triceps Rope Pushdown"),
      standardTwoSet("פשיטת מרפק מעל הראש יד אחת עם משקולת", "Overhead Triceps Dumbbell One Hand"),
      { id: "בטן", name: "כיווצי בטן והחזקות", englishName: "Abs Contraction Work", sets: [{ target: "4–6" }], note: "סטים של עבודה מרוכזת ומבוקרת" },
    ],
  },
  {
    id: "pull1",
    name: "Pull 1",
    focus: "גב, כתף אחורית, יד קדמית ובטן",
    accent: "#7DD3FC",
    exercises: [
      standardTwoSet("חתירה רחבה במכונה / כבל", "High Row"),
      standardTwoSet("חתירה במכונה עם תמיכה לחזה", "Rowing Machine Chest Supported"),
      standardTwoSet("חתירת T במוט", "Barbell Row"),
      { id: "עליות מתח באחיזה הפוכה", name: "עליות מתח באחיזה הפוכה", englishName: "Chin Ups", sets: [{ target: "מקסימום" }, { target: "מקסימום" }] },
      { id: "פול אובר בכבלים בעמידה", name: "פול־אובר בכבלים בעמידה", englishName: "Cable Pull Over", sets: [{ target: "8–12" }, { target: "8–12" }, { target: "8–12" }] },
      standardTwoSet("פרפר הפוך במכונה", "Reverse Butterfly"),
      { ...standardTwoSet("כפיפות מרפקים עם W בעמידה", "W Bar Curl"), sets: [{ target: "8–12" }, { target: "10–15" }] },
      { id: "כפיפות מרפקים במכונה", name: "כפיפות מרפקים במכונה", englishName: "Biceps Machine", sets: [{ target: "10–15", restPause: "סט יחיד עצים" }] },
      standardTwoSet("הרמת כתפיים כנגד מוט", "Shrugs Barbell"),
      { id: "בטן-pull1", name: "כיווצי בטן והחזקות", englishName: "Abs Contraction Work", sets: [{ target: "4–6" }] },
    ],
  },
  {
    id: "legs1",
    name: "Legs 1",
    focus: "ארבע־ראשי, המסטרינג, מקרבים, תאומים ובטן",
    accent: "#FB7185",
    exercises: [
      { id: "סקוואט חופשי", name: "סקוואט חופשי", englishName: "Free Squat", sets: [{ target: "6–10" }, { target: "8–12" }, { target: "12–15" }] },
      { id: "לג פרס", name: "לג פרס", englishName: "Leg Press", sets: [{ target: "8–12" }, { target: "8–12" }, { target: "6–10" }] },
      { id: "כפיפת ברכיים בשכיבה", name: "כפיפת ברכיים בשכיבה", englishName: "Lying Leg Curl", sets: [{ target: "8–12" }, { target: "10–15" }, { target: "10–15" }], note: "Rest Pause: 3 דקות" },
      { id: "כפיפת ברכיים בעמידה", name: "כפיפת ברכיים בעמידה", englishName: "Standing Leg Curl", sets: [{ target: "12–15" }, { target: "15–20" }] },
      { id: "פשיטת ברכיים במכונה", name: "פשיטת ברכיים במכונה", englishName: "Leg Extension", sets: [{ target: "8–12" }, { target: "10–15" }, { target: "15–20" }], note: "Rest Pause: 3 דקות" },
      standardTwoSet("מקרבי ירך במכונה", "Adductor Machine"),
      standardTwoSet("מרחיקי ירך במכונה", "Abductor Machine"),
      standardTwoSet("תאומים בישיבה", "Seated Calf Raise"),
    ],
  },
  {
    id: "push2",
    name: "Push 2",
    focus: "חזה, כתפיים ויד אחורית",
    accent: "#F5B72C",
    exercises: [
      { id: "לחיצת חזה עליון במוט חופשי", name: "לחיצת חזה עליון במוט חופשי", englishName: "Incline Barbell Press", sets: [{ target: "6–10" }, { target: "8–12" }, { target: "8–12" }] },
      { id: "לחיצת חזה בשיפוע עם משקולות", name: "לחיצת חזה בשיפוע עם משקולות", englishName: "Incline Dumbbell Press", sets: [{ target: "6–10" }, { target: "8–12" }, { target: "10–15" }] },
      { id: "לחיצת חזה תחתון במכשיר", name: "לחיצת חזה תחתון במכשיר", englishName: "Decline Chest Press Machine", sets: [{ target: "6–10" }, { target: "8–12" }] },
      { id: "פרפר חופשי בכבלים", name: "פרפר חופשי בכבלים", englishName: "Cable Flies", sets: [{ target: "8–12" }, { target: "10–15" }] },
      { id: "פרפר במכשיר ייעודי", name: "פרפר במכשיר ייעודי", englishName: "Pec Deck", sets: [{ target: "12–20", restPause: "Rest & Pause" }] },
      { id: "לחיצת כתפיים במכונת האמר", name: "לחיצת כתפיים במכונת האמר", englishName: "Hammer Shoulder Press", sets: [{ target: "8–12" }, { target: "8–12" }] },
      { id: "הרחקת כתפיים לצדדים", name: "הרחקת כתפיים לצדדים", englishName: "Lateral Raise", sets: [{ target: "8–12" }, { target: "10–15" }] },
      { id: "כתף קדמית בפולי תחתון", name: "כתף קדמית בפולי תחתון עם כבל", englishName: "Low Cable Front Raise", sets: [{ target: "8–12" }, { target: "10–15" }, { target: "10–15" }] },
      { id: "פשיטת מרפקים כנגד כבל", name: "פשיטת מרפקים כנגד כבל", englishName: "Cable Triceps Extension", sets: [{ target: "10–15" }, { target: "10–15" }, { target: "10–15" }] },
      { id: "פשיטת מרפקים בהצלבה", name: "פשיטת מרפקים בכבל — שתי ידיים בהצלבה", englishName: "Crucifix Triceps Extension", sets: [{ target: "8–12" }, { target: "8–12" }] },
    ],
  },
  {
    id: "pull2",
    name: "Pull 2",
    focus: "גב, כתף אחורית, יד קדמית ובטן",
    accent: "#7DD3FC",
    exercises: [
      standardTwoSet("פול־דאון עליון אחיזה הפוכה", "Lat Pull Down Supinated"),
      standardTwoSet("פול־דאון עליון אחיזה רחבה", "Wide Grip Pulldown"),
      standardTwoSet("חתירת T-Bar", "T-Bar Row"),
      standardTwoSet("חתירה בכבלים", "Cable Row"),
      { id: "כתף אחורית", name: "הרחקת זרועות בישיבה לכתף אחורית", englishName: "Bent Over Lat Raises Rear Shoulder", sets: [{ target: "8–12" }, { target: "8–12" }] },
      { id: "היפר אקסטנשן", name: "פשיטת גב במכונה ייעודית", englishName: "Hyperextensions", sets: [{ target: "מקסימום" }, { target: "מקסימום" }] },
      standardTwoSet("הרמת כתפיים / שרגים עם משקולות", "Shrugs Dumbbell"),
      { id: "בטן-pull2", name: "כיווצי בטן והחזקות", englishName: "Abs Contraction Work", sets: [{ target: "4–6" }] },
    ],
  },
  {
    id: "legs2",
    name: "Legs 2",
    focus: "רגליים, מקרבים ותאומים",
    accent: "#FB7185",
    exercises: [
      { id: "האק סקוואט-legs2", name: "האק סקוואט במכונה", englishName: "Hack Squat", sets: [{ target: "6–10", restPause: "Rest & Pause: 3 דקות" }, { target: "8–12" }, { target: "10–15" }] },
      { id: "מכרעים", name: "מכרעים", englishName: "Lunges", sets: [{ target: "15–25" }, { target: "15–25" }, { target: "15–25" }] },
      { id: "כפיפת ברך-ירך-legs2", name: "כפיפת ברך/ירך במכשיר", englishName: "Leg Curl / Hip Curl Machine", sets: [{ target: "15–25" }] },
      { id: "פשיטת ברכיים-legs2", name: "פשיטת ברכיים במכונה", englishName: "Leg Extension", sets: [{ target: "8–12" }, { target: "8–12" }, { target: "10–15" }] },
      { id: "כפיפת ירך בעמידה-legs2", name: "כפיפת ירך בעמידה", englishName: "Standing Hip Flexion", sets: [{ target: "10–15" }, { target: "10–15" }] },
      { id: "מקרבי ירך-legs2", name: "מקרבי ירך במכונה", englishName: "Adductor Machine", sets: [{ target: "8–12" }, { target: "10–15" }] },
      { id: "תאומים-legs2", name: "תאומים", englishName: "Calf Raise", sets: [{ target: "8–12" }, { target: "8–12" }] },
    ],
  },
  {
    id: "arms",
    name: "Arms / Pump",
    focus: "יד אחורית, יד קדמית ובטן",
    accent: "#C084FC",
    exercises: [
      { id: "לחיצת חזה צרה", name: "לחיצת חזה באחיזה צרה", englishName: "Close Grip Bench Press", sets: [{ target: "8–12" }, { target: "8–12" }, { target: "8–12" }] },
      { id: "פשיטת מרפקים מעל הראש", name: "פשיטת מרפקים מעל הראש בשתי ידיים", englishName: "Overhead Triceps Both Hands", sets: [{ target: "8–12" }, { target: "8–12" }, { target: "8–12" }] },
      { id: "פשיטת מרפק הפוכה", name: "פשיטת מרפקים בכבל באחיזה הפוכה", englishName: "Triceps Pushdown Reverse Grip", sets: [{ target: "8–12" }, { target: "8–12" }, { target: "8–12" }] },
      { id: "סקוט", name: "כפיפת מרפקים במכונת סקוט", englishName: "Scott Curls Machine", sets: [{ target: "8–12" }, { target: "8–12" }, { target: "8–12" }] },
      { id: "כפיפת מוט", name: "כפיפת מרפקים עם מוט", englishName: "Hammer Curls", sets: [{ target: "8–12" }, { target: "8–12" }, { target: "8–12" }] },
      { id: "ריכוז", name: "כפיפת מרפקים מרוכזת", englishName: "Concentration Curls", sets: [{ target: "8–12" }, { target: "8–12" }, { target: "8–12" }] },
      { id: "בטן-arms", name: "כיווצי בטן והחזקות", englishName: "Abs Contraction Work", sets: [{ target: "4–6" }] },
    ],
  },
  {
    id: "abc-a", name: "ABC · A", focus: "חזה, כתפיים ויד אחורית", accent: "#F5B72C",
    exercises: [standardTwoSet("לחיצת חזה במכונה", "Chest Press Machine"), standardTwoSet("לחיצת חזה בשיפוע עם דאמבלים", "Incline Dumbbell Press"), standardTwoSet("הרחקת כתפיים לצדדים", "Lateral Raise"), standardTwoSet("פשיטת מרפקים בחבל", "Triceps Rope Pushdown")],
  },
  {
    id: "abc-b", name: "ABC · B", focus: "גב, כתף אחורית ויד קדמית", accent: "#65BDF6",
    exercises: [standardTwoSet("פולי עליון באחיזה רחבה", "Wide Grip Lat Pulldown"), standardTwoSet("חתירה עם תמיכה לחזה", "Chest Supported Row"), standardTwoSet("פרפר הפוך לכתף אחורית", "Reverse Fly"), standardTwoSet("כפיפת מרפקים עם מוט", "Barbell Curl")],
  },
  {
    id: "abc-c", name: "ABC · C", focus: "כתפיים ורגליים", accent: "#FB7185",
    exercises: [standardTwoSet("לחיצת כתפיים במכונה", "Shoulder Press"), standardTwoSet("סקוואט במכונת סמית", "Smith Squat"), standardTwoSet("לחיצת רגליים", "Leg Press"), standardTwoSet("כפיפת ברכיים בישיבה", "Seated Leg Curl"), standardTwoSet("הרמת עקבים בעמידה", "Standing Calf Raise")],
  },
  {
    id: "abcd-a", name: "ABCD · A", focus: "חזה ויד אחורית", accent: "#F5B72C",
    exercises: [standardTwoSet("לחיצת חזה במוט", "Barbell Bench Press"), standardTwoSet("לחיצת חזה בשיפוע עם דאמבלים", "Incline Dumbbell Press"), standardTwoSet("פרפר במכונה", "Pec Deck"), standardTwoSet("פשיטת מרפקים מעל הראש", "Overhead Triceps Extension")],
  },
  {
    id: "abcd-b", name: "ABCD · B", focus: "גב ויד קדמית", accent: "#65BDF6",
    exercises: [standardTwoSet("מתח או פולי עליון", "Pull Up"), standardTwoSet("חתירת T", "T Bar Row"), standardTwoSet("חתירה בכבלים", "Cable Row"), standardTwoSet("כפיפת מרפקים בדאמבלים", "Dumbbell Curl")],
  },
  {
    id: "abcd-c", name: "ABCD · C", focus: "כתפיים", accent: "#C084FC",
    exercises: [standardTwoSet("לחיצת כתפיים בישיבה", "Seated Shoulder Press"), standardTwoSet("הרחקה לצדדים בכבלים", "Cable Lateral Raise"), standardTwoSet("הרחקה לכתף אחורית", "Rear Delt Raise"), standardTwoSet("משיכת פנים", "Face Pull")],
  },
  {
    id: "abcd-d", name: "ABCD · D", focus: "רגליים", accent: "#FB7185",
    exercises: [standardTwoSet("סקוואט", "Squat"), standardTwoSet("דדליפט רומני", "Romanian Deadlift"), standardTwoSet("פשיטת ברכיים", "Leg Extension"), standardTwoSet("כפיפת ברכיים", "Leg Curl"), standardTwoSet("הרמת עקבים", "Calf Raise")],
  },
  {
    id: "ab-upper", name: "AB · עליון", focus: "חזה, גב, כתפיים וידיים", accent: "#F5B72C",
    exercises: [standardTwoSet("לחיצת חזה במכונה", "Chest Press"), standardTwoSet("פולי עליון", "Lat Pulldown"), standardTwoSet("חתירה בכבלים", "Cable Row"), standardTwoSet("לחיצת כתפיים", "Shoulder Press"), standardTwoSet("פשיטת מרפקים בחבל", "Triceps Pushdown"), standardTwoSet("כפיפת מרפקים עם מוט", "Barbell Curl")],
  },
  {
    id: "ab-lower", name: "AB · תחתון", focus: "ארבע־ראשי, המסטרינג, ישבן ותאומים", accent: "#FB7185",
    exercises: [standardTwoSet("סקוואט במכונת סמית", "Smith Squat"), standardTwoSet("לחיצת רגליים", "Leg Press"), standardTwoSet("דדליפט רומני", "Romanian Deadlift"), standardTwoSet("כפיפת ברכיים", "Leg Curl"), standardTwoSet("הרמת עקבים", "Calf Raise")],
  },
  {
    id: "full-body", name: "Full Body", focus: "אימון גוף מלא לכל קבוצות השרירים", accent: "#42D392",
    exercises: [standardTwoSet("סקוואט או לחיצת רגליים", "Squat or Leg Press"), standardTwoSet("לחיצת חזה", "Chest Press"), standardTwoSet("פולי עליון", "Lat Pulldown"), standardTwoSet("לחיצת כתפיים", "Shoulder Press"), standardTwoSet("דדליפט רומני", "Romanian Deadlift"), standardTwoSet("כפיפת מרפקים", "Biceps Curl"), standardTwoSet("פשיטת מרפקים", "Triceps Extension")],
  },
  {
    id: "cardio", name: "אירובי", focus: "אימון אירובי כללי ושליטה בעצימות", accent: "#F59E0B",
    exercises: [{ id: "אירובי-כללי", name: "אירובי כללי", englishName: "General Cardio", sets: [{ target: "20–40 דקות" }] }, { id: "חימום", name: "חימום ותנועתיות", englishName: "Warm Up", sets: [{ target: "5–10 דקות" }] }],
  },
  {
    id: "cycling", name: "אופניים", focus: "רכיבה רציפה או אינטרוולים", accent: "#22C55E",
    exercises: [{ id: "אופניים", name: "אופניים", englishName: "Cycling", sets: [{ target: "30–60 דקות" }] }, { id: "אופניים-אינטרוולים", name: "אינטרוולים באופניים", englishName: "Bike Intervals", sets: [{ target: "10–20 דקות" }] }],
  },
  {
    id: "elliptical", name: "אליפטי", focus: "אימון אליפטי בעצימות נשלטת", accent: "#14B8A6",
    exercises: [{ id: "אליפטי", name: "מכשיר אליפטי", englishName: "Elliptical", sets: [{ target: "20–45 דקות" }] }],
  },
  {
    id: "stairs", name: "מדרגות", focus: "טיפוס מדרגות לשיפור סבולת", accent: "#F97316",
    exercises: [{ id: "מדרגות", name: "מכשיר מדרגות", englishName: "Stair Climber", sets: [{ target: "15–30 דקות" }] }],
  },
  {
    id: "treadmill", name: "הליכון", focus: "הליכה או ריצה בקצב נשלט", accent: "#EAB308",
    exercises: [{ id: "הליכון", name: "הליכון", englishName: "Treadmill", sets: [{ target: "20–45 דקות" }] }, { id: "הליכון-שיפוע", name: "הליכון בשיפוע", englishName: "Incline Treadmill", sets: [{ target: "15–30 דקות" }] }],
  },
  {
    id: "outdoor-run", name: "ריצה בחוץ", focus: "ריצה רציפה לפי זמן, מרחק וקצב", accent: "#38BDF8",
    exercises: [{ id: "ריצה-בחוץ", name: "ריצה בחוץ", englishName: "Outdoor Run", sets: [{ target: "20–60 דקות" }] }],
  },
  {
    id: "walking", name: "הליכה מהירה", focus: "הליכה מהירה לשיפור סבולת והתאוששות", accent: "#A3E635",
    exercises: [{ id: "הליכה-מהירה", name: "הליכה מהירה", englishName: "Brisk Walk", sets: [{ target: "20–60 דקות" }] }],
  },
  {
    id: "rowing", name: "חתירה", focus: "מכשיר חתירה או חתירה באינטרוולים", accent: "#60A5FA",
    exercises: [{ id: "חתירה", name: "מכשיר חתירה", englishName: "Rowing", sets: [{ target: "15–30 דקות" }] }],
  },
  {
    id: "swimming", name: "שחייה", focus: "שחייה רציפה או מחזורי בריכות", accent: "#06B6D4",
    exercises: [{ id: "שחייה", name: "שחייה", englishName: "Swimming", sets: [{ target: "20–45 דקות" }] }],
  },
  {
    id: "hiit", name: "אינטרוולים", focus: "מחזורי עבודה ומנוחה בעצימות גבוהה", accent: "#F43F5E",
    exercises: [{ id: "אינטרוולים", name: "אימון אינטרוולים", englishName: "HIIT", sets: [{ target: "10–25 דקות" }] }],
  },
];

export const getTemplate = (id: WorkoutId) => workoutTemplates.find((template) => template.id === id) ?? workoutTemplates[0];

export function replaceExerciseInTemplate(template: WorkoutTemplate, exerciseId: string, replacement: Pick<ExerciseTemplate, "name" | "englishName" | "note">): WorkoutTemplate {
  return { ...template, exercises: template.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, ...replacement } : exercise) };
}
