import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { caloriesPer100g, foodSubgroupFor, macrosForReference, type FoodGroup, type FoodItem, type FoodSubgroup } from "@/lib/food-nutrition";
import { nutritionSubgroupOrder } from "@/lib/nutrition-catalog";

type NutritionCategoryBrowserProps = {
  foods: FoodItem[];
  selectedGroup: FoodGroup | null;
  selectedSubgroup: FoodSubgroup | "ללא";
  onSelectGroup: (group: FoodGroup) => void;
  onClearGroup?: () => void;
  onSelectSubgroup: (subgroup: FoodSubgroup | "ללא") => void;
  groups?: FoodGroup[];
  onSelectFood?: (food: FoodItem) => void;
  productSearch?: string;
  onProductSearchChange?: (value: string) => void;
  productFilter?: (food: FoodItem) => boolean;
  productActionText?: string;
  productSearchPlaceholder?: string;
  allowGroupCollapse?: boolean;
  initiallyCollapsed?: boolean;
};

const categoryOrder: FoodGroup[] = ["חלבון", "פחמימה", "שומן", "ירק ופרי", "שונות"];

const categoryAccent: Record<FoodGroup, { border: string; background: string; text: string }> = {
  חלבון: { border: "#65BDF6", background: "#1C3152", text: "#8ED8FF" },
  פחמימה: { border: "#F5B72C", background: "#3B3015", text: "#F8D36B" },
  שומן: { border: "#F59E0B", background: "#3A2815", text: "#FBBF24" },
  "ירק ופרי": { border: "#4FD1C5", background: "#173A3D", text: "#99F6E4" },
  שונות: { border: "#8B5CF6", background: "#33265C", text: "#E9D5FF" },
};

export function NutritionCategoryBrowser({
  foods,
  selectedGroup,
  selectedSubgroup,
  onSelectGroup,
  onClearGroup,
  onSelectSubgroup,
  groups,
  onSelectFood,
  productSearch = "",
  onProductSearchChange,
  productFilter,
  productActionText = "בחר",
  productSearchPlaceholder,
  allowGroupCollapse = false,
  initiallyCollapsed = false,
}: NutritionCategoryBrowserProps) {
  const [expandedGroup, setExpandedGroup] = useState<FoodGroup | null>(initiallyCollapsed ? null : selectedGroup);
  const visibleGroups = groups ?? categoryOrder;

  useEffect(() => {
    if (!initiallyCollapsed) setExpandedGroup(selectedGroup);
  }, [initiallyCollapsed, selectedGroup]);

  const subgroupsByGroup = useMemo(() => {
    return visibleGroups.reduce<Record<FoodGroup, FoodSubgroup[]>>((result, group) => {
      result[group] = nutritionSubgroupOrder.filter((subgroup) =>
        foods.some((food) => food.group === group && foodSubgroupFor(food) === subgroup),
      );
      return result;
    }, { חלבון: [], פחמימה: [], שומן: [], "ירק ופרי": [], שונות: [] });
  }, [foods, visibleGroups]);

  const countForGroup = (group: FoodGroup) => foods.filter((food) => food.group === group && (!productFilter || productFilter(food))).length;
  const countForSubgroup = (group: FoodGroup, subgroup: FoodSubgroup) =>
    foods.filter((food) => food.group === group && foodSubgroupFor(food) === subgroup && (!productFilter || productFilter(food))).length;

  const selectGroup = (group: FoodGroup) => {
    const isSameOpenGroup = expandedGroup === group && selectedGroup === group;
    if (allowGroupCollapse && isSameOpenGroup) {
      setExpandedGroup(null);
      onClearGroup?.();
      onSelectSubgroup("ללא");
      return;
    }
    setExpandedGroup(group);
    onSelectGroup(group);
    onSelectSubgroup("ללא");
  };

  const productsForSubgroup = (group: FoodGroup, subgroup: FoodSubgroup) =>
    foods
      .filter((food) => food.group === group && foodSubgroupFor(food) === subgroup)
      .filter((food) => !productFilter || productFilter(food))
      .filter((food) => food.name.toLocaleLowerCase("he").includes(productSearch.trim().toLocaleLowerCase("he")));

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>קטלוג מוצרים לפי קטגוריות</Text>
      <Text style={styles.title}>בחר קטגוריה להוספה או לעריכה</Text>
      <Text style={styles.helper}>
        פתח קבוצת מאקרו, בחר קטגוריה, ובחר מוצר מתוך הרשימה. לחיצה חוזרת סוגרת את השכבה הפתוחה.
      </Text>

      <View style={styles.categories}>
        {visibleGroups.map((group) => {
          const accent = categoryAccent[group];
          const isExpanded = expandedGroup === group;
          const isSelected = selectedGroup === group;
          const subgroups = subgroupsByGroup[group];

          return (
            <View key={group} style={[styles.category, isExpanded && { borderColor: accent.border }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded, selected: isSelected }}
                onPress={() => selectGroup(group)}
                style={({ pressed }) => [styles.categoryHeader, pressed && styles.pressed]}
              >
                <View style={styles.categoryCount}>
                  <Text style={[styles.count, { color: accent.text }]}>{countForGroup(group)}</Text>
                  <Text style={styles.countLabel}>מוצרים</Text>
                </View>
                <View style={styles.categoryCopy}>
                  <Text style={[styles.categoryTitle, isSelected && { color: accent.text }]}>{group}</Text>
                  <Text style={styles.categoryHint}>
                    {isExpanded ? "לחץ לסגירה" : "לחץ לפתיחה"} · {subgroups.length} תתי־קטגוריות
                  </Text>
                </View>
                <View style={[styles.categoryIcon, { backgroundColor: accent.background, borderColor: accent.border }]}>
                  <Text style={[styles.iconText, { color: accent.text }]}>{isExpanded ? "−" : "+"}</Text>
                </View>
              </Pressable>

              {isExpanded ? (
                <View style={styles.subgroups}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected && selectedSubgroup === "ללא" }}
                    onPress={() => onSelectSubgroup("ללא")}
                    style={[styles.subgroup, isSelected && selectedSubgroup === "ללא" && { backgroundColor: accent.background, borderColor: accent.border }]}
                  >
                    <Text style={[styles.subgroupCount, { color: accent.text }]}>{countForGroup(group)}</Text>
                    <Text style={styles.subgroupText}>כל מוצרי {group}</Text>
                  </Pressable>
                  {subgroups.map((subgroup) => {
                    const isSubgroupSelected = isSelected && selectedSubgroup === subgroup;
                    const products = productsForSubgroup(group, subgroup);
                    return (
                      <View key={subgroup} style={styles.subgroupItem}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSubgroupSelected }}
                          onPress={() => {
                            if (isSubgroupSelected) {
                              onSelectSubgroup("ללא");
                              return;
                            }
                            onSelectGroup(group);
                            onSelectSubgroup(subgroup);
                          }}
                          style={[styles.subgroup, isSubgroupSelected && { backgroundColor: accent.background, borderColor: accent.border }]}
                        >
                          <Text style={[styles.subgroupCount, { color: accent.text }]}>{countForSubgroup(group, subgroup)}</Text>
                          <Text style={[styles.subgroupText, isSubgroupSelected && { color: accent.text }]}> {isSubgroupSelected ? "✓ " : ""}{subgroup}</Text>
                        </Pressable>
                        {isSubgroupSelected ? (
                          <View style={styles.productsForSubgroup}>
                            {onProductSearchChange ? (
                              <TextInput
                                accessibilityLabel={`חיפוש מוצרים ב${subgroup}`}
                                value={productSearch}
                                onChangeText={onProductSearchChange}
                                placeholder={productSearchPlaceholder ?? `חפש מוצר ב${subgroup}`}
                                placeholderTextColor="#7E8DA4"
                                returnKeyType="done"
                                style={styles.productSearch}
                                textAlign="right"
                              />
                            ) : null}
                            {products.length ? products.map((food) => {
                              const macros = macrosForReference(food);
                              const productBody = (
                                <>
                                  <Text style={styles.productName}>{food.name}</Text>
                                  <Text style={styles.productMeta}>
                                    {Math.round(caloriesPer100g(food))} קק״ל ל־100 ג׳ · חלבון {macros.protein} · פחמימות {macros.carbohydrates} · שומן {macros.fats}
                                  </Text>
                                  {onSelectFood ? <Text style={styles.productAction}>{productActionText}</Text> : null}
                                </>
                              );
                              return onSelectFood ? (
                                <Pressable key={food.id} accessibilityRole="button" onPress={() => onSelectFood(food)} style={({ pressed }) => [styles.productButton, pressed && styles.pressed]}>
                                  {productBody}
                                </Pressable>
                              ) : (
                                <View key={food.id} style={styles.productRow}>{productBody}</View>
                              );
                            }) : (
                              <Text style={styles.emptyProducts}>{productSearch.trim() ? "לא נמצאו מוצרים בחיפוש." : "אין מוצרים זמינים בקטגוריה זו."}</Text>
                            )}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.selection}>
        <Text style={styles.selectionTitle}>הבחירה הנוכחית</Text>
        <Text style={styles.selectionValue}>{selectedGroup ? `${selectedGroup} · ${selectedSubgroup === "ללא" ? "ללא תת־קטגוריה" : selectedSubgroup}` : "לא נבחרה קטגוריה"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 17, padding: 15, gap: 10 },
  eyebrow: { color: "#F5B72C", textAlign: "right", fontSize: 11, fontWeight: "900" },
  title: { color: "#F7F9FC", textAlign: "right", fontSize: 17, fontWeight: "900" },
  helper: { color: "#AAB7C8", textAlign: "right", lineHeight: 16, fontSize: 10 },
  categories: { gap: 8, width: "100%" },
  category: { width: "100%", overflow: "hidden", backgroundColor: "#101C31", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 12 },
  categoryHeader: { minHeight: 68, width: "100%", flexDirection: "row-reverse", alignItems: "center", gap: 9, padding: 10 },
  categoryCopy: { flex: 1, minWidth: 0, gap: 3 },
  categoryTitle: { color: "#F7F9FC", fontSize: 15, fontWeight: "900", textAlign: "right" },
  categoryHint: { color: "#AAB7C8", fontSize: 9, lineHeight: 14, textAlign: "right" },
  categoryCount: { width: 48, alignItems: "center", gap: 1 },
  count: { fontSize: 17, fontWeight: "900" },
  countLabel: { color: "#7E8DA4", fontSize: 8 },
  categoryIcon: { width: 37, height: 37, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1 },
  iconText: { fontSize: 22, fontWeight: "800", lineHeight: 25 },
  subgroups: { borderTopColor: "#2C3B55", borderTopWidth: 1, padding: 8, gap: 6 },
  subgroupItem: { gap: 6 },
  subgroup: { minHeight: 40, width: "100%", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8, borderColor: "#2C3B55", borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  subgroupText: { flex: 1, color: "#D9E2EF", textAlign: "right", fontSize: 10, fontWeight: "800", writingDirection: "rtl" },
  subgroupCount: { fontSize: 10, fontWeight: "900" },
  productsForSubgroup: { backgroundColor: "#0B1224", borderColor: "#3D587C", borderWidth: 1, borderRadius: 9, padding: 9, gap: 7 },
  productSearch: { minHeight: 40, backgroundColor: "#101C31", borderColor: "#3D587C", borderWidth: 1, borderRadius: 8, color: "#F7F9FC", paddingHorizontal: 10, textAlign: "right" },
  productRow: { borderBottomColor: "#2C3B55", borderBottomWidth: 1, paddingBottom: 6, gap: 2 },
  productButton: { backgroundColor: "#16233A", borderColor: "#3D587C", borderWidth: 1, borderRadius: 8, padding: 9, gap: 3 },
  productName: { color: "#F5B72C", fontSize: 10, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  productMeta: { color: "#AAB7C8", fontSize: 9, lineHeight: 14, textAlign: "right", writingDirection: "rtl" },
  productAction: { color: "#8ED8FF", fontSize: 9, fontWeight: "900", textAlign: "right" },
  emptyProducts: { color: "#AAB7C8", fontSize: 10, textAlign: "right", paddingVertical: 5 },
  selection: { backgroundColor: "#33265C", borderColor: "#8B5CF6", borderWidth: 1, borderRadius: 10, padding: 10, gap: 3 },
  selectionTitle: { color: "#BBA8D9", textAlign: "right", fontSize: 9, fontWeight: "800" },
  selectionValue: { color: "#E9D5FF", textAlign: "right", fontSize: 12, fontWeight: "900", writingDirection: "rtl" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
