import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useWorkoutStore } from "@/lib/workout-store";
import type { WorkoutId } from "@/lib/workout-data";
import { IconSymbol } from "@/components/ui/icon-symbol";

const templateCategoryOrder = ["PPL", "AB", "ABC", "ABCD", "Full Body", "אירובי", "תוכניות מותאמות", "אחר"];
const templateCategoryFor = (template: { id: string; name: string }) => {
  if (template.id.startsWith("custom-")) return "תוכניות מותאמות";
  if (/PPL|Push|Pull|Legs|Arms/i.test(`${template.id} ${template.name}`)) return "PPL";
  if (/ABCD/i.test(`${template.id} ${template.name}`)) return "ABCD";
  if (/ABC/i.test(`${template.id} ${template.name}`)) return "ABC";
  if (/^ab[- ]|\bAB\b/i.test(`${template.id} ${template.name}`)) return "AB";
  if (/full[- ]?body|גוף מלא/i.test(`${template.id} ${template.name}`)) return "Full Body";
  if (/cardio|ריצה|הליכון|אופניים|שחייה|חתירה|אירובי/i.test(`${template.id} ${template.name}`)) return "אירובי";
  return "אחר";
};

/**
 * Pure template picker: browse templates by category and either mark one
 * selected (a lightweight preview, no editing) or jump straight into a
 * dedicated editing screen via the pencil button. Editing a template's
 * exercises, and browsing the exercise library, both live on their own
 * screens (template-exercises.tsx, exercise-library.tsx) - deliberately
 * kept out of this screen so it stays a clean, focused list.
 */
export default function EditorScreen() {
  const { templates } = useWorkoutStore();
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();
  const [selectedId, setSelectedId] = useState<WorkoutId | null>((templateId as WorkoutId | undefined) ?? null);
  const [expandedTemplateGroups, setExpandedTemplateGroups] = useState<string[]>([]);
  const templateGroups = useMemo(() => templateCategoryOrder.map((group) => ({ group, items: templates.filter((item) => templateCategoryFor(item) === group) })).filter(({ items }) => items.length > 0), [templates]);
  const toggleTemplateGroup = (group: string) => setExpandedTemplateGroups((current) => current.includes(group) ? current.filter((item) => item !== group) : [...current, group]);
  const editTemplate = (id: WorkoutId) => router.push({ pathname: "/template-exercises" as never, params: { templateId: id } } as never);
  useEffect(() => {
    if (templateId && templates.some((item) => item.id === templateId)) setSelectedId(templateId as WorkoutId);
  }, [templateId, templates]);

  return (
    <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.screenContent}>
        <View style={styles.heading}><Text style={styles.title}>עריכת תבניות</Text><Text style={styles.subtitle}>בחר תבנית לתצוגה מהירה, או לחץ על סמל העריכה כדי לערוך את התרגילים שלה</Text></View>
        <View style={styles.templateGroupList}>
          {templateGroups.map(({ group, items }) => {
            const expanded = expandedTemplateGroups.includes(group);
            return (
              <View key={group} style={styles.templateGroup}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => toggleTemplateGroup(group)} style={({ pressed }) => [styles.templateGroupHeader, pressed && styles.pressed]}>
                  <View style={styles.templateGroupTitleWrap}><Text style={styles.templateGroupTitle}>{group}</Text><Text style={styles.templateGroupMeta}>{items.length} תבניות זמינות</Text></View>
                  <Text style={styles.groupChevron}>{expanded ? "⌃" : "⌄"}</Text>
                </Pressable>
                {expanded ? (
                  <View style={styles.templateGroupItems}>
                    {items.map((item) => (
                      <View key={item.id} style={styles.templateOptionRow}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={item.id === selectedId ? `ביטול בחירת ${item.name}` : `בחירת ${item.name}`}
                          onPress={() => setSelectedId((current) => current === item.id ? null : item.id)}
                          style={({ pressed }) => [styles.templateOption, item.id === selectedId && { backgroundColor: `${item.accent}22`, borderColor: item.accent }, pressed && styles.pressed]}
                        >
                          <View style={[styles.templateOptionAccent, { backgroundColor: item.accent }]} />
                          <View style={styles.templateOptionCopy}>
                            <Text style={styles.templateOptionTitle}>{item.name}</Text>
                            <Text style={styles.templateOptionMeta}>{item.exercises.length} תרגילים · {item.focus}</Text>
                          </View>
                          <Text style={[styles.templateOptionCheck, item.id === selectedId && { color: item.accent }]}>{item.id === selectedId ? "✓" : "›"}</Text>
                        </Pressable>
                        <Pressable accessibilityRole="button" accessibilityLabel={`עריכת ${item.name}`} onPress={() => editTemplate(item.id)} style={({ pressed }) => [styles.templateEditButton, pressed && styles.pressed]}>
                          <IconSymbol name="pencil" size={18} color="#0B1224" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push("/exercise-library" as never)} style={({ pressed }) => [styles.libraryLink, pressed && styles.pressed]}>
          <Text style={styles.libraryLinkText}>עריכת תרגילים · ניהול ספריית התרגילים</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: 35, gap: 14 },
  heading: { alignItems: "flex-end", marginBottom: 2 },
  title: { color: "#F7F9FC", fontSize: 30, fontWeight: "800" },
  subtitle: { color: "#AAB7C8", fontSize: 13, marginTop: 6, textAlign: "right" },
  templateGroupList: { gap: 9, marginBottom: 2 },
  templateGroup: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 15, overflow: "hidden" },
  templateGroupHeader: { minHeight: 60, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 13 },
  templateGroupTitleWrap: { flex: 1, alignItems: "flex-end" },
  templateGroupTitle: { color: "#F7F9FC", fontSize: 15, fontWeight: "900", textAlign: "right" },
  templateGroupMeta: { color: "#AAB7C8", fontSize: 10, marginTop: 3, textAlign: "right" },
  groupChevron: { color: "#F5B72C", fontSize: 21, width: 22, textAlign: "center" },
  templateGroupItems: { gap: 7, paddingHorizontal: 9, paddingBottom: 9, borderTopColor: "#2C3B55", borderTopWidth: 1 },
  templateOptionRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  templateOption: { flex: 1, minHeight: 58, flexDirection: "row-reverse", alignItems: "center", gap: 9, backgroundColor: "#0D1A30", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 11, paddingHorizontal: 10 },
  templateEditButton: { width: 44, height: 44, borderRadius: 11, backgroundColor: "#F5B72C", alignItems: "center", justifyContent: "center" },
  templateOptionAccent: { width: 5, height: 31, borderRadius: 3 },
  templateOptionCopy: { flex: 1, alignItems: "flex-end" },
  templateOptionTitle: { color: "#F7F9FC", fontSize: 13, fontWeight: "900", textAlign: "right" },
  templateOptionMeta: { color: "#AAB7C8", fontSize: 9, marginTop: 3, textAlign: "right" },
  templateOptionCheck: { color: "#7E8DA4", fontSize: 22, width: 22, textAlign: "center" },
  libraryLink: { backgroundColor: "#132D2C", borderColor: "#2E6A60", borderWidth: 1, borderRadius: 15, paddingVertical: 15, alignItems: "center" },
  libraryLinkText: { color: "#42D392", fontWeight: "900", fontSize: 13 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
