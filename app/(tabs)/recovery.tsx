import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useWorkoutStore, type RecoveryLog } from "@/lib/workout-store";
import { calculateRecoveryScore, recoveryLabel } from "@/lib/recovery-analysis";

const todayKey = () => new Date().toISOString().slice(0, 10);
const yesterdayKey = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};
const formatDate = (date: string) => new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${date}T00:00:00`));
const clamp = (value: number) => Math.max(1, Math.min(5, value));

export default function RecoveryScreen() {
  const { recoveryLogs, saveRecoveryLog } = useWorkoutStore();
  const recent = recoveryLogs[0];
  const [date, setDate] = useState(todayKey());
  const [sleepHours, setSleepHours] = useState(recent?.sleepHours ?? "");
  const [sleepQuality, setSleepQuality] = useState(recent?.sleepQuality ?? 3);
  const [fatigue, setFatigue] = useState(recent?.fatigue ?? 3);
  const [soreness, setSoreness] = useState(recent?.soreness ?? 3);
  const [restingHeartRate, setRestingHeartRate] = useState(recent?.restingHeartRate ?? "");
  const [note, setNote] = useState(recent?.note ?? "");
  const [message, setMessage] = useState("");

  const score = useMemo(() => calculateRecoveryScore({ sleepHours, sleepQuality, fatigue, soreness }), [sleepHours, sleepQuality, fatigue, soreness]);

  const save = () => {
    if (!date || !sleepHours.trim()) {
      setMessage("הזן לפחות תאריך ומספר שעות שינה.");
      return;
    }
    saveRecoveryLog({ date, sleepHours: sleepHours.replace(",", "."), sleepQuality, fatigue, soreness, restingHeartRate, note: note.trim() });
    setMessage("מדדי ההתאוששות נשמרו במכשיר.");
  };

  return (
    <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.heading}><Text style={styles.eyebrow}>מעקב אישי</Text><Text style={styles.title}>שינה והתאוששות</Text><Text style={styles.subtitle}>הזן נתונים ידניים עד שחיבור Garmin יהיה פעיל</Text></View>
        <View style={styles.scoreCard}><Text style={styles.scoreLabel}>ציון התאוששות משוער</Text><Text style={styles.score}>{score || "—"}<Text style={styles.scoreUnit}> / 100</Text></Text><Text style={styles.scoreHint}>{recoveryLabel(score)}</Text></View>
        <View style={styles.card}>
          <View style={styles.dateField}>
            <Text style={styles.label}>תאריך</Text>
            <View style={styles.dateRow}>
              <Pressable accessibilityRole="button" onPress={() => setDate(todayKey())} style={[styles.dateChip, date === todayKey() && styles.dateChipActive]}>
                <Text style={[styles.dateChipText, date === todayKey() && styles.dateChipTextActive]}>היום</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setDate(yesterdayKey())} style={[styles.dateChip, date === yesterdayKey() && styles.dateChipActive]}>
                <Text style={[styles.dateChipText, date === yesterdayKey() && styles.dateChipTextActive]}>אתמול</Text>
              </Pressable>
              <TextInput
                value={date}
                onChangeText={setDate}
                keyboardType="numbers-and-punctuation"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#7E8DA4"
                style={styles.dateInput}
              />
            </View>
          </View>
          <Field label="שעות שינה" value={sleepHours} onChangeText={(value) => setSleepHours(value.replace(/[^0-9.,]/g, ""))} keyboardType="decimal-pad" placeholder="למשל 7.5" />
          <Field label="דופק מנוחה" value={restingHeartRate} onChangeText={(value) => setRestingHeartRate(value.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="אופציונלי" />
          <Rating label="איכות שינה" value={sleepQuality} onChange={setSleepQuality} low="גרועה" high="מצוינת" />
          <Rating label="עייפות" value={fatigue} onChange={setFatigue} low="נמוכה" high="גבוהה" />
          <Rating label="כאבי שרירים" value={soreness} onChange={setSoreness} low="אין" high="חזקים" />
          <Text style={styles.label}>הערה יומית</Text><TextInput value={note} onChangeText={setNote} placeholder="איך הרגשת היום?" placeholderTextColor="#7E8DA4" multiline style={styles.noteInput} />
          <Pressable accessibilityRole="button" accessibilityLabel="שמור מדדי התאוששות" onPress={save} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}><Text style={styles.saveText}>שמור מדדי התאוששות</Text></Pressable>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
        <View style={styles.card}><Text style={styles.cardTitle}>רשומות אחרונות</Text>{recoveryLogs.length ? recoveryLogs.slice(0, 7).map((log) => <RecoveryRow key={log.id} log={log} />) : <Text style={styles.empty}>עדיין אין רשומות. שמור את המדידה הראשונה שלך.</Text>}</View>
      </ScrollView>
    </ScreenContainer>
  );
}

function Field({ label, value, onChangeText, keyboardType, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "decimal-pad" | "number-pad" | "numbers-and-punctuation"; placeholder?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} placeholder={placeholder} placeholderTextColor="#7E8DA4" style={styles.input} /></View>;
}

function Rating({ label, value, onChange, low, high }: { label: string; value: number; onChange: (value: number) => void; low: string; high: string }) {
  return <View style={styles.rating}><View style={styles.ratingHeader}><Text style={styles.ratingHint}>{low} · {high}</Text><Text style={styles.label}>{label}</Text></View><View style={styles.ratingRow}>{[1, 2, 3, 4, 5].map((item) => <Pressable key={item} accessibilityRole="button" accessibilityLabel={`${label} ${item} מתוך 5`} onPress={() => onChange(clamp(item))} style={[styles.ratingButton, value === item && styles.ratingButtonActive]}><Text style={[styles.ratingText, value === item && styles.ratingTextActive]}>{item}</Text></Pressable>)}</View></View>;
}

function RecoveryRow({ log }: { log: RecoveryLog }) {
  return <View style={styles.row}><View><Text style={styles.rowValue}>{log.sleepHours} שעות · ציון {calculateRecoveryScore(log)}</Text><Text style={styles.rowMeta}>איכות {log.sleepQuality}/5 · עייפות {log.fatigue}/5 · כאב {log.soreness}/5</Text></View><Text style={styles.rowDate}>{formatDate(log.date)}</Text></View>;
}

const styles = StyleSheet.create({ dateField: { gap: 4 }, dateRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 }, dateChip: { minHeight: 42, borderColor: "#3D587C", borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 }, dateChipActive: { backgroundColor: "#42D392", borderColor: "#42D392" }, dateChipText: { color: "#D9E2EF", fontWeight: "900", fontSize: 12 }, dateChipTextActive: { color: "#0B1224" }, dateInput: { flex: 1, backgroundColor: "#0B1224", borderColor: "#3D587C", borderWidth: 1, borderRadius: 9, color: "#F7F9FC", minHeight: 42, paddingHorizontal: 12, textAlign: "right", fontSize: 13 }, content: { gap: 13, paddingBottom: 35 }, heading: { alignItems: "flex-end", marginBottom: 4 }, eyebrow: { color: "#F5B72C", fontSize: 13, fontWeight: "800" }, title: { color: "#F7F9FC", fontSize: 30, fontWeight: "900" }, subtitle: { color: "#AAB7C8", fontSize: 13, marginTop: 5, textAlign: "right" }, scoreCard: { backgroundColor: "#132B2B", borderColor: "#42D392", borderWidth: 1, borderRadius: 17, padding: 16, alignItems: "flex-end" }, scoreLabel: { color: "#A9DACA", fontSize: 12, fontWeight: "800" }, score: { color: "#42D392", fontSize: 40, fontWeight: "900", marginTop: 4 }, scoreUnit: { fontSize: 16 }, scoreHint: { color: "#D9E2EF", fontSize: 11, textAlign: "right" }, card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 17, padding: 14, gap: 11 }, cardTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right" }, field: { gap: 4 }, label: { color: "#D9E2EF", fontSize: 12, fontWeight: "800", textAlign: "right" }, input: { backgroundColor: "#0B1224", borderColor: "#3D587C", borderWidth: 1, borderRadius: 9, color: "#F7F9FC", minHeight: 44, paddingHorizontal: 12, textAlign: "right", fontSize: 16 }, rating: { gap: 5 }, ratingHeader: { flexDirection: "row-reverse", justifyContent: "space-between" }, ratingHint: { color: "#7E8DA4", fontSize: 10 }, ratingRow: { flexDirection: "row-reverse", gap: 7 }, ratingButton: { flex: 1, minHeight: 42, borderColor: "#3D587C", borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center" }, ratingButtonActive: { backgroundColor: "#42D392", borderColor: "#42D392" }, ratingText: { color: "#D9E2EF", fontWeight: "900" }, ratingTextActive: { color: "#0B1224" }, noteInput: { backgroundColor: "#0B1224", borderColor: "#3D587C", borderWidth: 1, borderRadius: 9, color: "#F7F9FC", minHeight: 76, padding: 12, textAlign: "right", textAlignVertical: "top" }, saveButton: { backgroundColor: "#F5B72C", borderRadius: 10, minHeight: 48, alignItems: "center", justifyContent: "center" }, saveText: { color: "#0B1224", fontWeight: "900" }, message: { color: "#42D392", fontWeight: "800", textAlign: "right" }, row: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 10, borderTopColor: "#2C3B55", borderTopWidth: 1, paddingTop: 10 }, rowDate: { color: "#F5B72C", fontWeight: "900", fontSize: 11 }, rowValue: { color: "#F7F9FC", fontWeight: "800", textAlign: "right" }, rowMeta: { color: "#AAB7C8", fontSize: 10, textAlign: "right", marginTop: 3 }, empty: { color: "#AAB7C8", textAlign: "right", lineHeight: 20 }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] } });
