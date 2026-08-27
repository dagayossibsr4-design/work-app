import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { notifyNutritionStorageChanged, requestNutritionCloudSave } from "@/lib/nutrition-persistence";
import {
  CYCLE_STORAGE_KEY,
  cycleWeekdays,
  defaultCycleMaterials,
  normalizeCycleRecords,
  type CycleRecord,
} from "@/lib/cycle-tracking";

const hebrewMonthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const calendarWeekdays = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "שבת"] as const;
type DateField = "startDate" | "endDate";

const dateToKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const keyToDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
};
const createCalendarDays = (month: Date) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

const createEmptyCycle = (): CycleRecord => ({
  id: `cycle-${Date.now()}`,
  name: "",
  startDate: "",
  endDate: "",
  selectedDays: [0],
  materialsByDay: { "0": [] },
  customMaterials: [],
  dayIndexVersion: 2,
});

export default function CycleTrackingScreen() {
  const [draft, setDraft] = useState<CycleRecord>(createEmptyCycle);
  const [saved, setSaved] = useState<CycleRecord[]>([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customMaterial, setCustomMaterial] = useState("");
  const [status, setStatus] = useState("");
  const cycleScrollRef = useRef<ScrollView>(null);
  const [datePickerField, setDatePickerField] = useState<DateField | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CYCLE_STORAGE_KEY)
      .then((raw) => {
        if (raw) setSaved(normalizeCycleRecords(JSON.parse(raw)));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const showSuccessToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2200);
  };

  const materials = useMemo(
    () => [
      ...defaultCycleMaterials,
      ...draft.customMaterials.filter(
        (item) => !defaultCycleMaterials.includes(item as typeof defaultCycleMaterials[number]),
      ),
    ],
    [draft.customMaterials],
  );

  const persist = async (next: CycleRecord[]) => {
    try {
      await AsyncStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(next));
      setSaved(next);
      notifyNutritionStorageChanged();
      requestNutritionCloudSave();
      return true;
    } catch {
      return false;
    }
  };

  const updateDraft = <K extends keyof CycleRecord>(key: K, value: CycleRecord[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const toggleDay = (day: number) => {
    setDraft((current) => {
      const isSelected = current.selectedDays.includes(day);
      const selectedDays = isSelected
        ? current.selectedDays.filter((item) => item !== day)
        : [...current.selectedDays, day].sort((a, b) => a - b);
      return {
        ...current,
        selectedDays: selectedDays.length ? selectedDays : [day],
        materialsByDay: {
          ...current.materialsByDay,
          [String(day)]: current.materialsByDay[String(day)] ?? [],
        },
      };
    });
    setSelectedDay(day);
  };

  const toggleMaterial = (material: string) => {
    const dayKey = String(selectedDay);
    setDraft((current) => {
      const currentMaterials = current.materialsByDay[dayKey] ?? [];
      const nextMaterials = currentMaterials.includes(material)
        ? currentMaterials.filter((item) => item !== material)
        : [...currentMaterials, material];
      return {
        ...current,
        materialsByDay: { ...current.materialsByDay, [dayKey]: nextMaterials },
      };
    });
  };

  const addCustomMaterial = () => {
    const value = customMaterial.trim();
    if (!value || materials.includes(value)) return;
    setDraft((current) => ({
      ...current,
      customMaterials: [...current.customMaterials, value],
    }));
    setCustomMaterial("");
  };

  const openCalendar = (field: DateField) => {
    const selected = keyToDate(draft[field]);
    setCalendarMonth(selected ?? new Date());
    setDatePickerField(field);
  };
  const selectCalendarDate = (date: Date) => {
    if (!datePickerField) return;
    updateDraft(datePickerField, dateToKey(date));
    setDatePickerField(null);
  };
  const changeCalendarMonth = (offset: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const startEdit = (cycle: CycleRecord) => {
    setDraft({
      ...cycle,
      selectedDays: [...cycle.selectedDays],
      materialsByDay: Object.fromEntries(
        Object.entries(cycle.materialsByDay).map(([day, names]) => [day, [...names]]),
      ),
      customMaterials: [...cycle.customMaterials],
    });
    setEditingId(cycle.id);
    setSelectedDay(cycle.selectedDays[0] ?? 0);
    setCustomMaterial("");
    setStatus("מצב עריכה פתוח — ניתן לשנות את כל השדות.");
    setTimeout(() => cycleScrollRef.current?.scrollTo({ y: 120, animated: true }), 100);
  };

  const startNew = () => {
    setDraft(createEmptyCycle());
    setEditingId(null);
    setSelectedDay(0);
    setCustomMaterial("");
    setStatus("");
    setTimeout(() => cycleScrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
  };

  const saveCycle = async () => {
    if (!draft.name.trim()) {
      setStatus("יש להזין שם מחזור לפני השמירה.");
      return;
    }
    const normalized: CycleRecord = {
      ...draft,
      name: draft.name.trim(),
      selectedDays: [...new Set(draft.selectedDays)].sort((a, b) => a - b),
      dayIndexVersion: 2,
    };
    const next = editingId
      ? saved.map((cycle) => (cycle.id === editingId ? normalized : cycle))
      : [...saved, normalized];
    const wasEditing = Boolean(editingId);
    const didPersist = await persist(next);
    if (!didPersist) {
      setStatus("השמירה נכשלה. נסה שוב.");
      return;
    }
    setDraft(createEmptyCycle());
    setEditingId(null);
    setSelectedDay(0);
    setCustomMaterial("");
    setStatus(wasEditing ? "המחזור עודכן ונשמר." : "מחזור חדש נשמר.");
    showSuccessToast(wasEditing ? "ימי המחזור עודכנו בהצלחה" : "ימי המחזור נשמרו בהצלחה");
  };

  const deleteCycle = (id: string) => {
    Alert.alert("מחיקת מחזור", "למחוק את המחזור מרשימת התיעוד?", [
      { text: "ביטול", style: "cancel" },
      {
        text: "מחיקה",
        style: "destructive",
        onPress: () => {
          void persist(saved.filter((cycle) => cycle.id !== id));
          if (editingId === id) startNew();
        },
      },
    ]);
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView
        ref={cycleScrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>תוספי תזונה</Text>
            <Text style={styles.title}>מחזורי תיעוד</Text>
            <Text style={styles.subtitle}>בחירת ימים, חומרים ומחזורים</Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>מעקב בלבד</Text>
          <Text style={styles.noticeText}>
            לתיעוד בלבד. אין כאן מינון, פרוטוקול או המלצה רפואית.
          </Text>
        </View>

        <View style={[styles.card, editingId ? styles.editingCard : null]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{editingId ? "עריכת מחזור" : "מחזור חדש"}</Text>
            {editingId ? (
              <Pressable onPress={startNew} hitSlop={8} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </Pressable>
            ) : null}
          </View>
          {editingId ? (
            <Text style={styles.editModeHint}>✓ הטופס פתוח לעריכה — שנה את הערכים ולחץ על שמור עדכון</Text>
          ) : null}

          <TextInput
            editable
            value={draft.name}
            onChangeText={(value) => updateDraft("name", value)}
            placeholder="שם המחזור"
            placeholderTextColor="#7E8DA4"
            style={styles.input}
            textAlign="right"
            returnKeyType="next"
          />
          <View style={styles.row}>
            <Pressable onPress={() => openCalendar("startDate")} style={styles.dateField} accessibilityRole="button" accessibilityLabel="בחירת תאריך התחלה">
              <Text style={draft.startDate ? styles.dateValue : styles.datePlaceholder}>{draft.startDate || "התחלה"}</Text>
              <Text style={styles.calendarIcon}>▣</Text>
            </Pressable>
            <Pressable onPress={() => openCalendar("endDate")} style={styles.dateField} accessibilityRole="button" accessibilityLabel="בחירת תאריך סיום">
              <Text style={draft.endDate ? styles.dateValue : styles.datePlaceholder}>{draft.endDate || "סיום"}</Text>
              <Text style={styles.calendarIcon}>▣</Text>
            </Pressable>
          </View>


          <Text style={styles.sectionTitle}>בחר ימים</Text>
          <View style={styles.chips}>
            {cycleWeekdays.map((day, index) => {
              const active = draft.selectedDays.includes(index);
              return (
                <Pressable
                  key={day}
                  onPress={() => toggleDay(index)}
                  style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`יום ${day}`}
                >
                  <Text numberOfLines={1} style={[styles.chipText, active && styles.chipTextActive]}>{day}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>חומרים ליום {cycleWeekdays[selectedDay]}</Text>
          <Text style={styles.hint}>בחר את החומרים שיופיעו ביום זה.</Text>
          <View style={styles.materials}>
            {materials.map((material) => {
              const active = (draft.materialsByDay[String(selectedDay)] ?? []).includes(material);
              return (
                <Pressable
                  key={material}
                  onPress={() => toggleMaterial(material)}
                  style={({ pressed }) => [styles.materialRow, active && styles.materialRowActive, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`${active ? "הסר" : "הוסף"} ${material} ליום ${cycleWeekdays[selectedDay]}`}
                >
                  <Text style={[styles.materialBadge, active && styles.materialBadgeActive]}>{active ? "✓" : "＋"}</Text>
                  <Text style={styles.materialName}>{material}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.customRow}>
            <TextInput
              editable
              value={customMaterial}
              onChangeText={setCustomMaterial}
              placeholder="חומר מותאם אישית"
              placeholderTextColor="#7E8DA4"
              style={styles.customInput}
              textAlign="right"
              onSubmitEditing={addCustomMaterial}
            />
            <Pressable onPress={addCustomMaterial} style={styles.customButton}>
              <Text style={styles.customButtonText}>הוסף</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => void saveCycle()} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
            <Text style={styles.saveButtonText}>{editingId ? "שמור עדכון למחזור" : "שמור מחזור תיעוד"}</Text>
          </Pressable>
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>מחזורים שנשמרו ({saved.length})</Text>
            <Pressable onPress={startNew} style={styles.newButton}>
              <Text style={styles.newButtonText}>＋ חדש</Text>
            </Pressable>
          </View>
          {saved.length ? (
            saved.slice().reverse().map((cycle) => (
              <View key={cycle.id} style={styles.savedRow}>
                <View style={styles.savedHeader}>
                  <View style={styles.savedActions}>
                    <Pressable
                      onPress={() => startEdit(cycle)}
                      hitSlop={8}
                      style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`ערוך את ${cycle.name}`}
                      testID={`edit-cycle-${cycle.id}`}
                    >
                      <Text style={styles.editButtonText}>ערוך מחזור</Text>
                    </Pressable>
                    <Pressable onPress={() => deleteCycle(cycle.id)} hitSlop={8} style={styles.deleteButton} accessibilityRole="button">
                      <Text style={styles.deleteButtonText}>מחיקה</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.savedName}>{cycle.name}</Text>
                </View>
                <Text style={styles.savedMeta}>
                  {cycle.startDate || "ללא התחלה"} · {cycle.endDate || "ללא סיום"} · ימים: {cycle.selectedDays.map((day) => cycleWeekdays[day]).join(", ")}
                </Text>
                <Text style={styles.savedMaterials}>
                  {[...new Set(Object.values(cycle.materialsByDay).flat())].join(" · ") || "לא נבחרו חומרים"}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>עדיין לא נשמר מחזור תיעוד.</Text>
          )}
        </View>
      </ScrollView>
      <Modal visible={Boolean(datePickerField)} transparent animationType="fade" onRequestClose={() => setDatePickerField(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarModalTop}>
              <Text style={styles.calendarModalTitle}>בחירת תאריך</Text>
              <Pressable onPress={() => setDatePickerField(null)} hitSlop={8} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="סגור לוח שנה"><Text style={styles.closeButtonText}>×</Text></Pressable>
            </View>
            <Text style={styles.calendarFieldHint}>בחירת {datePickerField === "startDate" ? "תאריך התחלה" : "תאריך סיום"}</Text>
            <View style={styles.calendarHeader}>
              <Pressable onPress={() => changeCalendarMonth(-1)} hitSlop={8} style={styles.monthButton}><Text style={styles.monthButtonText}>‹</Text></Pressable>
              <Text style={styles.calendarTitle}>{hebrewMonthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</Text>
              <Pressable onPress={() => changeCalendarMonth(1)} hitSlop={8} style={styles.monthButton}><Text style={styles.monthButtonText}>›</Text></Pressable>
            </View>
            <View style={styles.calendarWeekRow}>{calendarWeekdays.map((day) => <Text key={day} style={styles.calendarWeekday}>{day}</Text>)}</View>
            <View style={styles.calendarGrid}>{createCalendarDays(calendarMonth).map((date) => {
              const key = dateToKey(date);
              const selected = datePickerField !== null && key === draft[datePickerField];
              const inMonth = date.getMonth() === calendarMonth.getMonth();
              return <Pressable key={key} onPress={() => selectCalendarDate(date)} style={[styles.calendarDay, !inMonth && styles.calendarDayMuted, selected && styles.calendarDaySelected]}><Text style={[styles.calendarDayText, !inMonth && styles.calendarDayTextMuted, selected && styles.calendarDayTextSelected]}>{date.getDate()}</Text></Pressable>;
            })}</View>
            <Pressable onPress={() => setDatePickerField(null)} style={styles.calendarDoneButton}><Text style={styles.calendarDoneText}>סיום</Text></Pressable>
          </View>
        </View>
      </Modal>
      {toastMessage ? (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastText}>✓ {toastMessage}</Text>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 42, gap: 14 },
  header: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between" },
  headerText: { flex: 1 },
  back: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: "#2C3B55", alignItems: "center", justifyContent: "center" },
  backText: { color: "#F5B72C", fontSize: 28, lineHeight: 30 },
  eyebrow: { color: "#F5B72C", fontSize: 12, fontWeight: "900", textAlign: "right" },
  title: { color: "#F7F9FC", fontSize: 23, lineHeight: 28, fontWeight: "900", textAlign: "right", marginTop: 3, flexShrink: 1 },
  subtitle: { color: "#AAB7C8", fontSize: 10, lineHeight: 14, textAlign: "right", marginTop: 4, flexShrink: 1 },
  notice: { backgroundColor: "#2A2110", borderColor: "#8A6B20", borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  noticeTitle: { color: "#F5D27A", fontSize: 13, fontWeight: "900", textAlign: "right" },
  noticeText: { color: "#E4D4AA", fontSize: 9, lineHeight: 14, textAlign: "right", flexShrink: 1 },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  editingCard: { borderColor: "#42D392", borderWidth: 1.5 },
  cardHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right" },
  editModeHint: { color: "#42D392", fontSize: 10, fontWeight: "900", textAlign: "right" },
  input: { minHeight: 42, backgroundColor: "#0B1224", borderColor: "#65BDF6", borderWidth: 1, borderRadius: 9, color: "#F7F9FC", paddingHorizontal: 10 },
  row: { flexDirection: "row-reverse", gap: 8, width: "100%" },
  inputSmall: { flex: 1, width: 0, minWidth: 0, minHeight: 42, backgroundColor: "#0B1224", borderColor: "#65BDF6", borderWidth: 1, borderRadius: 9, color: "#F7F9FC", paddingHorizontal: 10 },
  dateField: { flex: 1, minWidth: 0, minHeight: 42, backgroundColor: "#0B1224", borderColor: "#65BDF6", borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 6 },
  dateValue: { flex: 1, color: "#F7F9FC", fontSize: 11, textAlign: "right" },
  datePlaceholder: { flex: 1, color: "#7E8DA4", fontSize: 11, textAlign: "right" },
  calendarIcon: { color: "#F5B72C", fontSize: 13 },
  calendarBox: { backgroundColor: "#0B1224", borderColor: "#52759C", borderWidth: 1, borderRadius: 10, padding: 9, gap: 7 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(3, 9, 22, 0.72)", alignItems: "center", justifyContent: "center", padding: 20 },
  calendarModal: { width: "100%", maxWidth: 360, backgroundColor: "#16233A", borderColor: "#65BDF6", borderWidth: 1, borderRadius: 18, padding: 16, gap: 10, shadowColor: "#000000", shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  calendarModalTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  calendarModalTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right" },
  closeButton: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#253653", alignItems: "center", justifyContent: "center" },
  closeButtonText: { color: "#F5B72C", fontSize: 22, lineHeight: 24 },
  calendarDoneButton: { minHeight: 40, borderRadius: 9, backgroundColor: "#42D392", alignItems: "center", justifyContent: "center", marginTop: 2 },
  calendarDoneText: { color: "#07111F", fontSize: 11, fontWeight: "900" },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calendarTitle: { flex: 1, color: "#F7F9FC", fontSize: 13, fontWeight: "900", textAlign: "center" },
  monthButton: { width: 28, height: 28, borderRadius: 7, backgroundColor: "#253653", alignItems: "center", justifyContent: "center" },
  monthButtonText: { color: "#F5B72C", fontSize: 22, lineHeight: 24 },
  calendarFieldHint: { color: "#42D392", fontSize: 9, fontWeight: "900", textAlign: "right" },
  calendarWeekRow: { flexDirection: "row-reverse", gap: 3 },
  calendarWeekday: { flex: 1, color: "#AAB7C8", fontSize: 9, fontWeight: "900", textAlign: "center" },
  calendarGrid: { flexDirection: "row-reverse", flexWrap: "wrap" },
  calendarDay: { width: "14.2857%", height: 32, alignItems: "center", justifyContent: "center", borderRadius: 7 },
  calendarDayMuted: { opacity: 0.35 },
  calendarDaySelected: { backgroundColor: "#F5B72C" },
  calendarDayText: { color: "#D9E2EF", fontSize: 10, fontWeight: "800" },
  calendarDayTextMuted: { color: "#7E8DA4" },
  calendarDayTextSelected: { color: "#0B1224", fontWeight: "900" },
  sectionTitle: { color: "#F5D27A", fontSize: 12, fontWeight: "900", textAlign: "right", marginTop: 3 },
  hint: { color: "#AAB7C8", fontSize: 9, textAlign: "right", lineHeight: 13, flexShrink: 1 },
  chips: { flexDirection: "row-reverse", flexWrap: "nowrap", gap: 4, width: "100%" },
  chip: { flex: 1, minWidth: 0, height: 38, alignItems: "center", justifyContent: "center", borderColor: "#52759C", borderWidth: 1, borderRadius: 8, paddingHorizontal: 1 },
  chipActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
  chipText: { color: "#D9E2EF", fontSize: 10, fontWeight: "900", includeFontPadding: false },
  chipTextActive: { color: "#0B1224" },
  materials: { gap: 6 },
  materialRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0F1F35", borderColor: "#2F5275", borderWidth: 1, borderRadius: 9, padding: 10 },
  materialRowActive: { backgroundColor: "#123C35", borderColor: "#42D392" },
  materialName: { flex: 1, minWidth: 0, color: "#F7F9FC", fontSize: 11, fontWeight: "800", textAlign: "right", flexShrink: 1 },
  materialBadge: { color: "#7E8DA4", fontSize: 15, fontWeight: "900" },
  materialBadgeActive: { color: "#42D392" },
  customRow: { flexDirection: "row-reverse", gap: 7 },
  customInput: { flex: 1, minHeight: 40, backgroundColor: "#0B1224", borderColor: "#52759C", borderWidth: 1, borderRadius: 8, color: "#F7F9FC", paddingHorizontal: 9 },
  customButton: { backgroundColor: "#253653", borderColor: "#52759C", borderWidth: 1, borderRadius: 8, paddingHorizontal: 13, justifyContent: "center" },
  customButtonText: { color: "#D9EEFF", fontSize: 10, fontWeight: "900" },
  saveButton: { minHeight: 44, borderRadius: 10, backgroundColor: "#42D392", alignItems: "center", justifyContent: "center", marginTop: 3 },
  saveButtonText: { color: "#07111F", fontSize: 12, fontWeight: "900" },
  toast: { position: "absolute", left: 20, right: 20, bottom: 24, minHeight: 42, borderRadius: 12, backgroundColor: "#123C35", borderColor: "#42D392", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, shadowColor: "#000000", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  toastText: { color: "#D9FFF0", fontSize: 12, fontWeight: "900", textAlign: "center" },
  status: { color: "#A7F3D0", fontSize: 10, textAlign: "right" },
  savedRow: { backgroundColor: "#0F1F35", borderRadius: 9, padding: 10, gap: 5 },
  savedHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  savedActions: { flexDirection: "row-reverse", gap: 5 },
  savedName: { flex: 1, color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right" },
  savedMeta: { color: "#AAB7C8", fontSize: 9, lineHeight: 14, textAlign: "right" },
  savedMaterials: { color: "#A7F3D0", fontSize: 10, textAlign: "right" },
  editButton: { borderColor: "#65BDF6", borderWidth: 1, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: "#162A47" },
  editButtonText: { color: "#D9EEFF", fontSize: 10, fontWeight: "900" },
  deleteButton: { borderColor: "#8F3C4B", borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 6 },
  deleteButtonText: { color: "#FFB6C1", fontSize: 9, fontWeight: "900" },
  cancelButton: { borderColor: "#52759C", borderWidth: 1, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6 },
  cancelButtonText: { color: "#D9EEFF", fontSize: 9, fontWeight: "900" },
  newButton: { backgroundColor: "#F5B72C", borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6 },
  newButtonText: { color: "#0B1224", fontSize: 9, fontWeight: "900" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  empty: { color: "#AAB7C8", fontSize: 10, textAlign: "right" },
});
