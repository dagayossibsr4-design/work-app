import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { ActionToast } from "@/components/action-toast";
import { useWorkoutStore } from "@/lib/workout-store";
import type { WorkoutId } from "@/lib/workout-data";
import { categoryForExercise, exerciseLibrary, type ExerciseCategory, type ExerciseLibraryItem } from "@/lib/exercise-library";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";

const exerciseCategoryOrder: ExerciseCategory[] = ["חזה", "גב", "כתפיים", "רגליים", "יד קדמית", "יד אחורית", "ליבה", "כללי"];
const exerciseCategoryMeta: Record<string, { icon: IconSymbolName; accent: string }> = {
  "חזה": { icon: "square.grid.2x2.fill", accent: "#FB7185" },
  "גב": { icon: "rowing", accent: "#65BDF6" },
  "כתפיים": { icon: "dumbbell.fill", accent: "#C084FC" },
  "רגליים": { icon: "figure.run", accent: "#42D392" },
  "יד קדמית": { icon: "dumbbell.fill", accent: "#F5B72C" },
  "יד אחורית": { icon: "dumbbell.fill", accent: "#F59E0B" },
  "ליבה": { icon: "bolt.fill", accent: "#22C55E" },
  "כללי": { icon: "square.grid.2x2.fill", accent: "#94A3B8" },
};

export default function ExerciseLibraryScreen() {
  const { templates, addExerciseFromLibrary, addCustomExercise } = useWorkoutStore();
  const { templateId: initialTemplateId } = useLocalSearchParams<{ templateId?: string }>();
  const [targetId, setTargetId] = useState<WorkoutId | null>((initialTemplateId as WorkoutId | undefined) ?? null);
  const [category, setCategory] = useState<ExerciseCategory | "הכול">("הכול");
  const [librarySearch, setLibrarySearch] = useState("");
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [customExerciseEnglishName, setCustomExerciseEnglishName] = useState("");
  const [expandedExerciseCategories, setExpandedExerciseCategories] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const target = templates.find((item) => item.id === targetId);

  const libraryExercises = useMemo<ExerciseLibraryItem[]>(() => {
    const templateExercises = templates.flatMap((sourceTemplate) => sourceTemplate.exercises.map((exercise) => ({
      id: `template-library-${sourceTemplate.id}-${exercise.id}`,
      name: exercise.name,
      englishName: exercise.englishName ?? "",
      category: (categoryForExercise(`${exercise.name} ${exercise.englishName ?? ""}`) ?? "כללי") as ExerciseCategory,
      defaultTarget: exercise.sets[0]?.target ?? "8–12",
      note: exercise.note,
    })));
    const seen = new Set<string>();
    return [...exerciseLibrary, ...templateExercises].filter((item) => {
      const key = `${item.name.trim().toLowerCase()}|${item.englishName.trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return Boolean(item.name.trim());
    });
  }, [templates]);

  const libraryGroups = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();
    const matchesSearch = (item: ExerciseLibraryItem) => !query || `${item.name} ${item.englishName} ${(item.aliases ?? []).join(" ")}`.toLowerCase().includes(query);
    const knownGroups = exerciseCategoryOrder.filter((group) => libraryExercises.some((item) => item.category === group));
    const additionalGroups = Array.from(new Set(libraryExercises.map((item) => item.category))).filter((group) => !exerciseCategoryOrder.includes(group));
    return [...knownGroups, ...additionalGroups].map((group) => ({ group, items: libraryExercises.filter((item) => item.category === group && matchesSearch(item)) })).filter(({ group, items }) => items.length > 0 && (category === "הכול" || group === category));
  }, [libraryExercises, category, librarySearch]);

  const toggleExerciseCategory = (group: string) => setExpandedExerciseCategories((current) => current.includes(group) ? current.filter((item) => item !== group) : [...current, group]);

  const addItem = (item: ExerciseLibraryItem) => {
    if (!target) return;
    addExerciseFromLibrary(target.id, item);
    setToastMessage(`נוסף ${item.name} לתוכנית ${target.name}`);
  };

  const addCustom = () => {
    if (!target || !customExerciseName.trim()) return;
    const addedName = customExerciseName.trim();
    addCustomExercise(target.id, addedName, customExerciseEnglishName);
    setCustomExerciseName("");
    setCustomExerciseEnglishName("");
    setToastMessage(`נוסף ${addedName} לתוכנית ${target.name}`);
  };

  return (
    <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="חזרה" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹ חזרה</Text>
          </Pressable>
          <Text style={styles.eyebrow}>ספריית תרגילים</Text>
          <Text style={styles.title}>עריכת תרגילים</Text>
          <Text style={styles.subtitle}>בחר תוכנית יעד ואז הוסף תרגילים לפי רובריקות - חזה, גב, רגליים ועוד.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>תוכנית יעד</Text>
          {templates.length === 0 ? (
            <Text style={styles.hint}>אין עדיין תוכניות. צור תוכנית במסך התבניות ואז חזור לכאן.</Text>
          ) : (
            <View style={styles.targetRow}>
              {templates.map((item) => (
                <Pressable key={item.id} onPress={() => setTargetId(item.id as WorkoutId)} style={[styles.targetChip, targetId === item.id && { backgroundColor: `${item.accent}22`, borderColor: item.accent }]}>
                  <Text style={[styles.targetChipText, targetId === item.id && { color: item.accent }]} numberOfLines={1}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {!target ? <Text style={styles.hint}>בחר תוכנית יעד כדי להוסיף אליה תרגילים.</Text> : null}
        </View>

        <View style={styles.libraryCard}>
          <View style={styles.libraryTitleRow}>
            <View><Text style={styles.sectionTitle}>בחירת תרגיל להוספה</Text><Text style={styles.libraryHint}>לפי רובריקות שרירים</Text></View>
            <View style={styles.libraryCountBadge}><Text style={styles.libraryCountValue}>{libraryGroups.reduce((total, group) => total + group.items.length, 0)}</Text><Text style={styles.libraryCountLabel}>זמינים</Text></View>
          </View>
          <TextInput value={librarySearch} onChangeText={setLibrarySearch} placeholder="חפש תרגיל בעברית, באנגלית או בכינוי" placeholderTextColor="#7E8DA4" style={styles.librarySearchInput} textAlign="right" returnKeyType="search" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {["הכול", ...Array.from(new Set(libraryExercises.map((item) => item.category)))].map((item) => (
              <Pressable key={item} onPress={() => setCategory(item as ExerciseCategory | "הכול")} style={[styles.categoryPill, category === item && styles.categoryPillActive]}>
                <Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item === "הכול" ? "כל הקטגוריות" : item}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.libraryCategoryList}>
            {libraryGroups.map(({ group, items }) => {
              const expanded = category !== "הכול" || expandedExerciseCategories.includes(group);
              const meta = exerciseCategoryMeta[group] ?? exerciseCategoryMeta["כללי"];
              return (
                <View key={group} style={[styles.libraryCategory, { borderColor: `${meta.accent}88` }]}>
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => { setCategory("הכול"); toggleExerciseCategory(group); }} style={({ pressed }) => [styles.libraryCategoryHeader, pressed && styles.pressed]}>
                    <View style={[styles.libraryCategoryIcon, { backgroundColor: `${meta.accent}22`, borderColor: meta.accent }]}><IconSymbol name={meta.icon} size={19} color={meta.accent} /></View>
                    <View style={styles.libraryCategoryCopy}><Text style={styles.libraryCategoryTitle}>{group}</Text><Text style={styles.libraryCategoryMeta}>{items.length} תרגילים לבחירה</Text></View>
                    <View style={styles.libraryCategoryCount}><Text style={[styles.libraryCategoryCountValue, { color: meta.accent }]}>{items.length}</Text></View>
                    <Text style={styles.groupChevron}>{expanded ? "⌃" : "⌄"}</Text>
                  </Pressable>
                  {expanded ? (
                    <View style={styles.libraryCategoryItems}>
                      {items.map((item) => (
                        <Pressable key={item.id} disabled={!target} onPress={() => addItem(item)} style={({ pressed }) => [styles.libraryItem, pressed && styles.pressed, !target && styles.disabled]}>
                          <View style={styles.libraryItemCopy}><Text style={styles.libraryItemName}>{item.name}</Text><Text style={styles.libraryItemMeta}>{item.englishName} · יעד {item.defaultTarget}</Text></View>
                          <Text style={styles.libraryAdd}>＋ הוסף</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
          <View style={styles.customExerciseBox}>
            <Text style={styles.customExerciseTitle}>תרגיל שלא נמצא ברשימה</Text>
            <Text style={styles.customExerciseHint}>הקלד שם והוסף אותו ישירות לתוכנית היעד שנבחרה למעלה.</Text>
            <TextInput value={customExerciseName} onChangeText={setCustomExerciseName} placeholder="שם התרגיל בעברית" placeholderTextColor="#7E8DA4" style={styles.customExerciseInput} textAlign="right" />
            <TextInput value={customExerciseEnglishName} onChangeText={setCustomExerciseEnglishName} placeholder="שם באנגלית (אופציונלי)" placeholderTextColor="#7E8DA4" style={styles.customExerciseInput} textAlign="right" />
            <Pressable accessibilityRole="button" accessibilityLabel="הוסף תרגיל מותאם אישית" disabled={!target} onPress={addCustom} style={({ pressed }) => [styles.customExerciseButton, pressed && styles.pressed, !target && styles.disabled]}>
              <Text style={styles.customExerciseButtonText}>＋ הוסף תרגיל מותאם אישית</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <ActionToast message={toastMessage} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 35 },
  header: { alignItems: "flex-end", gap: 4 },
  back: { alignSelf: "flex-start", paddingVertical: 4 },
  backText: { color: "#65BDF6", fontWeight: "900" },
  eyebrow: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" },
  title: { color: "#F7F9FC", fontSize: 28, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", fontSize: 13, lineHeight: 19, textAlign: "right" },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 15, gap: 10 },
  sectionTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "800", textAlign: "right" },
  hint: { color: "#AAB7C8", fontSize: 11, textAlign: "right", lineHeight: 17 },
  targetRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, paddingVertical: 2 },
  targetChip: { borderColor: "#2C3B55", borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "#0D1A30", maxWidth: "100%" },
  targetChipText: { color: "#D9E2EF", fontSize: 12, fontWeight: "800", textAlign: "right" },
  disabled: { opacity: 0.4 },
  libraryCard: { backgroundColor: "#132D2C", borderColor: "#2E6A60", borderWidth: 1, borderRadius: 18, padding: 15, gap: 9 },
  libraryTitleRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10 },
  libraryCountBadge: { minWidth: 52, minHeight: 44, borderRadius: 12, backgroundColor: "#0B2424", borderColor: "#42D392", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  libraryCountValue: { color: "#42D392", fontSize: 16, fontWeight: "900" },
  libraryCountLabel: { color: "#82B9A8", fontSize: 8, marginTop: 1 },
  libraryHint: { color: "#A9DACA", fontSize: 11, textAlign: "right" },
  librarySearchInput: { minHeight: 44, backgroundColor: "#0B2424", borderColor: "#42D392", borderWidth: 1, borderRadius: 11, color: "#F7F9FC", paddingHorizontal: 12, textAlign: "right", writingDirection: "rtl", fontSize: 12 },
  categoryRow: { gap: 7, paddingVertical: 4 },
  categoryPill: { borderColor: "#2E6A60", borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7 },
  categoryPillActive: { backgroundColor: "#42D392", borderColor: "#42D392" },
  categoryText: { color: "#B7DACE", fontSize: 10, fontWeight: "800" },
  categoryTextActive: { color: "#0B1224" },
  libraryCategoryList: { gap: 8 },
  libraryCategory: { backgroundColor: "#0D2424", borderColor: "#2E6A60", borderWidth: 1, borderRadius: 13, overflow: "hidden" },
  libraryCategoryIcon: { width: 36, height: 36, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  libraryCategoryCount: { minWidth: 28, alignItems: "center", justifyContent: "center" },
  libraryCategoryCountValue: { fontSize: 15, fontWeight: "900" },
  libraryCategoryHeader: { minHeight: 56, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 11 },
  libraryCategoryCopy: { flex: 1, alignItems: "flex-end" },
  libraryCategoryTitle: { color: "#F7F9FC", fontSize: 13, fontWeight: "900", textAlign: "right" },
  libraryCategoryMeta: { color: "#82B9A8", fontSize: 9, marginTop: 3, textAlign: "right" },
  libraryCategoryItems: { gap: 6, paddingHorizontal: 8, paddingBottom: 8, borderTopColor: "#2E6A60", borderTopWidth: 1 },
  groupChevron: { color: "#F5B72C", fontSize: 21, width: 22, textAlign: "center" },
  libraryItem: { backgroundColor: "#0D2424", borderRadius: 11, padding: 10 },
  libraryItemCopy: { flex: 1, alignItems: "flex-end" },
  libraryItemName: { color: "#F7F9FC", textAlign: "right", fontSize: 12, fontWeight: "800" },
  libraryItemMeta: { color: "#82B9A8", fontSize: 9, textAlign: "right", marginTop: 3 },
  libraryAdd: { color: "#42D392", fontSize: 10, fontWeight: "900", textAlign: "right", marginTop: 6 },
  customExerciseBox: { backgroundColor: "#17253E", borderColor: "#F5B72C", borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  customExerciseTitle: { color: "#F5B72C", fontSize: 14, fontWeight: "900", textAlign: "right" },
  customExerciseHint: { color: "#C4D2E3", fontSize: 11, textAlign: "right" },
  customExerciseInput: { backgroundColor: "#0B1224", borderColor: "#48617E", borderWidth: 1, borderRadius: 9, minHeight: 42, color: "#F7F9FC", paddingHorizontal: 10, textAlign: "right" },
  customExerciseButton: { backgroundColor: "#F5B72C", borderRadius: 10, minHeight: 44, alignItems: "center", justifyContent: "center" },
  customExerciseButtonText: { color: "#0B1224", fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
