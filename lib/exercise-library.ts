export type ExerciseCategory = "יד אחורית" | "יד קדמית" | "חזה" | "כתפיים" | "גב" | "רגליים" | "ליבה" | "כללי";
export type ExerciseLibraryItem = { id: string; name: string; englishName: string; aliases?: string[]; category: ExerciseCategory; defaultTarget: string; note?: string };

export const exerciseLibrary: ExerciseLibraryItem[] = [
  { id: "triceps-rope", name: "פשיטת מרפקים בחבל", englishName: "Rope Triceps Pushdown", aliases: ["טרייספס חבל", "פשיטת יד אחורית בחבל", "פולי חבל"], category: "יד אחורית", defaultTarget: "10–15" },
  { id: "triceps-bar", name: "פשיטת מרפקים במוט", englishName: "Straight Bar Pushdown", aliases: ["טרייספס מוט", "פשיטת יד אחורית במוט", "פולי מוט"], category: "יד אחורית", defaultTarget: "8–12" },
  { id: "triceps-overhead-rope", name: "פשיטה מעל הראש בחבל", englishName: "Overhead Rope Extension", category: "יד אחורית", defaultTarget: "10–15" },
  { id: "triceps-skullcrusher", name: "לחיצה צרפתית", englishName: "Skull Crusher", aliases: ["סקול קראשר", "טרייספס בשכיבה", "פשיטת מרפקים בשכיבה"], category: "יד אחורית", defaultTarget: "8–12" },
  { id: "triceps-dips", name: "מקבילים לדגש יד אחורית", englishName: "Close-Grip Dips", category: "יד אחורית", defaultTarget: "8–12" },
  { id: "triceps-single", name: "פשיטה חד־ידית בכבל", englishName: "Single-Arm Cable Extension", category: "יד אחורית", defaultTarget: "12–15" },
  { id: "biceps-curl", name: "כפיפת מרפקים במוט", englishName: "Barbell Curl", aliases: ["בייספס מוט", "כפיפת יד קדמית", "כפיפת מרפקים בעמידה"], category: "יד קדמית", defaultTarget: "8–12" },
  { id: "biceps-incline", name: "כפיפת מרפקים בשיפוע", englishName: "Incline Dumbbell Curl", category: "יד קדמית", defaultTarget: "10–12" },
  { id: "biceps-hammer", name: "כפיפת פטיש", englishName: "Hammer Curl", aliases: ["פטישים", "האמר", "כפיפת פטיש ליד קדמית"], category: "יד קדמית", defaultTarget: "10–15" },
  { id: "biceps-preacher", name: "כפיפת מרפקים בפריצ׳ר", englishName: "Preacher Curl", category: "יד קדמית", defaultTarget: "8–12" },
  { id: "biceps-cable", name: "כפיפת מרפקים בכבל", englishName: "Cable Curl", category: "יד קדמית", defaultTarget: "12–15" },
  { id: "biceps-concentration", name: "כפיפה בריכוז", englishName: "Concentration Curl", category: "יד קדמית", defaultTarget: "10–15" },
  { id: "lateral-raise", name: "הרחקת כתפיים לצדדים", englishName: "Lateral Raise", aliases: ["הרחקות", "הרחקת כתפיים", "כתף אמצעית"], category: "כתפיים", defaultTarget: "12–20" },
  { id: "face-pull", name: "משיכת פנים", englishName: "Face Pull", aliases: ["פייס פול", "משיכת חבל לפנים", "כתף אחורית בכבל"], category: "כתפיים", defaultTarget: "12–20" },
  { id: "cable-fly", name: "קרוסאובר בכבלים", englishName: "Cable Fly", aliases: ["קרוס", "פרפר בכבלים", "חזה בכבלים"], category: "חזה", defaultTarget: "10–15" },
  { id: "chest-barbell-flat", name: "לחיצת חזה במוט", englishName: "Barbell Bench Press", aliases: ["לחיצה מוט", "בנץ׳ פרס", "בנץ פרס", "לחיצת מוט"], category: "חזה", defaultTarget: "5–9" },
  { id: "chest-barbell-incline", name: "לחיצת חזה בשיפוע עם מוט", englishName: "Incline Barbell Press", aliases: ["לחיצה מוט בשיפוע", "בנץ׳ עליון"], category: "חזה", defaultTarget: "8–12" },
  { id: "chest-machine-flat", name: "לחיצת חזה במכונה", englishName: "Chest Press Machine", aliases: ["לחיצה מכונה", "מכונת חזה", "חזה במכונה"], category: "חזה", defaultTarget: "8–12" },
  { id: "chest-dumbbell-flat", name: "לחיצת חזה עם דאמבלים", englishName: "Dumbbell Bench Press", aliases: ["לחיצה דאמבלים", "לחיצת משקולות חופשיות", "דאמבלס חזה"], category: "חזה", defaultTarget: "8–12" },
  { id: "chest-dumbbell-incline", name: "לחיצת חזה בשיפוע עם דאמבלים", englishName: "Incline Dumbbell Press", aliases: ["לחיצה דאמבלים בשיפוע", "לחיצה חיובית דאמבלים"], category: "חזה", defaultTarget: "8–12" },
  { id: "chest-hammer", name: "לחיצת חזה במכונת האמר", englishName: "Hammer Strength Chest Press", aliases: ["לחיצה בהאמר", "האמר חזה", "האמר סטרנת׳"], category: "חזה", defaultTarget: "8–12" },
  { id: "chest-cable-press", name: "לחיצת חזה בפולי", englishName: "Cable Chest Press", aliases: ["לחיצה בפולי", "לחיצת כבלים", "חזה בכבל"], category: "חזה", defaultTarget: "10–15" },
  { id: "chest-pec-deck", name: "פרפר במכונה", englishName: "Pec Deck", aliases: ["פרפר מכונה", "חזה פרפר"], category: "חזה", defaultTarget: "10–15" },
  { id: "chest-pushup", name: "שכיבות סמיכה", englishName: "Push Up", aliases: ["שכיבות", "סמיכה", "פוש אפ"], category: "חזה", defaultTarget: "מקסימום" },
  { id: "lat-pulldown", name: "משיכת פולי עליון", englishName: "Lat Pulldown", aliases: ["פולי עליון", "משיכת גב בפולי", "לט פולדאון"], category: "גב", defaultTarget: "8–12" },
  { id: "back-barbell-row", name: "חתירה עם מוט", englishName: "Barbell Row", aliases: ["חתירת מוט", "חתירה חופשית"], category: "גב", defaultTarget: "8–12" },
  { id: "back-hammer-row", name: "חתירה במכונת האמר", englishName: "Hammer Row", aliases: ["חתירה האמר", "האמר גב"], category: "גב", defaultTarget: "8–12" },
  { id: "back-cable-pullover", name: "פול־אובר בפולי", englishName: "Cable Pullover", aliases: ["פול אובר", "פולאובר גב"], category: "גב", defaultTarget: "10–15" },
  { id: "rear-delt-machine", name: "פרפר הפוך לכתף אחורית", englishName: "Reverse Pec Deck", aliases: ["כתף אחורית מכונה", "פרפר הפוך"], category: "כתפיים", defaultTarget: "12–20" },
  { id: "seated-row", name: "חתירה בישיבה", englishName: "Seated Cable Row", aliases: ["חתירה בכבל", "חתירה מכונה", "סיטד ראו"], category: "גב", defaultTarget: "8–12" },
  { id: "leg-curl", name: "כפיפת ברכיים במכונה", englishName: "Leg Curl", aliases: ["כפיפת רגליים", "המסטרינג במכונה", "לג קרל"], category: "רגליים", defaultTarget: "10–15" },
  { id: "leg-press", name: "לחיצת רגליים", englishName: "Leg Press", aliases: ["לג פרס", "לחיצה רגליים"], category: "רגליים", defaultTarget: "8–12" },
  { id: "leg-squat", name: "סקוואט", englishName: "Squat", aliases: ["סווט", "סקווט"], category: "רגליים", defaultTarget: "8–12" },
  { id: "leg-extension", name: "פשיטת ברכיים", englishName: "Leg Extension", aliases: ["קוואד במכונה", "פשיטת רגליים"], category: "רגליים", defaultTarget: "10–15" },
  { id: "leg-lunge", name: "מכרעים", englishName: "Lunge", aliases: ["לאנג׳ים", "לאנגים"], category: "רגליים", defaultTarget: "10–15" },
  { id: "calf-raise", name: "הרמת עקבים", englishName: "Calf Raise", aliases: ["תאומים", "הרמות תאומים", "קלף רייז"], category: "רגליים", defaultTarget: "12–20" },
  { id: "cable-crunch", name: "כפיפות בטן בכבל", englishName: "Cable Crunch", aliases: ["בטן בכבל", "כפיפות בטן", "קייבל קראנץ׳"], category: "ליבה", defaultTarget: "12–20" },
  { id: "pullup", name: "מתח", englishName: "Pull Up", aliases: ["מתח רחב", "מתח גוף", "פול אפ"], category: "גב", defaultTarget: "מקסימום" },
  { id: "assisted-pullup", name: "מתח מסייע", englishName: "Assisted Pull Up", aliases: ["מתח במכונה", "מתח עם עזרה"], category: "גב", defaultTarget: "8–12" },
  { id: "single-arm-row", name: "חתירה חד־ידית עם דאמבל", englishName: "Single Arm Dumbbell Row", aliases: ["חתירה יד אחת", "חתירת דאמבל"], category: "גב", defaultTarget: "8–12" },
  { id: "chest-supported-row", name: "חתירה עם תמיכת חזה", englishName: "Chest Supported Row", aliases: ["חתירה חזה נתמך", "חתירה בשיפוע"], category: "גב", defaultTarget: "8–12" },
  { id: "tbar-row", name: "חתירת T", englishName: "T-Bar Row", aliases: ["טי באר", "חתירת מוט T"], category: "גב", defaultTarget: "8–12" },
  { id: "straight-arm-pulldown", name: "משיכה ישרת־ידיים בפולי", englishName: "Straight Arm Pulldown", aliases: ["פולי ידיים ישרות", "משיכת זרועות ישרות"], category: "גב", defaultTarget: "10–15" },
  { id: "back-extension", name: "פשיטת גב", englishName: "Back Extension", aliases: ["היפר אקסטנשן", "פשיטת גב תחתון"], category: "גב", defaultTarget: "10–15" },
  { id: "overhead-press", name: "לחיצת כתפיים מעל הראש", englishName: "Overhead Press", aliases: ["לחיצת כתפיים", "פרס כתפיים"], category: "כתפיים", defaultTarget: "6–10" },
  { id: "seated-dumbbell-press", name: "לחיצת כתפיים בישיבה עם דאמבלים", englishName: "Seated Dumbbell Shoulder Press", aliases: ["לחיצת דאמבלים כתפיים", "כתפיים דאמבל"], category: "כתפיים", defaultTarget: "8–12" },
  { id: "front-raise", name: "הרמת כתפיים לפנים", englishName: "Front Raise", aliases: ["הרמות לפנים", "כתף קדמית"], category: "כתפיים", defaultTarget: "10–15" },
  { id: "cable-lateral-raise", name: "הרחקת כתף בכבל", englishName: "Cable Lateral Raise", aliases: ["הרחקה בפולי", "כתף אמצעית בכבל"], category: "כתפיים", defaultTarget: "12–20" },
  { id: "cable-rear-delt", name: "הרחקה אחורית בכבל", englishName: "Cable Rear Delt Fly", aliases: ["כתף אחורית בכבל", "הרחקה לאחור"], category: "כתפיים", defaultTarget: "12–20" },
  { id: "arnold-press", name: "לחיצת ארנולד", englishName: "Arnold Press", aliases: ["ארנולד פרס"], category: "כתפיים", defaultTarget: "8–12" },
  { id: "front-squat", name: "סקוואט קדמי", englishName: "Front Squat", aliases: ["פרונט סקוואט"], category: "רגליים", defaultTarget: "6–10" },
  { id: "hack-squat", name: "סקוואט האק", englishName: "Hack Squat", aliases: ["האק סקוואט", "מכונת האק"], category: "רגליים", defaultTarget: "8–12" },
  { id: "romanian-deadlift", name: "דדליפט רומני", englishName: "Romanian Deadlift", aliases: ["RDL", "דדליפט רגליים"], category: "רגליים", defaultTarget: "8–12" },
  { id: "bulgarian-split-squat", name: "סקוואט בולגרי", englishName: "Bulgarian Split Squat", aliases: ["בולגרי", "ספליט סקוואט"], category: "רגליים", defaultTarget: "8–12" },
  { id: "hip-thrust", name: "היפ תראסט", englishName: "Hip Thrust", aliases: ["דחיקת אגן", "אגן במכונה"], category: "רגליים", defaultTarget: "8–12" },
  { id: "glute-kickback", name: "בעיטת ישבן בכבל", englishName: "Cable Glute Kickback", aliases: ["קיקבק", "ישבן בכבל"], category: "רגליים", defaultTarget: "12–20" },
  { id: "adductor-machine", name: "קירוב ירכיים במכונה", englishName: "Adductor Machine", aliases: ["מקרבים", "מכונת מקרבים"], category: "רגליים", defaultTarget: "12–20" },
  { id: "abductor-machine", name: "הרחקת ירכיים במכונה", englishName: "Abductor Machine", aliases: ["מרחיקים", "מכונת מרחיקים"], category: "רגליים", defaultTarget: "12–20" },
  { id: "seated-calf-raise", name: "הרמת עקבים בישיבה", englishName: "Seated Calf Raise", aliases: ["תאומים בישיבה"], category: "רגליים", defaultTarget: "12–20" },
];

export function libraryForWorkout(workoutName: string) {
  if (/Push/i.test(workoutName)) return exerciseLibrary.filter((item) => ["יד אחורית", "חזה", "כתפיים"].includes(item.category));
  if (/Pull/i.test(workoutName)) return exerciseLibrary.filter((item) => ["יד קדמית", "גב", "כתפיים"].includes(item.category));
  if (/Legs/i.test(workoutName)) return exerciseLibrary.filter((item) => ["רגליים", "ליבה"].includes(item.category));
  return exerciseLibrary;
}

export function categoryForExercise(exerciseName: string): ExerciseCategory | null {
  if (/בטן|כיווצ|ליבה|abs/i.test(exerciseName)) return "ליבה";
  if (/פרפר הפוך|כתף אחורית|כתפ|הרחק|דלתא|פייס|shoulder|lateral|face/i.test(exerciseName)) return "כתפיים";
  if (/חזה|פרפר|pec|chest|לחיצת חזה|שכיבות/i.test(exerciseName)) return "חזה";
  if (/פשיטת מרפק|מקביל|טרייספס|יד אחורית|triceps/i.test(exerciseName)) return "יד אחורית";
  if (/כפיפת מרפק|בייספס|יד קדמית|סקוט|curl|פטיש/i.test(exerciseName)) return "יד קדמית";
  if (/רגל|ברכ|סקוואט|מכרע|תאומים|עקב|leg|squat|calf/i.test(exerciseName)) return "רגליים";
  if (/חתיר|פולי|מתח|גב|פול|row|pulldown|back/i.test(exerciseName)) return "גב";
  return null;
}

export function replacementLibraryForExercise(workoutName: string, exerciseName: string) {
  const category = categoryForExercise(exerciseName);
  const workoutItems = libraryForWorkout(workoutName);
  return category ? workoutItems.filter((item) => item.category === category) : workoutItems;
}
