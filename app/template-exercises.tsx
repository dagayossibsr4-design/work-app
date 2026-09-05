import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { ActionToast } from "@/components/action-toast";
import { useWorkoutStore } from "@/lib/workout-store";
import type { WorkoutId } from "@/lib/workout-data";
import { sanitizeNonNegativeDecimalInput } from "@/lib/numeric-input";

export default function TemplateExercisesScreen() {
  const { templates, updateTemplate, addExercise, addExerciseAfter, updateExercise, deleteExercise, moveExercise } = useWorkoutStore();
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const template = templates.find((item) => item.id === templateId);

  if (!template) {
    return (
      <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>התבנית לא נמצאה</Text>
          <Text style={styles.missingText}>ייתכן שהתבנית נמחקה. חזור לרשימת התבניות ובחר מחדש.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>חזרה</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const id = template.id as WorkoutId;

  return (
    <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="חזרה לרשימת התבניות" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹ חזרה לתבניות</Text>
          </Pressable>
          <Text style={styles.eyebrow}>עריכת תבנית</Text>
          <Text style={styles.title}>{template.name}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>פרטי התבנית</Text>
          <Field label="שם האימון" value={template.name} onChangeText={(name) => updateTemplate(id, { name })} />
          <Field label="קבוצות שרירים / מיקוד" value={template.focus} onChangeText={(focus) => updateTemplate(id, { focus })} />
        </View>

        <View style={styles.exerciseHeader}>
          <Text style={styles.sectionTitle}>תרגילי האימון</Text>
          <Text style={styles.count}>{template.exercises.length} תרגילים</Text>
        </View>

        {template.exercises.map((exercise, index) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseTop}>
              <Text style={styles.exerciseNumber}>תרגיל {index + 1}</Text>
              <View style={styles.orderButtons}>
                <Pressable disabled={index === 0} onPress={() => moveExercise(id, exercise.id, -1)} style={[styles.orderButton, index === 0 && styles.disabled]}><Text style={styles.orderText}>↑</Text></Pressable>
                <Pressable disabled={index === template.exercises.length - 1} onPress={() => moveExercise(id, exercise.id, 1)} style={[styles.orderButton, index === template.exercises.length - 1 && styles.disabled]}><Text style={styles.orderText}>↓</Text></Pressable>
                <Pressable onPress={() => { addExerciseAfter(id, exercise.id); setToastMessage(`נוסף תרגיל אחרי ${exercise.name}`); }} style={styles.insertAfterButton}><Text style={styles.insertAfterText}>＋ אחרי</Text></Pressable>
              </View>
            </View>
            <Field label="שם התרגיל" value={exercise.name} onChangeText={(name) => updateExercise(id, exercise.id, { name })} />
            <Field label="שם באנגלית (אופציונלי)" value={exercise.englishName ?? ""} onChangeText={(englishName) => updateExercise(id, exercise.id, { englishName })} />
            <View style={styles.setsHeader}>
              <Pressable onPress={() => updateExercise(id, exercise.id, { sets: [...exercise.sets, { target: "8–12" }] })} style={styles.smallButton}><Text style={styles.smallButtonText}>+ הוסף סט</Text></Pressable>
              <Text style={styles.fieldLabel}>טווחי חזרות וסטים</Text>
            </View>
            {exercise.sets.map((set, setIndex) => (
              <View key={`${exercise.id}-${setIndex}`} style={styles.setRow}>
                <Text style={styles.setNumber}>סט {setIndex + 1}</Text>
                <TextInput
                  value={set.target}
                  placeholder="8–12"
                  placeholderTextColor="#7E8DA4"
                  onChangeText={(target) => updateExercise(id, exercise.id, { sets: exercise.sets.map((currentSet, currentIndex) => currentIndex === setIndex ? { ...currentSet, target } : currentSet) })}
                  style={styles.setInput}
                />
                <TextInput
                  value={set.restPause ?? ""}
                  placeholder="Rest Pause"
                  placeholderTextColor="#7E8DA4"
                  onChangeText={(restPause) => updateExercise(id, exercise.id, { sets: exercise.sets.map((currentSet, currentIndex) => currentIndex === setIndex ? { ...currentSet, restPause: sanitizeNonNegativeDecimalInput(restPause) } : currentSet) })}
                  style={styles.setInput}
                />
                <Pressable onPress={() => updateExercise(id, exercise.id, { sets: exercise.sets.filter((_, indexToRemove) => indexToRemove !== setIndex) })} disabled={exercise.sets.length <= 1} style={[styles.removeSet, exercise.sets.length <= 1 && styles.disabled]}>
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              </View>
            ))}
            <Field label="הערה" value={exercise.note ?? ""} onChangeText={(note) => updateExercise(id, exercise.id, { note })} placeholder="למשל: טכניקה, מנוחה או דגשים" />
            <Pressable onPress={() => deleteExercise(id, exercise.id)} style={styles.deleteButton}><Text style={styles.deleteText}>מחיקת תרגיל</Text></Pressable>
          </View>
        ))}

        <Pressable onPress={() => addExercise(id)} style={[styles.addButton, { borderColor: template.accent }]}>
          <Text style={[styles.addText, { color: template.accent }]}>+ הוספת תרגיל חדש</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/exercise-library" as never, params: { templateId: id } } as never)}
          style={({ pressed }) => [styles.libraryButton, pressed && styles.pressed]}
        >
          <Text style={styles.libraryButtonText}>הוספת תרגיל מהספרייה</Text>
        </Pressable>

        <View style={styles.tip}><Text style={styles.tipText}>השינויים נשמרים אוטומטית ויופיעו מיד בבחירת אימון, באימון הפעיל ובמסך הניתוח.</Text></View>
      </ScrollView>
      <ActionToast message={toastMessage} />
    </ScreenContainer>
  );
}

function Field({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#7E8DA4" style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 35 },
  header: { alignItems: "flex-end", gap: 4, marginBottom: 2 },
  back: { alignSelf: "flex-start", paddingVertical: 4 },
  backText: { color: "#65BDF6", fontWeight: "900" },
  eyebrow: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" },
  title: { color: "#F7F9FC", fontSize: 26, fontWeight: "900", textAlign: "right" },
  missing: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 20, gap: 10, alignItems: "flex-end", marginTop: 20 },
  missingTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right" },
  missingText: { color: "#AAB7C8", fontSize: 12, lineHeight: 19, textAlign: "right" },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 15, gap: 11 },
  sectionTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "800", textAlign: "right" },
  exerciseHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  count: { color: "#AAB7C8", fontSize: 12 },
  exerciseCard: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 15, gap: 10 },
  exerciseTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  exerciseNumber: { color: "#F5B72C", fontSize: 14, fontWeight: "800" },
  orderButtons: { flexDirection: "row-reverse", gap: 6 },
  orderButton: { width: 32, height: 30, borderRadius: 9, backgroundColor: "#253653", alignItems: "center", justifyContent: "center" },
  orderText: { color: "#F7F9FC", fontWeight: "900" },
  insertAfterButton: { height: 30, borderRadius: 9, backgroundColor: "#2E6A60", paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  insertAfterText: { color: "#B7F2DF", fontSize: 10, fontWeight: "900" },
  disabled: { opacity: 0.25 },
  field: { gap: 5 },
  fieldLabel: { color: "#AAB7C8", fontSize: 11, textAlign: "right" },
  input: { backgroundColor: "#0B1224", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 10, minHeight: 40, color: "#F7F9FC", paddingHorizontal: 11, textAlign: "right", fontSize: 13 },
  setsHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  smallButton: { backgroundColor: "#253653", borderRadius: 9, paddingVertical: 7, paddingHorizontal: 10 },
  smallButtonText: { color: "#F7F9FC", fontSize: 11, fontWeight: "800" },
  setRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7, minWidth: 0 },
  setInput: { flex: 1, minWidth: 0, minHeight: 38, backgroundColor: "#0B1224", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 9, color: "#F7F9FC", paddingHorizontal: 8, textAlign: "right", fontSize: 11 },
  setNumber: { color: "#AAB7C8", width: 35, flexShrink: 0, fontSize: 10, textAlign: "right" },
  removeSet: { width: 29, height: 30, flexShrink: 0, borderRadius: 8, backgroundColor: "#432330", alignItems: "center", justifyContent: "center" },
  removeText: { color: "#F16B7A", fontSize: 19 },
  deleteButton: { alignItems: "center", paddingTop: 5 },
  deleteText: { color: "#F16B7A", fontSize: 12, fontWeight: "800" },
  addButton: { borderWidth: 1, borderRadius: 15, paddingVertical: 15, alignItems: "center", borderStyle: "dashed" },
  addText: { fontSize: 15, fontWeight: "900" },
  libraryButton: { backgroundColor: "#132D2C", borderColor: "#2E6A60", borderWidth: 1, borderRadius: 15, paddingVertical: 15, alignItems: "center" },
  libraryButtonText: { color: "#42D392", fontWeight: "900", fontSize: 14 },
  tip: { backgroundColor: "#231F12", borderColor: "#715B21", borderWidth: 1, padding: 14, borderRadius: 16 },
  tipText: { color: "#D7C89C", fontSize: 11, lineHeight: 18, textAlign: "right" },
  primary: { backgroundColor: "#F5B72C", borderRadius: 11, paddingVertical: 13, paddingHorizontal: 20, alignItems: "center" },
  primaryText: { color: "#0B1224", fontWeight: "900" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
