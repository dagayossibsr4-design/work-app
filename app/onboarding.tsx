import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { BrandMark } from "@/components/ui/brand-mark";
import { useWorkoutStore } from "@/lib/workout-store";
import { calculateMacroSplit, type MacroGoal } from "@/lib/macro-calculator";
import { muscleBuildingFolderTemplateIds, type MuscleBuildingFolderId } from "@/lib/muscle-building-content";
import { getTemplate, type WorkoutTemplate } from "@/lib/workout-data";
import { assignWorkoutTemplateToDate } from "@/lib/workout-schedule";
import { localDateKey } from "@/lib/calendar-grid";
import { enqueueAsyncStorageSet } from "@/lib/storage-write-queue";
import type { Meal } from "@/lib/meal-plan";

// calculateMacroSplit only knows these three goal labels - kept in sync here.
const GOAL_OPTIONS: MacroGoal[] = ["חיטוב", "מסה", "ניטרלי"];

const MEAL_COUNT_OPTIONS = [3, 4, 5, 6];

const WORKOUT_FREQUENCY_OPTIONS: { perWeek: number; programId: MuscleBuildingFolderId; label: string }[] = [
  { perWeek: 2, programId: "ab", label: "2 בשבוע" },
  { perWeek: 3, programId: "abc", label: "3 בשבוע" },
  { perWeek: 4, programId: "abcd", label: "4 בשבוע" },
  { perWeek: 5, programId: "ppl", label: "5+ בשבוע" },
  { perWeek: 1, programId: "full-body", label: "לא בטוח / גוף מלא" },
];

export default function OnboardingScreen() {
  const { templates, nutritionProfile, updateNutritionProfile, selectedProgramIds, toggleSelectedProgram } = useWorkoutStore();

  const [weightKg, setWeightKg] = useState(nutritionProfile.weightKg ?? "");
  const [heightCm, setHeightCm] = useState(nutritionProfile.heightCm ?? "");
  const [goal, setGoal] = useState<MacroGoal>((nutritionProfile.goal as MacroGoal) ?? "ניטרלי");
  const [calorieTarget, setCalorieTarget] = useState(nutritionProfile.calorieTarget ?? "2500");
  const [mealCount, setMealCount] = useState(5);
  const [workoutFrequency, setWorkoutFrequency] = useState(WORKOUT_FREQUENCY_OPTIONS[1]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const macroResult = useMemo(
    () => calculateMacroSplit({ calories: Number(calorieTarget) || 0, goal }),
    [calorieTarget, goal],
  );

  const handleSubmit = async () => {
    const parsedWeight = Number(weightKg);
    const parsedHeight = Number(heightCm);
    const parsedCalories = Number(calorieTarget);
    if (!parsedWeight || parsedWeight <= 0) { setError("נא להזין משקל תקין."); return; }
    if (!parsedHeight || parsedHeight <= 0) { setError("נא להזין גובה תקין."); return; }
    if (!macroResult) { setError("נא להזין יעד קלורי תקין."); return; }

    setBusy(true);
    setError("");

    // 1. Nutrition targets - syncs to Supabase automatically via the
    // existing AccountSync mechanism, same as any other profile edit.
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

    // 2. Build empty meal slots sized to the chosen meal count, each with its
    // own share of the daily targets - ids are onboarding-specific so the
    // existing "restore missing default meal slots" logic (keyed on
    // meal-1..meal-5) never merges the old generic defaults back in.
    const perMealProtein = Math.round((macroResult.proteinGrams / mealCount) * 10) / 10;
    const perMealCarbs = Math.round((macroResult.carbohydratesGrams / mealCount) * 10) / 10;
    const perMealFats = Math.round((macroResult.fatsGrams / mealCount) * 10) / 10;
    const meals: Meal[] = Array.from({ length: mealCount }, (_, index) => ({
      id: `onboarding-meal-${index + 1}`,
      title: `ארוחה ${index + 1}`,
      foods: [],
      targetMacros: { protein: perMealProtein, carbohydrates: perMealCarbs, fats: perMealFats },
    }));
    await enqueueAsyncStorageSet("meal-plan-state", JSON.stringify({ meals, eaten: {}, layoutVersion: 2 }));

    // 3. Select the matching workout program and schedule it onto the next
    // few days, starting today.
    if (!selectedProgramIds.includes(workoutFrequency.programId)) {
      toggleSelectedProgram(workoutFrequency.programId);
    }
    const templateIds = muscleBuildingFolderTemplateIds[workoutFrequency.programId];
    const daysToSchedule = Math.min(workoutFrequency.perWeek, templateIds.length);
    for (let i = 0; i < daysToSchedule; i += 1) {
      const templateId = templateIds[i];
      const template: WorkoutTemplate = templates.find((item) => item.id === templateId) ?? getTemplate(templateId);
      const dateKey = localDateKey(new Date(Date.now() + i * 24 * 60 * 60 * 1000));
      await assignWorkoutTemplateToDate(dateKey, template, "workout");
    }

    setBusy(false);
    router.replace("/(tabs)" as never);
  };

  return (
    <ScreenContainer className="px-5 pt-5">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <BrandMark variant="original" />
        <Text style={styles.eyebrow}>הגדרה ראשונית</Text>
        <Text style={styles.title}>בניית הפרופיל שלך</Text>
        <Text style={styles.subtitle}>כמה פרטים קצרים, ואנחנו נבנה לך אוטומטית יעדי תזונה, תפריט וריק ליוזון ולוח אימונים מתחיל.</Text>

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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>תדירות אימונים</Text>
          <View style={styles.choiceRow}>
            {WORKOUT_FREQUENCY_OPTIONS.map((option) => (
              <Pressable
                key={option.programId}
                onPress={() => setWorkoutFrequency(option)}
                style={[styles.choice, workoutFrequency.programId === option.programId && styles.choiceActive]}
              >
                <Text style={[styles.choiceText, workoutFrequency.programId === option.programId && styles.choiceTextActive]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable accessibilityRole="button" accessibilityLabel="בניית הפרופיל" onPress={() => void handleSubmit()} disabled={busy} style={({ pressed }) => [styles.primary, pressed && styles.pressed, busy && styles.disabled]}>
          {busy ? <ActivityIndicator color="#0B1224" /> : <Text style={styles.primaryText}>בניית הפרופיל שלי</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="דילוג" onPress={() => router.replace("/(tabs)" as never)} style={styles.skip}>
          <Text style={styles.skipText}>דלג לעכשיו</Text>
        </Pressable>
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
  skip: { alignItems: "center", paddingVertical: 6 },
  skipText: { color: "#7E8DA4", fontSize: 12, fontWeight: "700", textDecorationLine: "underline" },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});
