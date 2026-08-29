import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useWorkoutStore, type WorkoutSession } from "@/lib/workout-store";
import type { WorkoutTemplate } from "@/lib/workout-data";

type Method = {
  title: string;
  english: string;
  category: string;
  summary: string;
  how: string;
  use: string;
  caution: string;
};

const FAVORITES_KEY = "muscle-gain-method-favorites-v1";

const methods: Method[] = [
  {
    title: "התקדמות הדרגתית",
    english: "Progressive Overload",
    category: "בסיס התוכנית",
    summary: "הגדלה הדרגתית של דרישת האימון לאורך זמן.",
    how: "הוסף משקל, חזרות, סטים או איכות ביצוע רק כאשר אתה שומר על טכניקה טובה וטווח התנועה המתוכנן.",
    use: "מתאים כעיקרון קבוע לכל תוכנית. רשום את הביצועים באפליקציה והשווה לאימון הקודם.",
    caution: "אין צורך להעלות את כל המשתנים יחד. כאב חד, טכניקה מתפרקת או עייפות חריגה הם סימן לעצור ולהוריד עומס.",
  },
  {
    title: "התקדמות כפולה",
    english: "Double Progression",
    category: "ניהול עומס",
    summary: "מתקדמים תחילה בחזרות ורק אחר כך במשקל.",
    how: "הגדר טווח, למשל 8–12 חזרות. הישאר באותו משקל עד שכל הסטים מגיעים לקצה העליון, ואז העלה משקל וחזור לתחתית הטווח.",
    use: "יעיל במיוחד בתרגילי מכונות, כבלים ומשקולות שבהם קפיצות המשקל קבועות.",
    caution: "אם העלאת המשקל מורידה את החזרות מתחת לטווח או פוגעת בטכניקה, חזור למשקל הקודם.",
  },
  {
    title: "Rest-Pause",
    english: "Rest-Pause",
    category: "הארכת סט",
    summary: "חלוקה של סט קשה למקטעים קצרים עם מנוחות קצרות.",
    how: "בצע סט קרוב לכשל טכני, נוח כ־15–25 שניות, והוסף כמה חזרות איכותיות. אפשר לחזור פעם נוספת לפי התוכנית.",
    use: "מתאים בעיקר לתרגילי בידוד ולמכונות יציבות, לרוב בסט האחרון בלבד.",
    caution: "לא מומלץ באופן קבוע בתרגילים מורכבים כבדים. שמור חזרות ברזרבה כאשר הטכניקה מתחילה להיפגע.",
  },
  {
    title: "דרופ־סט",
    english: "Drop Set",
    category: "הארכת סט",
    summary: "הפחתת משקל לאחר הגעה לעייפות והמשך בחזרות איכותיות.",
    how: "סיים סט, הורד בערך 15–30% מהמשקל, והמשך ללא מנוחה ארוכה. ניתן לבצע ירידה אחת או שתיים.",
    use: "מתאים לסיום תרגיל בידוד כאשר רוצים לחסוך זמן ולהוסיף מאמץ מקומי.",
    caution: "הוא מעלה עייפות. השתמש בו במינון נמוך ואל תחליף באמצעותו את כל הסטים הרגילים.",
  },
  {
    title: "Myo-Reps",
    english: "Myo-Reps",
    category: "הארכת סט",
    summary: "סט הפעלה ולאחריו מיני־סטים קצרים עם הפסקות קצרות.",
    how: "בצע סט הפעלה קרוב לכשל, נוח כ־10–20 שניות, ואז בצע כמה מיני־סטים קצרים באותו משקל עד שהביצוע יורד.",
    use: "מתאים לתרגילי בידוד יציבים ולחיסכון בזמן בסוף האימון.",
    caution: "עצור כאשר טווח התנועה או השליטה נפגעים. אין צורך לדחוף כל מיני־סט לכשל מוחלט.",
  },
  {
    title: "סופר־סט",
    english: "Superset",
    category: "חיסכון בזמן",
    summary: "ביצוע של שני תרגילים ברצף עם מנוחה קצרה ביניהם.",
    how: "חבר תרגילים שאינם מתחרים זה בזה, למשל חזה וגב, או תרגיל שריר עיקרי עם תרגיל בידוד.",
    use: "מתאים לקיצור האימון או להגדלת צפיפות העבודה בלי להאריך את זמן האימון.",
    caution: "אל תחבר שני תרגילים כבדים אם התרגיל השני נפגע משמעותית. איכות הסט חשובה יותר מהקצב.",
  },
  {
    title: "סט משולש וסט ענק",
    english: "Tri-Set / Giant Set",
    category: "חיסכון בזמן",
    summary: "שלושה תרגילים או יותר ברצף, בדרך כלל לאותו אזור או דפוס תנועה.",
    how: "בחר 3–4 תרגילים, בצע אותם ברצף, נוח לאחר הסבב וחזור למספר סבבים מתוכנן.",
    use: "מתאים בעיקר לתרגילי בידוד, אימוני משאבה או ימים שבהם הזמן מוגבל.",
    caution: "העומס המצטבר גבוה. הפחת משקל במידת הצורך ואל תשתמש בשיטה במקום עבודה איכותית בתרגילים מורכבים.",
  },
  {
    title: "דרופ מכני",
    english: "Mechanical Drop Set",
    category: "שינוי מנוף",
    summary: "המשך העבודה באמצעות שינוי לגרסה קלה יותר של אותו דפוס תנועה.",
    how: "לאחר שהגרסה הקשה מתעייפת, עבור לגרסה עם מנוף נוח יותר, למשל אחיזה או זווית שמקלה על התנועה.",
    use: "מתאים בעיקר לתרגילי משקל גוף, כתפיים, חזה וזרועות כאשר אפשר לשמור על תנועה דומה.",
    caution: "המעבר חייב להיות מתוכנן ובטוח. אל תאלתר שינוי תנוחה תחת עומס כבד.",
  },
  {
    title: "קצב מבוקר",
    english: "Tempo Training",
    category: "שליטה בתנועה",
    summary: "שליטה מודעת במשך הירידה, העצירה והעלייה.",
    how: "האט את החלק היורד, שמור על טווח תנועה מלא והימנע מתנופה. אפשר לרשום קצב כמו 3–1–1.",
    use: "מתאים ללמידת טכניקה, להגדלת שליטה ולמצבים שבהם רוצים לעבוד עם משקל מתון יותר.",
    caution: "קצב איטי אינו תחליף להתקדמות. בחר משקל שמאפשר שליטה מלאה לאורך כל הסט.",
  },
  {
    title: "חזרות עם עצירה",
    english: "Paused Reps",
    category: "שליטה בתנועה",
    summary: "עצירה קצרה בנקודה מוגדרת כדי לבטל תנופה ולשפר שליטה.",
    how: "עצור בנקודה הקשה או במתיחה למשך שנייה עד שתיים, ואז המשך בלי לאבד מנח גוף.",
    use: "מתאים לתרגילים שבהם יש נטייה להשתמש בתנופה או לאבד את טווח התנועה.",
    caution: "עצירה בעומס כבד דורשת יציבות. התחל במשקל נמוך יותר והימנע מכאב במפרק.",
  },
  {
    title: "חזרות חלקיות בסוף הסט",
    english: "Partial Reps",
    category: "שיטה מתקדמת",
    summary: "המשך במסלול תנועה חלקי לאחר שהטווח המלא אינו אפשרי.",
    how: "השתמש רק לאחר חזרות מלאות ואיכותיות, בטווח חלקי מתוכנן ובשליטה. שמור את השיטה לסט האחרון.",
    use: "עשוי להתאים לתרגילי בידוד מסוימים ולמטרות נקודתיות, לא כבסיס לכל האימון.",
    caution: "אל תשתמש בחזרות חלקיות כדי להסתיר טכניקה ירודה או טווח תנועה מוגבל. כאב הוא סיבה לעצור.",
  },
  {
    title: "Cluster Sets",
    english: "Cluster Sets",
    category: "חלוקת עומס",
    summary: "חלוקת מספר החזרות להפסקות קצרות בתוך אותו סט.",
    how: "במקום לבצע את כל החזרות ברצף, חלק אותן למקטעים קטנים עם 10–30 שניות מנוחה, לפי התוכנית.",
    use: "מתאים בעיקר לתרגילים מורכבים או לעבודה עם עומס גבוה, כאשר רוצים לשמור על איכות החזרות.",
    caution: "הגדר מראש מספר חזרות כולל ואל תיתן למנוחות להפוך את הסט לאימון ללא גבולות.",
  },
];

type MethodCombination = {
  id: string;
  title: string;
  methods: string;
  description: string;
  placement: string;
  caution: string;
};

type SplitPlan = { id: string; title: string; subtitle: string; days: Array<{ name: string; focus: string; exercises: string[] }> };

const splitPlans: SplitPlan[] = [
  { id: "ab", title: "AB", subtitle: "שני ימי אימון מתחלפים", days: [{ name: "אימון A", focus: "חזה · רגליים · יד אחורית", exercises: ["לחיצת חזה במוט", "לחיצת חזה בשיפוע", "סקוואט", "לחיצת רגליים", "פשיטת ברך", "לחיצה צרפתית", "פשיטת מרפקים בכבל"] }, { name: "אימון B", focus: "גב · כתפיים · יד קדמית", exercises: ["משיכת פולי עליון", "חתירה בישיבה", "חתירה עם משקולת", "לחיצת כתפיים", "הרחקות לצדדים", "כפיפת מרפקים במוט", "כפיפת מרפקים בפטיש"] }] },
  { id: "abc", title: "ABC", subtitle: "שלושה ימי אימון", days: [{ name: "אימון A", focus: "חזה · יד אחורית", exercises: ["לחיצת חזה במוט", "לחיצת חזה בשיפוע", "פרפר בכבלים", "לחיצה צרפתית", "פשיטת מרפקים בכבל", "פשיטת מרפקים מעל הראש"] }, { name: "אימון B", focus: "גב · יד קדמית", exercises: ["מתח או פולי עליון", "חתירה במוט", "חתירה בכבל", "פולאובר בכבל", "כפיפת מרפקים במוט", "כפיפת מרפקים בשיפוע"] }, { name: "אימון C", focus: "כתפיים · רגליים", exercises: ["לחיצת כתפיים", "הרחקות לצדדים", "סקוואט", "מכרעים", "כפיפת ברך", "הרמת עקבים"] }] },
  { id: "abcd", title: "ABCD", subtitle: "ארבעה ימים עם הפרדה מלאה", days: [{ name: "אימון A", focus: "חזה · יד אחורית", exercises: ["לחיצת חזה במוט", "לחיצה בשיפוע", "פרפר", "לחיצה צרפתית", "פשיטת מרפקים בכבל", "פשיטת מרפקים ביד אחת"] }, { name: "אימון B", focus: "גב · יד קדמית", exercises: ["מתח", "משיכת פולי עליון", "חתירה במוט", "חתירה בכבל", "כפיפת מרפקים במוט", "כפיפת מרפקים בפטיש"] }, { name: "אימון C", focus: "כתפיים", exercises: ["לחיצת כתפיים", "הרחקות לצדדים", "הרחקה אחורית", "משיכת פנים", "הרמת כתפיים"] }, { name: "אימון D", focus: "רגליים", exercises: ["סקוואט", "לחיצת רגליים", "פשיטת ברך", "כפיפת ברך", "מכרעים", "הרמת עקבים"] }] },
  { id: "full-body", title: "Full Body", subtitle: "7–8 תרגילי ליבה בכל אימון", days: [{ name: "אימון Full Body", focus: "כל קבוצות השרירים באימון אחד", exercises: ["סקוואט", "לחיצת חזה", "משיכת פולי עליון", "חתירה", "לחיצת כתפיים", "כפיפת ברך", "פשיטת מרפקים", "כפיפת מרפקים"] }] },
];

const combinations: MethodCombination[] = [
  { id: "top-backoff", title: "כוח + Back-off", methods: "Top Set + Back-off + Double Progression", description: "סט מוביל כבד ומבוקר, אחריו סטים קלים יותר לצבירת נפח.", placement: "לתרגיל הראשון או השני באימון כוח.", caution: "לא להגיע לכשל בתרגיל מורכב; השאר 1–3 חזרות ברזרבה." },
  { id: "compound-isolation", title: "מורכב + בידוד", methods: "Straight Sets + Rest-Pause", description: "עבודה רגילה בתרגיל מורכב, וסיום ממוקד בתרגיל בידוד.", placement: "מתאים לחזה, גב, כתפיים, רגליים וידיים.", caution: "Rest-Pause רק בסט האחרון של הבידוד, לא על התרגיל המורכב." },
  { id: "volume-density", title: "נפח + חיסכון בזמן", methods: "Double Progression + Superset", description: "מתקדמים בטווח החזרות ומשלבים זוג תרגילים שאינם מתחרים.", placement: "מתאים לימים עמוסים ולתרגילי עזר.", caution: "אם התרגיל השני נפגע, מאריכים מנוחה או מפרידים בין התרגילים." },
  { id: "pump-finisher", title: "בסיס + פינישר", methods: "Straight Sets + Drop Set / Myo-Reps", description: "רוב האימון נשאר יציב, ובסוף מוסיפים הארכת סט קצרה.", placement: "לשריר שרוצים להדגיש בסיום האימון.", caution: "לבחור פינישר אחד בלבד ולשמור על מינון נמוך." },
  { id: "technique-control", title: "שליטה + התקדמות", methods: "Paused Reps + Tempo + Double Progression", description: "שיפור טכניקה וטווח תנועה לפני הגדלת המשקל.", placement: "מתאים כאשר יש תנופה, חוסר יציבות או קושי לשמור על טווח מלא.", caution: "להתחיל במשקל נמוך יותר; קצב איטי אינו תחליף להתקדמות." },
];

const appendTechniqueNote = (existing: string | undefined, note: string) => existing ? `${existing} · ${note}` : note;

function applyCombinationToTemplate(template: WorkoutTemplate, combination: MethodCombination): WorkoutTemplate {
  const technique = combination.id === "compound-isolation" ? "Straight Sets · Rest-Pause" : combination.id === "pump-finisher" ? "Straight Sets · Drop Set / Myo-Reps" : combination.id === "technique-control" ? "Paused Reps · Tempo · Double Progression" : combination.methods;
  const exercises = template.exercises.map((exercise, index) => {
    const isLast = index === template.exercises.length - 1;
    const sets = exercise.sets.map((set, setIndex) => {
      const isFinalSet = setIndex === exercise.sets.length - 1;
      const shouldRestPause = combination.id === "compound-isolation" && isLast && isFinalSet;
      const shouldFinisher = combination.id === "pump-finisher" && isLast && isFinalSet;
      return { ...set, restPause: shouldRestPause ? (set.restPause ?? "Rest-Pause · 10–20 שניות") : shouldFinisher ? (set.restPause ?? "Drop Set / Myo-Reps · פינישר") : set.restPause };
    });
    return { ...exercise, sets, technique, note: appendTechniqueNote(exercise.note, `${combination.title}: ${index === 0 ? "תרגיל מוביל" : isLast ? "פינישר מבוקר" : "ביצוע לפי השיטה"}`) };
  });
  return { ...template, id: `custom-method-${Date.now()}`, name: `${template.name} · ${combination.title}`, focus: `${template.focus} · ${combination.methods}`, exercises, derivedFromTemplateId: template.id, derivedMethodCombinationId: combination.id };
}

export default function MuscleGainMethodsScreen() {
  const { sessions, templates, addCustomTemplate, startWorkoutFromTemplate } = useWorkoutStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("הכול");
  const [favoriteTitles, setFavoriteTitles] = useState<string[]>([]);
  const [selectedCombination, setSelectedCombination] = useState(combinations[0].id);
  const [selectedSplitId, setSelectedSplitId] = useState(splitPlans[0].id);
  const [expandedSplitId, setExpandedSplitId] = useState<string | null>(splitPlans[0].id);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then((value) => {
      if (!value) return;
      try {
        const saved = JSON.parse(value);
        if (Array.isArray(saved)) setFavoriteTitles(saved.filter((item): item is string => typeof item === "string"));
      } catch {
        // נתון מועדפים פגום אינו צריך למנוע את פתיחת המסך.
      }
    }).catch(() => undefined);
  }, []);

  const categories = useMemo(() => ["הכול", ...Array.from(new Set(methods.map((method) => method.category)))], []);
  const visibleMethods = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return methods.filter((method) => {
      const matchesCategory = selectedCategory === "הכול" || method.category === selectedCategory;
      const matchesQuery = !normalizedQuery || `${method.title} ${method.english} ${method.summary}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [query, selectedCategory]);

  const completedSessions = useMemo(() => {
    const pplTemplateIds = new Set(["push1", "pull1", "legs1", "push2", "pull2", "legs2"]);
    return sessions
      .filter((session) => Boolean(session.finishedAt) && pplTemplateIds.has(session.templateId))
      .sort((left, right) => Date.parse(right.finishedAt ?? right.startedAt) - Date.parse(left.finishedAt ?? left.startedAt));
  }, [sessions]);
  const selectedCombinationData = combinations.find((combination) => combination.id === selectedCombination) ?? combinations[0];
  const selectedSplit = splitPlans.find((plan) => plan.id === selectedSplitId) ?? splitPlans[0];

  const toggleSessionSelection = (sessionId: string) => setSelectedSessionIds((current) => current.includes(sessionId) ? current.filter((id) => id !== sessionId) : [...current, sessionId]);
  const toggleAllSessions = () => setSelectedSessionIds((current) => current.length === completedSessions.length ? [] : completedSessions.map((session) => session.id));

  const applyToCompletedWorkouts = () => {
    const selectedSessions = completedSessions.filter((session) => selectedSessionIds.includes(session.id));
    const nextTemplates = selectedSessions.flatMap((session) => {
      const sourceTemplate = templates.find((template) => template.id === session.templateId);
      if (!sourceTemplate) return [];
      const customized = applyCombinationToTemplate(sourceTemplate, selectedCombinationData);
      return [{ ...customized, id: `custom-method-${Date.now()}-${session.id}`, name: `${sourceTemplate.name} · ${selectedCombinationData.title}`, derivedFromTemplateId: sourceTemplate.id, derivedMethodCombinationId: selectedCombinationData.id }];
    });
    if (nextTemplates.length === 0) return;
    const names = nextTemplates.map((template) => template.name).join("\n");
    Alert.alert("אישור יצירת תבניות", `האימונים המקוריים לא ישתנו. תיווצרנה ${nextTemplates.length} תבניות חדשות:\n${names}`, [
      { text: "ביטול", style: "cancel" },
      { text: "אישור ויצירה", onPress: () => { nextTemplates.forEach((template) => addCustomTemplate(template)); setSelectedSessionIds([]); router.push("/workouts" as never); } },
    ]);
  };

  const toggleFavorite = (title: string) => {
    setFavoriteTitles((current) => {
      const next = current.includes(title) ? current.filter((item) => item !== title) : [...current, title];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  };

  return (
    <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="חזרה למסך האימונים" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹ חזרה לאימונים</Text>
          </Pressable>
          <Text style={styles.eyebrow}>מדריך היפרטרופיה</Text>
          <Text style={styles.title}>שיטות לעלייה במסת שריר</Text>
          <Text style={styles.subtitle}>כלים לתכנון עומס, להארכת סטים ולחיסכון בזמן — בלי להפוך כל אימון למבחן.</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statValue}>{methods.length}</Text><Text style={styles.statLabel}>שיטות</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{categories.length - 1}</Text><Text style={styles.statLabel}>קטגוריות</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{favoriteTitles.length}</Text><Text style={styles.statLabel}>מועדפים</Text></View>
        </View>

        <TextInput value={query} onChangeText={setQuery} placeholder="חפש שיטה או טכניקה" placeholderTextColor="#8291A8" style={styles.searchInput} textAlign="right" accessibilityLabel="חיפוש שיטת אימון" />
        <View style={styles.combinationPanel}>
          <Text style={styles.panelTitle}>שילובי שיטות מומלצים</Text>
          <Text style={styles.panelText}>שילובים מעשיים לפי מטרה. בחר רובריקה כדי לראות את התיאור, המיקום והזהירות.</Text>
          <View style={styles.combinationList}>
            {combinations.map((combination) => {
              const selected = selectedCombination === combination.id;
              return (
                <Pressable key={combination.id} onPress={() => setSelectedCombination(combination.id)} accessibilityRole="button" accessibilityState={{ selected, expanded: selected }} style={({ pressed }) => [styles.combinationChip, selected && styles.combinationChipActive, pressed && styles.pressed]}>
                  <View style={styles.combinationChipHeader}>
                    <Text style={[styles.combinationChipTitle, selected && styles.combinationChipTitleActive]}>{combination.title}</Text>
                    <Text style={[styles.combinationChipArrow, selected && styles.combinationChipArrowActive]}>{selected ? "−" : "+"}</Text>
                  </View>
                  <Text style={[styles.combinationChipMeta, selected && styles.combinationChipMetaActive]}>{combination.methods}</Text>
                  {selected ? <View style={styles.combinationDetails}>
                    <Text style={styles.detailText}>{combination.description}</Text>
                    <Text style={styles.detailText}>מיקום: {combination.placement}</Text>
                    <Text style={styles.detailText}>זהירות: {combination.caution}</Text>
                  </View> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {visibleMethods.map((method, index) => {
          const isOpen = expanded === method.title;
          return (
            <View key={method.title} style={[styles.card, isOpen && styles.cardOpen]}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} accessibilityLabel={`${isOpen ? "סגור" : "פתח"} מידע על ${method.title}`} onPress={() => setExpanded(isOpen ? null : method.title)} style={({ pressed }) => [styles.cardButton, pressed && styles.pressed]}>
                <View style={styles.cardTop}><Text style={styles.number}>{String(methods.indexOf(method) + 1).padStart(2, "0")}</Text><View style={styles.cardTopActions}><Text style={styles.category}>{method.category}</Text><Pressable onPress={() => toggleFavorite(method.title)} accessibilityRole="button" accessibilityLabel={`${favoriteTitles.includes(method.title) ? "הסר" : "הוסף"} את ${method.title} מהמועדפים`} style={styles.favoriteButton}><Text style={[styles.favorite, favoriteTitles.includes(method.title) && styles.favoriteActive]}>{favoriteTitles.includes(method.title) ? "★" : "☆"}</Text></Pressable></View></View>
                <View style={styles.cardTextBlock}>
                  <Text style={styles.methodTitle}>{method.title}</Text>
                  <Text style={styles.english}>{method.english}</Text>
                  <Text style={styles.summary}>{method.summary}</Text>
                  <Text style={styles.openHint}>{isOpen ? "סגור פרטים" : "פתח הסבר וביצוע  ›"}</Text>
                </View>
              </Pressable>
              {isOpen ? <View style={styles.details}>
                <Detail title="איך מבצעים" text={method.how} />
                <Detail title="מתי להשתמש" text={method.use} />
                <View style={styles.caution}><Text style={styles.detailTitle}>זהירות ועומס</Text><Text style={styles.detailText}>{method.caution}</Text></View>
                <Pressable onPress={() => router.push("/workouts" as never)} accessibilityRole="button" style={({ pressed }) => [styles.workoutLink, pressed && styles.pressed]}><Text style={styles.workoutLinkText}>פתח את מסך האימונים</Text></Pressable>
              </View> : null}
            </View>
          );
        })}

        <View style={styles.footer}><Text style={styles.footerTitle}>כלל עבודה פשוט</Text><Text style={styles.footerText}>בחר שיטה אחת בלבד בכל פעם, תעד אותה, בדוק את ההתאוששות והתקדם רק כאשר הביצוע נשאר איכותי.</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Detail({ title, text }: { title: string; text: string }) {
  return <View style={styles.detail}><Text style={styles.detailTitle}>{title}</Text><Text style={styles.detailText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 36, width: "100%" },
  header: { alignItems: "flex-end", gap: 6 },
  back: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 4 },
  backText: { color: "#C86DDE", fontSize: 13, fontWeight: "900" },
  eyebrow: { color: "#C86DDE", fontSize: 12, fontWeight: "900" },
  title: { color: "#F7F9FC", fontSize: 27, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", fontSize: 13, lineHeight: 20, textAlign: "right" },
  notice: { backgroundColor: "#271D36", borderColor: "#A768CF", borderWidth: 1, borderRadius: 16, padding: 14, gap: 5 },
  noticeTitle: { color: "#F0B9FF", fontSize: 14, fontWeight: "900", textAlign: "right" },
  noticeText: { color: "#E1D2EC", fontSize: 12, lineHeight: 19, textAlign: "right" },
  statsRow: { flexDirection: "row-reverse", gap: 8 },
  combinationPanel: { backgroundColor: "#16233A", borderColor: "#8053A6", borderWidth: 1, borderRadius: 14, padding: 14, gap: 8, width: "100%", overflow: "hidden" },
  applyPanel: { backgroundColor: "#132A2C", borderColor: "#42D392", borderWidth: 1, borderRadius: 14, padding: 14, gap: 8, width: "100%", overflow: "hidden" },
  panelTitle: { width: "100%", color: "#F7F9FC", fontSize: 15, fontWeight: "900", textAlign: "right", writingDirection: "rtl", maxWidth: "100%", flexShrink: 1 },
  panelText: { width: "100%", color: "#B8C7D8", fontSize: 11, lineHeight: 17, textAlign: "right", writingDirection: "rtl", minWidth: 0, flexShrink: 1 },
  combinationList: { width: "100%", gap: 9, paddingVertical: 2 },
  combinationChip: { width: "100%", alignSelf: "stretch", minHeight: 74, borderColor: "#52759C", borderWidth: 1, borderRadius: 13, padding: 13, gap: 6, backgroundColor: "#101C31" },
  combinationChipActive: { backgroundColor: "#C86DDE", borderColor: "#C86DDE" },
  combinationChipTitle: { flex: 1, minWidth: 0, color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl", flexShrink: 1 },
  combinationChipTitleActive: { color: "#211C2D" },
  combinationChipMeta: { width: "100%", color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "ltr", minWidth: 0, flexShrink: 1 },
  combinationChipMetaActive: { color: "#3B2850" },
  combinationChipHeader: { width: "100%", minHeight: 24, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  combinationChipArrow: { color: "#C86DDE", fontSize: 20, fontWeight: "900" },
  combinationChipArrowActive: { color: "#211C2D" },
  combinationDetails: { width: "100%", borderTopColor: "#C26BE8", borderTopWidth: 1, paddingTop: 7, gap: 4 },
  sessionList: { width: "100%", gap: 8, paddingVertical: 2 },
  sessionChip: { width: "100%", borderColor: "#466E6E", borderWidth: 1, borderRadius: 11, padding: 11, gap: 4 },
  sessionChipActive: { backgroundColor: "#42D392", borderColor: "#42D392" },
  sessionChipTitle: { color: "#F7F9FC", fontSize: 10, fontWeight: "900", textAlign: "right" },
  sessionChipTitleActive: { color: "#0B2924" },
  sessionChipMeta: { color: "#AAB7C8", fontSize: 9, textAlign: "right" },
  sessionChipMetaActive: { color: "#0B2924" },
  sessionChipCheck: { color: "#82B6AC", fontSize: 9, fontWeight: "800", textAlign: "right" },
  sessionChipCheckActive: { color: "#0B2924" },
  selectionToolbar: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  selectAllButton: { borderColor: "#42D392", borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  selectAllText: { color: "#8DE4C5", fontSize: 10, fontWeight: "900" },
  applyButton: { minHeight: 42, backgroundColor: "#42D392", borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  applyButtonText: { color: "#0B2924", fontSize: 11, fontWeight: "900", textAlign: "center" },
  selectionHint: { color: "#82B6AC", fontSize: 10, textAlign: "right" },
  emptyText: { color: "#82B6AC", fontSize: 11, textAlign: "right" },
  searchInput: { minHeight: 44, backgroundColor: "#0F1A2E", borderColor: "#3F76A7", borderWidth: 1, borderRadius: 11, color: "#F7F9FC", paddingHorizontal: 12, fontSize: 12 },
  filters: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  filtersVertical: { width: "100%", gap: 7 },
  filterVertical: { width: "100%", minHeight: 38, borderColor: "#52759C", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, alignItems: "flex-end", justifyContent: "center" },
  splitList: { width: "100%", gap: 8 },
  splitOption: { width: "100%", borderColor: "#466E6E", borderWidth: 1, borderRadius: 11, padding: 10, gap: 4 },
  splitOptionActive: { backgroundColor: "#42D392", borderColor: "#42D392" },
  splitOptionHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 8 },
  splitOptionTitle: { color: "#F7F9FC", fontSize: 14, fontWeight: "900", textAlign: "right" },
  splitOptionTitleActive: { color: "#0B2924" },
  splitOptionSubtitle: { color: "#AAB7C8", fontSize: 10, textAlign: "right" },
  splitOptionSubtitleActive: { color: "#0B2924" },
  splitDayBlock: { width: "100%", gap: 3 },
  splitDay: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right" },
  splitDayActive: { color: "#0B2924" },
  splitExerciseList: { width: "100%", backgroundColor: "rgba(8, 30, 28, 0.18)", borderRadius: 7, padding: 6, gap: 2 },
  splitExercise: { color: "#C7D4E5", fontSize: 9, lineHeight: 14, textAlign: "right", writingDirection: "rtl" },
  splitExerciseActive: { color: "#0B2924" },
  splitOpenHint: { color: "#82B6AC", fontSize: 10, fontWeight: "900", textAlign: "right", marginTop: 3 },
  splitOpenHintActive: { color: "#0B2924" },
  filter: { borderColor: "#52759C", borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  filterActive: { backgroundColor: "#C86DDE", borderColor: "#C86DDE" },
  filterText: { color: "#C5D0DF", fontSize: 10, fontWeight: "800" },
  filterTextActive: { color: "#211C2D" },
  stat: { flex: 1, backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 13, paddingVertical: 10, alignItems: "center", gap: 2 },
  statValue: { color: "#C86DDE", fontSize: 20, fontWeight: "900" },
  statLabel: { color: "#AAB7C8", fontSize: 10, fontWeight: "800" },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 16, overflow: "hidden", width: "100%", maxWidth: "100%" },
  cardOpen: { borderColor: "#A768CF" },
  cardButton: { padding: 14, gap: 5, minWidth: 0, width: "100%", alignItems: "stretch" },
  cardTop: { width: "100%", flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  cardTextBlock: { width: "100%", alignSelf: "stretch", alignItems: "flex-end", gap: 2 },
  cardTopActions: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  favoriteButton: { minWidth: 28, minHeight: 28, alignItems: "center", justifyContent: "center" },
  favorite: { color: "#8291A8", fontSize: 23, lineHeight: 25 },
  favoriteActive: { color: "#F5B72C" },
  number: { color: "#C86DDE", fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  category: { color: "#AAB7C8", fontSize: 10, fontWeight: "800", textAlign: "right" },
  methodTitle: { width: "100%", alignSelf: "stretch", color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right", writingDirection: "rtl", marginTop: 2, minWidth: 0, maxWidth: "100%", flexShrink: 1, lineHeight: 23 },
  english: { width: "100%", alignSelf: "stretch", color: "#C99DDF", fontSize: 10, textAlign: "left", writingDirection: "ltr", minWidth: 0, maxWidth: "100%", flexShrink: 1, lineHeight: 14 },
  summary: { width: "100%", alignSelf: "stretch", color: "#C5D0DF", fontSize: 12, lineHeight: 18, textAlign: "right", writingDirection: "rtl", marginTop: 3, minWidth: 0, maxWidth: "100%", flexShrink: 1 },
  openHint: { width: "100%", alignSelf: "stretch", color: "#C86DDE", fontSize: 11, fontWeight: "900", textAlign: "right", writingDirection: "rtl", marginTop: 4, lineHeight: 16 },
  details: { width: "100%", borderTopColor: "#49385B", borderTopWidth: 1, backgroundColor: "#101B2F", padding: 13, gap: 11, minWidth: 0 },
  detail: { gap: 3 },
  detailTitle: { color: "#F0B9FF", fontSize: 11, fontWeight: "900", textAlign: "right" },
  detailText: { width: "100%", color: "#D9E2EF", fontSize: 11, lineHeight: 18, textAlign: "right", writingDirection: "rtl", minWidth: 0, flexShrink: 1 },
  workoutLink: { minHeight: 42, backgroundColor: "#C86DDE", borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 2 },
  workoutLinkText: { color: "#211C2D", fontSize: 11, fontWeight: "900" },
  caution: { backgroundColor: "#30242A", borderColor: "#855264", borderWidth: 1, borderRadius: 10, padding: 10, gap: 3 },
  footer: { backgroundColor: "#173755", borderColor: "#4C91BE", borderWidth: 1, borderRadius: 15, padding: 14, gap: 5 },
  footerTitle: { color: "#65D5FF", fontWeight: "900", fontSize: 13, textAlign: "right" },
  footerText: { color: "#D9E2EF", fontSize: 12, lineHeight: 19, textAlign: "right" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
