import { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, usePathname } from "expo-router";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  Keyboard,
  LayoutAnimation,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  UIManager,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ScreenContainer } from "@/components/screen-container";
import { PermanentSaveBanner } from "@/components/permanent-save-banner";
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import {
  dailyMealTotals,
  defaultMeals,
  mealFoodTotals,
  mealTotals,
  normalizeMealsTo100Grams,
  type Meal,
} from "@/lib/meal-plan";
import { requestNutritionCloudSave } from "@/lib/nutrition-persistence";
import { useWorkoutStore as useNutritionStore } from "@/lib/workout-store";
import {
  convertMealFoodWeight,
  cookingConversionInfo,
  weightModeLabels,
  type WeightMode,
} from "@/lib/cooking-weight";
import { todayKey, upsertSnapshot } from "@/lib/weekly-nutrition";
import {
  alternativesFor,
  conversionFoods,
  gramsForMacroTarget,
  recommendSwap,
  sourceForFood,
  type ConversionFood,
  type ConversionGroup,
} from "@/lib/food-conversions";
import {
  mealPlanGoalLabel,
  scaleMealsToTargets,
} from "@/lib/meal-plan-targets";
import {
  completeMenuProfile,
  createMenuProfiles,
  type MenuProfile,
  type MenuProfiles,
} from "@/lib/menu-profiles";
import {
  cloneMeals,
  emptyMealPlanVersions,
  type MealPlanVersion,
  type MealPlanVersions,
} from "@/lib/meal-plan-versions";
import { buildBodyweightTargets } from "@/lib/bodyweight-targets";
import {
  calculateMacroDistribution,
  type MacroDistribution,
} from "@/lib/macro-distribution";
import { foodItems, macrosForGrams, type FoodGroup } from "@/lib/food-nutrition";

type WaterEntry = {
  id: string;
  amount: number;
  at: string;
};

type PendingSwap = {
  mealIndex: number;
  foodIndex: number;
  sourceName: string;
  sourceQuantity: string;
  sourceTotals: ReturnType<typeof mealFoodTotals>;
  target: ConversionFood;
  result: ReturnType<typeof recommendSwap>;
};

type NutritionDraft = {
  calories: string;
  protein: string;
  carbohydrates: string;
  fats: string;
};

type DailyMealSnapshot = {
  meals: Meal[];
  eaten: Record<string, boolean>;
};

export default function MealPlanScreen() {
  const standalone = usePathname() === "/meals";
  const { nutritionProfile, updateNutritionProfile } = useNutritionStore();
  const user = null;
  const mealFoods = useMemo(() => [...(nutritionProfile.customFoods ?? []), ...foodItems], [nutritionProfile.customFoods]);
  const mealConversionFoods = useMemo(() => [...conversionFoods, ...(nutritionProfile.customFoods ?? []).filter((food) => food.group !== "ירק ופרי").map((food) => ({ id: food.id, name: food.name, group: food.group as ConversionGroup, calories: food.calories, protein: food.protein, carbohydrates: food.carbohydrates, fats: food.fats }))], [nutritionProfile.customFoods]);
  const [meals, setMeals] = useState<Meal[]>(defaultMeals);
  const [pending, setPending] = useState<PendingSwap | null>(null);
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
  const [appliedTarget, setAppliedTarget] = useState("");
  const [rebalanceMessage, setRebalanceMessage] = useState("");
  const [hasFavorite, setHasFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState<"save" | "load" | null>(null);
  const [favoriteStatus, setFavoriteStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [menuProfiles, setMenuProfiles] = useState<MenuProfiles>(() => createMenuProfiles(nutritionProfile));
  const [activeGoal, setActiveGoal] = useState(nutritionProfile.goal);
  const [versionsByGoal, setVersionsByGoal] = useState<MealPlanVersions>(emptyMealPlanVersions);
  const [versionName, setVersionName] = useState("גרסה חדשה");
  const [bodyWeight, setBodyWeight] = useState("");
  const [versionTransitionBusy, setVersionTransitionBusy] = useState(false);
  const [expandedFoodId, setExpandedFoodId] = useState<string | null>(null);
  const [weightInfoFoodId, setWeightInfoFoodId] = useState<string | null>(null);
  const [editingQuantityKey, setEditingQuantityKey] = useState<string | null>(null);
  const [quantityDraft, setQuantityDraft] = useState("");
  const [editingNutritionKey, setEditingNutritionKey] = useState<string | null>(null);
  const [nutritionDraft, setNutritionDraft] = useState<NutritionDraft>({ calories: "", protein: "", carbohydrates: "", fats: "" });
  const [activeSwapKey, setActiveSwapKey] = useState<string | null>(null);
  const [swapGroup, setSwapGroup] = useState<ConversionGroup | null>(null);
  const [expandedMealIds, setExpandedMealIds] = useState<string[]>(["meal-1"]);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [mealEditBackup, setMealEditBackup] = useState<Meal | null>(null);
  const [mealFoodSearch, setMealFoodSearch] = useState("");
  const [addFoodGroupFilter, setAddFoodGroupFilter] = useState<FoodGroup | null>(null);
  const [pressedAddFoodGroup, setPressedAddFoodGroup] = useState<FoodGroup | null>(null);
  const [selectedAddFoodKey, setSelectedAddFoodKey] = useState<string | null>(null);
  const [selectedMealFoodKey, setSelectedMealFoodKey] = useState<string | null>(null);
  const mealPlanScrollRef = useRef<ScrollView>(null);
  const [conversionSearch, setConversionSearch] = useState("");
  const [favoriteConversionIds, setFavoriteConversionIds] = useState<string[]>([]);
  const [animatedFavoriteId, setAnimatedFavoriteId] = useState<string | null>(null);
  const [favoriteNotice, setFavoriteNotice] = useState<string | null>(null);
  const [mealConversionId, setMealConversionId] = useState<string | null>(null);
  const [mealConversionSelection, setMealConversionSelection] = useState<Record<string, ConversionFood | null>>({});

  useEffect(() => {
    if (Platform.OS === "android") {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const activeWater = waterHistory[selectedDate] ?? { consumed: 0, goal: 2000 };
  const waterProgress = activeWater.goal > 0 ? Math.min(activeWater.consumed / activeWater.goal, 1) : 0;
  const activeWaterEvents = [...(waterEvents[selectedDate] ?? [])].sort((a, b) => b.at.localeCompare(a.at));
  const favoriteScale = useRef(new Animated.Value(1)).current;
  const mealPlanOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem("conversion-favorites")
      .then((value) => {
        if (value) setFavoriteConversionIds(JSON.parse(value) as string[]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (hydrated)
      AsyncStorage.setItem("conversion-favorites", JSON.stringify(favoriteConversionIds)).catch(() => undefined);
  }, [favoriteConversionIds, hydrated]);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("meal-plan-state"),
      AsyncStorage.getItem("meal-plan-eaten-history"),
      AsyncStorage.getItem("meal-plan-day-history"),
      AsyncStorage.getItem("meal-plan-favorite"),
      AsyncStorage.getItem("meal-plan-profiles"),
      AsyncStorage.getItem("meal-plan-versions"),
      AsyncStorage.getItem("nutrition-water-history"),
      AsyncStorage.getItem("nutrition-water-events"),
    ])
      .then(
        ([
          value,
          eatenHistoryValue,
          mealHistoryValue,
          favorite,
          profiles,
          versions,
          waterHistoryValue,
          waterEventsValue,
        ]) => {
          let hasLoadedMeals = false;

          if (mealHistoryValue) {
            try {
              const savedHistory = JSON.parse(mealHistoryValue) as Record<string, DailyMealSnapshot>;
              const todaySnapshot = savedHistory[todayKey()];
              if (todaySnapshot?.meals?.length) {
                setMeals(normalizeMealsTo100Grams(todaySnapshot.meals));
                setEaten(todaySnapshot.eaten ?? {});
                hasLoadedMeals = true;
              }
              setMealHistoryByDate(savedHistory);
            } catch {}
          }

          if (!hasLoadedMeals && value) {
            try {
              const saved = JSON.parse(value) as {
                meals?: Meal[];
                eaten?: Record<string, boolean>;
                appliedTarget?: string;
              };
              if (saved.meals?.length) {
                setMeals(normalizeMealsTo100Grams(saved.meals));
              }
              if (saved.appliedTarget) setAppliedTarget(saved.appliedTarget);
              if (saved.eaten) setEaten(saved.eaten);
            } catch {}
          }

          if (eatenHistoryValue) {
            try {
              const savedHistory = JSON.parse(eatenHistoryValue) as Record<string, Record<string, boolean>>;
              setEatenHistory(savedHistory);
              if (!hasLoadedMeals) setEaten(savedHistory[todayKey()] ?? {});
            } catch {}
          }

          setHasFavorite(Boolean(favorite));

          if (versions) {
            try {
              const savedVersions = JSON.parse(versions) as MealPlanVersions;
              setVersionsByGoal({ ...emptyMealPlanVersions(), ...savedVersions });
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

          if (profiles) {
            try {
              const savedProfiles = JSON.parse(profiles) as MenuProfiles;
              setMenuProfiles(savedProfiles);
              const savedActive = savedProfiles[nutritionProfile.goal] ?? savedProfiles.ניטרלי;
              if (savedActive) setActiveGoal(savedActive.goal);
            } catch {}
          }

          setHydrated(true);
        }
      )
      .catch(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) {
      const nextMealsState = JSON.stringify({
        meals,
        eaten: selectedDate === todayKey() ? eaten : eatenHistory[todayKey()] ?? {},
        appliedTarget,
      });
      const nextEatenHistory = JSON.stringify({ ...eatenHistory, [selectedDate]: eaten });
      const nextDayHistory = JSON.stringify({ ...mealHistoryByDate, [selectedDate]: { meals: cloneMeals(meals), eaten } });
      void AsyncStorage.multiSet([
        ["meal-plan-state", nextMealsState],
        ["meal-plan-eaten-history", nextEatenHistory],
        ["meal-plan-day-history", nextDayHistory],
        ["meal-plan-profiles", JSON.stringify(menuProfiles)],
        ["meal-plan-versions", JSON.stringify(versionsByGoal)],
        ["nutrition-water-history", JSON.stringify(waterHistory)],
        ["nutrition-water-events", JSON.stringify(waterEvents)],
      ])
        .then(requestNutritionCloudSave)
        .catch(() => undefined);
    }
  }, [meals, eaten, eatenHistory, mealHistoryByDate, selectedDate, hydrated, appliedTarget, menuProfiles, versionsByGoal, waterHistory, waterEvents]);

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

  const buildProfileFromWeight = () => {
    const result = buildBodyweightTargets(Number(bodyWeight), targetCalories, activeGoal);
    if (!result) {
      setRebalanceMessage("הזן משקל גוף ויעד קלורי תקינים לפני בניית התפריט.");
      return;
    }
    commitProfile({
      ...activeProfile,
      calories: String(result.calories),
      protein: String(result.protein),
      carbohydrates: String(result.carbohydrates),
      fats: String(result.fats),
    });
    setRebalanceMessage(result.warning ?? `היעדים נבנו לפי ${bodyWeight} ק״ג במצב ${mealPlanGoalLabel(activeGoal)}.`);
  };

  useEffect(() => {
    setWaterGoalDraft(String(activeWater.goal));
  }, [selectedDate, activeWater.goal]);

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

  const saveActiveProfile = async () => {
    const nextProfiles = { ...menuProfiles, [activeProfile.goal]: activeProfile };
    await AsyncStorage.setItem("meal-plan-profiles", JSON.stringify(nextProfiles));
    setMenuProfiles(nextProfiles);
    setRebalanceMessage(`יעד ${mealPlanGoalLabel(activeProfile.goal)} נשמר בהצלחה.`);
  };

  const saveVersion = () => {
    triggerFavoriteHaptic();
    const name = versionName.trim() || `גרסת ${versionsByGoal[activeGoal].length + 1}`;
    const version: MealPlanVersion = {
      id: `${activeGoal}-${Date.now()}`,
      name,
      goal: activeGoal,
      profile: { ...activeProfile },
      meals: cloneMeals(meals),
      savedAt: new Date().toISOString(),
      favorite: false,
    };
    setVersionsByGoal((current) => ({ ...current, [activeGoal]: [version, ...current[activeGoal]] }));
    setVersionName("");
    setRebalanceMessage(`הגרסה "${name}" נשמרה תחת ${mealPlanGoalLabel(activeGoal)}.`);
  };

  const loadVersion = (version: MealPlanVersion) => {
    if (versionTransitionBusy) return;
    triggerFavoriteHaptic();
    setVersionTransitionBusy(true);
    Animated.timing(mealPlanOpacity, {
      toValue: 0.25,
      duration: 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setActiveGoal(version.goal);
      setMeals(normalizeMealsTo100Grams(cloneMeals(version.meals)));
      commitProfile({ ...version.profile });
      setAppliedTarget(`${version.profile.goal}:${version.profile.calories}:${version.profile.protein}:${version.profile.carbohydrates}:${version.profile.fats}`);
      setVersionName(version.name);
      setRebalanceMessage(`הגרסה "${version.name}" נטענה בהצלחה.`);
      Animated.timing(mealPlanOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(() => setVersionTransitionBusy(false));
    });
  };

  const toggleVersionFavorite = (versionId: string) => {
    setVersionsByGoal((current) => ({
      ...current,
      [activeGoal]: current[activeGoal].map((version) => ({
        ...version,
        favorite: version.id === versionId ? !version.favorite : false,
      })),
    }));
    setRebalanceMessage("הגרסה המועדפת עודכנה.");
  };

  const favoriteVersion = versionsByGoal[activeGoal].find((version) => version.favorite);
  const loadFavoriteVersion = () => {
    if (favoriteVersion) loadVersion(favoriteVersion);
    else setRebalanceMessage("עדיין לא סומנה גרסה מועדפת למצב הזה.");
  };

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

  useEffect(() => {
    if (!hydrated || nutritionProfile.goal !== activeGoal) return;
    const syncedProfile: MenuProfile = {
      ...activeProfile,
      calories: nutritionProfile.calorieTarget ?? activeProfile.calories,
      protein: nutritionProfile.proteinTarget ?? activeProfile.protein,
      carbohydrates: nutritionProfile.carbohydratesTarget ?? activeProfile.carbohydrates,
      fats: nutritionProfile.fatsTarget ?? activeProfile.fats,
    };
    const changed =
      syncedProfile.calories !== activeProfile.calories ||
      syncedProfile.protein !== activeProfile.protein ||
      syncedProfile.carbohydrates !== activeProfile.carbohydrates ||
      syncedProfile.fats !== activeProfile.fats;
    if (changed) {
      setMenuProfiles((current) => ({ ...current, [activeGoal]: syncedProfile }));
    }
  }, [activeGoal, activeProfile, hydrated, nutritionProfile.goal, nutritionProfile.calorieTarget, nutritionProfile.proteinTarget, nutritionProfile.carbohydratesTarget, nutritionProfile.fatsTarget]);

  const targets = {
    calories: targetCalories || dailyMealTotals(meals).calories,
    protein: Number(activeProfile.protein) || 0,
    carbohydrates: Number(activeProfile.carbohydrates) || 0,
    fats: Number(activeProfile.fats) || 0,
  };

  const toggleEaten = (id: string) => setEaten((current) => ({ ...current, [id]: !current[id] }));

  const selectMealDate = (nextDate: string) => {
    const currentSnapshot = { meals: cloneMeals(meals), eaten };
    const nextSnapshot = mealHistoryByDate[nextDate];
    setMealHistoryByDate((current) => ({ ...current, [selectedDate]: currentSnapshot }));
    setSelectedDate(nextDate);
    if (nextSnapshot?.meals.length) {
      setMeals(normalizeMealsTo100Grams(nextSnapshot.meals));
      setEaten(nextSnapshot.eaten);
    } else {
      setEaten({});
    }
    setViewMode("eaten");
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

  const rebalanceToTarget = () => {
    if (!targetCalories) {
      setRebalanceMessage("יש להגדיר יעד קלורי במחשבון לפני האיזון מחדש.");
      return;
    }
    setMeals((current) =>
      scaleMealsToTargets(current, {
        calories: targetCalories,
        protein: Number(activeProfile.protein) || 0,
        carbohydrates: Number(activeProfile.carbohydrates) || 0,
        fats: Number(activeProfile.fats) || 0,
      })
    );
    setRebalanceMessage(`הכמויות אוזנו מחדש ליעד של ${targetCalories} קק״ל.`);
  };

  const resetToOriginal = () => {
    setMeals(JSON.parse(JSON.stringify(defaultMeals)) as Meal[]);
    setRebalanceMessage("התפריט חזר לתפריט המקורי. סימוני נאכל נשמרו.");
  };

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const exportPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    setShareStatus(null);
    const html = buildMealPlanHtml(activeGoal, activeProfile, targetCalories, meals, user?.name ?? "", bodyWeight);
    try {
      if (Platform.OS === "web") {
        await Print.printAsync({ html });
        setShareStatus({ type: "success", message: "חלון ההדפסה נפתח. בחרת באפשרות שמירה כ־PDF." });
      } else {
        const { uri } = await Print.printToFileAsync({
          html,
          width: 595,
          height: 842,
          margins: { top: 28, bottom: 28, left: 28, right: 28 },
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            UTI: "com.adobe.pdf",
            dialogTitle: "שתף תפריט PDF",
          });
          setShareStatus({ type: "success", message: "קובץ ה־PDF נוצר ונפתח לשיתוף." });
        } else {
          setShareStatus({ type: "success", message: "קובץ ה־PDF נוצר בהצלחה במכשיר." });
        }
      }
    } catch {
      setShareStatus({ type: "error", message: "יצירת או שיתוף ה־PDF נכשלו. נסה שוב." });
    } finally {
      setPdfBusy(false);
    }
  };

  const shareMealPlan = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    setShareStatus(null);
    const lines = [
      `תפריט ${meals.length} ארוחות — ${mealPlanGoalLabel(activeGoal)}`,
      `יעד: ${targetCalories || "לא הוגדר"} קק״ל`,
      `חלבון: ${activeProfile.protein || "—"} ג׳ · פחמימות: ${activeProfile.carbohydrates || "—"} ג׳ · שומן: ${activeProfile.fats || "—"} ג׳`,
      "",
      ...meals.map((meal, index) => {
        const foods = meal.foods.map((food) => `• ${food.name}: ${food.quantity}`).join("\n");
        return `ארוחה ${index + 1} — ${meal.title}\n${foods}`;
      }),
    ];
    try {
      await Share.share({ title: `תפריט ${meals.length} ארוחות`, message: lines.join("\n\n") });
      setShareStatus({ type: "success", message: "חלון השיתוף נפתח. אפשר לבחור WhatsApp או דוא״ל." });
    } catch {
      setShareStatus({ type: "error", message: "השיתוף לא הושלם. נסה שוב." });
    } finally {
      setShareBusy(false);
    }
  };

  const saveFavorite = async () => {
    if (favoriteBusy) return;
    setFavoriteBusy("save");
    setFavoriteStatus(null);
    try {
      await Promise.all([
        AsyncStorage.setItem(
          "meal-plan-favorite",
          JSON.stringify({
            meals: normalizeMealsTo100Grams(meals),
            savedAt: new Date().toISOString(),
          })
        ),
        wait(450),
      ]);
      setHasFavorite(true);
      setFavoriteStatus({ type: "success", message: "התפריט נשמר כמועדף וזמין לטעינה מהירה." });
    } catch {
      setFavoriteStatus({ type: "error", message: "שמירת התפריט המועדף נכשלה. נסה שוב." });
    } finally {
      setFavoriteBusy(null);
    }
  };

  const loadFavorite = async () => {
    if (favoriteBusy) return;
    setFavoriteBusy("load");
    setFavoriteStatus(null);
    try {
      const [value] = await Promise.all([AsyncStorage.getItem("meal-plan-favorite"), wait(450)]);
      if (!value) {
        setHasFavorite(false);
        setFavoriteStatus({ type: "error", message: "עדיין לא נשמר תפריט מועדף." });
        return;
      }
      const saved = JSON.parse(value) as { meals?: Meal[] };
      if (saved.meals) setMeals(normalizeMealsTo100Grams(saved.meals));
      setFavoriteStatus({ type: "success", message: "התפריט המועדף נטען בהצלחה." });
    } catch {
      setFavoriteStatus({ type: "error", message: "טעינת התפריט המועדף נכשלה. נסה שוב." });
    } finally {
      setFavoriteBusy(null);
    }
  };

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
  const consumed = useMemo(
    () =>
      meals
        .flatMap((meal) => meal.foods)
        .filter((food) => eaten[food.id])
        .reduce(
          (sum, food) => {
            const values = mealFoodTotals(food);
            return {
              calories: sum.calories + values.calories,
              protein: sum.protein + values.protein,
              carbohydrates: sum.carbohydrates + values.carbohydrates,
              fats: sum.fats + values.fats,
            };
          },
          { calories: 0, protein: 0, carbohydrates: 0, fats: 0 }
        ),
    [meals, eaten]
  );

  useEffect(() => {
    if (!hydrated || selectedDate !== todayKey()) return;
    AsyncStorage.getItem("nutrition-daily-history")
      .then((value) => {
        const history = value ? JSON.parse(value) : [];
        const next = upsertSnapshot(history, {
          date: todayKey(),
          calories: consumed.calories,
          protein: consumed.protein,
          carbohydrates: consumed.carbohydrates,
          fats: consumed.fats,
        });
        return AsyncStorage.setItem("nutrition-daily-history", JSON.stringify(next));
      })
      .catch(() => undefined);
  }, [consumed, hydrated, selectedDate]);

  const macroDistribution = useMemo(() => calculateMacroDistribution(displayedTotals), [displayedTotals]);

  const triggerFavoriteHaptic = () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const toggleConversionFavorite = (targetId: string) => {
    triggerFavoriteHaptic();
    const willFavorite = !favoriteConversionIds.includes(targetId);
    setFavoriteConversionIds((current) =>
      current.includes(targetId) ? current.filter((id) => id !== targetId) : [...current, targetId]
    );
    setAnimatedFavoriteId(targetId);
    setFavoriteNotice(willFavorite ? "החלופה נוספה למועדפים" : "החלופה הוסרה מהמועדפים");
    Animated.sequence([
      Animated.timing(favoriteScale, { toValue: 1.2, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(favoriteScale, { toValue: 1, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]).start(() => setAnimatedFavoriteId(null));
    setTimeout(() => setFavoriteNotice(null), 1800);
  };

  const chooseSwap = (mealIndex: number, foodIndex: number, target: ConversionFood) => {
    const food = meals[mealIndex].foods[foodIndex];
    const source = sourceForFood(food.name);
    const grams = Number(food.quantity.match(/^[0-9]+(?:\.[0-9]+)?/)?.[0] ?? 100);
    if (source)
      setPending({
        mealIndex,
        foodIndex,
        sourceName: food.name,
        sourceQuantity: food.quantity,
        sourceTotals: mealFoodTotals(food),
        target,
        result: recommendSwap(
          source,
          target,
          grams,
          mealFoodTotals(food)[source.group === "חלבון" ? "protein" : source.group === "פחמימה" ? "carbohydrates" : "fats"]
        ),
      });
  };

  const confirmSwap = () => {
    if (!pending) return;
    setMeals((current) =>
      current.map((meal, mealIndex) => {
        if (mealIndex !== pending.mealIndex) return meal;
        return {
          ...meal,
          foods: meal.foods.map((food, foodIndex) =>
            foodIndex !== pending.foodIndex
              ? food
              : {
                  ...food,
                  name: pending.target.name,
                  quantity: `${pending.result.grams} גרם`,
                  reference: "המרה לפי ערך מאקרו",
                  calories: pending.result.calories,
                  protein: pending.result.protein,
                  carbohydrates: pending.result.carbohydrates,
                  fats: pending.result.fats,
                }
          ),
        };
      })
    );
    setPending(null);
  };

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
    setMeals((current) => [...current, nextMeal]);
    setExpandedMealIds((current) => [...current, nextMeal.id]);
    setViewMode("planned");
    setRebalanceMessage(`נוספה ${nextMeal.title}. אפשר לערוך את השם והמזונות.`);
  };

  const deleteMeal = (meal: Meal) => {
    if (meals.length <= 1) {
      setRebalanceMessage("חייבת להישאר לפחות ארוחה אחת בתפריט.");
      return;
    }
    setMeals((current) => current.filter((item) => item.id !== meal.id));
    setExpandedMealIds((current) => current.filter((id) => id !== meal.id));
    if (editingMealId === meal.id) cancelMealEdit();
    setRebalanceMessage(`${meal.title} נמחקה ונשמרה בתאריך הנוכחי.`);
  };

  const moveMeal = (mealId: string, direction: -1 | 1) => {
    setMeals((current) => {
      const index = current.findIndex((meal) => meal.id === mealId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const updateMealTitle = (mealId: string, title: string) =>
    setMeals((current) => current.map((meal) => (meal.id === mealId ? { ...meal, title } : meal)));

  const beginMealEdit = (meal: Meal) => {
    setMealEditBackup(JSON.parse(JSON.stringify(meal)) as Meal);
    setEditingMealId(meal.id);
    setExpandedMealIds((current) => (current.includes(meal.id) ? current : [...current, meal.id]));
    setMealFoodSearch("");
    setAddFoodGroupFilter(null);
    setSelectedAddFoodKey(null);
    setSelectedMealFoodKey(null);
  };

  const openMealFoodGroup = (meal: Meal, group: FoodGroup) => {
    setMealEditBackup((current) => current ?? (JSON.parse(JSON.stringify(meal)) as Meal));
    setEditingMealId(meal.id);
    setExpandedMealIds((current) => (current.includes(meal.id) ? current : [...current, meal.id]));
    setMealFoodSearch("");
    setPressedAddFoodGroup(group);
    setSelectedAddFoodKey(`${meal.id}:${group}`);
    setSelectedMealFoodKey(null);
    setAddFoodGroupFilter(group);
  };

  const updateMealFoodQuantity = (mealId: string, foodId: string, quantity: string) => {
    setMeals((current) =>
      current.map((meal) =>
        meal.id !== mealId
          ? meal
          : {
              ...meal,
              foods: meal.foods.map((food) =>
                food.id === foodId
                  ? {
                      ...food,
                      quantity,
                      servingGrams:
                        food.servingGrams ??
                        Number(food.quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)/)?.[1] ?? 100),
                    }
                  : food
              ),
            }
      )
    );
  };

  const saveMealFoodQuantity = (mealId: string, foodId: string, draftOverride?: string) => {
    const meal = meals.find((item) => item.id === mealId);
    const food = meal?.foods.find((item) => item.id === foodId);
    const raw = (draftOverride ?? food?.quantity ?? "").trim().replace(",", ".");
    const match = raw.match(/^([0-9]+(?:\.[0-9]+)?)/);
    const parsed = match ? Number(match[1]) : 0;
    const normalized = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 10) / 10) : 0;
    updateMealFoodQuantity(mealId, foodId, `${normalized} גרם`);
  };

  const resetMealFoodQuantity = (mealId: string, foodId: string) => {
    setQuantityDraft("100");
    updateMealFoodQuantity(mealId, foodId, "100 גרם");
  };

  const openManualNutritionEditor = (mealId: string, food: Meal["foods"][number]) => {
    const t = mealFoodTotals(food);
    const key = `${mealId}:${food.id}`;
    if (editingNutritionKey === key) {
      setEditingNutritionKey(null);
      Keyboard.dismiss();
      return;
    }
    setNutritionDraft({
      calories: String(t.calories),
      protein: String(t.protein),
      carbohydrates: String(t.carbohydrates),
      fats: String(t.fats),
    });
    setEditingNutritionKey(key);
    setEditingQuantityKey(null);
    setActiveSwapKey(null);
  };

  const saveManualNutrition = (mealId: string, foodId: string) => {
    const parseValue = (value: string) => {
      const parsed = Number(value.replace(",", "."));
      return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 10) / 10) : 0;
    };
    setMeals((current) =>
      current.map((meal) =>
        meal.id !== mealId
          ? meal
          : {
              ...meal,
              foods: meal.foods.map((food) => {
                if (food.id !== foodId) return food;
                const grams = Number(food.quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)/)?.[1]);
                return {
                  ...food,
                  calories: Math.round(parseValue(nutritionDraft.calories)),
                  protein: parseValue(nutritionDraft.protein),
                  carbohydrates: parseValue(nutritionDraft.carbohydrates),
                  fats: parseValue(nutritionDraft.fats),
                  servingGrams: Number.isFinite(grams) && grams > 0 ? grams : food.servingGrams ?? 100,
                  reference: `ערך ידני · ${food.quantity}`,
                  manualNutrition: true,
                };
              }),
            }
      )
    );
    setEditingNutritionKey(null);
    Keyboard.dismiss();
    setRebalanceMessage("ערכי התזונה נשמרו ידנית והסיכומים עודכנו.");
  };

  const restoreNutritionLabel = (mealId: string, foodId: string) => {
    setMeals((current) =>
      current.map((meal) =>
        meal.id !== mealId
          ? meal
          : normalizeMealsTo100Grams([
              {
                ...meal,
                foods: meal.foods.map((food) =>
                  food.id === foodId ? { ...food, manualNutrition: false } : food
                ),
              },
            ])[0]
      )
    );
    setEditingNutritionKey(null);
    setRebalanceMessage("ערכי התווית המקוריים שוחזרו לכרטיס.");
  };

  const updateMealFoodWeightMode = (mealId: string, foodId: string, mode: WeightMode) => {
    setMeals((current) =>
      current.map((meal) =>
        meal.id !== mealId
          ? meal
          : {
              ...meal,
              foods: meal.foods.map((food) =>
                food.id === foodId
                  ? (() => {
                      const converted = convertMealFoodWeight(food, mode);
                      const convertedGrams = Number(
                        converted.quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)/)?.[1]
                      );
                      return food.manualNutrition && Number.isFinite(convertedGrams)
                        ? { ...converted, servingGrams: convertedGrams }
                        : converted;
                    })()
                  : food
              ),
            }
      )
    );
  };

  const adjustMealFoodQuantity = (mealId: string, foodId: string, delta: number) => {
    const meal = meals.find((item) => item.id === mealId);
    const food = meal?.foods.find((item) => item.id === foodId);
    const currentMatch = food?.quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)/);
    const currentGrams = currentMatch ? Number(currentMatch[1]) : 0;
    const nextGrams = Math.max(0, Math.round((currentGrams + delta) * 10) / 10);
    setQuantityDraft(String(nextGrams));
    updateMealFoodQuantity(mealId, foodId, `${nextGrams} גרם`);
  };

  const removeMealFood = (mealId: string, foodId: string) => {
    const meal = meals.find((item) => item.id === mealId);
    if (!meal || meal.foods.length <= 1) {
      setRebalanceMessage("חייב להישאר לפחות רכיב אחד בארוחה.");
      return;
    }
    const removed = meal.foods.find((food) => food.id === foodId);
    setMeals((current) =>
      current.map((item) =>
        item.id !== mealId ? item : { ...item, foods: item.foods.filter((food) => food.id !== foodId) }
      )
    );
    setActiveSwapKey(null);
    setEditingQuantityKey(null);
    setRebalanceMessage(`הוסר ${removed?.name ?? "הרכיב"} מהארוחה.`);
  };

  const addFoodToMeal = (mealId: string, item: (typeof mealFoods)[number]) => {
    const grams = 100;
    const macros = macrosForGrams(item, grams);
    setMeals((current) =>
      current.map((meal) =>
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
                  weightMode: "cooked",
                  ...macros,
                  servingGrams: grams,
                },
              ],
            }
      )
    );
    setSelectedMealFoodKey(`${mealId}:${item.id}`);
    setPressedAddFoodGroup(null);
    setRebalanceMessage(`נוסף ${item.name} ל${meals.find((meal) => meal.id === mealId)?.title ?? "ארוחה"}.`);
  };

  const saveMealEdit = () => {
    setEditingMealId(null);
    setMealEditBackup(null);
    setMealFoodSearch("");
    setRebalanceMessage("השינויים בארוחה נשמרו.");
  };

  const cancelMealEdit = () => {
    if (mealEditBackup)
      setMeals((current) =>
        current.map((meal) => (meal.id === mealEditBackup.id ? normalizeMealsTo100Grams([mealEditBackup])[0] : meal))
      );
    setEditingMealId(null);
    setMealEditBackup(null);
    setMealFoodSearch("");
    setAddFoodGroupFilter(null);
    setSelectedAddFoodKey(null);
    setSelectedMealFoodKey(null);
  };

  const filteredMealFoods = mealFoods
    .filter((item) => !addFoodGroupFilter || item.group === addFoodGroupFilter)
    .filter((item) => `${item.name} ${item.group} ${item.reference}`.includes(mealFoodSearch.trim()))
    .slice(0, 15);

  const openSwap = (mealId: string, foodId: string, group: ConversionGroup) => {
    setActiveSwapKey(`${mealId}:${foodId}`);
    setSwapGroup(group);
    setConversionSearch("");
    setExpandedFoodId(null);
  };

  const openMealConversion = (meal: Meal) => {
    const defaults: Record<string, ConversionFood | null> = {};
    (["חלבון", "פחמימה", "שומן"] as ConversionGroup[]).forEach((group) => {
      const source = meal.foods.find(
        (food) => foodMacroLabel(food.name, food.protein, food.carbohydrates, food.fats) === group
      );
      defaults[group] =
        sourceForFood(source?.name ?? "") ?? mealConversionFoods.find((food) => food.group === group) ?? null;
    });
    setMealConversionSelection(defaults);
    setMealConversionId(meal.id);
  };

  const applyMealConversion = () => {
    if (!mealConversionId) return;
    const meal = meals.find((item) => item.id === mealConversionId);
    if (!meal) return;
    const groups: ConversionGroup[] = ["חלבון", "פחמימה", "שומן"];
    const nextFoods = groups
      .map((group) => {
        const selected = mealConversionSelection[group];
        if (!selected) return null;
        const targetMacro = group === "חלבון" ? "protein" : group === "פחמימה" ? "carbohydrates" : "fats";
        const originalTarget = meal.foods.reduce((sum, food) => {
          const label = foodMacroLabel(food.name, food.protein, food.carbohydrates, food.fats);
          return label === group ? sum + mealFoodTotals(food)[targetMacro] : sum;
        }, 0);
        const grams = gramsForMacroTarget(selected, targetMacro, originalTarget);
        const factor = grams / 100;
        return {
          id: `${selected.id}-${meal.id}-${Date.now()}-${group}`,
          name: selected.name,
          quantity: `${grams} גרם`,
          reference: `המרת ארוחה · יעד ${Math.round(originalTarget * 10) / 10} ג׳ ${group} · לפי 100 גרם`,
          calories: Math.round(selected.calories * factor),
          protein: Math.round(selected.protein * factor * 10) / 10,
          carbohydrates: Math.round(selected.carbohydrates * factor * 10) / 10,
          fats: Math.round(selected.fats * factor * 10) / 10,
          weightMode: "cooked" as WeightMode,
        };
      })
      .filter(Boolean) as Meal["foods"];
    setMeals((current) => current.map((item) => (item.id === meal.id ? { ...item, foods: nextFoods } : item)));
    setMealConversionId(null);
    setRebalanceMessage(`${meal.title} הומרה לפי יעדי המאקרו המקוריים: חלבון, פחמימה ושומן.`);
  };

  return (
    <ScreenContainer className="px-5 pt-5" containerClassName="bg-[#07111E]">
      <ScrollView
        ref={mealPlanScrollRef}
        style={styles.mealPlanScroll}
        scrollEnabled={true}
        onStartShouldSetResponderCapture={() => false}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={true}
        alwaysBounceVertical
        nestedScrollEnabled={false}
        disableScrollViewPanResponder={false}
        directionalLockEnabled={false}
        scrollsToTop={true}
        overScrollMode="always"
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
            יעד פעיל: {mealPlanGoalLabel(activeGoal)} · {targetCalories || "לא הוגדר"} קק״ל · לפי המחשבון הקלורי
          </Text>
          <Pressable onPress={() => router.push("/scroll-test")} style={styles.scrollTestButton}>
            <Text style={styles.scrollTestButtonText}>בדיקת גלילה</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/nutrition-calendar" as never)} style={styles.scrollTestButton}>
            <Text style={styles.scrollTestButtonText}>לוח תזונה: יום · שבוע · חודש</Text>
          </Pressable>
          <PermanentSaveBanner />
          <View style={styles.datePicker}>
            <Pressable onPress={() => changeSelectedDate(-1)} style={styles.dateButton}>
              <Text style={styles.dateButtonText}>‹</Text>
            </Pressable>
            <Pressable onPress={openCalendar} style={styles.dateCenter}>
              <Text style={styles.dateLabel}>
                {selectedDate === todayKey() ? "היום" : formatDateLabel(selectedDate)}
              </Text>
              <Text style={styles.dateHint}>
                לחץ לפתיחת לוח שנה · {selectedDate === todayKey() ? "מעקב יומי" : "היסטוריית אכילה"}
              </Text>
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

        <View style={styles.profileEditor}>
          <Text style={styles.profileTitle}>הגדרת יעד בתוך התפריט</Text>
          <Text style={styles.profileHint}>בחר מצב, ערוך את הכמויות ושמור כל מצב בנפרד.</Text>
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
          <Text style={styles.profileHint}>בחר איזה רכיב להשלים אוטומטית:</Text>
          <View style={styles.goalRow}>
            {(
              [
                ["protein", "חלבון"],
                ["carbohydrates", "פחמימות"],
                ["fats", "שומן"],
              ] as const
            ).map(([field, label]) => (
              <Pressable
                key={field}
                accessibilityRole="button"
                accessibilityState={{ selected: activeProfile.autoField === field }}
                onPress={() => patchActiveProfile({ autoField: field })}
                style={[styles.autoButton, activeProfile.autoField === field && styles.autoButtonActive]}
              >
                <Text style={[styles.autoText, activeProfile.autoField === field && styles.autoTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.weightBuilder}>
            <Text style={styles.profileHint}>בניית תפריט לפי משקל גוף</Text>
            <View style={styles.weightRow}>
              <TextInput
                value={bodyWeight}
                onChangeText={(value) => setBodyWeight(value.replace(/[^0-9.]/g, ""))}
                placeholder="משקל בק״ג"
                placeholderTextColor="#8A9BB5"
                keyboardType="numeric"
                style={styles.weightInput}
              />
              <Pressable onPress={buildProfileFromWeight} style={styles.weightButton}>
                <Text style={styles.weightButtonText}>בנה לפי משקל</Text>
              </Pressable>
            </View>
            <Text style={styles.weightHint}>החלבון והשומן יחושבו לפי המצב, והפחמימות ימלאו את יתרת הקלוריות.</Text>
          </View>
          <Pressable onPress={completeActiveProfile} style={styles.completeButton}>
            <Text style={styles.completeText}>השלם אוטומטית לפי הקלוריות</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`שמור יעד ${activeGoal}`}
            onPress={saveActiveProfile}
            style={({ pressed }) => [styles.saveProfileButton, pressed && styles.bannerPressed]}
          >
            <Text style={styles.saveProfileText}>שמור יעד {activeGoal}</Text>
          </Pressable>
          <Text style={styles.profileHint}>גרסה חדשה למצב {activeGoal}</Text>
          <View style={styles.versionComposer}>
            <TextInput
              value={versionName}
              onChangeText={setVersionName}
              placeholder="שם הגרסה"
              placeholderTextColor="#8A9BB5"
              style={styles.versionInput}
            />
            <Pressable onPress={saveVersion} style={styles.versionSaveButton}>
              <Text style={styles.versionSaveText}>שמור גרסה</Text>
            </Pressable>
          </View>
          {favoriteVersion ? (
            <Pressable
              disabled={versionTransitionBusy}
              onPress={loadFavoriteVersion}
              style={[styles.favoriteVersionButton, versionTransitionBusy && styles.versionButtonDisabled]}
            >
              <Text style={styles.favoriteVersionText}>★ טען מועדפת: {favoriteVersion.name}</Text>
            </Pressable>
          ) : null}
          {versionsByGoal[activeGoal].length > 0 ? (
            <View style={styles.versionList}>
              {versionsByGoal[activeGoal].map((version) => (
                <View key={version.id} style={styles.versionItem}>
                  <Pressable
                    disabled={versionTransitionBusy}
                    onPress={() => loadVersion(version)}
                    style={[styles.versionLoadButton, versionTransitionBusy && styles.versionButtonDisabled]}
                  >
                    <Text style={styles.versionLoad}>טען</Text>
                  </Pressable>
                  <Text style={styles.versionName}>{version.name}</Text>
                  <Pressable
                    onPress={() => toggleVersionFavorite(version.id)}
                    style={[styles.versionFavoriteButton, version.favorite && styles.versionFavoriteButtonActive]}
                  >
                    <Text style={[styles.versionFavoriteText, version.favorite && styles.versionFavoriteTextActive]}>
                      {version.favorite ? "★" : "☆"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noVersions}>אין עדיין גרסאות שמורות למצב הזה.</Text>
          )}
        </View>

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
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="התקדמות שתיית המים היומית"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(waterProgress * 100) }}
            style={styles.waterProgressTrack}
          >
            <View style={[styles.waterProgressFill, waterProgress >= 1 && styles.waterProgressFillDone, { width: `${Math.round(waterProgress * 100)}%` }]}>
              <View style={styles.waterProgressGlow} />
            </View>
            <View style={[styles.waterProgressMarker, { left: "99%" }]} />
          </View>
          <View style={styles.waterProgressScale}>
            <Text style={styles.waterProgressScaleText}>0 מ״ל</Text>
            <Text style={styles.waterProgressScaleText}>יעד {Math.round(activeWater.goal)} מ״ל</Text>
          </View>
          <Text style={styles.waterRemaining}>
            {activeWater.consumed >= activeWater.goal
              ? "הגעת ליעד המים היומי"
              : `נשארו ${Math.max(0, Math.round(activeWater.goal - activeWater.consumed))} מ״ל להשלמת היעד`}
          </Text>
          <Text style={styles.waterQuickTitle}>הוספה מהירה</Text>
          <View style={styles.waterQuickRow}>
            {[
              { amount: 200, kind: "כוס" },
              { amount: 250, kind: "כוס" },
              { amount: 330, kind: "בקבוק" },
              { amount: 500, kind: "בקבוק" },
              { amount: 750, kind: "בקבוק" },
            ].map(({ amount, kind }) => (
              <Pressable
                key={amount}
                accessibilityRole="button"
                accessibilityLabel={`הוספת ${amount} מיליליטר, ${kind}`}
                onPress={() => addWater(amount)}
                style={({ pressed }) => [styles.waterQuickButton, pressed && styles.waterQuickButtonPressed]}
              >
                <Text style={styles.waterQuickIcon}>{kind === "כוס" ? "◉" : "▣"}</Text>
                <Text style={styles.waterQuickButtonText}>{kind}</Text>
                <Text style={styles.waterQuickAmount}>+{amount} מ״ל</Text>
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
                returnKeyType="done"
                selectTextOnFocus
                placeholder="יעד במ״ל"
                placeholderTextColor="#8A9BB5"
                style={styles.waterGoalInput}
              />
              <Text style={styles.waterGoalLabel}>יעד מים במ״ל</Text>
            </View>
          </View>
        </View>

        <View style={styles.waterHistoryCard}>
          <View style={styles.waterHistoryHeader}>
            <Text style={styles.waterHistoryTitle}>היסטוריית שתייה יומית</Text>
            <Text style={styles.waterHistoryCount}>{activeWaterEvents.length} הוספות</Text>
          </View>
          {activeWaterEvents.length === 0 ? (
            <Text style={styles.waterHistoryEmpty}>עדיין לא נרשמה שתייה ביום הזה.</Text>
          ) : (
            <View style={styles.waterHistoryList}>
              {activeWaterEvents.map((entry, index) => {
                const cumulative = activeWaterEvents.slice(index).reduce((sum, current) => sum + current.amount, 0);
                const time = new Date(entry.at).toLocaleTimeString("he-IL", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
                return (
                  <View key={entry.id} style={styles.waterHistoryRow}>
                    <Text style={styles.waterHistoryCumulative}>מצטבר {cumulative} מ״ל</Text>
                    <Text style={styles.waterHistoryAmount}>+{entry.amount} מ״ל</Text>
                    <Text style={styles.waterHistoryTime}>{time}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <MacroDistributionCard distribution={macroDistribution} />

        {favoriteNotice ? (
          <Animated.View style={styles.conversionNotice}>
            <Text style={styles.conversionNoticeIcon}>✓</Text>
            <Text style={styles.conversionNoticeText}>{favoriteNotice}</Text>
          </Animated.View>
        ) : null}

        {versionTransitionBusy ? (
          <View style={styles.versionLoading}>
            <ActivityIndicator color="#5B9FE3" size="small" />
            <Text style={styles.versionLoadingText}>טוען גרסת תפריט…</Text>
          </View>
        ) : null}

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
            const previous = meals.slice(0, mealIndex + 1).reduce((sum, current) => sum + mealTotals(current).calories, 0);
            const proteinSources = meal.foods.filter(
              (food) => foodMacroLabel(food.name, food.protein, food.carbohydrates, food.fats) === "חלבון"
            ).length;
            const isExpanded = expandedMealIds.includes(meal.id);

            return (
              <View key={meal.id} style={[styles.meal, isExpanded && styles.mealActive]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${meal.title}, ${isExpanded ? "פתוח" : "סגור"}.`}
                  accessibilityState={{ expanded: isExpanded }}
                  onPress={() => toggleMeal(meal.id)}
                  style={({ pressed }) => [styles.mealHeader, isExpanded && styles.mealHeaderActive, pressed && styles.mealHeaderPressed]}
                >
                  <Text style={[styles.mealTotal, isExpanded && styles.mealTotalActive]}>
                    {Math.round(total.calories)} קק״ל · מצטבר {Math.round(previous)}
                  </Text>
                  <View style={styles.mealTitleRow}>
                    <Text style={[styles.mealTitle, isExpanded && styles.mealTitleActive]}>{meal.title}</Text>
                    <View style={[styles.mealFoodCountBadge, isExpanded && styles.mealFoodCountBadgeActive]}>
                      <Text style={[styles.mealFoodCountText, isExpanded && styles.mealFoodCountTextActive]}>
                        {meal.foods.length} {meal.foods.length === 1 ? "רכיב" : "רכיבים"}
                      </Text>
                    </View>
                    {meal.id === "meal-1" ? (
                      <Text style={[styles.breakfastProteinBadge, isExpanded && styles.breakfastProteinBadgeActive]}>
                        {proteinSources} מקורות חלבון
                      </Text>
                    ) : null}
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
                      <Text style={styles.mealFoodListTitle}>רשימת המאכלים המדויקת</Text>
                      <Text style={styles.mealFoodListCount}>{meal.foods.length} רכיבים</Text>
                    </View>

                    {meal.foods.map((food, foodIndex) => {
                      const source = sourceForFood(food.name);
                      const macroGroup = foodMacroLabel(food.name, food.protein, food.carbohydrates, food.fats);
                      const macroIcon: IconSymbolName =
                        macroGroup === "חלבון" ? "fork.knife" : macroGroup === "פחמימה" ? "leaf.fill" : "drop.fill";
                      const quantityGramsMatch = food.quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)\s*גרם/);
                      const quantityGrams = quantityGramsMatch ? Number(quantityGramsMatch[1]) : null;
                      const weightMode = food.weightMode ?? "cooked";
                      const weightInfo = cookingConversionInfo(food.id, weightMode);
                      const weightInfoKey = `${meal.id}:${food.id}`;
                      const weightInfoOpen = weightInfoFoodId === weightInfoKey;
                      const quantityEditKey = `${meal.id}:${food.id}`;
                      const quantityEditOpen = editingQuantityKey === quantityEditKey;
                      const nutritionEditOpen = editingNutritionKey === quantityEditKey;
                      const swapKey = `${meal.id}:${food.id}`;
                      const swapOpen = activeSwapKey === swapKey;
                      const swapTargets =
                        source && swapGroup === source.group
                          ? alternativesFor(source)
                              .filter((target) => target.name.includes(conversionSearch.trim()))
                              .sort(
                                (a, b) =>
                                  Number(favoriteConversionIds.includes(b.id)) -
                                  Number(favoriteConversionIds.includes(a.id))
                              )
                          : [];
                      const foodPending = pending?.mealIndex === mealIndex && pending.foodIndex === foodIndex;

                      return (
                        <View key={food.id} style={[styles.food, foodPending && styles.foodSelected]}>
                          <View style={styles.foodTop}>
                            <Text style={styles.foodMacros}>
                              {mealFoodTotals(food).calories} קק״ל · חלבון {mealFoodTotals(food).protein} · פחמ׳ {mealFoodTotals(food).carbohydrates} · שומן {mealFoodTotals(food).fats}
                            </Text>
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
                            {quantityGrams !== null ? (
                              <Pressable
                                onPress={() => setWeightInfoFoodId(weightInfoOpen ? null : weightInfoKey)}
                                accessibilityRole="button"
                                accessibilityLabel={`מידע על מקדם ההמרה של ${food.name}`}
                                style={styles.weightInfoButton}
                              >
                                <Text style={styles.weightInfoButtonText}>i</Text>
                              </Pressable>
                            ) : null}
                          </View>

                          {weightInfoOpen ? (
                            <View style={styles.weightInfoPanel}>
                              <Text style={styles.weightInfoTitle}>מקדם ההמרה — {weightModeLabels[weightMode]}</Text>
                              <Text style={styles.weightInfoText}>{weightInfo.factorText}</Text>
                              <Text style={styles.weightInfoText}>{weightInfo.calculationText}</Text>
                              <Text style={styles.weightInfoNote}>המקדם הוא אומדן ותלוי בשיטת הבישול.</Text>
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
                              accessibilityRole="button"
                              accessibilityLabel={`הסר את ${food.name} מהארוחה`}
                              onPress={() => removeMealFood(meal.id, food.id)}
                              style={({ pressed }) => [styles.removeMealFoodButton, pressed && styles.removeMealFoodPressed]}
                            >
                              <Text style={styles.removeMealFoodText}>− הסר רכיב</Text>
                            </Pressable>
                          ) : null}

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`${nutritionEditOpen ? "סגור" : "ערוך"} ערכים תזונתיים של ${food.name}`}
                            onPress={() => openManualNutritionEditor(meal.id, food)}
                            style={({ pressed }) => [
                              nutritionEditStyles.openButton,
                              nutritionEditOpen && nutritionEditStyles.openButtonActive,
                              pressed && nutritionEditStyles.pressed,
                            ]}
                          >
                            <Text style={[nutritionEditStyles.openButtonText, nutritionEditOpen && nutritionEditStyles.openButtonTextActive]}>
                              {nutritionEditOpen ? "סגור עריכת ערכים" : "ערוך ערכים תזונתיים"}
                            </Text>
                          </Pressable>

                          {nutritionEditOpen ? (
                            <View style={nutritionEditStyles.panel}>
                              <Text style={nutritionEditStyles.title}>ערכים עבור {food.quantity}</Text>
                              <Text style={nutritionEditStyles.hint}>הערכים נשמרים לכמות המופיעה בכרטיס, והסיכום מתעדכן מיד.</Text>
                              <View style={nutritionEditStyles.fields}>
                                {(
                                  [
                                    ["calories", "קק״ל"],
                                    ["protein", "חלבון"],
                                    ["carbohydrates", "פחמימות"],
                                    ["fats", "שומן"],
                                  ] as [keyof NutritionDraft, string][]
                                ).map(([field, label]) => (
                                  <View key={field} style={nutritionEditStyles.field}>
                                    <Text style={nutritionEditStyles.label}>{label}</Text>
                                    <TextInput
                                      value={nutritionDraft[field]}
                                      onChangeText={(value) =>
                                        setNutritionDraft((current) => ({
                                          ...current,
                                          [field]: value.replace(/[^0-9.,]/g, "").replace(",", "."),
                                        }))
                                      }
                                      keyboardType="decimal-pad"
                                      inputMode="decimal"
                                      selectTextOnFocus
                                      accessibilityLabel={`${label} עבור ${food.name}`}
                                      style={nutritionEditStyles.input}
                                    />
                                  </View>
                                ))}
                              </View>
                              <View style={nutritionEditStyles.actions}>
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel="שמור ערכים תזונתיים ידניים"
                                  onPress={() => saveManualNutrition(meal.id, food.id)}
                                  style={nutritionEditStyles.saveButton}
                                >
                                  <Text style={nutritionEditStyles.saveText}>שמור ערכים</Text>
                                </Pressable>
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel="שחזר ערכי תווית מקוריים"
                                  onPress={() => restoreNutritionLabel(meal.id, food.id)}
                                  style={nutritionEditStyles.restoreButton}
                                >
                                  <Text style={nutritionEditStyles.restoreText}>שחזר תווית</Text>
                                </Pressable>
                              </View>
                            </View>
                          ) : null}

                          <View style={styles.foodEdit}>
                            {quantityEditOpen ? (
                              <>
                                {quantityGrams !== null ? (
                                  <View style={styles.quantityStepper}>
                                    <Pressable
                                      onPress={() => adjustMealFoodQuantity(meal.id, food.id, -10)}
                                      accessibilityRole="button"
                                      accessibilityLabel="הפחת 10 גרם"
                                      style={styles.quantityStepButton}
                                    >
                                      <Text style={styles.quantityStepText}>−10</Text>
                                    </Pressable>
                                    <Pressable
                                      onPress={() => adjustMealFoodQuantity(meal.id, food.id, 10)}
                                      accessibilityRole="button"
                                      accessibilityLabel="הוסף 10 גרם"
                                      style={styles.quantityStepButton}
                                    >
                                      <Text style={styles.quantityStepText}>+10</Text>
                                    </Pressable>
                                  </View>
                                ) : null}
                                {quantityGrams !== null ? (
                                  <View style={styles.weightModeRow}>
                                    <Text style={styles.weightModeLabel}>שקילה:</Text>
                                    {(["raw", "cooked"] as WeightMode[]).map((mode) => {
                                      const activeMode = food.weightMode ?? "cooked";
                                      return (
                                        <Pressable
                                          key={mode}
                                          onPress={() => updateMealFoodWeightMode(meal.id, food.id, mode)}
                                          accessibilityRole="button"
                                          accessibilityLabel={weightModeLabels[mode]}
                                          style={[styles.weightModeButton, activeMode === mode && styles.weightModeButtonActive]}
                                        >
                                          <Text style={[styles.weightModeText, activeMode === mode && styles.weightModeTextActive]}>
                                            {weightModeLabels[mode]}
                                          </Text>
                                        </Pressable>
                                      );
                                    })}
                                  </View>
                                ) : null}
                                <TextInput
                                  value={quantityDraft}
                                  editable
                                  keyboardType="decimal-pad"
                                  inputMode="decimal"
                                  selectTextOnFocus
                                  accessibilityLabel={`כמות ${food.name} בגרמים`}
                                  onChangeText={(value) => setQuantityDraft(value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                                  onSubmitEditing={() => {
                                    saveMealFoodQuantity(meal.id, food.id, quantityDraft);
                                    Keyboard.dismiss();
                                  }}
                                  style={[styles.quantityInput, styles.quantityInputEditable]}
                                />
                                <Pressable
                                  onPress={() => {
                                    saveMealFoodQuantity(meal.id, food.id, quantityDraft);
                                    Keyboard.dismiss();
                                    setEditingQuantityKey(null);
                                  }}
                                  accessibilityRole="button"
                                  accessibilityLabel="שמור כמות מזון"
                                  style={styles.saveQuantityButton}
                                >
                                  <Text style={styles.saveQuantityText}>שמור</Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => resetMealFoodQuantity(meal.id, food.id)}
                                  accessibilityRole="button"
                                  accessibilityLabel="אפס כמות ל־100 גרם"
                                  style={styles.resetQuantityButton}
                                >
                                  <Text style={styles.resetQuantityText}>אפס ל־100 גרם</Text>
                                </Pressable>
                                <Text style={styles.quantityLabel}>כמות לעריכה</Text>
                                {editingMealId === meal.id ? (
                                  <Pressable
                                    onPress={() => removeMealFood(meal.id, food.id)}
                                    disabled={meal.foods.length <= 1}
                                    style={styles.removeFoodButton}
                                  >
                                    <Text style={styles.removeFoodText}>הסר</Text>
                                  </Pressable>
                                ) : null}
                              </>
                            ) : null}
                          </View>

                          {quantityGrams !== null ? (
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
                                if (!quantityEditOpen && swapOpen) {
                                  setActiveSwapKey(null);
                                }
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={quantityEditOpen ? "סגור עריכת כמות" : "ערוך כמות"}
                              style={[
                                styles.quantityEditButton,
                                macroGroup === "חלבון" && styles.quantityEditProtein,
                                macroGroup === "פחמימה" && styles.quantityEditCarb,
                                macroGroup === "שומן" && styles.quantityEditFat,
                                quantityEditOpen && styles.quantityEditButtonActive,
                              ]}
                            >
                              <View style={styles.quantityEditButtonContent} accessible accessibilityLabel={`קבוצת מזון: ${macroGroup}`}>
                                <IconSymbol
                                  name={macroIcon}
                                  size={14}
                                  color={
                                    quantityEditOpen
                                      ? "#07111E"
                                      : macroGroup === "חלבון"
                                      ? "#90CAF9"
                                      : macroGroup === "פחמימה"
                                      ? "#81D4FA"
                                      : "#FFE082"
                                  }
                                />
                                <Text
                                  style={[
                                    styles.quantityEditButtonText,
                                    macroGroup === "חלבון" && styles.quantityEditProteinText,
                                    macroGroup === "פחמימה" && styles.quantityEditCarbText,
                                    macroGroup === "שומן" && styles.quantityEditFatText,
                                    quantityEditOpen && styles.quantityEditButtonTextActive,
                                  ]}
                                >
                                  {quantityEditOpen ? "סגור עריכת כמות" : "ערוך כמות"}
                                </Text>
                              </View>
                            </Pressable>
                          ) : null}

                          {source ? (
                            <>
                              <Pressable
                                onPress={() => (swapOpen ? setActiveSwapKey(null) : openSwap(meal.id, food.id, source.group))}
                                style={[styles.openSwapButton, swapOpen && styles.openSwapButtonActive]}
                              >
                                <Text style={styles.openSwapText}>{swapOpen ? "סגור החלפת מזון" : `החלף ${source.group}`}</Text>
                              </Pressable>
                              {swapOpen ? (
                                <View style={styles.swapArea}>
                                  <Text style={styles.swapLabel}>החלפת {food.name} · בחר חלופה מאותה קבוצת מאקרו</Text>
                                  <View style={styles.swapCategoryRow}>
                                    {(["חלבון", "פחמימה", "שומן"] as ConversionGroup[]).map((group) => (
                                      <Pressable
                                        key={group}
                                        onPress={() => setSwapGroup(group)}
                                        disabled={group !== source.group}
                                        style={[
                                          styles.swapCategoryButton,
                                          swapGroup === group && styles.swapCategoryButtonActive,
                                          group !== source.group && styles.disabledAction,
                                        ]}
                                      >
                                        <Text style={[styles.swapCategoryText, swapGroup === group && styles.swapCategoryTextActive]}>
                                          {group}
                                        </Text>
                                      </Pressable>
                                    ))}
                                  </View>
                                  <TextInput
                                    value={conversionSearch}
                                    onChangeText={setConversionSearch}
                                    placeholder={`חפש ${source.group} להחלפה`}
                                    placeholderTextColor="#8A9BB5"
                                    style={styles.conversionSearch}
                                    returnKeyType="done"
                                  />
                                  {swapTargets
                                    .slice(0, expandedFoodId === food.id || conversionSearch.trim() ? swapTargets.length : 4)
                                    .map((target) => (
                                      <View key={target.id} style={styles.swapChoice}>
                                        <Pressable
                                          onPress={() => chooseSwap(mealIndex, foodIndex, target)}
                                          style={({ pressed }) => [styles.swapButton, pressed && styles.swapButtonPressed]}
                                        >
                                          <Text style={styles.swapText}>{target.name}</Text>
                                          <Text style={styles.swapQuantityHint}>המרה לפי {source.group} · כמות חדשה תוצג לפני אישור</Text>
                                        </Pressable>
                                        <Animated.View
                                          style={{
                                            transform: [{ scale: animatedFavoriteId === target.id ? favoriteScale : 1 }],
                                          }}
                                        >
                                          <Pressable
                                            onPress={() => toggleConversionFavorite(target.id)}
                                            style={styles.swapFavoriteButton}
                                          >
                                            <Text style={styles.swapFavoriteText}>
                                              {favoriteConversionIds.includes(target.id) ? "★" : "☆"}
                                            </Text>
                                          </Pressable>
                                        </Animated.View>
                                      </View>
                                    ))}
                                  {conversionSearch.trim() && swapTargets.length === 0 ? (
                                    <Text style={styles.noSwapResults}>לא נמצאו חלופות בשם הזה בקבוצת {source.group}.</Text>
                                  ) : null}
                                  {!conversionSearch.trim() && swapTargets.length > 4 ? (
                                    <Pressable
                                      onPress={() => setExpandedFoodId(expandedFoodId === food.id ? null : food.id)}
                                      style={styles.moreSwapButton}
                                    >
                                      <Text style={styles.moreSwapText}>
                                        {expandedFoodId === food.id ? "הצג פחות" : `הצג עוד ${swapTargets.length - 4}`}
                                      </Text>
                                    </Pressable>
                                  ) : null}
                                  {foodPending ? (
                                    <View style={styles.localConversionPreview}>
                                      <Text style={styles.localConversionTitle}>המרה מוכנה לבדיקה</Text>
                                      <Text style={styles.localConversionLine}>
                                        מקור: {pending.sourceQuantity} {pending.sourceName}
                                      </Text>
                                      <Text style={styles.localConversionLine}>
                                        חלופה: {pending.result.grams} גרם {pending.target.name}
                                      </Text>
                                      <Text style={styles.localConversionDetail}>
                                        נשמר בעיקר: {pending.result.preserved} · {pending.result.calories} קק״ל · חלבון {pending.result.protein} · פחמימות {pending.result.carbohydrates} · שומן {pending.result.fats}
                                      </Text>
                                      <View style={styles.localConversionActions}>
                                        <Pressable onPress={() => setPending(null)} style={styles.cancel}>
                                          <Text style={styles.cancelText}>ביטול</Text>
                                        </Pressable>
                                        <Pressable onPress={confirmSwap} style={styles.confirm}>
                                          <Text style={styles.confirmText}>אישור החלפה</Text>
                                        </Pressable>
                                      </View>
                                    </View>
                                  ) : null}
                                </View>
                              ) : null}
                            </>
                          ) : null}
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
                        accessibilityRole="button"
                        accessibilityState={{ selected: selectedAddFoodKey === `${meal.id}:${group}` }}
                        accessibilityLabel={`פתח תפריט ${group} להוספה ל${meal.title}`}
                        android_ripple={{ color: "rgba(245,183,44,0.22)" }}
                        onPressIn={() => setPressedAddFoodGroup(group)}
                        onPressOut={() => setPressedAddFoodGroup(null)}
                        onPress={() => {
                          openMealFoodGroup(meal, group);
                          setRebalanceMessage(`נפתחה בחירת ${group} ב${meal.title}. בחר פריט מהרשימה.`);
                        }}
                        style={({ pressed }) => {
                          const isSelected = selectedAddFoodKey === `${meal.id}:${group}`;
                          const selectedColor = group === "חלבון" ? "#1E3A5F" : group === "פחמימה" ? "#164E63" : "#713F12";
                          const selectedBorder = group === "חלבון" ? "#90CAF9" : group === "פחמימה" ? "#38BDF8" : "#FACC15";
                          return [
                            styles.addFoodGroupButton,
                            group === "חלבון" && styles.addFoodProtein,
                            group === "פחמימה" && styles.addFoodCarb,
                            group === "שומן" && styles.addFoodFat,
                            group === pressedAddFoodGroup && styles.addFoodGroupButtonPressed,
                            pressed && styles.addFoodGroupButtonPressed,
                            isSelected && {
                              backgroundColor: selectedColor,
                              borderColor: selectedBorder,
                              borderWidth: 2,
                            },
                          ];
                        }}
                      >
                        <Text style={[styles.addFoodGroupText, selectedAddFoodKey === `${meal.id}:${group}` && styles.addFoodGroupTextActive]}>
                          {selectedAddFoodKey === `${meal.id}:${group}` ? "✓" : "＋"} {group}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {addFoodGroupFilter && editingMealId === meal.id ? (
                    <View style={styles.addFoodFeedback}>
                      <Text style={styles.addFoodFeedbackIcon}>✓</Text>
                      <Text style={styles.addFoodFeedbackText}>נבחרה קבוצת {addFoodGroupFilter} ב{meal.title} — החיפוש פתוח, בחר מזון להוספה</Text>
                    </View>
                  ) : null}

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
                      {addFoodGroupFilter ? <Text style={styles.quickSearchLabel}>חיפוש מהיר · {addFoodGroupFilter}</Text> : null}
                      <TextInput
                        value={mealFoodSearch}
                        onChangeText={setMealFoodSearch}
                        autoFocus={Boolean(addFoodGroupFilter)}
                        accessibilityLabel={addFoodGroupFilter ? `חיפוש מהיר של ${addFoodGroupFilter}` : "חיפוש מזון להוספה"}
                        placeholder={addFoodGroupFilter ? `חפש ${addFoodGroupFilter} להוספה...` : "חפש מזון להוספה"}
                        placeholderTextColor="#8A9BB5"
                        style={styles.mealFoodSearch}
                        textAlign="right"
                      />
                      {mealFoodSearch.trim() || addFoodGroupFilter ? (
                        <View style={styles.mealFoodResults}>
                          {filteredMealFoods.map((item) => (
                            <Pressable
                              key={item.id}
                              onPress={() => addFoodToMeal(meal.id, item)}
                              style={({ pressed }) => [
                                styles.mealFoodResult,
                                selectedMealFoodKey === `${meal.id}:${item.id}` && styles.mealFoodResultSelected,
                                pressed && styles.mealFoodResultPressed,
                              ]}
                              accessibilityRole="button"
                              accessibilityState={{ selected: selectedMealFoodKey === `${meal.id}:${item.id}` }}
                            >
                              <View style={styles.mealFoodResultHeader}>
                                <Text style={[styles.mealFoodResultName, selectedMealFoodKey === `${meal.id}:${item.id}` && styles.mealFoodResultNameSelected]}>
                                  {selectedMealFoodKey === `${meal.id}:${item.id}` ? "✓ " : "＋ "}
                                  {item.name}
                                </Text>
                                {selectedMealFoodKey === `${meal.id}:${item.id}` ? <Text style={styles.mealFoodResultConfirm}>נוסף</Text> : null}
                              </View>
                              <Text style={styles.mealFoodResultMeta}>{item.group} · בסיס חישוב 100 ג׳</Text>
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

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`המרת ${meal.title}`}
                  onPress={() => openMealConversion(meal)}
                  style={({ pressed }) => [styles.mealConversionBanner, pressed && styles.mealConversionPressed]}
                >
                  <Text style={styles.mealConversionTitle}>המרת ארוחה</Text>
                  <Text style={styles.mealConversionSubtitle}>חלבון · פחמימה · שומן · חישוב לפי 100 ג׳</Text>
                  <Text style={styles.mealConversionArrow}>פתח ›</Text>
                </Pressable>
              </View>
            );
          })}
        </Animated.View>

        <Modal visible={Boolean(mealConversionId)} animationType="slide" transparent onRequestClose={() => setMealConversionId(null)}>
          <View style={styles.mealConversionBackdrop}>
            <View style={styles.mealConversionModal}>
              <View style={styles.mealConversionHeader}>
                <View>
                  <Text style={styles.mealConversionModalTitle}>המרת ארוחה</Text>
                  <Text style={styles.mealConversionModalHint}>בחר רכיב חלופי בכל קבוצת מאקרו</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="סגור המרת ארוחה" onPress={() => setMealConversionId(null)} style={styles.mealConversionClose}>
                  <Text style={styles.mealConversionCloseText}>×</Text>
                </Pressable>
              </View>
              {(["חלבון", "פחמימה", "שומן"] as ConversionGroup[]).map((group) => (
                <View key={group} style={styles.mealConversionGroup}>
                  <Text style={styles.mealConversionGroupTitle}>{group}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mealConversionChoices}>
                    <Pressable
                      key={`none-${group}`}
                      onPress={() => setMealConversionSelection((current) => ({ ...current, [group]: null }))}
                      style={[styles.mealConversionChoice, !mealConversionSelection[group] && styles.mealConversionChoiceActive]}
                    >
                      <Text style={[styles.mealConversionChoiceText, !mealConversionSelection[group] && styles.mealConversionChoiceTextActive]}>
                        ללא
                      </Text>
                      <Text style={styles.mealConversionChoiceMeta}>ללא רכיב</Text>
                    </Pressable>
                    {mealConversionFoods
                      .filter((food) => food.group === group)
                      .map((food) => (
                        <Pressable
                          key={food.id}
                          onPress={() => setMealConversionSelection((current) => ({ ...current, [group]: food }))}
                          style={[styles.mealConversionChoice, mealConversionSelection[group]?.id === food.id && styles.mealConversionChoiceActive]}
                        >
                          <Text style={[styles.mealConversionChoiceText, mealConversionSelection[group]?.id === food.id && styles.mealConversionChoiceTextActive]}>
                            {food.name}
                          </Text>
                          <Text style={styles.mealConversionChoiceMeta}>{food.calories} קק״ל · 100 ג׳</Text>
                        </Pressable>
                      ))}
                  </ScrollView>
                  {mealConversionSelection[group] ? (
                    <Text style={styles.mealConversionSelected}>נבחר: {mealConversionSelection[group]?.name} · החישוב יתאים את הכמות לערך המרכזי של הקבוצה</Text>
                  ) : (
                    <Text style={styles.mealConversionSelected}>לא נבחר רכיב בקבוצה זו</Text>
                  )}
                </View>
              ))}
              <View style={styles.mealConversionActions}>
                <Pressable onPress={() => setMealConversionId(null)} style={styles.mealConversionCancel}>
                  <Text style={styles.mealConversionCancelText}>ביטול</Text>
                </Pressable>
                <Pressable onPress={applyMealConversion} style={styles.mealConversionApply}>
                  <Text style={styles.mealConversionApplyText}>החל והצג ערכים</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {viewMode === "eaten" && displayedTotals.calories === 0 ? (
          <Text style={styles.emptyEaten}>עדיין לא סומן מזון כנאכל היום.</Text>
        ) : null}

        <Text style={styles.note}>
          הכמויות המתוכננות מותאמות אוטומטית ליעד הקלורי ולמצב שנבחר במחשבון. ניתן לשנות כל מזון או כמות ידנית; ההמרה שומרת על המאקרו המרכזי ככל האפשר.
        </Text>

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
          <View style={styles.summaryActions}>
            <Pressable
              disabled={pdfBusy || shareBusy || Boolean(favoriteBusy)}
              onPress={exportPdf}
              style={({ pressed }) => [styles.pdfButton, (pdfBusy || shareBusy || favoriteBusy) && styles.busyButton, pressed && styles.swapButtonPressed]}
            >
              {pdfBusy ? <ActivityIndicator color="#07111E" size="small" /> : <Text style={styles.pdfText}>ייצא ושתף PDF</Text>}
            </Pressable>
            <Pressable
              disabled={shareBusy || Boolean(favoriteBusy)}
              onPress={shareMealPlan}
              style={({ pressed }) => [styles.shareButton, (shareBusy || favoriteBusy) && styles.busyButton, pressed && styles.swapButtonPressed]}
            >
              {shareBusy ? <ActivityIndicator color="#07111E" size="small" /> : <Text style={styles.shareText}>שתף תפריט</Text>}
            </Pressable>
            <Pressable
              disabled={Boolean(favoriteBusy)}
              onPress={saveFavorite}
              style={({ pressed }) => [styles.favoriteButton, favoriteBusy && styles.busyButton, pressed && styles.swapButtonPressed]}
            >
              {favoriteBusy === "save" ? <ActivityIndicator color="#07111E" size="small" /> : <Text style={styles.favoriteText}>שמור כתפריט מועדף</Text>}
            </Pressable>
            {hasFavorite && (
              <Pressable
                disabled={Boolean(favoriteBusy)}
                onPress={loadFavorite}
                style={({ pressed }) => [styles.loadFavoriteButton, favoriteBusy && styles.busyButton, pressed && styles.swapButtonPressed]}
              >
                {favoriteBusy === "load" ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.loadFavoriteText}>טען תפריט מועדף</Text>}
              </Pressable>
            )}
            <Pressable onPress={rebalanceToTarget} style={({ pressed }) => [styles.rebalanceButton, pressed && styles.swapButtonPressed]}>
              <Text style={styles.rebalanceText}>התאם מחדש ליעד</Text>
            </Pressable>
            <Pressable onPress={resetToOriginal} style={({ pressed }) => [styles.resetButton, pressed && styles.swapButtonPressed]}>
              <Text style={styles.resetText}>איפוס לתפריט המקורי</Text>
            </Pressable>
          </View>
          {favoriteStatus ? (
            <View style={[styles.favoriteStatus, favoriteStatus.type === "error" && styles.favoriteStatusError]}>
              <Text style={styles.favoriteStatusIcon}>{favoriteStatus.type === "success" ? "✓" : "!"}</Text>
              <Text style={styles.favoriteStatusText}>{favoriteStatus.message}</Text>
            </View>
          ) : null}
          {shareStatus ? (
            <View style={[styles.shareStatus, shareStatus.type === "error" && styles.favoriteStatusError]}>
              <Text style={styles.favoriteStatusIcon}>{shareStatus.type === "success" ? "✓" : "!"}</Text>
              <Text style={styles.favoriteStatusText}>{shareStatus.message}</Text>
            </View>
          ) : null}
          {rebalanceMessage ? <Text style={styles.rebalanceMessage}>{rebalanceMessage}</Text> : null}
        </View>

        <View style={styles.chart}>
          <Text style={styles.chartTitle}>צריכה יומית מול יעד</Text>
          <ProgressBar label="קלוריות" value={displayedTotals.calories} target={targets.calories} color="#60A5FA" unit="קק״ל" />
          <ProgressBar label="חלבון" value={displayedTotals.protein} target={targets.protein} color="#93C5FD" unit="ג׳" />
          <ProgressBar label="פחמימות" value={displayedTotals.carbohydrates} target={targets.carbohydrates} color="#FBBF24" unit="ג׳" />
          <ProgressBar label="שומן" value={displayedTotals.fats} target={targets.fats} color="#F87171" unit="ג׳" />
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

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function buildMealPlanHtml(
  goal: MenuProfile["goal"],
  profile: MenuProfile,
  targetCalories: number,
  meals: Meal[],
  userName: string,
  bodyWeight: string
) {
  const mealsHtml = meals
    .map(
      (meal, index) =>
        `<section class="meal"><div class="meal-head"><strong>ארוחה ${index + 1} — ${escapeHtml(
          meal.title
        )}</strong><span>${Math.round(mealTotals(meal).calories)} קק״ל</span></div>${meal.foods
          .map((food) => `<div class="food"><span>${escapeHtml(food.name)}</span><span>${escapeHtml(food.quantity)}</span></div>`)
          .join("")}</section>`
    )
    .join("");
  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>@page{size:A4;margin:28px}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#16233A;background:#fff;direction:rtl}h1{color:#10243A;margin:0 0 6px;font-size:26px}.subtitle{color:#53657C;margin-bottom:16px}.identity{display:flex;align-items:center;gap:12px;background:#10243A;color:#fff;border-radius:14px;padding:14px;margin-bottom:16px}.logo{width:46px;height:46px;border-radius:13px;background:#5B9FE3;color:#10243A;display:flex;align-items:center;justify-content:center;font-size:25px;font-weight:900}.identity-info{flex:1}.identity-name{font-size:17px;font-weight:700}.identity-meta{font-size:11px;color:#D2DFEF;margin-top:4px}.targets{display:flex;gap:8px;margin-bottom:18px}.target{flex:1;background:#EAF4FF;border:1px solid #9BC8E8;border-radius:10px;padding:9px;text-align:center}.target b{display:block;color:#10243A;font-size:16px}.target span{font-size:10px;color:#53657C}.meal{border:1px solid #C8D5E3;border-radius:11px;padding:11px;margin-bottom:10px;page-break-inside:avoid}.meal-head{display:flex;justify-content:space-between;color:#10243A;border-bottom:1px solid #DCE5EE;padding-bottom:7px;margin-bottom:4px}.meal-head span{color:#8A6B20}.food{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #EEF2F6;font-size:12px}.food:last-child{border-bottom:0}</style></head><body><div class="identity"><div class="logo">W</div><div class="identity-info"><div class="identity-name">${escapeHtml(
    userName.trim() || "משתמש"
  )}</div><div class="identity-meta">${bodyWeight.trim() ? `משקל: ${escapeHtml(bodyWeight.trim())} ק״ג · ` : ""}תפריט ${meals.length} ארוחות · מצב ${escapeHtml(
    mealPlanGoalLabel(goal)
  )}</div></div></div><h1>תפריט ${meals.length} ארוחות</h1><div class="subtitle">מצב: ${escapeHtml(
    mealPlanGoalLabel(goal)
  )} · יעד יומי: ${targetCalories || "לא הוגדר"} קק״ל</div><div class="targets"><div class="target"><b>${escapeHtml(
    profile.protein || "—"
  )} ג׳</b><span>חלבון</span></div><div class="target"><b>${escapeHtml(
    profile.carbohydrates || "—"
  )} ג׳</b><span>פחמימות</span></div><div class="target"><b>${escapeHtml(
    profile.fats || "—"
  )} ג׳</b><span>שומן</span></div></div>${mealsHtml}</body></html>`;
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
          <Pressable onPress={() => onChange("")} accessibilityRole="button" accessibilityLabel={`נקה ${label}`} style={styles.clearProfileFieldButton}>
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

function ProgressBar({ label, value, target, color, unit }: { label: string; value: number; target: number; color: string; unit: string }) {
  const ratio = target > 0 ? Math.min(value / target, 1) : 0;
  const percent = target > 0 ? Math.round((value / target) * 100) : 0;
  return (
    <View style={styles.progress}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressValue}>{Math.round(value)} / {Math.round(target)} {unit} · {percent}%</Text>
        <Text style={styles.progressLabel}>{label}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function MacroDistributionCard({ distribution }: { distribution: MacroDistribution }) {
  const items = [
    { label: "חלבון", percent: distribution.proteinPercent, grams: distribution.proteinGrams, calories: distribution.proteinCalories, color: "#93C5FD" },
    { label: "פחמימות", percent: distribution.carbohydratesPercent, grams: distribution.carbohydratesGrams, calories: distribution.carbohydratesCalories, color: "#60A5FA" },
    { label: "שומן", percent: distribution.fatsPercent, grams: distribution.fatsGrams, calories: distribution.fatsCalories, color: "#FBBF24" },
  ];
  return (
    <View style={styles.macroDistribution}>
      <Text style={styles.chartTitle}>התפלגות אבות המזון · התפריט היומי</Text>
      <Text style={styles.macroDistributionSubtitle}>
        {distribution.totalCalories ? `${Math.round(distribution.totalCalories)} קק״ל ממאקרו` : "הזן כמויות כדי לראות התפלגות"}
      </Text>
      <View style={styles.macroStack}>
        {items.map((item) => (
          <View key={item.label} style={[styles.macroSegment, { flex: item.percent || 0.001, backgroundColor: item.color }]} />
        ))}
      </View>
      <View style={styles.macroLegend}>
        {items.map((item) => (
          <View key={item.label} style={styles.macroLegendItem}>
            <View style={[styles.macroDot, { backgroundColor: item.color }]} />
            <View style={styles.macroLegendText}>
              <Text style={styles.macroLegendLabel}>{item.label} · {item.percent}%</Text>
              <Text style={styles.macroLegendValues}>{Math.round(item.grams)} ג׳ · {Math.round(item.calories)} קק״ל</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const nutritionEditStyles = StyleSheet.create({
  openButton: { alignSelf: "flex-end", borderColor: "#60A5FA", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8, backgroundColor: "#172A45" },
  openButtonActive: { backgroundColor: "#3B82F6" },
  openButtonText: { color: "#93C5FD", fontSize: 12, fontWeight: "900", writingDirection: "rtl" },
  openButtonTextActive: { color: "#FFFFFF" },
  panel: { backgroundColor: "#111C2E", borderColor: "#3B82F6", borderWidth: 1, borderRadius: 12, padding: 12, gap: 10, marginTop: 10 },
  title: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  hint: { color: "#CBD5E1", fontSize: 11, lineHeight: 16, textAlign: "right", writingDirection: "rtl" },
  fields: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  field: { width: "47%", gap: 4 },
  label: { color: "#93C5FD", fontSize: 11, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  input: { minHeight: 42, backgroundColor: "#09111D", borderColor: "#3B82F6", borderWidth: 1, borderRadius: 8, color: "#FFFFFF", paddingHorizontal: 10, textAlign: "center", writingDirection: "ltr", fontSize: 14, fontWeight: "800" },
  actions: { flexDirection: "row-reverse", gap: 8 },
  saveButton: { flex: 1, minHeight: 42, backgroundColor: "#F59E0B", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#000000", fontSize: 12, fontWeight: "900", writingDirection: "rtl" },
  restoreButton: { flex: 1, minHeight: 42, borderColor: "#60A5FA", borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#1E293B" },
  restoreText: { color: "#F1F5F9", fontSize: 12, fontWeight: "900", writingDirection: "rtl" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});

const styles = StyleSheet.create({
  mealPlanScroll: { flex: 1, minHeight: 0, backgroundColor: "#07111E" },
  content: {
    flexGrow: 1,
    minHeight: 1,
    gap: 14,
    paddingBottom: 320,
    writingDirection: "rtl",
  },
  header: { alignItems: "flex-end" },
  eyebrow: { color: "#60A5FA", fontSize: 13, fontWeight: "800" },
  title: { color: "#FFFFFF", fontSize: 30, fontWeight: "900" },
  subtitle: { color: "#CBD5E1", fontSize: 13, marginTop: 5 },
  scrollTestButton: { alignSelf: "stretch", minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: "#F59E0B", alignItems: "center", justifyContent: "center", marginTop: 8, backgroundColor: "#17253B" },
  scrollTestButtonText: { color: "#FBBF24", fontSize: 14, fontWeight: "900", writingDirection: "rtl" },
  menuButton: {
    backgroundColor: "#1E293B",
    borderColor: "#475569",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 8,
  },
  menuText: { color: "#60A5FA", fontWeight: "900", fontSize: 12 },
  datePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    marginTop: 10,
    backgroundColor: "#132137",
    borderColor: "#334E68",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
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
  profileEditor: { backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  profileTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", textAlign: "right" },
  profileHint: { color: "#CBD5E1", fontSize: 11, textAlign: "right" },
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
  profileInput: {
    flex: 1,
    minWidth: 0,
    width: "100%",
    backgroundColor: "#09111D",
    borderColor: "#334E68",
    borderWidth: 1,
    borderRadius: 8,
    color: "#FFFFFF",
    padding: 10,
    textAlign: "right",
    writingDirection: "rtl",
    minHeight: 44,
    fontSize: 14,
    fontWeight: "700",
  },
  autoButton: { flex: 1, borderColor: "#475569", borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center", backgroundColor: "#1E293B" },
  autoButtonActive: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  autoText: { color: "#CBD5E1", fontSize: 11, fontWeight: "800" },
  autoTextActive: { color: "#000000", fontWeight: "900" },
  completeButton: { backgroundColor: "#1E3A5F", borderColor: "#60A5FA", borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  completeText: { color: "#93C5FD", fontWeight: "900", fontSize: 13, writingDirection: "rtl" },
  saveProfileButton: { width: "100%", minHeight: 48, backgroundColor: "#F59E0B", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  saveProfileText: { color: "#000000", fontWeight: "900", fontSize: 14, writingDirection: "rtl" },
  bannerPressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  versionComposer: { flexDirection: "row-reverse", gap: 7 },
  versionInput: {
    flex: 1,
    backgroundColor: "#09111D",
    borderColor: "#334E68",
    borderWidth: 1,
    borderRadius: 8,
    color: "#FFFFFF",
    padding: 10,
    textAlign: "right",
    writingDirection: "rtl",
    fontSize: 12,
  },
  versionSaveButton: { backgroundColor: "#1E293B", borderColor: "#F59E0B", borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, justifyContent: "center" },
  versionSaveText: { color: "#FBBF24", fontSize: 12, fontWeight: "900" },
  weightBuilder: { backgroundColor: "#0E1826", borderColor: "#273D54", borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  weightRow: { flexDirection: "row-reverse", gap: 7 },
  weightInput: {
    flex: 1,
    backgroundColor: "#09111D",
    borderColor: "#334E68",
    borderWidth: 1,
    borderRadius: 8,
    color: "#FFFFFF",
    padding: 10,
    textAlign: "right",
    writingDirection: "rtl",
    fontSize: 13,
  },
  weightButton: { backgroundColor: "#F59E0B", borderRadius: 8, paddingHorizontal: 14, justifyContent: "center" },
  weightButtonText: { color: "#000000", fontSize: 12, fontWeight: "900" },
  weightHint: { color: "#94A3B8", fontSize: 10, textAlign: "right" },
  favoriteVersionButton: { backgroundColor: "#F59E0B", borderRadius: 9, paddingVertical: 10, alignItems: "center" },
  favoriteVersionText: { color: "#000000", fontWeight: "900", fontSize: 12 },
  versionList: { gap: 6 },
  versionItem: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", backgroundColor: "#09111D", borderColor: "#334E68", borderWidth: 1, borderRadius: 8, padding: 8 },
  versionLoadButton: { paddingHorizontal: 8, paddingVertical: 5 },
  versionFavoriteButton: { borderColor: "#475569", borderWidth: 1, borderRadius: 6, minWidth: 30, paddingVertical: 4, alignItems: "center" },
  versionFavoriteButtonActive: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  versionFavoriteText: { color: "#94A3B8", fontSize: 16 },
  versionFavoriteTextActive: { color: "#000000" },
  versionName: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  versionLoad: { color: "#F59E0B", fontSize: 11, fontWeight: "900" },
  noVersions: { color: "#94A3B8", fontSize: 11, textAlign: "right" },
  summary: { backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderRadius: 16, padding: 15, gap: 12 },
  viewModeRow: { flexDirection: "row-reverse", gap: 8 },
  viewModeButton: { flex: 1, borderColor: "#475569", borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center", backgroundColor: "#1E293B" },
  viewModeButtonActive: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  viewModeText: { color: "#CBD5E1", fontSize: 11, fontWeight: "800" },
  viewModeTextActive: { color: "#000000", fontWeight: "900" },
  emptyEaten: { color: "#F59E0B", fontSize: 12, fontWeight: "800", textAlign: "right", backgroundColor: "#2A200B", borderColor: "#F59E0B", borderWidth: 1, borderRadius: 8, padding: 10 },
  summaryTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "900", textAlign: "right" },
  summaryGrid: { flexDirection: "row-reverse", justifyContent: "space-between" },
  summaryActions: { gap: 8 },
  pdfButton: { backgroundColor: "#3B82F6", borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  pdfText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },
  shareButton: { backgroundColor: "#0284C7", borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  shareText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },
  shareStatus: { flexDirection: "row-reverse", alignItems: "center", gap: 8, backgroundColor: "#1E293B", borderColor: "#0284C7", borderWidth: 1, borderRadius: 8, padding: 10 },
  favoriteButton: { backgroundColor: "#F59E0B", borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  favoriteText: { color: "#000000", fontWeight: "900", fontSize: 13 },
  busyButton: { opacity: 0.6 },
  favoriteStatus: { flexDirection: "row-reverse", alignItems: "center", gap: 8, backgroundColor: "#064E3B", borderColor: "#10B981", borderWidth: 1, borderRadius: 8, padding: 10 },
  favoriteStatusError: { backgroundColor: "#450A0A", borderColor: "#EF4444" },
  favoriteStatusIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#10B981", color: "#000000", textAlign: "center", lineHeight: 22, fontWeight: "900" },
  favoriteStatusText: { flex: 1, color: "#FFFFFF", textAlign: "right", fontSize: 12, fontWeight: "800" },
  loadFavoriteButton: { borderColor: "#60A5FA", borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center", backgroundColor: "#1E293B" },
  loadFavoriteText: { color: "#93C5FD", fontWeight: "800", fontSize: 12 },
  rebalanceButton: { backgroundColor: "#2563EB", borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  rebalanceText: { color: "#FFFFFF", fontWeight: "900", fontSize: 13 },
  resetButton: { borderColor: "#475569", borderWidth: 1, borderRadius: 8, paddingVertical: 9, alignItems: "center", backgroundColor: "#1E293B" },
  resetText: { color: "#CBD5E1", fontWeight: "800", fontSize: 12 },
  rebalanceMessage: { color: "#CBD5E1", fontSize: 12, textAlign: "right", fontWeight: "800" },
  macroDistribution: { backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  macroDistributionSubtitle: { color: "#94A3B8", fontSize: 11, textAlign: "right" },
  macroStack: { flexDirection: "row-reverse", height: 16, borderRadius: 8, overflow: "hidden", backgroundColor: "#09111D" },
  macroSegment: { minWidth: 2 },
  macroLegend: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 7 },
  macroLegendItem: { flex: 1, flexDirection: "row-reverse", alignItems: "flex-start", gap: 6 },
  macroDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  macroLegendText: { flex: 1 },
  macroLegendLabel: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", textAlign: "right" },
  macroLegendValues: { color: "#94A3B8", fontSize: 10, textAlign: "right", marginTop: 2 },
  macroProtein: {},
  macroCarb: {},
  macroFat: {},
  waterHistoryCard: { backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderRadius: 14, padding: 12, gap: 8, writingDirection: "rtl" },
  waterHistoryHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  waterHistoryTitle: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  waterHistoryCount: { color: "#FBBF24", fontSize: 11, fontWeight: "800", textAlign: "left", writingDirection: "rtl" },
  waterHistoryEmpty: { color: "#94A3B8", fontSize: 11, textAlign: "right", writingDirection: "rtl" },
  waterHistoryList: { gap: 6 },
  waterHistoryRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", minHeight: 34, backgroundColor: "#09111D", borderColor: "#273D54", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  waterHistoryTime: { width: 66, color: "#FFFFFF", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "ltr" },
  waterHistoryAmount: { flex: 1, color: "#F59E0B", fontSize: 12, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  waterHistoryCumulative: { color: "#94A3B8", fontSize: 10, textAlign: "left", writingDirection: "rtl" },
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
  waterProgressMarker: { position: "absolute", top: 1, bottom: 1, width: 2, backgroundColor: "#FFFFFF", opacity: 0.9 },
  waterProgressScale: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  waterProgressScaleText: { color: "#94A3B8", fontSize: 9, textAlign: "right", writingDirection: "rtl" },
  waterRemaining: { color: "#CBD5E1", fontSize: 11, textAlign: "right", writingDirection: "rtl" },
  waterQuickTitle: { color: "#FFFFFF", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  waterQuickRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
  waterQuickButton: { flex: 1, minWidth: 72, minHeight: 60, borderRadius: 10, backgroundColor: "#1E293B", borderColor: "#334E68", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  waterQuickButtonPressed: { backgroundColor: "#0284C7", borderColor: "#0284C7", transform: [{ scale: 0.97 }] },
  waterQuickIcon: { color: "#38BDF8", fontSize: 14, fontWeight: "900", lineHeight: 16 },
  waterQuickButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", writingDirection: "rtl" },
  waterQuickAmount: { color: "#93C5FD", fontSize: 11, fontWeight: "900", writingDirection: "rtl" },
  waterSettingsRow: { flexDirection: "row-reverse", alignItems: "flex-end", gap: 8 },
  waterResetButton: { borderColor: "#475569", borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, minHeight: 42, justifyContent: "center", backgroundColor: "#1E293B" },
  waterResetText: { color: "#CBD5E1", fontSize: 11, fontWeight: "800" },
  waterGoalEditor: { flex: 1, gap: 3 },
  waterGoalInput: { minHeight: 42, backgroundColor: "#09111D", borderColor: "#334E68", borderWidth: 1, borderRadius: 8, color: "#FFFFFF", paddingHorizontal: 10, textAlign: "right", writingDirection: "rtl", fontSize: 13, fontWeight: "700" },
  waterGoalLabel: { color: "#94A3B8", fontSize: 10, textAlign: "right", writingDirection: "rtl" },
  chart: { backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  chartTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", textAlign: "right" },
  progress: { gap: 5 },
  progressHeader: { flexDirection: "row-reverse", justifyContent: "space-between" },
  progressLabel: { color: "#E2E8F0", fontSize: 11, fontWeight: "800" },
  progressValue: { color: "#94A3B8", fontSize: 10 },
  track: { height: 8, backgroundColor: "#09111D", borderRadius: 6, overflow: "hidden" },
  fill: { height: 8, borderRadius: 6 },
  stat: { alignItems: "flex-end" },
  statValue: { color: "#60A5FA", fontSize: 20, fontWeight: "900" },
  statLabel: { color: "#94A3B8", fontSize: 11, marginTop: 3 },
  mealManagement: { backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  mealManagementHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  mealManagementTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  mealManagementHint: { color: "#94A3B8", fontSize: 11 },
  addMealButton: { width: "100%", minHeight: 48, backgroundColor: "#F59E0B", borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  addMealButtonText: { color: "#000000", fontWeight: "900", fontSize: 14, writingDirection: "rtl" },
  meal: {
    backgroundColor: "#16253B",
    borderColor: "#2E4765",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginBottom: 12,
  },
  mealActive: { borderColor: "#3B82F6" },
  mealHeader: {
    minHeight: 88,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "stretch",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    borderRadius: 10,
    backgroundColor: "#1A2E4C",
    borderColor: "#33537C",
    borderWidth: 1,
  },
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
  mealConversionBanner: { minHeight: 54, backgroundColor: "#1E293B", borderColor: "#475569", borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4, justifyContent: "center", alignItems: "flex-end", gap: 2 },
  mealConversionPressed: { backgroundColor: "#334155" },
  mealConversionTitle: { color: "#FBBF24", fontSize: 13, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  mealConversionSubtitle: { color: "#CBD5E1", fontSize: 11, textAlign: "right", writingDirection: "rtl" },
  mealConversionArrow: { color: "#60A5FA", fontSize: 11, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  mealConversionBackdrop: { flex: 1, backgroundColor: "rgba(3,8,18,0.85)", justifyContent: "flex-end" },
  mealConversionModal: { maxHeight: "86%", backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 12 },
  mealConversionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  mealConversionModalTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", textAlign: "right" },
  mealConversionModalHint: { color: "#94A3B8", fontSize: 11, textAlign: "right", marginTop: 2 },
  mealConversionClose: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#1E293B", borderColor: "#475569", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  mealConversionCloseText: { color: "#FFFFFF", fontSize: 22, lineHeight: 24 },
  mealConversionGroup: { backgroundColor: "#0E1826", borderColor: "#273D54", borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  mealConversionGroupTitle: { color: "#FBBF24", fontSize: 13, fontWeight: "900", textAlign: "right" },
  mealConversionChoices: { flexDirection: "row-reverse", gap: 7, paddingVertical: 2 },
  mealConversionChoice: { minWidth: 105, backgroundColor: "#1E293B", borderColor: "#475569", borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, alignItems: "flex-end" },
  mealConversionChoiceActive: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  mealConversionChoiceText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", textAlign: "right" },
  mealConversionChoiceTextActive: { color: "#000000" },
  mealConversionChoiceMeta: { color: "#94A3B8", fontSize: 10, marginTop: 2, textAlign: "right" },
  mealConversionSelected: { color: "#CBD5E1", fontSize: 10, textAlign: "right", lineHeight: 14 },
  mealConversionActions: { flexDirection: "row-reverse", gap: 8, paddingTop: 3 },
  mealConversionCancel: { flex: 1, minHeight: 44, borderColor: "#475569", borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#1E293B" },
  mealConversionCancelText: { color: "#F1F5F9", fontSize: 12, fontWeight: "900" },
  mealConversionApply: { flex: 1.4, minHeight: 44, backgroundColor: "#F59E0B", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  mealConversionApplyText: { color: "#000000", fontSize: 12, fontWeight: "900" },
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
  quickSearchLabel: { color: "#FBBF24", fontSize: 11, fontWeight: "900", textAlign: "right", width: "100%" },
  addFoodRowTitle: { width: "100%", color: "#FFFFFF", fontSize: 12, fontWeight: "900", textAlign: "right" },
  addFoodGroupButton: { flex: 1, minWidth: 85, borderRadius: 8, paddingVertical: 8, alignItems: "center", borderWidth: 1, backgroundColor: "#1E293B", borderColor: "#475569" },
  addFoodProtein: {},
  addFoodCarb: {},
  addFoodFat: {},
  addFoodGroupText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  addFoodGroupTextActive: { color: "#FFFFFF" },
  addFoodGroupButtonPressed: { opacity: 0.75 },
  addFoodFeedback: { width: "100%", flexDirection: "row-reverse", alignItems: "center", gap: 7, backgroundColor: "#064E3B", borderColor: "#10B981", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  addFoodFeedbackIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#10B981", color: "#000000", textAlign: "center", lineHeight: 20, fontWeight: "900" },
  addFoodFeedbackText: { flex: 1, color: "#D1FAE5", fontSize: 11, fontWeight: "800", textAlign: "right" },
  mealFoodSearch: { backgroundColor: "#09111D", borderColor: "#334E68", borderWidth: 1, borderRadius: 8, color: "#FFFFFF", padding: 10, textAlign: "right", writingDirection: "rtl", fontSize: 13 },
  mealFoodResults: { gap: 6 },
  mealFoodResult: { backgroundColor: "#1E293B", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#334E68" },
  mealFoodResultPressed: { opacity: 0.75 },
  mealFoodResultSelected: { backgroundColor: "#064E3B", borderColor: "#10B981", borderWidth: 1 },
  mealFoodResultHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  mealFoodResultName: { flex: 1, color: "#FFFFFF", fontWeight: "800", textAlign: "right", fontSize: 12 },
  mealFoodResultNameSelected: { color: "#D1FAE5" },
  mealFoodResultConfirm: { color: "#10B981", fontSize: 11, fontWeight: "900" },
  mealFoodResultMeta: { color: "#94A3B8", fontSize: 10, textAlign: "right" },
  removeFoodButton: { backgroundColor: "#7F1D1D", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4 },
  removeFoodText: { color: "#FCA5A5", fontSize: 11, fontWeight: "900" },
  removeMealFoodButton: { alignSelf: "flex-start", backgroundColor: "#450A0A", borderColor: "#7F1D1D", borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 },
  removeMealFoodPressed: { opacity: 0.75 },
  removeMealFoodText: { color: "#FCA5A5", fontSize: 11, fontWeight: "900" },
  mealTitleRow: { width: "100%", flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  breakfastProteinBadge: { color: "#93C5FD", fontSize: 11, fontWeight: "800", borderColor: "#3B82F6", borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: "#1E3A5F" },
  breakfastProteinBadgeActive: { color: "#60A5FA", borderColor: "#60A5FA" },
  mealTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  mealTitleActive: { color: "#FFFFFF" },
  mealFoodCountBadge: { backgroundColor: "#1E293B", borderColor: "#475569", borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 },
  mealFoodCountBadgeActive: { backgroundColor: "#3B82F6", borderColor: "#60A5FA" },
  mealFoodCountText: { color: "#CBD5E1", fontSize: 11, fontWeight: "900", textAlign: "center" },
  mealFoodCountTextActive: { color: "#FFFFFF" },
  mealTotal: { color: "#93C5FD", fontSize: 11, fontWeight: "800", textAlign: "right", width: "100%" },
  mealTotalActive: { color: "#60A5FA" },
  food: {
    backgroundColor: "#111D2E",
    borderColor: "#223955",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 4,
  },
  foodSelected: { backgroundColor: "#1A2C1D", borderColor: "#10B981" },
  foodTop: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 8 },
  foodName: { color: "#FFFFFF", fontWeight: "900", flex: 1, textAlign: "right", fontSize: 14 },
  foodMacros: { color: "#94A3B8", fontSize: 11, textAlign: "right", writingDirection: "rtl", flex: 1 },
  foodMetaRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" },
  weightInfoButton: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: "#60A5FA", backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center" },
  weightInfoButtonText: { color: "#60A5FA", fontSize: 12, fontWeight: "900", fontStyle: "italic" },
  weightInfoPanel: { backgroundColor: "#0E1826", borderColor: "#334E68", borderWidth: 1, borderRadius: 8, padding: 8, gap: 3 },
  weightInfoTitle: { color: "#60A5FA", fontSize: 11, fontWeight: "900", textAlign: "right" },
  weightInfoText: { color: "#E2E8F0", fontSize: 11, fontWeight: "700", textAlign: "right" },
  weightInfoNote: { color: "#94A3B8", fontSize: 10, textAlign: "right" },
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
  quantityInput: {
    width: "100%",
    minHeight: 44,
    backgroundColor: "#09111D",
    borderColor: "#334E68",
    borderWidth: 1,
    borderRadius: 8,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: "right",
    writingDirection: "rtl",
  },
  quantityStepper: { flexDirection: "row-reverse", gap: 4 },
  weightModeRow: { width: "100%", flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 4 },
  weightModeLabel: { color: "#94A3B8", fontSize: 11, fontWeight: "700" },
  weightModeButton: { minHeight: 30, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: "#475569", backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center" },
  weightModeButtonActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  weightModeText: { color: "#CBD5E1", fontSize: 11, fontWeight: "800" },
  weightModeTextActive: { color: "#FFFFFF", fontWeight: "900" },
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
  quantityEditProtein: { borderColor: "#3B82F6", backgroundColor: "#152438" },
  quantityEditCarb: { borderColor: "#0284C7", backgroundColor: "#132738" },
  quantityEditFat: { borderColor: "#CA8A04", backgroundColor: "#2D2411" },
  quantityEditProteinText: { color: "#93C5FD" },
  quantityEditCarbText: { color: "#67E8F9" },
  quantityEditFatText: { color: "#FDE047" },
  quantityEditButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  quantityEditButtonTextActive: { color: "#FFFFFF" },
  quantityStepButton: { minWidth: 36, minHeight: 32, borderRadius: 7, backgroundColor: "#1E293B", borderColor: "#475569", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  quantityStepText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  quantityInputEditable: { borderColor: "#3B82F6", borderWidth: 2 },
  saveQuantityButton: { backgroundColor: "#F59E0B", borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7 },
  saveQuantityText: { color: "#000000", fontSize: 11, fontWeight: "900" },
  resetQuantityButton: { backgroundColor: "#1E293B", borderColor: "#475569", borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7 },
  resetQuantityText: { color: "#CBD5E1", fontSize: 11, fontWeight: "800" },
  quantityLabel: { color: "#FBBF24", fontSize: 11, fontWeight: "800" },
  mealsTransition: { gap: 0 },
  versionLoading: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-end", gap: 8, backgroundColor: "#1E293B", borderColor: "#334E68", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  versionLoadingText: { color: "#FBBF24", fontSize: 12, fontWeight: "800" },
  versionButtonDisabled: { opacity: 0.5 },
  swapArea: { gap: 8, backgroundColor: "#0E1826", borderColor: "#273D54", borderWidth: 1, borderRadius: 10, padding: 10 },
  openSwapButton: { alignSelf: "flex-start", borderColor: "#475569", borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#1E293B" },
  openSwapButtonActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  openSwapText: { color: "#FBBF24", fontSize: 11, fontWeight: "900" },
  swapCategoryRow: { flexDirection: "row-reverse", gap: 6 },
  swapCategoryButton: { flex: 1, borderColor: "#475569", borderWidth: 1, borderRadius: 7, paddingVertical: 6, alignItems: "center", backgroundColor: "#1E293B" },
  swapCategoryButtonActive: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  swapCategoryText: { color: "#CBD5E1", fontSize: 11, fontWeight: "800" },
  swapCategoryTextActive: { color: "#000000", fontWeight: "900" },
  swapQuantityHint: { color: "#94A3B8", fontSize: 9, marginTop: 2 },
  swapRow: { flexDirection: "row-reverse", gap: 6, alignItems: "center" },
  swapLabel: { color: "#CBD5E1", fontSize: 10, textAlign: "right" },
  conversionSearch: { backgroundColor: "#09111D", borderColor: "#334E68", borderWidth: 1, borderRadius: 8, color: "#FFFFFF", paddingHorizontal: 10, paddingVertical: 7, textAlign: "right", fontSize: 11 },
  noSwapResults: { color: "#FBBF24", fontSize: 10, textAlign: "right" },
  swapButton: { backgroundColor: "#1E293B", borderColor: "#334E68", borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, flex: 1 },
  swapChoice: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  swapFavoriteButton: { paddingHorizontal: 4, paddingVertical: 3 },
  swapFavoriteText: { color: "#F59E0B", fontSize: 16 },
  conversionNotice: { flexDirection: "row-reverse", alignItems: "center", alignSelf: "flex-end", gap: 7, backgroundColor: "#064E3B", borderColor: "#10B981", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  conversionNoticeIcon: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#10B981", color: "#000000", textAlign: "center", lineHeight: 18, fontWeight: "900", fontSize: 11 },
  conversionNoticeText: { color: "#D1FAE5", fontSize: 11, fontWeight: "800" },
  localConversionPreview: { backgroundColor: "#1E293B", borderColor: "#334E68", borderWidth: 1, borderRadius: 8, padding: 10, gap: 5 },
  localConversionTitle: { color: "#10B981", fontSize: 13, fontWeight: "900", textAlign: "right" },
  localConversionLine: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", textAlign: "right" },
  localConversionDetail: { color: "#CBD5E1", fontSize: 10, lineHeight: 15, textAlign: "right" },
  localConversionActions: { flexDirection: "row-reverse", gap: 8, marginTop: 4 },
  swapText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", textAlign: "right" },
  moreSwapButton: { backgroundColor: "#F59E0B", borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "center", marginTop: 4 },
  moreSwapText: { color: "#000000", fontSize: 11, fontWeight: "900" },
  swapButtonPressed: { opacity: 0.65 },
  confirm: { flex: 1, minHeight: 44, backgroundColor: "#F59E0B", borderRadius: 8, padding: 10, alignItems: "center", justifyContent: "center" },
  confirmText: { color: "#000000", fontWeight: "900", fontSize: 12, writingDirection: "rtl" },
  cancel: { flex: 1, borderColor: "#475569", borderWidth: 1, borderRadius: 8, padding: 10, alignItems: "center", backgroundColor: "#1E293B" },
  cancelText: { color: "#CBD5E1", fontWeight: "800", fontSize: 12 },
  note: { color: "#CBD5E1", fontSize: 11, lineHeight: 16, textAlign: "right", backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderRadius: 10, padding: 10 },
});