import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type WorkoutMethod = {
  title: string;
  english: string;
  category: string;
  summary: string;
};

export const workoutMethods: WorkoutMethod[] = [
  { title: "התקדמות הדרגתית", english: "Progressive Overload", category: "בסיס התוכנית", summary: "הגדלה הדרגתית של דרישת האימון לאורך זמן." },
  { title: "התקדמות כפולה", english: "Double Progression", category: "ניהול עומס", summary: "מתקדמים תחילה בחזרות ורק אחר כך במשקל." },
  { title: "Rest-Pause", english: "Rest-Pause", category: "הארכת סט", summary: "חלוקת סט קשה למקטעים קצרים עם מנוחות קצרות." },
  { title: "דרופ־סט", english: "Drop Set", category: "הארכת סט", summary: "הפחתת משקל לאחר עייפות והמשך בחזרות איכותיות." },
  { title: "Myo-Reps", english: "Myo-Reps", category: "הארכת סט", summary: "סט הפעלה ולאחריו מיני־סטים קצרים עם הפסקות קצרות." },
  { title: "סופר־סט", english: "Superset", category: "חיסכון בזמן", summary: "ביצוע של שני תרגילים ברצף עם מנוחה קצרה ביניהם." },
  { title: "סט משולש וסט ענק", english: "Tri-Set / Giant Set", category: "חיסכון בזמן", summary: "שלושה תרגילים או יותר ברצף, בדרך כלל לאותו אזור." },
  { title: "דרופ מכני", english: "Mechanical Drop Set", category: "שינוי מנוף", summary: "המשך העבודה באמצעות שינוי לגרסה קלה יותר של התנועה." },
  { title: "קצב מבוקר", english: "Tempo Training", category: "שליטה בתנועה", summary: "שליטה מודעת במשך הירידה, העצירה והעלייה." },
  { title: "חזרות עם עצירה", english: "Paused Reps", category: "שליטה בתנועה", summary: "עצירה קצרה בנקודה מוגדרת כדי לבטל תנופה ולשפר שליטה." },
  { title: "חזרות חלקיות בסוף הסט", english: "Partial Reps", category: "שיטה מתקדמת", summary: "המשך בטווח חלקי מתוכנן לאחר שהטווח המלא אינו אפשרי." },
  { title: "Cluster Sets", english: "Cluster Sets", category: "חלוקת עומס", summary: "חלוקת מספר החזרות להפסקות קצרות בתוך אותו סט." },
];

type WorkoutMethodPickerProps = {
  visible: boolean;
  selectedMethod?: string;
  onSelect: (method: WorkoutMethod) => void;
  onClose: () => void;
};

export function WorkoutMethodPicker({ visible, selectedMethod, onSelect, onClose }: WorkoutMethodPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>שיטות אימון</Text>
              <Text style={styles.title}>בחר שיטה לסט</Text>
              <Text style={styles.subtitle}>הבחירה נשמרת בתוך הסט בלבד וניתנת לשינוי בכל עת.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="סגור שיטות אימון" onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {workoutMethods.map((method, index) => {
              const selected = selectedMethod === method.title;
              return (
                <Pressable
                  key={method.title}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`בחר ${method.title}`}
                  onPress={() => onSelect(method)}
                  style={({ pressed }) => [styles.methodCard, selected && styles.methodCardSelected, pressed && styles.pressed]}
                >
                  <View style={styles.methodTop}>
                    <Text style={styles.methodNumber}>{String(index + 1).padStart(2, "0")}</Text>
                    <Text style={styles.methodCategory}>{method.category}</Text>
                  </View>
                  <Text style={styles.methodTitle}>{selected ? `✓ ${method.title}` : method.title}</Text>
                  <Text style={styles.methodEnglish}>{method.english}</Text>
                  <Text style={styles.methodSummary}>{method.summary}</Text>
                  <Text style={styles.chooseText}>{selected ? "נבחר לסט הזה" : "בחר שיטה זו"}</Text>
                </Pressable>
              );
            })}
            <Pressable accessibilityRole="button" onPress={() => onSelect({ title: "ללא שיטה", english: "Straight Sets", category: "ברירת מחדל", summary: "סט רגיל ללא טכניקה מיוחדת." })} style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
              <Text style={styles.clearText}>נקה שיטת אימון</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(3, 8, 22, 0.82)", justifyContent: "flex-end" },
  sheet: { maxHeight: "92%", backgroundColor: "#0B1224", borderTopColor: "#A855F7", borderTopWidth: 2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 15 },
  header: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 10, paddingBottom: 12 },
  headerCopy: { flex: 1, gap: 3 },
  eyebrow: { color: "#D77CFF", fontSize: 12, fontWeight: "900", textAlign: "right" },
  title: { color: "#F7F9FC", fontSize: 22, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right" },
  closeButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#33265C", borderColor: "#A855F7", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  closeText: { color: "#E9D5FF", fontSize: 28, lineHeight: 29 },
  list: { flexGrow: 0 },
  listContent: { gap: 8, paddingBottom: 22 },
  methodCard: { backgroundColor: "#16233A", borderColor: "#334A69", borderWidth: 1, borderRadius: 15, padding: 12, gap: 4 },
  methodCardSelected: { backgroundColor: "#33265C", borderColor: "#D77CFF", borderWidth: 1.5 },
  methodTop: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  methodNumber: { color: "#D77CFF", fontSize: 11, fontWeight: "900" },
  methodCategory: { color: "#AAB7C8", fontSize: 10, textAlign: "right" },
  methodTitle: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "right" },
  methodEnglish: { color: "#D8A2F4", fontSize: 10, textAlign: "right" },
  methodSummary: { color: "#C4D2E3", fontSize: 10, lineHeight: 15, textAlign: "right" },
  chooseText: { color: "#D77CFF", fontSize: 10, fontWeight: "900", textAlign: "right", marginTop: 2 },
  clearButton: { minHeight: 44, borderRadius: 11, borderColor: "#526B8E", borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#101C31" },
  clearText: { color: "#C4D2E3", fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
