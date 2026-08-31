import type { ExerciseTemplate, WorkoutTemplate } from "./workout-data";

/**
 * תוכן מדריך האימונים שהועלה על ידי המשתמש. בפרקי המדריך שאינם מציינים
 * מינון מספרי, האפליקציה מציגה במפורש שהמינון מותאם אישית — ללא המצאת סטים,
 * חזרות או זמני מנוחה.
 */
const guideSet = [{ target: "לפי תכנית אישית", note: "במדריך לא צוינו סטים, חזרות או מנוחה." }];

function exercise(id: string, name: string, englishName: string, note: string): ExerciseTemplate {
  return { id, name, englishName, note, sets: guideSet.map((set) => ({ ...set })) };
}

function workout(id: string, name: string, focus: string, accent: string, exercises: ExerciseTemplate[]): WorkoutTemplate {
  return { id, name, focus, accent, exercises };
}

export const workoutGuideTemplates: WorkoutTemplate[] = [
  workout("glute-shape", "בניית ועיצוב הישבן", "מיקוד בישבן הגדול, התיכון, ירך אחורית ושליטה חד־רגלית", "#E38BFF", [
    exercise("glute-hip-thrust", "היפ ת׳ראסט עם מוט כבד", "Heavy Barbell Hip Thrust", "תרגיל דגל לעומס על הישבן הגדול."),
    exercise("glute-bridge", "גלוט ברידג׳", "Glute Bridge", "מיקוד בכיווץ שיא ללא עומס מיותר על הגב התחתון."),
    exercise("glute-rdl", "דדליפט רומני", "Romanian Deadlift", "מתיחה עמוקה של הישבן והירך האחורית."),
    exercise("glute-bulgarian", "ספליט סקוואט בולגרי", "Bulgarian Split Squat", "עבודה חד־רגלית לישבן ולירך."),
    exercise("glute-abduction", "הרחקת ירך במכונה או בכבל", "Hip Abduction", "מיקוד בעכוז האמצעי."),
    exercise("glute-kickback", "קיק־בק בכבל", "Cable Glute Kickback", "בידוד החלק העליון של הישבן."),
    exercise("glute-monster-walk", "הליכת סרטן עם גומייה", "Banded Monster Walk", "אקטיבציה של מייצבי האגן והירך."),
  ]),
  workout("glute-medius-waist", "ישבן וקו מותניים", "ייצוב אגן, ישבן תיכון ושליטה צדית", "#D8B4FE", [
    exercise("waist-abduction", "הרחקת ירך בכבל", "Cable Hip Abduction", "מיקוד בישבן התיכון ובייצוב האגן."),
    exercise("waist-band-walk", "הליכת גומייה צדית", "Lateral Band Walk", "שימור ברכיים בקו כפות הרגליים."),
    exercise("waist-bulgarian", "ספליט סקוואט בולגרי", "Bulgarian Split Squat", "עבודה חד־צדדית לשליטה בכוח ובאיזון."),
    exercise("waist-rdl", "דדליפט רומני", "Romanian Deadlift", "חיזוק השרשרת האחורית."),
    exercise("waist-kickback", "קיק־בק לאחור", "Cable Glute Kickback", "בידוד הישבן ללא תנופת גב."),
  ]),
  workout("upper-body-posture", "פלג גוף עליון ויציבה", "כתפיים אחוריות, שכמות, גב עליון וזרועות", "#C084FC", [
    exercise("posture-ohp", "לחיצת כתפיים מעל הראש", "Overhead Press", "פיתוח מסה ועוצמה בחגורת הכתפיים."),
    exercise("posture-lateral-raise", "הרחקת זרועות לצדדים", "Lateral Raise", "בידוד הכתף האמצעית."),
    exercise("posture-face-pull", "פייס פול בכבל", "Face Pull", "חיזוק כתף אחורית וטרפז אמצעי."),
    exercise("posture-ytwl", "תרגילי Y-T-W-L", "Y-T-W-L", "ייצוב שכמות וחיזוק טרפז תחתון."),
    exercise("posture-row", "חתירה בכבל או ברצועות", "Cable or Band Row", "שימור שכמות אחורנית וזקיפות גב."),
  ]),
  workout("prenatal-postnatal", "הריון, לאחר לידה ורצפת אגן", "תנועה עדינה המצריכה התאמה מקצועית אישית", "#F0ABFC", [
    exercise("prenatal-wall-squat", "סקוואט עם כדור פיטבול על קיר", "Wall Ball Squat", "תמיכה לגב התחתון וחיזוק רגליים."),
    exercise("prenatal-wall-plank", "פלאנק בשיפוע גבוה על קיר", "Incline Wall Plank", "חיזוק ליבה עדין."),
    exercise("prenatal-bridge", "גשר אגן מוגבה", "Elevated Glute Bridge", "שימור כוח הישבן והאגן."),
    exercise("prenatal-breathing", "איסוף בטן בנשיפה", "Diastasis Recti Core Breathing", "שליטה עדינה בשריר הרחב־בטני."),
    exercise("prenatal-kegel", "קיגל מסונכרן בנשימה", "Kegel Contractions with Breath", "שליטה ברצפת האגן."),
  ]),
  workout("fall-prevention", "מניעת נפילות ושיווי משקל", "שיווי משקל, שליטה מוטורית וביטחון בהליכה", "#42D392", [
    exercise("senior-single-leg", "עמידה נתמכת על רגל אחת", "Supported Single-Leg Stance", "תרגול שיווי משקל למניעת מעידות."),
    exercise("senior-tandem", "הליכת טנדם", "Tandem Walk", "עקב לצד אגודל במסלול ישר."),
    exercise("senior-sit-stand", "מעבר מישיבה לעמידה", "Sit-to-Stand", "שמירה על כוח הרגליים ועצמאות תפקודית."),
  ]),
  workout("chair-based", "אימונים בישיבה על כיסא", "חיזוק ותנועתיות מותאמים בישיבה", "#4ADE80", [
    exercise("chair-knee-extension", "פשיטת ברכיים בישיבה", "Seated Knee Extension", "חיזוק ארבע־ראשי."),
    exercise("chair-band-row", "חתירה עם גומייה בישיבה", "Seated Band Row", "שמירה על זקיפות גב."),
    exercise("chair-band-press", "לחיצה עם גומייה בישיבה", "Seated Band Press", "טווח תנועה לזרועות ולכתפיים."),
  ]),
  workout("bone-density", "צפיפות עצם ואריכות ימים", "נשיאת משקל מתונה וחיזוק תפקודי", "#86EFAC", [
    exercise("bone-carry", "נשיאת משקלים מתונה בעמידה", "Moderate Loaded Carry", "גירוי מכני לשמירה על צפיפות עצם."),
    exercise("bone-sit-stand", "מעבר מישיבה לעמידה", "Sit-to-Stand", "חיזוק רגליים לתפקוד יומיומי."),
    exercise("bone-step", "עלייה על מדרגה נמוכה", "Low Step-Up", "עומס מדורג על הרגליים ושיווי המשקל."),
  ]),
  workout("joint-mobility-seniors", "תנועתיות מפרקים", "טווחי תנועה פעילים ושחרור מבוקר", "#34D399", [
    exercise("senior-cat-cow", "חתול־פרה", "Cat-Cow", "תנועתיות עמוד השדרה."),
    exercise("senior-cars", "סיבובי מפרקים מבוקרים", "Shoulder & Hip CARs", "שימור טווח תנועה פעיל."),
    exercise("senior-foam-roll", "עיסוי בגליל", "Foam Rolling", "שחרור רקמות והורדת מתח שרירי."),
  ]),
  workout("fms-youth", "מיומנויות תנועה בסיסיות", "כוח כולל וקואורדינציה לילדים ולנוער", "#65BDF6", [
    exercise("youth-crawls", "זחילות חיות", "Bear Crawls, Crab Walks, Frog Jumps", "פיתוח כוח, קואורדינציה וחגורת כתפיים."),
    exercise("youth-monkey-bars", "מתח וסולמות קופים", "Monkey Bars & Bar Hangs", "פיתוח אחיזה ומשיכה טבעית."),
    exercise("youth-bodyweight", "סקוואט משקל גוף ומשיכות גומייה", "Bodyweight Squats & Band Pulls", "הקניית דפוסי תנועה בסיסיים."),
  ]),
  workout("youth-agility", "זריזות, קואורדינציה ומהירות", "עבודת רגליים, תגובה ושינויי כיוון", "#60A5FA", [
    exercise("youth-ladder", "סולם זריזות", "Agility Ladder Drills", "תיאום עין־רגל ומהירות."),
    exercise("youth-cones", "ריצות סלאלום בין קונוסים", "Cone Shuttles", "שינוי כיוון ובלימה נכונה."),
    exercise("youth-med-ball", "זריקות כדור כוח קל", "Light Medicine Ball Passes", "כוח מתפרץ סיבובי בעומס מותאם."),
  ]),
  workout("youth-resistance", "התנגדות מותאמת לנוער", "אימון התנגדות לפי דפוסי תנועה מבוקרים", "#38BDF8", [
    exercise("youth-squat", "סקוואט משקל גוף", "Bodyweight Squat", "לימוד שליטה בברך ובאגן."),
    exercise("youth-band-pull", "משיכות גומייה", "Band Pull", "חיזוק גב ושכמות בעומס מותאם."),
    exercise("youth-carry", "נשיאה קלה", "Light Carry", "יציבה ושליטה כללית בתנועה."),
  ]),
  workout("powerlifting-big-3", "שלושת הגדולים", "סקוואט, לחיצת חזה ודדליפט תחרותיים", "#FB7185", [
    exercise("pl-squat", "סקוואט תחרותי", "Competition Squat", "סקוואט Low/High Bar לעומק מתאים."),
    exercise("pl-bench", "לחיצת חזה עם עצירה", "Paused Bench Press", "עצירה יציבה על החזה לפני הלחיצה."),
    exercise("pl-deadlift", "דדליפט קונבנציונלי", "Conventional Deadlift", "הרמה מהרצפה עד נעילה מלאה."),
  ]),
  workout("powerlifting-accessories", "תרגילי עזר לפאוורליפטינג", "חיזוק נקודות חולשה בשלושת הגדולים", "#FDA4AF", [
    exercise("pl-sumo", "דדליפט סומו", "Sumo Deadlift", "עמידה רחבה ועומס על ישבן ורגליים."),
    exercise("pl-paused-box", "סקוואט עצירה או קופסה", "Paused & Box Squat", "פיתוח כוח מתחתית התנועה."),
    exercise("pl-spoto", "ספוטו פרס או לחיצה מקרשים", "Spoto & Board Press", "חיזוק נקודת התקיעה בלחיצת חזה."),
    exercise("pl-deficit", "דדליפט מגרעון או מבוקים", "Deficit Deadlift & Block Pull", "חיזוק ניתוק מהרצפה או נעילה."),
    exercise("pl-good-morning", "גוד מורנינג עם מוט", "Barbell Good Morning", "חיזוק השרשרת האחורית."),
  ]),
  workout("strongman-events", "אירועי סטרונגמן", "הרמה, נשיאה ומשימות כוח ייעודיות", "#F43F5E", [
    exercise("strong-log", "לוג קלין אנד פרס", "Log Clean & Press", "הרמת בול עץ ולחיצה מעל הראש."),
    exercise("strong-atlas", "אבני אטלס", "Atlas Stones", "חיבוק והרמת אבנים לפלטפורמה."),
    exercise("strong-farmer", "הליכת פארמר", "Heavy Farmer’s Walk", "נשיאת משקלים כבדים בכל יד."),
    exercise("strong-yoke", "הליכת סופר־יוק", "Super Yoke Walk", "נשיאת מסגרת על השכמות."),
    exercise("strong-tire", "הפיכת צמיג", "Tire Flips", "כוח מתפרץ לכל הגוף."),
  ]),
  workout("snatch-variations", "הנפה ווריאציות", "מהירות, תזמון וכוח מתפרץ מעל הראש", "#F59E0B", [
    exercise("oly-full-snatch", "הנפה מלאה", "Full Snatch", "נחיתה בסקוואט עמוק."),
    exercise("oly-power-snatch", "פאוור סנאץ׳", "Power Snatch", "תפיסת המוט מעל גובה מקביל."),
    exercise("oly-ohs", "אוברהד סקוואט", "Overhead Squat", "סקוואט כשהמוט נעול מעל הראש."),
    exercise("oly-snatch-pull", "משיכה גבוהה לסנאץ׳", "Snatch High Pull", "חיזוק שלב המשיכה השנייה."),
  ]),
  workout("clean-jerk", "קלין ודחיקה", "קליטה, דחיקה וכוח מתפרץ", "#FB923C", [
    exercise("oly-full-clean", "קלין מלא", "Full Clean", "קליטת המוט על הכתפיים בסקוואט קדמי."),
    exercise("oly-split-jerk", "ספליט ג׳רק", "Split Jerk", "דחיקה מעל הראש בפיסוק מהיר."),
    exercise("oly-clean-pull", "משיכה גבוהה לקלין", "Clean High Pull", "חיזוק משיכה וכוח טרפזים."),
  ]),
  workout("calisthenics-basics", "בסיס משקל גוף", "משיכה, דחיפה ושליטה חד־רגלית במשקל גוף", "#A78BFA", [
    exercise("cal-muscle-up", "מאסל־אפ", "Muscle-up", "עלייה מעל מוט המתח בכוח מתפרץ."),
    exercise("cal-ring-dip", "מקבילים על טבעות", "Ring Dip", "דחיפה וייצוב כתפיים וחזה."),
    exercise("cal-pistol", "סקוואט אקדח", "Pistol Squat", "סקוואט מלא על רגל אחת."),
    exercise("cal-handstand", "עמידת ידיים ושכיבות סמיכה", "Handstand & HSPU", "שליטה וכוח דחיפה אנכי."),
  ]),
  workout("calisthenics-static-dynamic", "אלמנטים סטטיים ודינמיים", "שליטה סטטית בגוף וקואורדינציה מתקדמת", "#C4B5FD", [
    exercise("cal-planche", "פלאנש", "Planche", "החזקת גוף מקביל לרצפה על הידיים."),
    exercise("cal-lever", "פרונט ליבר ובק ליבר", "Front & Back Lever", "החזקות אופקיות בתלייה."),
    exercise("cal-flag", "דגל אנושי", "Human Flag", "אחיזה בעמוד והחזקת הגוף באוויר."),
    exercise("cal-handstand-skill", "עמידת ידיים חופשית", "Freestanding Handstand", "שיווי משקל ושליטה."),
  ]),
  workout("crossfit-wod", "קרוספיט ו־WOD", "תנועות פונקציונליות בעצימות גבוהה", "#F97316", [
    exercise("cf-thruster", "ת׳ראסטרס", "Thrusters", "סקוואט קדמי ולחיצה מתפרצת."),
    exercise("cf-wall-ball", "וול בולס", "Wall Balls", "סקוואט מלא וזריקת כדור למטרה."),
    exercise("cf-t2b", "טוז־טו־בר", "Toes-to-Bar", "תלייה והבאת בהונות למוט."),
    exercise("cf-rope", "עליות חבל", "Rope Climbs", "טיפוס רגיל או ללא רגליים."),
    exercise("cf-double-under", "דאבל אנדרס", "Double Unders", "שני סיבובי חבל בניתור."),
    exercise("cf-box-jump", "בוקס ג׳אמפ אובר", "Box Jump Over", "קפיצה על ארגז ומעבר לצד השני."),
    exercise("cf-handstand-walk", "הליכת עמידת ידיים", "Handstand Walk", "חציית מרחק על כפות הידיים."),
  ]),
  workout("hyrox-hybrid", "HYROX ואימון היברידי", "תחנות כוח וסבולת למרחק", "#FB923C", [
    exercise("hyrox-ski", "סקי־ארג", "SkiErg 1000m", "משיכות רציפות בסקי־ארג."),
    exercise("hyrox-sled-push", "דחיפת מזחלת", "Sled Push", "דחיפת מזחלת כבדה."),
    exercise("hyrox-sled-pull", "משיכת מזחלת", "Sled Pull", "משיכה בחבל כנגד עומס."),
    exercise("hyrox-burpee", "ברפי בראוד ג׳אמפ", "Burpee Broad Jump", "ברפי וקפיצה למרחק."),
    exercise("hyrox-row", "חתירה", "Rowing 1000m", "עבודת סבולת כוללת."),
    exercise("hyrox-lunge", "מכרעים עם שק חול", "Sandbag Lunges", "מכרעים רציפים עם עומס."),
  ]),
  workout("classical-mat-pilates", "פילאטיס מזרן קלאסי", "ליבה, גמישות ושליטה באגן", "#F0ABFC", [
    exercise("pilates-hundred", "המאה", "The Hundred", "חימום ליבה עם נשימות ותנועת ידיים."),
    exercise("pilates-roll-up", "גלגול מעלה", "The Roll Up", "תנועה חוליה אחר חוליה."),
    exercise("pilates-leg-stretch", "מתיחת רגל בודדת וכפולה", "Single & Double Leg Stretch", "יציבות אגן ואיסוף בטן."),
    exercise("pilates-criss-cross", "קריס־קרוס", "Criss-Cross", "כפיפה ורוטציה לאלכסונים."),
    exercise("pilates-teaser", "טיזר", "The Teaser", "איזון בצורת V."),
    exercise("pilates-swan", "צלילת ברבור ושחייה", "Swan Dive & Swimming", "חיזוק השרשרת האחורית."),
    exercise("pilates-side-kick", "סדרת בעיטות צד", "Side Kick Series", "חיזוק ירך ואגן."),
  ]),
  workout("apparatus-pilates", "פילאטיס מכשירים", "רפורמר, קדילאק וצ׳ייר", "#E879F9", [
    exercise("app-footwork", "פוטוורק ברפורמר", "Reformer Footwork", "עבודה כנגד קפיצים."),
    exercise("app-straps", "רצועות לרגליים", "Feet in Straps", "מעגלי רגליים ותנועת צפרדע."),
    exercise("app-elephant", "הפיל ברפורמר", "The Elephant", "מתיחת המסטרינגס וייצוב כתפיים."),
    exercise("app-box", "סדרת קופסה קצרה וארוכה", "Short & Long Box Series", "תנועתיות גב ופיתולים."),
    exercise("app-push-through", "פוש־ת׳רו בר בקדילאק", "Cadillac Push-Through Bar", "פתיחת בית חזה ומתיחה."),
    exercise("app-pike", "פייק בוונדה צ׳ייר", "Wunda Chair Pike", "הרמת הגוף בכוח ליבה."),
  ]),
  workout("barre", "שיטת בר", "שליטה, יציבה וסבולת שריר מקומית", "#F0ABFC", [
    exercise("barre-plie", "פלייה פולסים ברלווה", "Plié Pulses in Relevé", "ניעות קטנות בעמידה על קצות האצבעות."),
    exercise("barre-arabesque", "ערבסק בר", "Barre Arabesque", "הרמת רגל ישרה לאחור."),
    exercise("barre-attitude", "אטיטיוד בר", "Barre Attitude", "הרמת רגל בברך כפופה באלכסון."),
    exercise("barre-second-squat", "סקוואט עמדה שנייה", "Second Position Squat", "כיווץ איזומטרי למקרבי הירך."),
    exercise("barre-arms", "עבודת ידיים עם משקולות קלות", "Light-Weight Arms", "משקולות 1–2 ק״ג וחזרות מרובות."),
  ]),
  workout("yoga-asanas", "תנוחות יוגה", "גמישות, שיווי משקל ושליטה בנשימה", "#2DD4BF", [
    exercise("yoga-down-dog", "כלב מביט לאחור", "Downward-Facing Dog", "הארכת השרשרת האחורית."),
    exercise("yoga-cobra", "כלב מביט לפנים וקוברה", "Upward Dog & Cobra", "פתיחת בית חזה ועמוד שדרה."),
    exercise("yoga-warrior", "סדרת הלוחמים", "Warrior Series", "כוח רגליים ופתיחת אגן."),
    exercise("yoga-pigeon", "תנוחת היונה", "Pigeon Pose", "פתיחת אגן ופיריפורמיס."),
    exercise("yoga-triangle", "תנוחת המשולש", "Triangle Pose", "מתיחה צדית של הירך והגב."),
    exercise("yoga-tree", "תנוחת העץ", "Tree Pose", "יציבות ושיווי משקל על רגל אחת."),
    exercise("yoga-child", "תנוחת הילד", "Child’s Pose", "הרפיה ומתיחת גב תחתון."),
  ]),
  workout("joint-cars", "מוביליטי ו־CARs", "טווחי תנועה פעילים ושחרור מפרקים", "#5EEAD4", [
    exercise("mobility-cat-cow", "חתול־פרה", "Cat-Cow", "תנועתיות עמוד השדרה."),
    exercise("mobility-worlds-greatest", "מתיחת הטובה בעולם", "World’s Greatest Stretch", "פתיחת ירך, גב חזי וקרסול."),
    exercise("mobility-9090", "מעברי 90/90", "90/90 Hip Switches", "סיבוב פנימי וחיצוני בירך."),
    exercise("mobility-thoracic", "רוטציות בית חזה בכריעה", "Half-Kneeling Thoracic Rotations", "שחרור חגורת כתפיים."),
    exercise("mobility-cars", "סיבובי כתף וירך מבוקרים", "Shoulder & Hip CARs", "שמירת טווח פעיל ובריאות מפרקית."),
  ]),
  workout("myofascial-breathwork", "שחרור מיופציאלי ונשימה", "שחרור רקמות ושליטה בנשימה", "#99F6E4", [
    exercise("release-foam", "עיסוי בגליל", "Foam Rolling", "שחרור פאציה והורדת מתח שרירי."),
    exercise("release-breath", "נשימה מבוקרת", "Controlled Breathing", "הרפיה והתמקדות בתנועה."),
    exercise("release-child", "תנוחת הילד", "Child’s Pose", "שחרור עדין לגב התחתון."),
  ]),
  workout("boxing-muay-thai", "איגרוף וקיקבוקסינג", "תזמון, תנועה, דיוק וכוח סיבובי", "#EF4444", [
    exercise("combat-shadow", "אגרוף צללים", "Shadowboxing", "תנועה, קומבינציות והתחמקויות."),
    exercise("combat-bag", "עבודה על שק כבד", "Heavy Bag Work", "ג׳אב, קרוס, הוק ואפרקאט."),
    exercise("combat-mitts", "פדים ומטרות", "Focus Mitts", "תזמון ודיוק בזוגות."),
    exercise("combat-roundhouse", "בעיטות סיבוביות", "Roundhouse Kicks", "כוח סיבובי מהאגן."),
    exercise("combat-teep", "בעיטת דחיפה", "Teep", "שמירה על מרחק."),
    exercise("combat-slip-roll", "סליפ ורול", "Slip & Roll Drills", "תנועת ראש ועבודת רגליים."),
  ]),
  workout("mma-bjj", "MMA ו־BJJ", "תנועתיות אגן, כוח אחיזה ושליטה בקרקע", "#F87171", [
    exercise("bjj-shrimp", "שרימפינג ובריחות אגן", "BJJ Shrimping & Hip Escapes", "תנועתיות אגן ייעודית לקרקע."),
    exercise("bjj-neck", "חיזוק צוואר", "Neck Bridges & Harness", "חיזוק שרירי הצוואר."),
    exercise("bjj-gi", "מתח באחיזת גי", "Gi Grip Pull-ups", "כוח אחיזה ואמות."),
    exercise("bjj-sandbag", "סנדבג קלין לכתף", "Sandbag Clean & Shouldering", "נשיאת משא לא־מאוזן."),
  ]),
  workout("grappling-wrestling", "היאבקות וגראפלינג", "כוח צוואר, אחיזה ותנועה קרקעית", "#FB7185", [
    exercise("grappling-neck", "גשרי צוואר", "Neck Bridges", "חיזוק צוואר להטלות."),
    exercise("grappling-sandbag", "הרמת שק חול", "Sandbag Shouldering", "הדמיית נשיאת גוף יריב."),
    exercise("grappling-grip", "מתח באחיזת מגבת", "Towel Grip Pull-ups", "כוח אחיזה ואמות."),
    exercise("grappling-hip", "בריחות אגן", "Hip Escapes", "שליטה בתנועה קרקעית."),
  ]),
  workout("shoulder-prehab", "שיקום כתף ומסובבי הכתף", "חיזוק עדין סביב הכתף והשכמה", "#84CC16", [
    exercise("rehab-rotator", "רוטציות פנימיות וחיצוניות", "Rotator Cuff Rotations", "חיזוק מסובבי הכתף."),
    exercise("rehab-ytwl", "Y-T-W-L", "Y-T-W-L", "ייצוב שכמות וחיזוק טרפז תחתון."),
    exercise("rehab-face-pull", "פייס פול קל", "Light Face Pull", "שליטה בכתף אחורית."),
  ]),
  workout("knee-hip-ankle-rehab", "שיקום ברכיים, ירכיים וקרסוליים", "תרגול מדורג של הגפה התחתונה", "#A3E635", [
    exercise("rehab-step-down", "סטפ־דאון", "Step-Down", "חיזוק VMO ושליטה בברך."),
    exercise("rehab-tibialis", "הרמות שוק קדמי", "Tibialis Anterior Raises", "חיזוק קדמת השוק."),
    exercise("rehab-9090", "מעברי 90/90", "90/90 Hip Switches", "תנועתיות ירך."),
    exercise("rehab-bridge", "גשר אגן", "Glute Bridge", "חיזוק ישבן ותמיכת אגן."),
  ]),
  workout("mcgill-big-3", "פרוטוקול מקגיל", "ייצוב גב תחתון בתרגילים מבוקרים", "#BEF264", [
    exercise("mcgill-bird-dog", "בירד דוג", "Bird Dog", "ייצוב עמוד השדרה."),
    exercise("mcgill-side-bridge", "סייד ברידג׳", "Side Bridge", "יציבות צדית של הגו."),
    exercise("mcgill-curl-up", "מקגיל קרל־אפ", "McGill Curl-Up", "חיזוק ליבה ללא כפיפה עמוקה."),
  ]),
  workout("hiit-tabata", "HIIT וטבטה", "אינטרוולים קצרים בעצימות גבוהה", "#F43F5E", [
    exercise("hiit-sprint", "ספרינטים באינטרוולים", "Sprint Intervals", "פרצי ריצה במהירות גבוהה."),
    exercise("hiit-airbike", "ספרינטים באסולט בייק", "Assault AirBike Sprints", "עבודה מול התנגדות אוויר."),
    exercise("hiit-rope", "קפיצות חבל מהירות", "Speed Jump Rope", "קלילות רגליים והעלאת דופק."),
    exercise("hiit-squat-jump", "סקוואט ג׳אמפ", "Squat Jump", "כוח מתפרץ לרגליים."),
    exercise("hiit-burpee", "ברפיז", "Burpees", "שילוב כוח משקל גוף וקרדיו."),
    exercise("hiit-mountain", "מטפסי הרים", "Mountain Climbers", "ליבה וקרדיו דינמי."),
  ]),
  workout("cardio-endurance", "אירובי וסיבולת", "בחירת פעילות אירובית לפי מטרה וקצב אישי", "#38BDF8", [
    exercise("cardio-incline", "הליכה בשיפוע על הליכון", "Incline Treadmill Walking", "אירובי בקצב נמוך עד בינוני."),
    exercise("cardio-stairs", "טיפוס מדרגות", "StairMaster", "סיבולת רגליים וישבן."),
    exercise("cardio-cycle", "רכיבת אופניים וספינינג", "Road & Stationary Cycling", "סיבולת ללא עומס אימפקט."),
    exercise("cardio-zone2", "ריצת נפח Zone 2", "Zone 2 Easy Run", "בניית בסיס אירובי."),
    exercise("cardio-swim", "שחיית חופשי", "Freestyle Swimming", "סיבולת כוללת בעומס נמוך למפרקים."),
  ]),
  workout("aquatic-fitness", "שחייה ואימוני מים", "סיבולת, כוח ותנועה כנגד התנגדות המים", "#06B6D4", [
    exercise("aqua-freestyle", "שחיית חתירה/חופשי", "Freestyle Laps", "סיבולת לב־ריאה לכל הגוף."),
    exercise("aqua-backstroke", "שחיית גב", "Backstroke", "פתיחת בית חזה וחיזוק חגורת כתפיים."),
    exercise("aqua-breast-butterfly", "חזה ופרפר", "Breaststroke & Butterfly", "כוח מתפרץ וגמישות ירך וכתף."),
    exercise("aqua-aerobics", "אירובי במים", "Aqua Aerobics", "תנועות כנגד התנגדות מים בעומס מפרקי נמוך."),
  ]),
  workout("kettlebell-training", "אימוני קטלבלס", "כוח מתפרץ, יציבות כתף ושליטה בשרשרת האחורית", "#F97316", [
    exercise("kb-swing", "קטלבל סווינג", "Russian & American Swing", "הנפה מתפרצת מונעת אגן."),
    exercise("kb-tgu", "טורקיש גט־אפ", "Turkish Get-Up", "מעבר מבוקר משכיבה לעמידה עם משקל."),
    exercise("kb-clean-press", "קטלבל קלין אנד פרס", "Kettlebell Clean & Press", "הנפה לכתף ולחיצה מעל הראש."),
    exercise("kb-snatch", "סנאץ׳ קטלבל", "Kettlebell Snatch", "הנפה מעל הראש בתנועה אחת."),
    exercise("kb-waiter", "הליכת מלצר", "Waiter’s Carry", "נשיאה מעל הראש למייצבי כתף וליבה."),
  ]),
  workout("trx-training", "אימוני TRX", "כוח במשקל גוף, ליבה ויציבות שכמות", "#FB923C", [
    exercise("trx-row", "חתירה ב־TRX", "TRX Low & High Row", "חיזוק גב ושכמות במשקל גוף."),
    exercise("trx-push", "שכיבות סמיכה ב־TRX", "TRX Push-up", "עבודה על חזה עם ייצוב שכמות."),
    exercise("trx-pike", "פייק וקירוב ברכיים", "TRX Pike & Knee Tuck", "איסוף ליבה במצב תלייה."),
    exercise("trx-pistol", "סקוואט אקדח נתמך", "TRX Assisted Pistol Squat", "כוח חד־רגלי וטווח תנועה."),
    exercise("trx-arms", "זרועות ב־TRX", "TRX Arm Sculpt", "כפיפת בייספס ופשיטת מרפקים."),
  ]),
];
