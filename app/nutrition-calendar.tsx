import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { dailyMealTotals, mealTotals, type Meal } from "@/lib/meal-plan";
import { addNutritionCalendarTotals, buildNutritionMonthCells, emptyNutritionCalendarTotals, nutritionWeekDates } from "@/lib/nutrition-calendar";
import { todayKey } from "@/lib/weekly-nutrition";

type DailyMealSnapshot = { meals: Meal[]; eaten: Record<string, boolean> };
type NutritionTotals = { calories: number; protein: number; carbohydrates: number; fats: number };

const emptyTotals: NutritionTotals = emptyNutritionCalendarTotals;
const weekdays = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export default function NutritionCalendarScreen() {
  const [mode, setMode] = useState<"day" | "week" | "month">("day");
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [monthKey, setMonthKey] = useState(todayKey().slice(0, 7));
  const [history, setHistory] = useState<Record<string, DailyMealSnapshot>>({});
  const [summaryHistory, setSummaryHistory] = useState<Record<string, NutritionTotals>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem("meal-plan-day-history"), AsyncStorage.getItem("nutrition-daily-history")])
      .then(([mealsValue, summariesValue]) => {
        if (mealsValue) setHistory(JSON.parse(mealsValue) as Record<string, DailyMealSnapshot>);
        if (summariesValue) {
          const values = JSON.parse(summariesValue) as ({ date: string } & NutritionTotals)[];
          setSummaryHistory(Object.fromEntries(values.map((item) => [item.date, { calories: Number(item.calories) || 0, protein: Number(item.protein) || 0, carbohydrates: Number(item.carbohydrates) || 0, fats: Number(item.fats) || 0 }])));
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const totalsForDate = (date: string): NutritionTotals => history[date]?.meals.length ? dailyMealTotals(history[date].meals) : summaryHistory[date] ?? emptyTotals;
  const selectedSnapshot = history[selectedDate];
  const selectedTotals = totalsForDate(selectedDate);
  const selectedMeals = selectedSnapshot?.meals ?? [];
  const monthCells = useMemo(() => buildNutritionMonthCells(monthKey), [monthKey]);
  const weekDates = useMemo(() => nutritionWeekDates(selectedDate), [selectedDate]);
  const weekTotals = weekDates.reduce((sum, date) => addNutritionCalendarTotals(sum, totalsForDate(date)), emptyTotals);
  const hasData = Object.keys(history).length > 0 || Object.keys(summaryHistory).length > 0;

  const openDay = (date: string) => { setSelectedDate(date); setMonthKey(date.slice(0, 7)); setMode("day"); };
  const step = (offset: number) => {
    if (mode === "month") { setMonthKey(shiftMonth(monthKey, offset)); return; }
    const next = shiftDate(selectedDate, mode === "week" ? offset * 7 : offset);
    setSelectedDate(next);
    setMonthKey(next.slice(0, 7));
  };

  return <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>חזרה לתזונה</Text></Pressable><Text style={styles.eyebrow}>מעקב לפי תאריך</Text><Text style={styles.title}>לוח תזונה</Text><Text style={styles.subtitle}>ארוחות, קלוריות ומאקרו לפי יום, שבוע וחודש</Text></View>
      <View style={styles.modeRow}>{([ ["day", "יום"], ["week", "שבוע"], ["month", "חודש"] ] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={[styles.modeButton, mode === value && styles.modeButtonActive]}><Text style={[styles.modeText, mode === value && styles.modeTextActive]}>{label}</Text></Pressable>)}</View>
      <View style={styles.navigator}><Pressable accessibilityRole="button" onPress={() => step(-1)} style={styles.navButton}><Text style={styles.navText}>›</Text></Pressable><View style={styles.navCenter}><Text style={styles.navTitle}>{mode === "month" ? monthLabel(monthKey) : mode === "week" ? `שבוע של ${dateLabel(weekDates[0])}` : dateLabel(selectedDate)}</Text><Text style={styles.navHint}>{mode === "month" ? "לחץ על יום כדי לראות את הארוחות" : mode === "week" ? "סיכום 7 ימים" : "פירוט ארוחות לתאריך שנבחר"}</Text></View><Pressable accessibilityRole="button" onPress={() => step(1)} style={styles.navButton}><Text style={styles.navText}>‹</Text></Pressable></View>
      {loading ? <ActivityIndicator color="#F5B72C" style={styles.loader} /> : !hasData ? <EmptyState /> : <>
        {mode === "day" && <DayDetails date={selectedDate} meals={selectedMeals} totals={selectedTotals} />}
        {mode === "week" && <WeekView dates={weekDates} totalsForDate={totalsForDate} total={weekTotals} onOpenDay={openDay} />}
        {mode === "month" && <MonthView cells={monthCells} totalsForDate={totalsForDate} selectedDate={selectedDate} onOpenDay={openDay} />}
      </>}
    </ScrollView>
  </ScreenContainer>;
}

function DayDetails({ date, meals, totals }: { date: string; meals: Meal[]; totals: NutritionTotals }) {
  return <><TotalsCard title={dateLabel(date)} totals={totals} /><View style={styles.detailCard}><Text style={styles.cardTitle}>ארוחות ביום זה</Text>{meals.length ? meals.map((meal) => { const values = mealTotals(meal); return <View key={meal.id} style={styles.mealRow}><View style={styles.mealValues}><Text style={styles.mealMacro}>ח {round(values.protein)} · פ {round(values.carbohydrates)} · ש {round(values.fats)}</Text><Text style={styles.mealCalories}>{round(values.calories)} קק״ל</Text></View><View style={styles.mealInfo}><Text style={styles.mealName}>{meal.title}</Text><Text style={styles.mealFoods}>{meal.foods.map((food) => food.name).join(" · ") || "ללא רכיבים"}</Text></View></View>; }) : <Text style={styles.emptyText}>לא נשמר פירוט ארוחות לתאריך זה. סיכום הערכים מוצג אם הוא קיים.</Text>}</View></>;
}

function WeekView({ dates, totalsForDate, total, onOpenDay }: { dates: string[]; totalsForDate: (date: string) => NutritionTotals; total: NutritionTotals; onOpenDay: (date: string) => void }) {
  return <><TotalsCard title="סיכום השבוע" totals={total} /><View style={styles.detailCard}><Text style={styles.cardTitle}>כל יום בשבוע</Text>{dates.map((date) => { const totals = totalsForDate(date); return <Pressable key={date} accessibilityRole="button" onPress={() => onOpenDay(date)} style={styles.weekRow}><Text style={styles.weekCalories}>{round(totals.calories)} קק״ל</Text><Text style={styles.weekMacros}>ח {round(totals.protein)} · פ {round(totals.carbohydrates)} · ש {round(totals.fats)}</Text><Text style={styles.weekDate}>{dateLabel(date)}</Text></Pressable>; })}</View></>;
}

function MonthView({ cells, totalsForDate, selectedDate, onOpenDay }: { cells: (string | null)[]; totalsForDate: (date: string) => NutritionTotals; selectedDate: string; onOpenDay: (date: string) => void }) {
  return <View style={styles.detailCard}><Text style={styles.cardTitle}>סיכום חודשי לפי יום</Text><View style={styles.weekdayRow}>{weekdays.map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}</View><View style={styles.monthGrid}>{cells.map((date, index) => { if (!date) return <View key={`blank-${index}`} style={styles.dayCell} />; const totals = totalsForDate(date); const active = date === selectedDate; const hasTotals = totals.calories > 0 || totals.protein > 0; return <Pressable key={date} accessibilityRole="button" accessibilityLabel={`יום ${date}, ${round(totals.calories)} קלוריות`} onPress={() => onOpenDay(date)} style={[styles.dayCell, hasTotals && styles.dayCellData, active && styles.dayCellActive]}><Text style={styles.dayNumber}>{date.slice(-2)}</Text>{hasTotals ? <><Text style={styles.dayCalories}>{round(totals.calories)}</Text><Text style={styles.dayProtein}>ח {round(totals.protein)}</Text></> : <Text style={styles.dayEmpty}>—</Text>}</Pressable>; })}</View><Text style={styles.monthHint}>בכל תא: קלוריות בשורה העליונה וחלבון בשורה התחתונה. לחץ על יום לפירוט הארוחות.</Text></View>;
}

function TotalsCard({ title, totals }: { title: string; totals: NutritionTotals }) { return <View style={styles.totalsCard}><Text style={styles.cardTitle}>{title}</Text><View style={styles.macroRow}><Macro value={round(totals.protein)} label="חלבון" color="#F7F9FC" /><Macro value={round(totals.carbohydrates)} label="פחמימות" color="#5DB4FF" /><Macro value={round(totals.fats)} label="שומן" color="#F5C542" /><Macro value={round(totals.calories)} label="קלוריות" color="#F5B72C" /></View></View>; }
function Macro({ value, label, color }: { value: number; label: string; color: string }) { return <View style={styles.macro}><Text style={[styles.macroValue, { color }]}>{value}</Text><Text style={styles.macroLabel}>{label}</Text></View>; }
function EmptyState() { return <View style={styles.detailCard}><Text style={styles.cardTitle}>עדיין אין היסטוריית תזונה</Text><Text style={styles.emptyText}>הארוחות שתערוך או תסמן בתפריט נשמרות מעכשיו לפי תאריך. חזור למסך התזונה והתחל לעדכן את הארוחות.</Text></View>; }
function round(value: number) { return Math.round(Number(value) || 0); }
function dateFromKey(key: string) { return new Date(`${key}T12:00:00`); }
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function shiftDate(key: string, days: number) { const date = dateFromKey(key); date.setDate(date.getDate() + days); return dateKey(date); }
function shiftMonth(key: string, offset: number) { const [year, month] = key.split("-").map(Number); const date = new Date(year, month - 1 + offset, 1, 12); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function dateLabel(key: string) { return new Intl.DateTimeFormat("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(dateFromKey(key)); }
function monthLabel(key: string) { const [year, month] = key.split("-").map(Number); return new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1, 12)); }

const styles = StyleSheet.create({
  content: { paddingBottom: 40 }, header: { alignItems: "flex-end", marginBottom: 15 }, back: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: "#4C8AC4" }, backText: { color: "#8BC7FF", fontWeight: "800", fontSize: 11 }, eyebrow: { color: "#F5B72C", fontWeight: "900", fontSize: 12, marginTop: 10 }, title: { color: "#F7F9FC", fontSize: 30, fontWeight: "900", textAlign: "right", marginTop: 3 }, subtitle: { color: "#9CAFC5", fontSize: 12, textAlign: "right", marginTop: 5 }, modeRow: { flexDirection: "row-reverse", backgroundColor: "#172943", borderRadius: 13, padding: 4, marginBottom: 12, gap: 4 }, modeButton: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10 }, modeButtonActive: { backgroundColor: "#F5B72C" }, modeText: { color: "#AFC0D5", fontWeight: "900" }, modeTextActive: { color: "#091424" }, navigator: { flexDirection: "row-reverse", alignItems: "center", gap: 9, backgroundColor: "#1B304F", borderColor: "#477AA8", borderWidth: 1, borderRadius: 16, padding: 10, marginBottom: 13 }, navButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#274665", alignItems: "center", justifyContent: "center" }, navText: { color: "#F5C542", fontSize: 29, fontWeight: "900" }, navCenter: { flex: 1, alignItems: "center" }, navTitle: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "center" }, navHint: { color: "#9CAFC5", fontSize: 9, textAlign: "center", marginTop: 4 }, loader: { marginTop: 50 }, totalsCard: { backgroundColor: "#182A44", borderColor: "#3B729E", borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 12 }, cardTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right", marginBottom: 10 }, macroRow: { flexDirection: "row-reverse", gap: 6 }, macro: { flex: 1, alignItems: "center", backgroundColor: "#0D1B2E", borderRadius: 10, paddingVertical: 9 }, macroValue: { fontSize: 17, fontWeight: "900" }, macroLabel: { color: "#A8BAD0", fontSize: 8, marginTop: 3 }, detailCard: { backgroundColor: "#15263E", borderColor: "#2D4D6C", borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 12 }, mealRow: { flexDirection: "row-reverse", alignItems: "center", borderTopColor: "#2D4D6C", borderTopWidth: 1, paddingVertical: 11, gap: 8 }, mealInfo: { flex: 1, alignItems: "flex-end" }, mealName: { color: "#F7F9FC", fontSize: 14, fontWeight: "900" }, mealFoods: { color: "#9CAFC5", fontSize: 9, textAlign: "right", marginTop: 4, lineHeight: 14 }, mealValues: { width: 105, alignItems: "flex-start" }, mealCalories: { color: "#F5C542", fontSize: 12, fontWeight: "900" }, mealMacro: { color: "#8BC7FF", fontSize: 8, marginTop: 4 }, emptyText: { color: "#A8BAD0", fontSize: 12, lineHeight: 19, textAlign: "right" }, weekRow: { flexDirection: "row-reverse", alignItems: "center", borderTopColor: "#2D4D6C", borderTopWidth: 1, paddingVertical: 11, gap: 7 }, weekDate: { color: "#F7F9FC", fontSize: 10, fontWeight: "800", flex: 1, textAlign: "right" }, weekMacros: { color: "#8BC7FF", fontSize: 9, textAlign: "center" }, weekCalories: { color: "#F5C542", fontSize: 10, fontWeight: "900", width: 62, textAlign: "left" }, weekdayRow: { flexDirection: "row-reverse", marginBottom: 5 }, weekday: { flex: 1, color: "#9CAFC5", fontSize: 10, fontWeight: "900", textAlign: "center" }, monthGrid: { flexDirection: "row-reverse", flexWrap: "wrap" }, dayCell: { width: "14.2857%", minHeight: 65, borderWidth: 0.5, borderColor: "#284763", paddingTop: 6, alignItems: "center", backgroundColor: "#101F34" }, dayCellData: { backgroundColor: "#203C5C" }, dayCellActive: { borderColor: "#F5B72C", borderWidth: 1.5, backgroundColor: "#4B3C16" }, dayNumber: { color: "#F7F9FC", fontSize: 12, fontWeight: "900" }, dayCalories: { color: "#F5C542", fontSize: 9, fontWeight: "900", marginTop: 5 }, dayProtein: { color: "#8BC7FF", fontSize: 8, marginTop: 2 }, dayEmpty: { color: "#526982", fontSize: 10, marginTop: 12 }, monthHint: { color: "#9CAFC5", fontSize: 10, textAlign: "right", marginTop: 11, lineHeight: 16 },
});
