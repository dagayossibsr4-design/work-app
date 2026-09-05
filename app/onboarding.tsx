import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { BrandMark } from "@/components/ui/brand-mark";
import { ProgramBuilder } from "@/components/program-builder";
import { MAX_SELECTED_PROGRAMS, useWorkoutStore } from "@/lib/workout-store";
import { calculateMacroSplit, type MacroGoal } from "@/lib/macro-calculator";
import { muscleBuildingFolderIds, muscleBuildingFolderTemplateIds, type MuscleBuildingFolderId } from "@/lib/muscle-building-content";
import { getTemplate, type WorkoutId, type WorkoutTemplate } from "@/lib/workout-data";
import { assignWorkoutTemplateToDate } from "@/lib/workout-schedule";
import { localDateKey } from "@/lib/calendar-grid";
import { enqueueAsyncStorageSet } from "@/lib/storage-write-queue";
import { foodItems, macrosForFoodQuantity, type FoodItem } from "@/lib/food-nutrition";
import type { Meal } from "@/lib/meal-plan";

// calculateMacroSplit only knows these three goal labels - kept in sync here.
const GOAL_OPTIONS: MacroGoal[] = ["חיטוב", "מסה", "ניטרלי"];

const MEAL_COUNT_OPTIONS = [3, 4, 5, 6];

// The same five built-in programs offered on the home screen's workout
// catalog (workoutMenuFolders in app/(tabs)/index.tsx) - kept as a small
// local copy since that list isn't exported.
const CATALOG_PROGRAM_OPTIONS: { id: MuscleBuildingFolderId; title: string; description: string; accent: string }[] = [
  { id: "ppl", title: "PPL", description: "PPL 1, PPL 2 ו־Arms/Pump: Push, Pull ו־Legs", accent: "#F5B72C" },
  { id: "ab", title: "AB", description: "אימון A לפלג גוף עליון ואימון B לפלג גוף תחתון", accent: "#42D392" },
  { id: "abc", title: "ABC", description: "שלושה ימי אימון לפי קבוצות השרירים", accent: "#65BDF6" },
  { id: "abcd", title: "ABCD", description: "ארבעה ימי אימון ממוקדים", accent: "#C084FC" },
  { id: "full-body", title: "Full Body", description: "אימון גוף מלא עם כל קבוצות השרירים", accent: "#22C55E" },
];

export default function OnboardingScreen() {
  const { templates, nutritionProfile, updateNutritionProfile, selectedProgramIds, toggleSelectedProgram, personalPrograms } = useWorkoutStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // שלב 1 - נתונים אישיים ותזונה
  const [weightKg, setWeightKg] = useState(nutritionProfile.weightKg ?? "");
  const [heightCm, setHeightCm] = useState(nutritionProfile.heightCm ?? "");
  const [goal, setGoal] = useState<MacroGoal>((nutritionProfile.goal as MacroGoal) ?? "ניטרלי");
  const [calorieTarget, setCalorieTarget] = useState(nutritionProfile.calorieTarget ?? "2500");
  const [mealCount, setMealCount] = useState(5);
  const [error, setError] = useState("");

  // שלב 2 - בניית תוכנית האימון
  const [isCustomProgramBuilderOpen, setIsCustomProgramBuilderOpen] = useState(false);
  const [programStepMessage, setProgramStepMessage] = useState("");

  // שלב 3 - הזנת הארוחות
  const [meals, setMeals] = useState<Meal[]>([]);
  const [busy, setBusy] = useState(false);

  const macroResult = useMemo(
    () => calculateMacroSplit({ calories: Number(calorieTarget) || 0, goal }),
    [calorieTarget, goal],
  );

  const advanceFromStep1 = () => {
    const parsedWeight = Number(weightKg);
    const parsedHeight = Number(heightCm);
    if (!parsedWeight || parsedWeight <= 0) { setError("נא להזין משקל תקין."); return; }
    if (!parsedHeight || parsedHeight <= 0) { setError("נא להזין גובה תקין."); return; }
    if (!macroResult) { setError("נא להזין יעד קלורי תקין."); return; }
    setError("");

    // נשמר מיד דרך אותו מנגנון AccountSync כמו כל עריכת פרופיל אחרת.
    updateNutritionProfile({
      ...nutritionProfile,
      weightKg,
      heightCm,
      goal,
      calorieTarget: String(macroResult.calories),
      proteinTarget: String(macroResult.proteinGrams),
      carbohydratesTarget: String(macroResult.carbohydratesGrams),
      fatsTarget: String(macroResult.fatsGrams),
      autoMacroField: undefined,
    });

    // תאי ארוחה ריקים בגודל שנבחר - עם מזהים ייחודיים לאונבורדינג כדי
    // שמנגנון שחזור ברירות המחדל (הפועל לפי meal-1..meal-5) לא ימזג בחזרה
    // את חמש הארוחות הגנריות הישנות.
    const perMealProtein = Math.round((macroResult.proteinGrams / mealCount) * 10) / 10;
    const perMealCarbs = Math.round((macroResult.carbohydratesGrams / mealCount) * 10) / 10;
    const perMealFats = Math.round((macroResult.fatsGrams / mealCount) * 10) / 10;
    setMeals(
      Array.from({ length: mealCount }, (_, index) => ({
        id: `onboarding-meal-${index + 1}`,
        title: `ארוחה ${index + 1}`,
        foods: [],
        targetMacros: { protein: perMealProtein, carbohydrates: perMealCarbs, fats: perMealFats },
      })),
    );
    setStep(2);
  };

  const toggleCatalogProgram = (id: MuscleBuildingFolderId) => {
    const result = toggleSelectedProgram(id);
    setProgramStepMessage(result.limitReached ? `אפשר לבחור עד ${MAX_SELECTED_PROGRAMS} תוכניות בסך הכול.` : "");
  };

  const scheduleSelectedPrograms = async () => {
    const templateIdsToSchedule: WorkoutId[] = selectedProgramIds.flatMap((id) => {
      if ((muscleBuildingFolderIds as readonly string[]).includes(id)) return muscleBuildingFolderTemplateIds[id as MuscleBuildingFolderId];
      const personalProgram = personalPrograms.find((program) => program.id === id);
      return personalProgram?.workoutTemplateIds ?? [];
    });
    for (let i = 0; i < templateIdsToSchedule.length; i += 1) {
      const templateId = templateIdsToSchedule[i];
      const template: WorkoutTemplate | undefined = templates.find((item) => item.id === templateId) ?? getTemplate(templateId);
      if (!template) continue;
      const dateKey = localDateKey(new Date(Date.now() + i * 24 * 60 * 60 * 1000));
      await assignWorkoutTemplateToDate(dateKey, template, "workout");
    }
  };

  const advanceFromStep2 = async () => {
    setBusy(true);
    await scheduleSelectedPrograms();
    setBusy(false);
    setStep(3);
  };

  const addFoodToOnboardingMeal = (mealId: string, item: FoodItem) => {
    const grams = Number.isFinite(item.servingGrams) && item.servingGrams > 0 ? item.servingGrams : 100;
    const macros = macrosForFoodQuantity(item, grams);
    setMeals((current) =>
      current.map((meal) =>
        meal.id !== mealId
          ? meal
          : {
              ...meal,
              foods: [
                ...meal.foods,
                {
                  id: `${item.id}-${mealId}-${Date.now()}`,
                  name: item.name,
                  quantity: `${grams} גרם`,
                  reference: `${item.reference} · מנה/יחידה ${grams} ג׳`,
                  foodGroup: item.group,
                  weightMode: "cooked" as const,
                  ...macros,
                  servingGrams: grams,
                  quantityGrams: grams,
                },
              ],
            },
      ),
    );
  };
  const removeFoodFromOnboardingMeal = (mealId: string, foodId: string) => {
    setMeals((current) => current.map((meal) => meal.id !== mealId ? meal : { ...meal, foods: meal.foods.filter((food) => food.id !== foodId) }));
  };

  const finishOnboarding = async () => {
    setBusy(true);
    await enqueueAsyncStorageSet("meal-plan-state", JSON.stringify({ meals, eaten: {}, layoutVersion: 2 }));
    setBusy(false);
    router.replace("/(tabs)" as never);
  };

  return (
    <ScreenContainer className="px-5 pt-5">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <BrandMark variant="original" />
        <Text style={styles.eyebrow}>הגדרה ראשונית · שלב {step} מתוך 3</Text>

        {step === 1 ? (
          <>
            <Text style={styles.title}>בניית הפרופיל שלך</Text>
            <Text style={styles.subtitle}>כמה פרטים קצרים, ואנחנו נבנה לך אוטומטית יעדי תזונה, תפריט ולוח אימונים מתחיל.</Text>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>נתונים אישיים</Text>
              <View style={styles.row}>
                <Field label="משקל (ק״ג)" value={weightKg} onChange={setWeightKg} />
                <Field label="גובה (ס״מ)" value={heightCm} onChange={setHeightCm} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>יעד ותזונה</Text>
              <View style={styles.choiceRow}>
                {GOAL_OPTIONS.map((option) => (
                  <Pressable key={option} onPress={() => setGoal(option)} style={[styles.choice, goal === option && styles.choiceActive]}>
                    <Text style={[styles.choiceText, goal === option && styles.choiceTextActive]}>{option}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label="יעד קלורי יומי" value={calorieTarget} onChange={setCalorieTarget} />
              {macroResult ? (
                <View style={styles.macroGrid}>
                  <Metric label="חלבון" value={`${macroResult.proteinGrams} ג׳`} />
                  <Metric label="פחמימות" value={`${macroResult.carbohydratesGrams} ג׳`} />
                  <Metric label="שומן" value={`${macroResult.fatsGrams} ג׳`} />
                </View>
              ) : null}
              <Text style={styles.sectionTitle}>מספר ארוחות ביום</Text>
              <View style={styles.choiceRow}>
                {MEAL_COUNT_OPTIONS.map((count) => (
                  <Pressable key={count} onPress={() => setMealCount(count)} style={[styles.choice, mealCount === count && styles.choiceActive]}>
                    <Text style={[styles.choiceText, mealCount === count && styles.choiceTextActive]}>{count}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable accessibilityRole="button" accessibilityLabel="המשך לבניית תוכנית האימון" onPress={advanceFromStep1} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>המשך לבניית תוכנית האימון</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="דילוג" onPress={() => router.replace("/(tabs)" as never)} style={styles.skip}>
              <Text style={styles.skipText}>דלג לעכשיו</Text>
            </Pressable>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={styles.title}>בניית תוכנית האימון</Text>
            <Text style={styles.subtitle}>בחר עד 5 תוכניות מהקטלוג המובנה, או בנה תוכנית אישית משלך.</Text>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>תוכניות מהקטלוג · {selectedProgramIds.length}/{MAX_SELECTED_PROGRAMS}</Text>
              {CATALOG_PROGRAM_OPTIONS.map((option) => {
                const selected = selectedProgramIds.includes(option.id);
                return (
                  <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => toggleCatalogProgram(option.id)} style={[styles.programRow, selected && { borderColor: option.accent, backgroundColor: `${option.accent}18` }]}>
                    <View style={[styles.programCheck, selected && { backgroundColor: option.accent, borderColor: option.accent }]}><Text style={styles.programCheckText}>{selected ? "✓" : ""}</Text></View>
                    <View style={styles.programCopy}>
                      <Text style={styles.programTitle}>{option.title}</Text>
                      <Text style={styles.programDescription}>{option.description}</Text>
                    </View>
                  </Pressable>
                );
              })}
              {programStepMessage ? <Text style={styles.error}>{programStepMessage}</Text> : null}
            </View>

            <Pressable accessibilityRole="button" accessibilityLabel="בנה תוכנית אישית" onPress={() => setIsCustomProgramBuilderOpen(true)} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Text style={styles.secondaryText}>או בנה תוכנית אישית משלך</Text>
            </Pressable>

            <Pressable accessibilityRole="button" accessibilityLabel="המשך להזנת הארוחות" disabled={busy} onPress={() => void advanceFromStep2()} style={({ pressed }) => [styles.primary, pressed && styles.pressed, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color="#0B1224" /> : <Text style={styles.primaryText}>המשך להזנת הארוחות</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="דילוג" onPress={() => setStep(3)} style={styles.skip}>
              <Text style={styles.skipText}>דלג לעכשיו</Text>
            </Pressable>

            <Modal visible={isCustomProgramBuilderOpen} animationType="slide" transparent onRequestClose={() => setIsCustomProgramBuilderOpen(false)}>
              <ProgramBuilder onCancel={() => setIsCustomProgramBuilderOpen(false)} onDone={() => setIsCustomProgramBuilderOpen(false)} />
            </Modal>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text style={styles.title}>הזנת הארוחות שלך</Text>
            <Text style={styles.subtitle}>חפש והוסף מאכלים לכל ארוחה, בכמות ברירת המחדל של הקטלוג.</Text>

            {meals.map((meal) => (
              <MealFoodPicker key={meal.id} meal={meal} onAdd={(item) => addFoodToOnboardingMeal(meal.id, item)} onRemove={(foodId) => removeFoodFromOnboardingMeal(meal.id, foodId)} />
            ))}

            <Pressable accessibilityRole="button" accessibilityLabel="סיום בניית הפרופיל" disabled={busy} onPress={() => void finishOnboarding()} style={({ pressed }) => [styles.primary, pressed && styles.pressed, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color="#0B1224" /> : <Text style={styles.primaryText}>סיום והתחלה</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="דילוג" onPress={() => void finishOnboarding()} style={styles.skip}>
              <Text style={styles.skipText}>דלג לעכשיו</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ""))} keyboardType="numeric" style={styles.input} textAlign="right" />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function MealFoodPicker({ meal, onAdd, onRemove }: { meal: Meal; onAdd: (item: FoodItem) => void; onRemove: (foodId: string) => void }) {
  const [search, setSearch] = useState("");
  const results = search.trim()
    ? foodItems.filter((item) => `${item.name} ${(item.aliases ?? []).join(" ")}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8)
    : [];

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{meal.title}</Text>
      {meal.foods.length ? meal.foods.map((food) => (
        <View key={food.id} style={styles.mealFoodRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={`הסר את ${food.name}`} onPress={() => onRemove(food.id)} style={styles.mealFoodRemove}><Text style={styles.mealFoodRemoveText}>×</Text></Pressable>
          <View style={styles.mealFoodCopy}>
            <Text style={styles.mealFoodName}>{food.name}</Text>
            <Text style={styles.mealFoodMeta}>{food.quantity} · {food.calories} קלוריות</Text>
          </View>
        </View>
      )) : <Text style={styles.mealFoodEmpty}>עדיין לא נוספו מאכלים לארוחה זו.</Text>}
      <TextInput value={search} onChangeText={setSearch} placeholder="חפש מאכל להוספה" placeholderTextColor="#718096" style={styles.input} textAlign="right" />
      {results.map((item) => (
        <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`הוסף ${item.name}`} onPress={() => { onAdd(item); setSearch(""); }} style={styles.mealSearchResultRow}>
          <Text style={styles.mealSearchResultAdd}>+</Text>
          <View style={styles.mealFoodCopy}>
            <Text style={styles.mealFoodName}>{item.name}</Text>
            <Text style={styles.mealFoodMeta}>{item.reference}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 40 },
  eyebrow: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" },
  title: { color: "#F7F9FC", fontSize: 26, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", fontSize: 13, lineHeight: 20, textAlign: "right" },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  sectionTitle: { color: "#F5B72C", fontSize: 14, fontWeight: "900", textAlign: "right" },
  row: { flexDirection: "row-reverse", gap: 8 },
  field: { flex: 1, gap: 5 },
  label: { color: "#AAB7C8", fontSize: 11, textAlign: "right" },
  input: { minHeight: 46, borderRadius: 10, borderWidth: 1, borderColor: "#52759C", backgroundColor: "#0F1B31", color: "#F7F9FC", fontSize: 14, paddingHorizontal: 12 },
  choiceRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  choice: { minHeight: 40, borderColor: "#52759C", borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  choiceActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
  choiceText: { color: "#D9E2EF", fontSize: 12, fontWeight: "800" },
  choiceTextActive: { color: "#0B1224" },
  macroGrid: { flexDirection: "row-reverse", gap: 8 },
  metric: { flex: 1, backgroundColor: "#0F1B31", borderRadius: 12, padding: 10, alignItems: "center" },
  metricValue: { color: "#F5B72C", fontSize: 15, fontWeight: "900" },
  metricLabel: { color: "#AAB7C8", fontSize: 10, marginTop: 3 },
  error: { color: "#FF879A", fontSize: 12, textAlign: "right" },
  primary: { minHeight: 50, backgroundColor: "#F5B72C", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#0B1224", fontSize: 15, fontWeight: "900" },
  secondary: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: "#52759C", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#D9E2EF", fontSize: 13, fontWeight: "800" },
  skip: { alignItems: "center", paddingVertical: 6 },
  skipText: { color: "#7E8DA4", fontSize: 12, fontWeight: "700", textDecorationLine: "underline" },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
  programRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#2C3B55", borderRadius: 12, padding: 11 },
  programCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: "#64748B", alignItems: "center", justifyContent: "center" },
  programCheckText: { color: "#0B1224", fontSize: 15, fontWeight: "900" },
  programCopy: { flex: 1, alignItems: "flex-end", gap: 2 },
  programTitle: { color: "#F7F9FC", fontSize: 14, fontWeight: "900", textAlign: "right" },
  programDescription: { color: "#AAB7C8", fontSize: 10, textAlign: "right" },
  mealFoodRow: { flexDirection: "row-reverse", alignItems: "center", gap: 9 },
  mealFoodRemove: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#3A1F27", alignItems: "center", justifyContent: "center" },
  mealFoodRemoveText: { color: "#FF879A", fontSize: 15, fontWeight: "900" },
  mealFoodCopy: { flex: 1, alignItems: "flex-end", gap: 1 },
  mealFoodName: { color: "#F7F9FC", fontSize: 12, fontWeight: "800", textAlign: "right" },
  mealFoodMeta: { color: "#8FA4BB", fontSize: 10, textAlign: "right" },
  mealFoodEmpty: { color: "#7E8DA4", fontSize: 11, textAlign: "right" },
  mealSearchResultRow: { flexDirection: "row-reverse", alignItems: "center", gap: 9, backgroundColor: "#0F1B31", borderRadius: 10, padding: 9 },
  mealSearchResultAdd: { color: "#42D392", fontSize: 17, fontWeight: "900" },
});
