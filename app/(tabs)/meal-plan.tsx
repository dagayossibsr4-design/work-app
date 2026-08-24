import { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, usePathname } from "expo-router";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  Keyboard,
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import {
  dailyMealTotals,
  defaultMeals,
  mealFoodTotals,
  mealTotals,
  normalizeMealsTo100Grams,
  type Meal,
} from "@/lib/meal-plan";
import { useWorkoutStore as useNutritionStore } from "@/lib/workout-store";
import {
  cookingConversionInfo,
  weightModeLabels,
  type WeightMode,
} from "@/lib/cooking-weight";
import { todayKey } from "@/lib/weekly-nutrition";
import {
  conversionFoods,
  macrosForGrams,
  sourceForFood,
  type ConversionFood,
  type ConversionGroup,
} from "@/lib/food-conversions";
import {
  mealPlanGoalLabel,
} from "@/lib/meal-plan-targets";
import {
  completeMenuProfile,
  createMenuProfiles,
  type MenuProfile,
  type MenuProfiles,
} from "@/lib/menu-profiles";
import {
  cloneMeals,
} from "@/lib/meal-plan-versions";
import { foodItems, type FoodGroup } from "@/lib/food-nutrition";

type WaterEntry = {
  id: string;
  amount: number;
  at: string;
};

type DailyMealSnapshot = {
  meals: Meal[];
  eaten: Record<string, boolean>;
};

export default function MealPlanScreen() {
  const standalone = usePathname() === "/meals";
  const { nutritionProfile, updateNutritionProfile } = useNutritionStore();
  const mealFoods = useMemo(() => [...(nutritionProfile.customFoods ?? []), ...foodItems], [nutritionProfile.customFoods]);
  
  const [meals, setMeals] = useState<Meal[]>(defaultMeals);
  const [eaten, setEaten] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<"planned" | "eaten">("planned");
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonthKey, setCalendarMonthKey] = useState(todayKey().slice(0, 7));
  const [calendarDraftDate, setCalendarDraftDate] = useState(todayKey());
  const [eatenHistory, setEatenHistory] = useState<Record<string, Record<string, boolean>>>({});
  const [mealHistoryByDate, setMealHistoryByDate] = useState<Record<string, DailyMealSnapshot>>({});
  const [waterHistory, setWaterHistory] = useState<Record<string, { consumed: number; goal: number }>>({});
  const [waterEvents, setWaterEvents] = useState<Record<string, WaterEntry[]>>({});
  const [waterGoalDraft, setWaterGoalDraft] = useState("2000");
  const [hydrated, setHydrated] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [savingActive, setSavingActive] = useState(false);
  const [saveButtonText, setSaveButtonText] = useState("💾 שמור שינויים בתפריט");
  const [saveButtonColor, setSaveButtonColor] = useState("#F59E0B");
  const [menuProfiles, setMenuProfiles] = useState<MenuProfiles>(() => createMenuProfiles(nutritionProfile));
  const [activeGoal, setActiveGoal] = useState(nutritionProfile.goal);
  const [weightInfoFoodId, setWeightInfoFoodId] = useState<string | null>(null);
  
  const [editingQuantityKey, setEditingQuantityKey] = useState<string | null>(null);
  const [quantityDraft, setQuantityDraft] = useState("");
  const [editingInlineFoodId, setEditingInlineFoodId] = useState<string | null>(null);
  const [inlineCaloriesDraft, setInlineCaloriesDraft] = useState("");

  const [expandedMealIds, setExpandedMealIds] = useState<string[]>(["meal-1", "meal-2", "meal-3", "meal-4", "meal-5"]);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [mealEditBackup, setMealEditBackup] = useState<Meal | null>(null);
  const [mealFoodSearch, setMealFoodSearch] = useState("");
  const [addFoodGroupFilter, setAddFoodGroupFilter] = useState<FoodGroup | null>(null);
  const [selectedAddFoodKey, setSelectedAddFoodKey] = useState<string | null>(null);
  const mealPlanScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (Platform.OS === "android") {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const activeWater = waterHistory[selectedDate] ?? { consumed: 0, goal: 2000 };
  const waterProgress = activeWater.goal > 0 ? Math.min(activeWater.consumed / activeWater.goal, 1) : 0;
  const mealPlanOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("meal-plan-state"),
      AsyncStorage.getItem("meal-plan-eaten-history"),
      AsyncStorage.getItem("meal-plan-day-history"),
      AsyncStorage.getItem("meal-plan-profiles"),
      AsyncStorage.getItem("nutrition-water-history"),
      AsyncStorage.getItem("nutrition-water-events"),
    ])
      .then(([value, eatenHistoryValue, mealHistoryValue, profiles, waterHistoryValue, waterEventsValue]) => {
        let baseMeals = defaultMeals;
        if (value) {
          try {
            const saved = JSON.parse(value) as { meals?: Meal[] };
            if (saved.meals?.length) {
              baseMeals = normalizeMealsTo100Grams(saved.meals);
            }
          } catch {}
        }

        if (mealHistoryValue) {
          try {
            const savedHistory = JSON.parse(mealHistoryValue) as Record<string, DailyMealSnapshot>;
            const todaySnapshot = savedHistory[todayKey()];
            if (todaySnapshot?.meals?.length) {
              setMeals(normalizeMealsTo100Grams(todaySnapshot.meals));
              setEaten(todaySnapshot.eaten ?? {});
            } else {
              setMeals(baseMeals);
              setEaten({});
            }
            setMealHistoryByDate(savedHistory);
          } catch {
            setMeals(baseMeals);
          }
        } else {
          setMeals(baseMeals);
        }

        if (eatenHistoryValue) {
          try {
            const savedHistory = JSON.parse(eatenHistoryValue) as Record<string, Record<string, boolean>>;
            setEatenHistory(savedHistory);
          } catch {}
        }

        if (profiles) {
          try {
            const savedProfiles = JSON.parse(profiles) as MenuProfiles;
            setMenuProfiles(savedProfiles);
            const savedActive = savedProfiles[nutritionProfile.goal] ?? savedProfiles.ניטרלי;
            if (savedActive) setActiveGoal(savedActive.goal);
          } catch {}
        }

        if (waterHistoryValue) {
          try {
            setWaterHistory(JSON.parse(waterHistoryValue));
          } catch {}
        }

        if (waterEventsValue) {
          try {
            setWaterEvents(JSON.parse(waterEventsValue));
          } catch {}
        }

        setHydrated(true);
      })
      .catch(() => setHydrated(true));
  }, []);

  const persistEverything = async (overrideMeals?: Meal[]) => {
    const currentMeals = overrideMeals ?? meals;
    const nextMealsState = JSON.stringify({
      meals: currentMeals,
      eaten: selectedDate === todayKey() ? eaten : eatenHistory[todayKey()] ?? {},
    });
    const nextEatenHistory = JSON.stringify({ ...eatenHistory, [selectedDate]: eaten });
    const nextDayHistory = JSON.stringify({ ...mealHistoryByDate, [selectedDate]: { meals: cloneMeals(currentMeals), eaten } });

    try {
      await AsyncStorage.multiSet([
        ["meal-plan-state", nextMealsState],
        ["meal-plan-eaten-history", nextEatenHistory],
        ["meal-plan-day-history", nextDayHistory],
        ["meal-plan-profiles", JSON.stringify(menuProfiles)],
        ["nutrition-water-history", JSON.stringify(waterHistory)],
        ["nutrition-water-events", JSON.stringify(waterEvents)],
      ]);
    } catch {}
  };

  const manualSaveAction = async () => {
    if (savingActive) return;
    setSavingActive(true);
    setSaveButtonText("⏳ שומר נתונים...");
    setSaveButtonColor("#2563EB");
    try {
      await persistEverything();
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
      setSaveButtonText("✓ נשמר בהצלחה!");
      setSaveButtonColor("#10B981");
      setSaveSuccessNotice(true);
      setTimeout(() => {
        setSaveSuccessNotice(false);
        setSaveButtonText("💾 שמור שינויים בתפריט");
        setSaveButtonColor("#F59E0B");
      }, 2500);
    } catch {
      setSaveButtonText("! שגיאה בשמירה");
      setSaveButtonColor("#EF4444");
      setTimeout(() => {
        setSaveButtonText("💾 שמור שינויים בתפריט");
        setSaveButtonColor("#F59E0B");
      }, 3000);
    } finally {
      setSavingActive(false);
    }
  };

  useEffect(() => {
    if (hydrated) {
      void persistEverything().catch(() => undefined);
    }
  }, [meals, eaten, eatenHistory, mealHistoryByDate, selectedDate, hydrated, menuProfiles, waterHistory, waterEvents]);

  const addWater = (amount: number) => {
    const entry: WaterEntry = { id: `${Date.now()}-${amount}`, amount, at: new Date().toISOString() };
    setWaterEvents((current) => ({ ...current, [selectedDate]: [...(current[selectedDate] ?? []), entry] }));
    setWaterHistory((current) => ({
      ...current,
      [selectedDate]: {
        consumed: Math.max(0, (current[selectedDate]?.consumed ?? 0) + amount),
        goal: Math.max(250, current[selectedDate]?.goal ?? 2000),
      },
    }));
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  };

  const saveWaterGoal = () => {
    const nextGoal = Math.min(10000, Math.max(250, Number(waterGoalDraft.replace(/[^0-9]/g, "")) || 2000));
    setWaterGoalDraft(String(nextGoal));
    setWaterHistory((current) => ({
      ...current,
      [selectedDate]: {
        consumed: current[selectedDate]?.consumed ?? 0,
        goal: nextGoal,
      },
    }));
  };

  const resetWater = () => {
    setWaterHistory((current) => ({
      ...current,
      [selectedDate]: { consumed: 0, goal: current[selectedDate]?.goal ?? 2000 },
    }));
  };

  const activeProfile = menuProfiles[activeGoal];
  const targetCalories = Number(activeProfile.calories) || 0;

  const commitProfile = (next: MenuProfile) => {
    setMenuProfiles((current) => ({ ...current, [next.goal]: next }));
    updateNutritionProfile({
      ...nutritionProfile,
      goal: next.goal,
      calorieTarget: next.calories,
      proteinTarget: next.protein,
      carbohydratesTarget: next.carbohydrates,
      fatsTarget: next.fats,
      autoMacroField: next.autoField,
    });
  };

  const patchActiveProfile = (patch: Partial<MenuProfile>) => commitProfile({ ...activeProfile, ...patch });
  const completeActiveProfile = () => commitProfile(completeMenuProfile(activeProfile));

  const selectGoal = (goal: MenuProfile["goal"]) => {
    setActiveGoal(goal);
    const next = menuProfiles[goal];
    updateNutritionProfile({
      ...nutritionProfile,
      goal,
      calorieTarget: next.calories,
      proteinTarget: next.protein,
      carbohydratesTarget: next.carbohydrates,
      fatsTarget: next.fats,
      autoMacroField: next.autoField,
    });
  };

  const toggleEaten = (id: string) => setEaten((current) => ({ ...current, [id]: !current[id] }));

  const selectMealDate = (nextDate: string) => {
    const currentSnapshot = { meals: cloneMeals(meals), eaten };
    const nextSnapshot = mealHistoryByDate[nextDate];
    setMealHistoryByDate((current) => ({ ...current, [selectedDate]: currentSnapshot }));
    setSelectedDate(nextDate);
    if (nextSnapshot?.meals?.length) {
      setMeals(normalizeMealsTo100Grams(nextSnapshot.meals));
      setEaten(nextSnapshot.eaten);
    } else {
      setMeals(cloneMeals(defaultMeals));
      setEaten({});
    }
    setViewMode("planned");
  };

  const changeSelectedDate = (offset: number) => selectMealDate(shiftDateKey(selectedDate, offset));
  const openCalendar = () => {
    setCalendarDraftDate(selectedDate);
    setCalendarMonthKey(selectedDate.slice(0, 7));
    setCalendarOpen(true);
  };
  const confirmCalendarDate = () => {
    selectMealDate(calendarDraftDate);
    setCalendarOpen(false);
  };

  const calendarCells = useMemo(() => buildCalendarCells(calendarMonthKey), [calendarMonthKey]);

  const displayedMeals = useMemo(
    () =>
      viewMode === "planned"
        ? meals
        : meals.map((meal) => ({
            ...meal,
            foods: meal.foods.filter((food) => eaten[food.id]),
          })),
    [meals, eaten, viewMode]
  );
  const displayedTotals = useMemo(() => dailyMealTotals(displayedMeals), [displayedMeals]);

  const toggleMeal = (mealId: string) => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(260, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.scaleXY)
    );
    setExpandedMealIds((current) =>
      current.includes(mealId) ? current.filter((id) => id !== mealId) : [...current, mealId]
    );
  };

  const addMeal = () => {
    const mealNumber = meals.length + 1;
    const mealId = `meal-${Date.now()}`;
    const starters = [
      foodItems.find((item) => item.group === "חלבון") ?? foodItems[0],
      foodItems.find((item) => item.group === "פחמימה") ?? foodItems[0],
      foodItems.find((item) => item.group === "שומן") ?? foodItems[0],
    ];
    const starterGrams = [150, 180, 10];
    const nextMeal: Meal = {
      id: mealId,
      title: `ארוחה ${mealNumber}`,
      foods: starters.map((starter, index) => ({
        id: `${starter.id}-${mealId}`,
        name: starter.name,
        quantity: `${starterGrams[index]} גרם`,
        reference: starter.reference,
        weightMode: "cooked" as WeightMode,
        ...macrosForGrams(starter, starterGrams[index]),
      })),
    };
    const nextMeals = [...meals, nextMeal];
    setMeals(nextMeals);
    setExpandedMealIds((current) => [...current, nextMeal.id]);
    void persistEverything(nextMeals);
  };

  const deleteMeal = (meal: Meal) => {
    if (meals.length <= 1) return;
    const nextMeals = meals.filter((item) => item.id !== meal.id);
    setMeals(nextMeals);
    setExpandedMealIds((current) => current.filter((id) => id !== meal.id));
    if (editingMealId === meal.id) cancelMealEdit();
    void persistEverything(nextMeals);
  };

  const moveMeal = (mealId: string, direction: -1 | 1) => {
    const index = meals.findIndex((meal) => meal.id === mealId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= meals.length) return;
    const next = [...meals];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setMeals(next);
    void persistEverything(next);
  };

  const updateMealTitle = (mealId: string, title: string) => {
    const next = meals.map((meal) => (meal.id === mealId ? { ...meal, title } : meal));
    setMeals(next);
  };

  const beginMealEdit = (meal: Meal) => {
    setMealEditBackup(JSON.parse(JSON.stringify(meal)) as Meal);
    setEditingMealId(meal.id);
    setExpandedMealIds((current) => (current.includes(meal.id) ? current : [...current, meal.id]));
    setMealFoodSearch("");
    setAddFoodGroupFilter(null);
  };

  const openMealFoodGroup = (meal: Meal, group: FoodGroup) => {
    setMealEditBackup((current) => current ?? (JSON.parse(JSON.stringify(meal)) as Meal));
    setEditingMealId(meal.id);
    setExpandedMealIds((current) => (current.includes(meal.id) ? current : [...current, meal.id]));
    setMealFoodSearch("");
    setSelectedAddFoodKey(`${meal.id}:${group}`);
    setAddFoodGroupFilter(group);
  };

  const updateMealFoodQuantity = (mealId: string, foodId: string, quantity: string) => {
    const next = meals.map((meal) => {
      if (meal.id !== mealId) return meal;
      return {
        ...meal,
        foods: meal.foods.map((food) => {
          if (food.id !== foodId) return food;
          const match = quantity.match(/^([0-9]+(?:\.[0-9]+)?)/);
          const grams = match ? Number(match[1]) : 100;
          const baseItem = foodItems.find((i) => i.name === food.name) ?? { calories: 100, protein: 10, carbohydrates: 10, fats: 5 };
          const calculatedMacros = macrosForGrams(baseItem, grams);
          return {
            ...food,
            quantity,
            ...calculatedMacros,
          };
        }),
      };
    });
    setMeals(next);
  };

  const updateInlineFoodCalories = (mealId: string, foodId: string, newCalories: number) => {
    const next = meals.map((meal) => {
      if (meal.id !== mealId) return meal;
      return {
        ...meal,
        foods: meal.foods.map((food) => {
          if (food.id !== foodId) return food;
          const currentCals = mealFoodTotals(food).calories || 1;
          const ratio = newCalories / currentCals;
          return {
            ...food,
            calories: Math.round(newCalories),
            protein: Math.round((food.protein * ratio) * 10) / 10,
            carbohydrates: Math.round((food.carbohydrates * ratio) * 10) / 10,
            fats: Math.round((food.fats * ratio) * 10) / 10,
          };
        }),
      };
    });
    setMeals(next);
    void persistEverything(next);
  };

  const saveMealFoodQuantity = (mealId: string, foodId: string, draftOverride?: string) => {
    const raw = (draftOverride ?? "").trim().replace(",", ".");
    const match = raw.match(/^([0-9]+(?:\.[0-9]+)?)/);
    const parsed = match ? Number(match[1]) : 100;
    const normalized = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 10) / 10) : 100;
    updateMealFoodQuantity(mealId, foodId, `${normalized} גרם`);
    void persistEverything();
  };

  const resetMealFoodQuantity = (mealId: string, foodId: string) => {
    updateMealFoodQuantity(mealId, foodId, "100 גרם");
    void persistEverything();
  };

  const removeMealFood = (mealId: string, foodId: string) => {
    const meal = meals.find((item) => item.id === mealId);
    if (!meal || meal.foods.length <= 1) return;
    const next = meals.map((item) =>
      item.id !== mealId ? item : { ...item, foods: item.foods.filter((food) => food.id !== foodId) }
    );
    setMeals(next);
    void persistEverything(next);
  };

  const addFoodToMeal = (mealId: string, item: (typeof mealFoods)[number]) => {
    const grams = 100;
    const macros = macrosForGrams(item, grams);
    const next = meals.map((meal) =>
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
                reference: item.reference,
                weightMode: "cooked" as WeightMode,
                ...macros,
                servingGrams: grams,
              },
            ],
          }
    );
    setMeals(next);
    void persistEverything(next);
  };

  const saveMealEdit = () => {
    setEditingMealId(null);
    setMealEditBackup(null);
    setMealFoodSearch("");
    void persistEverything();
  };

  const cancelMealEdit = () => {
    if (mealEditBackup) {
      const next = meals.map((meal) => (meal.id === mealEditBackup.id ? normalizeMealsTo100Grams([mealEditBackup])[0] : meal));
      setMeals(next);
    }
    setEditingMealId(null);
    setMealEditBackup(null);
    setMealFoodSearch("");
    setAddFoodGroupFilter(null);
    setSelectedAddFoodKey(null);
  };

  const filteredMealFoods = mealFoods
    .filter((item) => !addFoodGroupFilter || item.group === addFoodGroupFilter)
    .filter((item) => `${item.name} ${item.group} ${item.reference}`.includes(mealFoodSearch.trim()))
    .slice(0, 20);

  return (
    <ScreenContainer className="px-5 pt-5" containerClassName="bg-[#07111E]">
      <ScrollView
        ref={mealPlanScrollRef}
        style={styles.mealPlanScroll}
        scrollEnabled={true}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          {standalone ? (
            <Pressable onPress={() => router.back()} style={styles.menuButton}>
              <Text style={styles.menuText}>‹ חזרה</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push("/menu")} style={styles.menuButton}>
              <Text style={styles.menuText}>☰ תפריט</Text>
            </Pressable>
          )}
          <Text style={styles.eyebrow}>תזונה יומית</Text>
          <Text style={styles.title}>{standalone ? "הארוחות שלי" : `תפריט ${meals.length} ארוחות`}</Text>
          <Text style={styles.subtitle}>
            יעד פעיל: {mealPlanGoalLabel(activeGoal)} · {targetCalories || "לא הוגדר"} קק״ל
          </Text>

          <Pressable
            onPress={manualSaveAction}
            disabled={savingActive}
            style={[styles.mainSaveButton, { backgroundColor: saveButtonColor }, savingActive && styles.busyButton]}
          >
            {savingActive ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.mainSaveButtonText}>{saveButtonText}</Text>
            )}
          </Pressable>

          {saveSuccessNotice ? (
            <View style={styles.saveSuccessBanner}>
              <Text style={styles.saveSuccessBannerText}>✓ התפריט, הערכים והארוחות נשמרו בהצלחה!</Text>
            </View>
          ) : null}

          <Pressable onPress={() => router.push("/scroll-test")} style={styles.utilityNavButton}>
            <Text style={styles.utilityNavButtonText}>בדיקת גלילה</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/nutrition-calendar" as never)} style={styles.utilityNavButton}>
            <Text style={styles.utilityNavButtonText}>לוח תזונה: יום · שבוע · חודש</Text>
          </Pressable>

          <View style={styles.datePicker}>
            <Pressable onPress={() => changeSelectedDate(-1)} style={styles.dateButton}>
              <Text style={styles.dateButtonText}>‹</Text>
            </Pressable>
            <Pressable onPress={openCalendar} style={styles.dateCenter}>
              <Text style={styles.dateLabel}>
                {selectedDate === todayKey() ? "היום" : formatDateLabel(selectedDate)}
              </Text>
              <Text style={styles.dateHint}>לחץ לפתיחת לוח שנה</Text>
            </Pressable>
            <Pressable
              disabled={selectedDate === todayKey()}
              onPress={() => changeSelectedDate(1)}
              style={[styles.dateButton, selectedDate === todayKey() && styles.dateButtonDisabled]}
            >
              <Text style={styles.dateButtonText}>›</Text>
            </Pressable>
          </View>
        </View>

        <Modal transparent visible={calendarOpen} animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
          <View style={styles.calendarBackdrop}>
            <View style={styles.calendarModal}>
              <View style={styles.calendarHeader}>
                <Pressable
                  onPress={() => setCalendarMonthKey(shiftMonthKey(calendarMonthKey, 1))}
                  style={styles.calendarNav}
                >
                  <Text style={styles.calendarNavText}>›</Text>
                </Pressable>
                <Text style={styles.calendarTitle}>{formatMonthLabel(calendarMonthKey)}</Text>
                <Pressable
                  onPress={() => setCalendarMonthKey(shiftMonthKey(calendarMonthKey, -1))}
                  style={styles.calendarNav}
                >
                  <Text style={styles.calendarNavText}>‹</Text>
                </Pressable>
              </View>
              <View style={styles.weekdayRow}>
                {["א", "ב", "ג", "ד", "ה", "ו", "ש"].map((day) => (
                  <Text key={day} style={styles.weekday}>
                    {day}
                  </Text>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {calendarCells.map((dateKey, index) => {
                  const isFuture = Boolean(dateKey && dateKey > todayKey());
                  const isSelected = dateKey === calendarDraftDate;
                  const hasData = Boolean(
                    dateKey && eatenHistory[dateKey] && Object.values(eatenHistory[dateKey]).some(Boolean)
                  );
                  return (
                    <View key={`${dateKey ?? "empty"}-${index}`} style={styles.calendarCell}>
                      {dateKey ? (
                        <Pressable
                          disabled={isFuture}
                          onPress={() => setCalendarDraftDate(dateKey)}
                          style={[
                            styles.calendarDay,
                            isSelected && styles.calendarDaySelected,
                            isFuture && styles.calendarDayDisabled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.calendarDayText,
                              isSelected && styles.calendarDayTextSelected,
                              isFuture && styles.calendarDayTextDisabled,
                            ]}
                          >
                            {Number(dateKey.slice(-2))}
                          </Text>
                          {hasData ? <View style={styles.calendarDataDot} /> : null}
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
              <View style={styles.calendarActions}>
                <Pressable onPress={() => setCalendarOpen(false)} style={styles.calendarCancel}>
                  <Text style={styles.calendarCancelText}>ביטול</Text>
                </Pressable>
                <Pressable onPress={confirmCalendarDate} style={styles.calendarConfirm}>
                  <Text style={styles.calendarConfirmText}>אישור תאריך</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* 💧 רכיב מעקב המים */}
        <View style={styles.waterCard}>
          <View style={styles.waterHeader}>
            <View style={styles.waterHeaderCopy}>
              <Text style={styles.waterTitle}>מעקב שתיית מים</Text>
              <Text style={styles.waterSubtitle}>
                {selectedDate === todayKey() ? "היום" : formatDateLabel(selectedDate)} · שמירה לפי תאריך
              </Text>
            </View>
            <Text style={styles.waterIcon}>◉</Text>
          </View>
          <View style={styles.waterStatsRow}>
            <View style={styles.waterStat}>
              <Text style={styles.waterStatValue}>{Math.round(activeWater.consumed)} מ״ל</Text>
              <Text style={styles.waterStatLabel}>נצרך</Text>
            </View>
            <View style={styles.waterStatDivider} />
            <View style={styles.waterStat}>
              <Text style={styles.waterStatValue}>{Math.round(activeWater.goal)} מ״ל</Text>
              <Text style={styles.waterStatLabel}>יעד יומי</Text>
            </View>
            <View style={styles.waterStatDivider} />
            <View style={styles.waterStat}>
              <Text style={[styles.waterStatValue, waterProgress >= 1 && styles.waterStatValueDone]}>
                {Math.round(waterProgress * 100)}%
              </Text>
              <Text style={styles.waterStatLabel}>השלמה</Text>
            </View>
          </View>
          <View style={styles.waterProgressHeader}>
            <Text style={styles.waterProgressCaption}>התקדמות יומית</Text>
            <Text style={[styles.waterProgressPercent, waterProgress >= 1 && styles.waterProgressPercentDone]}>
              {Math.round(waterProgress * 100)}%
            </Text>
          </View>
          <View style={styles.waterProgressTrack}>
            <View style={[styles.waterProgressFill, waterProgress >= 1 && styles.waterProgressFillDone, { width: `${Math.round(waterProgress * 100)}%` }]}>
              <View style={styles.waterProgressGlow} />
            </View>
          </View>
          <Text style={styles.waterRemaining}>
            {activeWater.consumed >= activeWater.goal
              ? "הגעת ליעד המים היומי"
              : `נשארו ${Math.max(0, Math.round(activeWater.goal - activeWater.consumed))} מ״ל להשלמת היעד`}
          </Text>
          <View style={styles.waterQuickRow}>
            {[200, 250, 330, 500, 750].map((amount) => (
              <Pressable
                key={amount}
                onPress={() => addWater(amount)}
                style={({ pressed }) => [styles.waterQuickButton, pressed && styles.waterQuickButtonPressed]}
              >
                <Text style={styles.waterQuickButtonText}>+{amount} מ״ל</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.waterSettingsRow}>
            <Pressable onPress={resetWater} style={styles.waterResetButton}>
              <Text style={styles.waterResetText}>איפוס</Text>
            </Pressable>
            <View style={styles.waterGoalEditor}>
              <TextInput
                value={waterGoalDraft}
                onChangeText={setWaterGoalDraft}
                onBlur={saveWaterGoal}
                onSubmitEditing={saveWaterGoal}
                keyboardType="number-pad"
                placeholder="יעד במ״ל"
                placeholderTextColor="#8A9BB5"
                style={styles.waterGoalInput}
              />
            </View>
          </View>
        </View>

        <View style={styles.profileEditor}>
          <Text style={styles.profileTitle}>הגדרת יעד בתוך התפריט</Text>
          <View style={styles.goalRow}>
            {(["מסה", "חיטוב", "ניטרלי"] as const).map((goal) => (
              <Pressable
                key={goal}
                accessibilityRole="button"
                accessibilityState={{ selected: activeGoal === goal }}
                onPress={() => selectGoal(goal)}
                style={[styles.goalButton, activeGoal === goal && styles.goalButtonActive]}
              >
                <Text style={[styles.goalText, activeGoal === goal && styles.goalTextActive]}>{goal}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.profileFields}>
            <ProfileField label="קלוריות" value={activeProfile.calories} onChange={(value) => patchActiveProfile({ calories: value })} />
            <ProfileField label="חלבון (ג׳)" value={activeProfile.protein} onChange={(value) => patchActiveProfile({ protein: value })} />
            <ProfileField label="פחמימות (ג׳)" value={activeProfile.carbohydrates} onChange={(value) => patchActiveProfile({ carbohydrates: value })} />
            <ProfileField label="שומן (ג׳)" value={activeProfile.fats} onChange={(value) => patchActiveProfile({ fats: value })} />
          </View>
          <Pressable onPress={completeActiveProfile} style={styles.completeButton}>
            <Text style={styles.completeText}>השלם אוטומטית לפי הקלוריות</Text>
          </Pressable>
        </View>

        <View style={styles.mealManagement}>
          <View style={styles.mealManagementHeader}>
            <Text style={styles.mealManagementTitle}>ניהול ארוחות</Text>
            <Text style={styles.mealManagementHint}>{meals.length} ארוחות בתפריט</Text>
          </View>
          <Pressable onPress={addMeal} style={styles.addMealButton}>
            <Text style={styles.addMealButtonText}>＋ הוסף ארוחה חדשה</Text>
          </Pressable>
        </View>

        <Animated.View style={[styles.mealsTransition, { opacity: mealPlanOpacity }]}>
          {displayedMeals.map((meal, mealIndex) => {
            const total = mealTotals(meal);
            const isExpanded = expandedMealIds.includes(meal.id);

            return (
              <View key={meal.id} style={[styles.meal, isExpanded && styles.mealActive]}>
                <Pressable
                  onPress={() => toggleMeal(meal.id)}
                  style={({ pressed }) => [styles.mealHeader, isExpanded && styles.mealHeaderActive, pressed && styles.mealHeaderPressed]}
                >
                  <Text style={[styles.mealTotal, isExpanded && styles.mealTotalActive]}>
                    {Math.round(total.calories)} קק״ל · חלבון {Math.round(total.protein)}ג׳ · פחמימות {Math.round(total.carbohydrates)}ג׳ · שומן {Math.round(total.fats)}ג׳
                  </Text>
                  <View style={styles.mealTitleRow}>
                    <Text style={[styles.mealTitle, isExpanded && styles.mealTitleActive]}>{meal.title}</Text>
                    <View style={[styles.mealFoodCountBadge, isExpanded && styles.mealFoodCountBadgeActive]}>
                      <Text style={[styles.mealFoodCountText, isExpanded && styles.mealFoodCountTextActive]}>
                        {meal.foods.length} {meal.foods.length === 1 ? "רכיב" : "רכיבים"}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.mealToggle, isExpanded && styles.mealToggleActive]}>
                    {isExpanded ? "סגור ▲" : "פתח ▼"}
                  </Text>
                </Pressable>

                <View style={styles.mealQuickActions}>
                  <Pressable
                    onPress={() => moveMeal(meal.id, 1)}
                    disabled={mealIndex === meals.length - 1}
                    style={[styles.mealMoveButton, mealIndex === meals.length - 1 && styles.disabledAction]}
                  >
                    <Text style={styles.mealMoveText}>↓</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => moveMeal(meal.id, -1)}
                    disabled={mealIndex === 0}
                    style={[styles.mealMoveButton, mealIndex === 0 && styles.disabledAction]}
                  >
                    <Text style={styles.mealMoveText}>↑</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteMeal(meal)} style={styles.deleteMealButton}>
                    <Text style={styles.deleteMealText}>מחק ארוחה</Text>
                  </Pressable>
                </View>

                {isExpanded ? (
                  <View style={styles.mealFoodEditor}>
                    <View style={styles.mealFoodListHeader}>
                      <Text style={styles.mealFoodListTitle}>רכיבי הארוחה</Text>
                      <Text style={styles.mealFoodListCount}>{meal.foods.length} רכיבים</Text>
                    </View>

                    {meal.foods.map((food, foodIndex) => {
                      const macroGroup = foodMacroLabel(food.name, food.protein, food.carbohydrates, food.fats);
                      const macroIcon: IconSymbolName =
                        macroGroup === "חלבון" ? "fork.knife" : macroGroup === "פחמימה" ? "leaf.fill" : "drop.fill";
                      const weightMode = food.weightMode ?? "cooked";
                      const weightInfo = cookingConversionInfo(food.id, weightMode);
                      const weightInfoKey = `${meal.id}:${food.id}`;
                      const weightInfoOpen = weightInfoFoodId === weightInfoKey;
                      const quantityEditKey = `${meal.id}:${food.id}`;
                      const quantityEditOpen = editingQuantityKey === quantityEditKey;
                      const inlineEditKey = `${meal.id}:${food.id}`;
                      const inlineEditOpen = editingInlineFoodId === inlineEditKey;
                      const currentCalories = mealFoodTotals(food).calories;

                      return (
                        <View key={food.id} style={styles.food}>
                          <View style={styles.foodTop}>
                            <View style={styles.foodInlineEditWrapper}>
                              {inlineEditOpen ? (
                                <View style={styles.inlineEditBox}>
                                  <TextInput
                                    value={inlineCaloriesDraft}
                                    onChangeText={setInlineCaloriesDraft}
                                    keyboardType="numeric"
                                    placeholder="קלוריות"
                                    placeholderTextColor="#8A9BB5"
                                    style={styles.inlineCaloriesInput}
                                    autoFocus
                                  />
                                  <Pressable
                                    onPress={() => {
                                      const parsed = Number(inlineCaloriesDraft) || currentCalories;
                                      updateInlineFoodCalories(meal.id, food.id, parsed);
                                      setEditingInlineFoodId(null);
                                      Keyboard.dismiss();
                                    }}
                                    style={styles.inlineSaveButton}
                                  >
                                    <Text style={styles.inlineSaveText}>אישור</Text>
                                  </Pressable>
                                </View>
                              ) : (
                                <Pressable
                                  onPress={() => {
                                    setInlineCaloriesDraft(String(currentCalories));
                                    setEditingInlineFoodId(inlineEditKey);
                                  }}
                                  style={styles.inlineCaloriesButton}
                                >
                                  <Text style={styles.foodMacros}>
                                    {currentCalories} קק״ל (ערוך ערכים) · חלבון {mealFoodTotals(food).protein} · פחמ׳ {mealFoodTotals(food).carbohydrates} · שומן {mealFoodTotals(food).fats}
                                  </Text>
                                </Pressable>
                              )}
                            </View>
                            <Text style={styles.foodName}>{food.name}</Text>
                          </View>

                          <View style={styles.foodMetaRow}>
                            <Text
                              style={[
                                styles.foodMacroLabel,
                                macroGroup === "חלבון"
                                  ? styles.foodMacroProtein
                                  : macroGroup === "פחמימה"
                                  ? styles.foodMacroCarb
                                  : styles.foodMacroFat,
                              ]}
                            >
                              {macroGroup}
                            </Text>
                            <Text style={styles.foodMeta}>
                              {food.quantity} · {food.reference}
                            </Text>
                            <Pressable
                              onPress={() => setWeightInfoFoodId(weightInfoOpen ? null : weightInfoKey)}
                              accessibilityRole="button"
                              style={styles.weightInfoButton}
                            >
                              <Text style={styles.weightInfoButtonText}>i</Text>
                            </Pressable>
                          </View>

                          {weightInfoOpen ? (
                            <View style={styles.weightInfoPanel}>
                              <Text style={styles.weightInfoTitle}>מקדם ההמרה — {weightModeLabels[weightMode]}</Text>
                              <Text style={styles.weightInfoText}>{weightInfo.factorText}</Text>
                              <Text style={styles.weightInfoText}>{weightInfo.calculationText}</Text>
                            </View>
                          ) : null}

                          <Pressable
                            onPress={() => toggleEaten(food.id)}
                            style={[styles.eatenButton, eaten[food.id] && styles.eatenButtonActive]}
                          >
                            <Text style={[styles.eatenText, eaten[food.id] && styles.eatenTextActive]}>
                              {eaten[food.id] ? "✓ נאכל" : "סמן כנאכל"}
                            </Text>
                          </Pressable>

                          {meal.foods.length > 1 ? (
                            <Pressable
                              onPress={() => removeMealFood(meal.id, food.id)}
                              style={({ pressed }) => [styles.removeMealFoodButton, pressed && styles.removeMealFoodPressed]}
                            >
                              <Text style={styles.removeMealFoodText}>− הסר רכיב</Text>
                            </Pressable>
                          ) : null}

                          <View style={styles.foodEdit}>
                            {quantityEditOpen ? (
                              <>
                                <View style={styles.quantityStepper}>
                                  <Pressable
                                    onPress={() => {
                                      const cur = Number(food.quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)/)?.[1] ?? 100);
                                      const next = Math.max(0, cur - 10);
                                      updateMealFoodQuantity(meal.id, food.id, `${next} גרם`);
                                    }}
                                    style={styles.quantityStepButton}
                                  >
                                    <Text style={styles.quantityStepText}>−10</Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => {
                                      const cur = Number(food.quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)/)?.[1] ?? 100);
                                      const next = cur + 10;
                                      updateMealFoodQuantity(meal.id, food.id, `${next} גרם`);
                                    }}
                                    style={styles.quantityStepButton}
                                  >
                                    <Text style={styles.quantityStepText}>+10</Text>
                                  </Pressable>
                                </View>
                                <TextInput
                                  value={quantityDraft}
                                  editable
                                  keyboardType="decimal-pad"
                                  onChangeText={(value) => setQuantityDraft(value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                                  onSubmitEditing={() => {
                                    saveMealFoodQuantity(meal.id, food.id, quantityDraft);
                                    Keyboard.dismiss();
                                    setEditingQuantityKey(null);
                                  }}
                                  style={[styles.quantityInput, styles.quantityInputEditable]}
                                />
                                <Pressable
                                  onPress={() => {
                                    saveMealFoodQuantity(meal.id, food.id, quantityDraft);
                                    Keyboard.dismiss();
                                    setEditingQuantityKey(null);
                                  }}
                                  style={styles.saveQuantityButton}
                                >
                                  <Text style={styles.saveQuantityText}>שמור</Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => resetMealFoodQuantity(meal.id, food.id)}
                                  style={styles.resetQuantityButton}
                                >
                                  <Text style={styles.resetQuantityText}>אפס ל־100 גרם</Text>
                                </Pressable>
                              </>
                            ) : null}
                          </View>

                          <Pressable
                            onPress={() => {
                              if (quantityEditOpen) {
                                setEditingQuantityKey(null);
                                Keyboard.dismiss();
                              } else {
                                const numericQuantity = food.quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)/)?.[1] ?? "100";
                                setQuantityDraft(numericQuantity);
                                setEditingQuantityKey(quantityEditKey);
                              }
                            }}
                            style={[styles.quantityEditButton, quantityEditOpen && styles.quantityEditButtonActive]}
                          >
                            <View style={styles.quantityEditButtonContent}>
                              <IconSymbol name={macroIcon} size={14} color={quantityEditOpen ? "#07111E" : "#93C5FD"} />
                              <Text style={styles.quantityEditButtonText}>
                                {quantityEditOpen ? "סגור עריכת כמות" : "ערוך כמות מזון"}
                              </Text>
                            </View>
                          </Pressable>
                        </View>
                      );
                    })}

                    <View style={styles.mealSummaryFooter}>
                      <Text style={styles.mealSummaryTitle}>סיכום הארוחה</Text>
                      <View style={styles.mealSummaryValues}>
                        <Text style={styles.mealSummaryCalories}>{Math.round(total.calories)} קק״ל</Text>
                        <Text style={styles.mealSummaryProtein}>חלבון {Math.round(total.protein)} ג׳</Text>
                        <Text style={styles.mealSummaryCarbs}>פחמימות {Math.round(total.carbohydrates)} ג׳</Text>
                        <Text style={styles.mealSummaryFats}>שומן {Math.round(total.fats)} ג׳</Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                <View style={styles.mealActions}>
                  <View style={styles.addFoodRow}>
                    <Text style={styles.addFoodRowTitle}>הוסף רכיב</Text>
                    {(["חלבון", "פחמימה", "שומן"] as FoodGroup[]).map((group) => (
                      <Pressable
                        key={group}
                        onPress={() => openMealFoodGroup(meal, group)}
                        style={[
                          styles.addFoodGroupButton,
                          selectedAddFoodKey === `${meal.id}:${group}` && styles.addFoodGroupButtonActive,
                        ]}
                      >
                        <Text style={styles.addFoodGroupText}>＋ {group}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {editingMealId === meal.id ? (
                    <>
                      <TextInput
                        value={meal.title}
                        onChangeText={(value) => updateMealTitle(meal.id, value)}
                        placeholder="שם הארוחה"
                        placeholderTextColor="#8A9BB5"
                        style={styles.mealTitleInput}
                        textAlign="right"
                      />
                      <Pressable onPress={saveMealEdit} style={styles.mealSaveButton}>
                        <Text style={styles.mealSaveText}>שמור ארוחה</Text>
                      </Pressable>
                      <Pressable onPress={cancelMealEdit} style={styles.mealCancelButton}>
                        <Text style={styles.mealCancelText}>בטל</Text>
                      </Pressable>
                      {addFoodGroupFilter ? <Text style={styles.quickSearchLabel}>בחר {addFoodGroupFilter} להוספה:</Text> : null}
                      <TextInput
                        value={mealFoodSearch}
                        onChangeText={setMealFoodSearch}
                        autoFocus={Boolean(addFoodGroupFilter)}
                        placeholder="חיפוש מזון..."
                        placeholderTextColor="#8A9BB5"
                        style={styles.mealFoodSearch}
                        textAlign="right"
                      />
                      {filteredMealFoods.length > 0 ? (
                        <View style={styles.mealFoodResults}>
                          {filteredMealFoods.map((item) => (
                            <Pressable
                              key={item.id}
                              onPress={() => addFoodToMeal(meal.id, item)}
                              style={styles.mealFoodResult}
                            >
                              <Text style={styles.mealFoodResultName}>＋ {item.name}</Text>
                              <Text style={styles.mealFoodResultMeta}>{item.group} · 100 ג׳</Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <Pressable onPress={() => beginMealEdit(meal)} style={styles.mealEditButton}>
                      <Text style={styles.mealEditText}>ערוך ארוחה</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </Animated.View>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>
            {viewMode === "planned" ? "תפריט מתוכנן" : "מה שנאכל היום"} · יעד {targetCalories || "—"} קק״ל
          </Text>
          <View style={styles.viewModeRow}>
            <Pressable onPress={() => setViewMode("planned")} style={[styles.viewModeButton, viewMode === "planned" && styles.viewModeButtonActive]}>
              <Text style={[styles.viewModeText, viewMode === "planned" && styles.viewModeTextActive]}>תפריט מתוכנן</Text>
            </Pressable>
            <Pressable onPress={() => setViewMode("eaten")} style={[styles.viewModeButton, viewMode === "eaten" && styles.viewModeButtonActive]}>
              <Text style={[styles.viewModeText, viewMode === "eaten" && styles.viewModeTextActive]}>נאכל היום</Text>
            </Pressable>
          </View>
          <View style={styles.summaryGrid}>
            <Stat label="מוצג · קלוריות" value={`${Math.round(displayedTotals.calories)}`} />
            <Stat label="מוצג · חלבון" value={`${Math.round(displayedTotals.protein)} ג׳`} />
            <Stat label="מוצג · פחמימות" value={`${Math.round(displayedTotals.carbohydrates)} ג׳`} />
            <Stat label="מוצג · שומן" value={`${Math.round(displayedTotals.fats)} ג׳`} />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function buildCalendarCells(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  return [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => `${monthKey}-${String(index + 1).padStart(2, "0")}`),
  ];
}

function shiftMonthKey(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function shiftDateKey(dateKey: string, offset: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return todayKey(date);
}

function formatDateLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function foodMacroLabel(name: string, protein: number, carbohydrates: number, fats: number): ConversionGroup {
  const source = sourceForFood(name);
  if (source) return source.group;
  const values: [ConversionGroup, number][] = [
    ["חלבון", protein],
    ["פחמימה", carbohydrates],
    ["שומן", fats],
  ];
  return values.sort((a, b) => b[1] - a[1])[0][0];
}

function ProfileField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.profileField}>
      <Text style={styles.profileLabel}>{label}</Text>
      <View style={styles.profileInputRow}>
        <TextInput
          value={value}
          onChangeText={(nextValue) => onChange(nextValue.replace(/[^0-9.]/g, ""))}
          keyboardType="numeric"
          style={styles.profileInput}
        />
        {value ? (
          <Pressable onPress={() => onChange("")} style={styles.clearProfileFieldButton}>
            <Text style={styles.clearProfileFieldText}>נקה</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mealPlanScroll: { flex: 1, minHeight: 0, backgroundColor: "#07111E" },
  content: { flexGrow: 1, minHeight: 1, gap: 14, paddingBottom: 320, writingDirection: "rtl" },
  header: { alignItems: "flex-end" },
  eyebrow: { color: "#60A5FA", fontSize: 13, fontWeight: "800" },
  title: { color: "#FFFFFF", fontSize: 30, fontWeight: "900" },
  subtitle: { color: "#CBD5E1", fontSize: 13, marginTop: 5 },
  mainSaveButton: { alignSelf: "stretch", minHeight: 50, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 12 },
  mainSaveButtonText: { color: "#000000", fontSize: 16, fontWeight: "900", writingDirection: "rtl" },
  saveSuccessBanner: { alignSelf: "stretch", minHeight: 44, borderRadius: 10, backgroundColor: "#064E3B", borderColor: "#10B981", borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveSuccessBannerText: { color: "#D1FAE5", fontSize: 13, fontWeight: "900", writingDirection: "rtl" },
  busyButton: { opacity: 0.6 },
  utilityNavButton: { alignSelf: "stretch", minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#334E68", alignItems: "center", justifyContent: "center", marginTop: 8, backgroundColor: "#132137" },
  utilityNavButtonText: { color: "#FBBF24", fontSize: 13, fontWeight: "800", writingDirection: "rtl" },
  menuButton: { backgroundColor: "#1E293B", borderColor: "#475569", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8 },
  menuText: { color: "#60A5FA", fontWeight: "900", fontSize: 12 },
  datePicker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch", marginTop: 12, backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  dateCenter: { alignItems: "center", gap: 2, flex: 1 },
  calendarBackdrop: { flex: 1, backgroundColor: "rgba(3, 8, 18, 0.85)", justifyContent: "center", padding: 20 },
  calendarModal: { backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calendarTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  calendarNav: { width: 36, height: 36, borderRadius: 9, backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center" },
  calendarNavText: { color: "#60A5FA", fontSize: 24, lineHeight: 28, fontWeight: "900" },
  weekdayRow: { flexDirection: "row-reverse" },
  weekday: { flex: 1, color: "#94A3B8", fontSize: 11, fontWeight: "800", textAlign: "center" },
  calendarGrid: { flexDirection: "row-reverse", flexWrap: "wrap" },
  calendarCell: { width: "14.2857%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  calendarDay: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  calendarDaySelected: { backgroundColor: "#3B82F6" },
  calendarDayDisabled: { opacity: 0.3 },
  calendarDayText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  calendarDayTextSelected: { color: "#FFFFFF", fontWeight: "900" },
  calendarDayTextDisabled: { color: "#64748B" },
  calendarDataDot: { position: "absolute", bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: "#60A5FA" },
  calendarActions: { flexDirection: "row-reverse", gap: 8 },
  calendarCancel: { flex: 1, borderColor: "#475569", borderWidth: 1, borderRadius: 9, paddingVertical: 10, alignItems: "center", backgroundColor: "#1E293B" },
  calendarCancelText: { color: "#F1F5F9", fontWeight: "800", fontSize: 12 },
  calendarConfirm: { flex: 1, backgroundColor: "#3B82F6", borderRadius: 9, paddingVertical: 10, alignItems: "center" },
  calendarConfirmText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },
  dateButton: { width: 34, height: 34, borderRadius: 8, backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center", borderColor: "#475569", borderWidth: 1 },
  dateButtonDisabled: { opacity: 0.35 },
  dateButtonText: { color: "#60A5FA", fontSize: 22, lineHeight: 26, fontWeight: "900" },
  dateLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  dateHint: { color: "#94A3B8", fontSize: 10 },
  waterCard: { backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, writingDirection: "rtl" },
  waterHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  waterHeaderCopy: { flex: 1, gap: 3 },
  waterIcon: { color: "#38BDF8", fontSize: 24, fontWeight: "900" },
  waterTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  waterSubtitle: { color: "#94A3B8", fontSize: 11, textAlign: "right", writingDirection: "rtl" },
  waterStatsRow: { flexDirection: "row-reverse", alignItems: "stretch", justifyContent: "space-between", gap: 8 },
  waterStat: { flex: 1, alignItems: "flex-end", gap: 2 },
  waterStatDivider: { width: 1, backgroundColor: "#334E68" },
  waterStatValue: { color: "#FFFFFF", fontSize: 15, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  waterStatValueDone: { color: "#10B981" },
  waterStatLabel: { color: "#94A3B8", fontSize: 10, textAlign: "right" },
  waterProgressHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  waterProgressCaption: { color: "#94A3B8", fontSize: 11, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  waterProgressPercent: { color: "#38BDF8", fontSize: 20, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  waterProgressPercentDone: { color: "#10B981" },
  waterProgressTrack: { height: 16, backgroundColor: "#09111D", borderColor: "#334E68", borderWidth: 1, borderRadius: 10, overflow: "hidden", position: "relative" },
  waterProgressFill: { height: "100%", minWidth: 4, backgroundColor: "#0284C7", borderRadius: 8, overflow: "hidden" },
  waterProgressFillDone: { backgroundColor: "#10B981" },
  waterProgressGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: "#E0F2FE", opacity: 0.9 },
  waterRemaining: { color: "#CBD5E1", fontSize: 11, textAlign: "right", writingDirection: "rtl" },
  waterQuickRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
  waterQuickButton: { flex: 1, minWidth: 50, minHeight: 38, borderRadius: 8, backgroundColor: "#1E293B", borderColor: "#334E68", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  waterQuickButtonPressed: { backgroundColor: "#0284C7", borderColor: "#0284C7" },
  waterQuickButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", writingDirection: "rtl" },
  waterSettingsRow: { flexDirection: "row-reverse", alignItems: "flex-end", gap: 8, marginTop: 4 },
  waterResetButton: { borderColor: "#475569", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#1E293B", justifyContent: "center" },
  waterResetText: { color: "#CBD5E1", fontSize: 11, fontWeight: "800" },
  waterGoalEditor: { flex: 1 },
  waterGoalInput: { minHeight: 38, backgroundColor: "#09111D", borderColor: "#334E68", borderWidth: 1, borderRadius: 8, color: "#FFFFFF", paddingHorizontal: 10, textAlign: "right", writingDirection: "rtl", fontSize: 12, fontWeight: "700" },
  profileEditor: { backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  profileTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", textAlign: "right" },
  goalRow: { flexDirection: "row-reverse", gap: 7 },
  goalButton: { flex: 1, borderColor: "#475569", borderWidth: 1, borderRadius: 9, paddingVertical: 10, alignItems: "center", backgroundColor: "#1E293B" },
  goalButtonActive: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  goalText: { color: "#E2E8F0", fontWeight: "800", fontSize: 12 },
  goalTextActive: { color: "#000000", fontWeight: "900" },
  profileFields: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between" },
  profileField: { width: "48%", marginBottom: 10, alignItems: "stretch" },
  profileLabel: { color: "#94A3B8", fontSize: 11, textAlign: "right", marginBottom: 3, fontWeight: "700" },
  profileInputRow: { width: "100%", flexDirection: "row-reverse", alignItems: "stretch" },
  clearProfileFieldButton: { borderColor: "#F59E0B", borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: "#1E293B" },
  clearProfileFieldText: { color: "#F59E0B", fontSize: 10, fontWeight: "900" },
  profileInput: { flex: 1, minWidth: 0, width: "100%", backgroundColor: "#09111D", borderColor: "#334E68", borderWidth: 1, borderRadius: 8, color: "#FFFFFF", padding: 10, textAlign: "right", writingDirection: "rtl", minHeight: 44, fontSize: 14, fontWeight: "700" },
  completeButton: { backgroundColor: "#1E3A5F", borderColor: "#60A5FA", borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  completeText: { color: "#93C5FD", fontWeight: "900", fontSize: 13, writingDirection: "rtl" },
  mealManagement: { backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  mealManagementHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  mealManagementTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  mealManagementHint: { color: "#94A3B8", fontSize: 11 },
  addMealButton: { width: "100%", minHeight: 48, backgroundColor: "#F59E0B", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  addMealButtonText: { color: "#000000", fontWeight: "900", fontSize: 14, writingDirection: "rtl" },
  meal: { backgroundColor: "#16253B", borderColor: "#2E4765", borderWidth: 1, borderRadius: 16, padding: 14, gap: 12, marginBottom: 12 },
  mealActive: { borderColor: "#3B82F6" },
  mealHeader: { minHeight: 88, flexDirection: "column", justifyContent: "center", alignItems: "stretch", paddingHorizontal: 12, paddingVertical: 10, gap: 6, borderRadius: 10, backgroundColor: "#1A2E4C", borderColor: "#33537C", borderWidth: 1 },
  mealHeaderActive: { backgroundColor: "#1E3A5F", borderColor: "#60A5FA" },
  mealHeaderPressed: { opacity: 0.85 },
  mealToggle: { color: "#93C5FD", fontSize: 12, fontWeight: "900", writingDirection: "rtl", textAlign: "right" },
  mealToggleActive: { color: "#60A5FA" },
  mealFoodEditor: { gap: 10, paddingTop: 4 },
  mealFoodListHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 3 },
  mealFoodListTitle: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  mealFoodListCount: { color: "#FBBF24", fontSize: 11, fontWeight: "800", textAlign: "left", writingDirection: "rtl" },
  mealSummaryFooter: { backgroundColor: "#0E1826", borderColor: "#273D54", borderWidth: 1, borderRadius: 10, padding: 12, gap: 8, marginTop: 2, writingDirection: "rtl" },
  mealSummaryTitle: { color: "#FBBF24", fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  mealSummaryValues: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: 6 },
  mealSummaryCalories: { color: "#FFFFFF", fontSize: 12, fontWeight: "900", writingDirection: "rtl" },
  mealSummaryProtein: { color: "#93C5FD", fontSize: 11, fontWeight: "800", writingDirection: "rtl" },
  mealSummaryCarbs: { color: "#60A5FA", fontSize: 11, fontWeight: "800", writingDirection: "rtl" },
  mealSummaryFats: { color: "#FBBF24", fontSize: 11, fontWeight: "800", writingDirection: "rtl" },
  mealActions: { gap: 8, marginTop: 8, paddingTop: 8, borderTopColor: "#2E4765", borderTopWidth: 1 },
  mealQuickActions: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-start", gap: 6 },
  mealMoveButton: { width: 32, height: 30, borderRadius: 7, backgroundColor: "#1E293B", borderColor: "#334E68", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  mealMoveText: { color: "#60A5FA", fontSize: 16, fontWeight: "900" },
  deleteMealButton: { borderColor: "#7F1D1D", borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#450A0A" },
  deleteMealText: { color: "#FCA5A5", fontSize: 11, fontWeight: "900" },
  disabledAction: { opacity: 0.35 },
  mealTitleInput: { backgroundColor: "#09111D", borderColor: "#334E68", borderWidth: 1, borderRadius: 8, color: "#FFFFFF", padding: 10, textAlign: "right", writingDirection: "rtl", fontSize: 13, fontWeight: "700" },
  mealEditButton: { alignSelf: "flex-end", borderColor: "#475569", borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#1E293B" },
  mealEditText: { color: "#60A5FA", fontWeight: "900", fontSize: 12 },
  mealSaveButton: { backgroundColor: "#3B82F6", borderRadius: 8, alignItems: "center", paddingVertical: 10 },
  mealSaveText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },
  mealCancelButton: { borderColor: "#475569", borderWidth: 1, borderRadius: 8, alignItems: "center", paddingVertical: 8, backgroundColor: "#1E293B" },
  mealCancelText: { color: "#CBD5E1", fontWeight: "800", fontSize: 12 },
  addFoodRow: { flexDirection: "row-reverse", alignItems: "center", flexWrap: "wrap", gap: 7, padding: 10, backgroundColor: "#0E1826", borderRadius: 10, borderColor: "#273D54", borderWidth: 1 },
  quickSearchLabel: { color: "#FBBF24", fontSize: 12, fontWeight: "900", textAlign: "right", width: "100%", marginTop: 4 },
  addFoodRowTitle: { width: "100%", color: "#FFFFFF", fontSize: 12, fontWeight: "900", textAlign: "right" },
  addFoodGroupButton: { flex: 1, minWidth: 85, borderRadius: 8, paddingVertical: 9, alignItems: "center", borderWidth: 1, backgroundColor: "#1E293B", borderColor: "#475569" },
  addFoodGroupButtonActive: { backgroundColor: "#3B82F6", borderColor: "#60A5FA" },
  addFoodGroupText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  mealFoodSearch: { backgroundColor: "#09111D", borderColor: "#334E68", borderWidth: 1, borderRadius: 8, color: "#FFFFFF", padding: 10, textAlign: "right", writingDirection: "rtl", fontSize: 13 },
  mealFoodResults: { gap: 6 },
  mealFoodResult: { backgroundColor: "#1E293B", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#334E68", flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  mealFoodResultName: { color: "#FFFFFF", fontWeight: "800", textAlign: "right", fontSize: 13 },
  mealFoodResultMeta: { color: "#94A3B8", fontSize: 11, textAlign: "right" },
  removeMealFoodButton: { alignSelf: "flex-start", backgroundColor: "#450A0A", borderColor: "#7F1D1D", borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 },
  removeMealFoodPressed: { opacity: 0.75 },
  removeMealFoodText: { color: "#FCA5A5", fontSize: 11, fontWeight: "900" },
  mealTitleRow: { width: "100%", flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  mealTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  mealTitleActive: { color: "#FFFFFF" },
  mealFoodCountBadge: { backgroundColor: "#1E293B", borderColor: "#475569", borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 },
  mealFoodCountBadgeActive: { backgroundColor: "#3B82F6", borderColor: "#60A5FA" },
  mealFoodCountText: { color: "#CBD5E1", fontSize: 11, fontWeight: "900", textAlign: "center" },
  mealFoodCountTextActive: { color: "#FFFFFF" },
  mealTotal: { color: "#93C5FD", fontSize: 11, fontWeight: "800", textAlign: "right", width: "100%" },
  mealTotalActive: { color: "#60A5FA" },
  food: { backgroundColor: "#111D2E", borderColor: "#223955", borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, marginBottom: 4 },
  foodTop: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 8 },
  foodName: { color: "#FFFFFF", fontWeight: "900", flex: 1, textAlign: "right", fontSize: 14 },
  foodMacros: { color: "#94A3B8", fontSize: 11, textAlign: "right", writingDirection: "rtl" },
  foodInlineEditWrapper: { flex: 1 },
  inlineEditBox: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  inlineCaloriesInput: { backgroundColor: "#09111D", borderColor: "#3B82F6", borderWidth: 1, borderRadius: 6, color: "#FFFFFF", paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, minWidth: 70, textAlign: "right" },
  inlineSaveButton: { backgroundColor: "#3B82F6", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  inlineSaveText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  inlineCaloriesButton: { alignSelf: "flex-start" },
  foodMetaRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" },
  weightInfoButton: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: "#60A5FA", backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center" },
  weightInfoButtonText: { color: "#60A5FA", fontSize: 12, fontWeight: "900", fontStyle: "italic" },
  weightInfoPanel: { backgroundColor: "#0E1826", borderColor: "#334E68", borderWidth: 1, borderRadius: 8, padding: 8, gap: 3 },
  weightInfoTitle: { color: "#60A5FA", fontSize: 11, fontWeight: "900", textAlign: "right" },
  weightInfoText: { color: "#E2E8F0", fontSize: 11, fontWeight: "700", textAlign: "right" },
  foodMacroLabel: { fontSize: 11, fontWeight: "800", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  foodMacroProtein: { color: "#93C5FD", backgroundColor: "#1E3A5F", borderColor: "#3B82F6", borderWidth: 1 },
  foodMacroCarb: { color: "#67E8F9", backgroundColor: "#164E63", borderColor: "#06B6D4", borderWidth: 1 },
  foodMacroFat: { color: "#FDE047", backgroundColor: "#713F12", borderColor: "#EAB308", borderWidth: 1 },
  foodMeta: { color: "#CBD5E1", fontSize: 11, textAlign: "right", writingDirection: "rtl" },
  eatenButton: { alignSelf: "flex-start", borderColor: "#475569", borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#1E293B" },
  eatenButtonActive: { backgroundColor: "#10B981", borderColor: "#10B981" },
  eatenText: { color: "#CBD5E1", fontSize: 11, fontWeight: "800" },
  eatenTextActive: { color: "#000000", fontWeight: "900" },
  foodEdit: { width: "100%", flexDirection: "row-reverse", flexWrap: "wrap", alignItems: "center", gap: 7 },
  quantityInput: { width: "100%", minHeight: 44, backgroundColor: "#09111D", borderColor: "#334E68", borderWidth: 1, borderRadius: 8, color: "#FFFFFF", fontSize: 16, fontWeight: "800", paddingHorizontal: 12, paddingVertical: 8, textAlign: "right", writingDirection: "rtl" },
  quantityStepper: { flexDirection: "row-reverse", gap: 4 },
  quantityEditButtonContent: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  quantityEditButton: {
    alignSelf: "flex-start",
    borderColor: "#475569",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#1E293B",
  },
  quantityEditButtonActive: { backgroundColor: "#3B82F6", borderColor: "#60A5FA" },
  quantityEditButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  quantityStepButton: { minWidth: 36, minHeight: 32, borderRadius: 7, backgroundColor: "#1E293B", borderColor: "#475569", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  quantityStepText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  quantityInputEditable: { borderColor: "#3B82F6", borderWidth: 2 },
  saveQuantityButton: { backgroundColor: "#F59E0B", borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7 },
  saveQuantityText: { color: "#000000", fontSize: 11, fontWeight: "900" },
  resetQuantityButton: { backgroundColor: "#1E293B", borderColor: "#475569", borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7 },
  resetQuantityText: { color: "#CBD5E1", fontSize: 11, fontWeight: "800" },
  summary: { backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderRadius: 16, padding: 15, gap: 12 },
  viewModeRow: { flexDirection: "row-reverse", gap: 8 },
  viewModeButton: { flex: 1, borderColor: "#475569", borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center", backgroundColor: "#1E293B" },
  viewModeButtonActive: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  viewModeText: { color: "#CBD5E1", fontSize: 11, fontWeight: "800" },
  viewModeTextActive: { color: "#000000", fontWeight: "900" },
  summaryTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "900", textAlign: "right" },
  summaryGrid: { flexDirection: "row-reverse", justifyContent: "space-between" },
  stat: { alignItems: "flex-end" },
  statValue: { color: "#60A5FA", fontSize: 20, fontWeight: "900" },
  statLabel: { color: "#94A3B8", fontSize: 11, marginTop: 3 },
});