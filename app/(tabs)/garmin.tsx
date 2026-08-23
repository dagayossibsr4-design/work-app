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
import { useNutritionStore } from "../lib/nutrition-store";
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
  const [calendarMonthKey, setCalendarMonthKey] = useState(
    todayKey().slice(0, 7),
  );
  const [calendarDraftDate, setCalendarDraftDate] = useState(todayKey());
  const [eatenHistory, setEatenHistory] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [mealHistoryByDate, setMealHistoryByDate] = useState<
    Record<string, DailyMealSnapshot>
  >({});
  const [waterHistory, setWaterHistory] = useState<
    Record<string, { consumed: number; goal: number }>
  >({});
  const [waterEvents, setWaterEvents] = useState<Record<string, WaterEntry[]>>({});
  const [waterGoalDraft, setWaterGoalDraft] = useState("2000");
  const [hydrated, setHydrated] = useState(false);
  const [appliedTarget, setAppliedTarget] = useState("");
  const [rebalanceMessage, setRebalanceMessage] = useState("");
  const [hasFavorite, setHasFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState<"save" | "load" | null>(
    null,
  );
  const [favoriteStatus, setFavoriteStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [shareStatus, setShareStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [menuProfiles, setMenuProfiles] = useState<MenuProfiles>(() =>
    createMenuProfiles(nutritionProfile),
  );
  const [activeGoal, setActiveGoal] = useState(nutritionProfile.goal);
  const [versionsByGoal, setVersionsByGoal] = useState<MealPlanVersions>(
    emptyMealPlanVersions,
  );
  const [versionName, setVersionName] = useState("גרסה חדשה");
  const [bodyWeight, setBodyWeight] = useState("");
  const [versionTransitionBusy, setVersionTransitionBusy] = useState(false);
  const [expandedFoodId, setExpandedFoodId] = useState<string | null>(null);
  const [weightInfoFoodId, setWeightInfoFoodId] = useState<string | null>(null);
  const [editingQuantityKey, setEditingQuantityKey] = useState<string | null>(
    null,
  );
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
  const [favoriteConversionIds, setFavoriteConversionIds] = useState<string[]>(
    [],
  );
  const [animatedFavoriteId, setAnimatedFavoriteId] = useState<string | null>(
    null,
  );
  const [favoriteNotice, setFavoriteNotice] = useState<string | null>(null);
  const [mealConversionId, setMealConversionId] = useState<string | null>(null);
  const [mealConversionSelection, setMealConversionSelection] = useState<Record<string, ConversionFood | null>>({});
  const manualMealEditRef = useRef(false);
  useEffect(() => {
    if (Platform.OS === "android") {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);
  const activeWater = waterHistory[selectedDate] ?? { consumed: 0, goal: 2000 };
  const waterProgress = activeWater.goal > 0
    ? Math.min(activeWater.consumed / activeWater.goal, 1)
    : 0;
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
      AsyncStorage.setItem(
        "conversion-favorites",
        JSON.stringify(favoriteConversionIds),
      ).catch(() => undefined);
  }, [favoriteConversionIds, hydrated]);
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem("meal-plan-state"),
      AsyncStorage.getItem("meal-plan-eaten-history"),
      AsyncStorage.getItem("meal-plan-day-history"),
      AsyncStorage.getItem("meal-plan-favorite"),
      AsyncStorage.getItem("meal-plan-profiles"),
      AsyncStorage.getItem("meal-plan-versions"),
      AsyncStorage.getItem("meal-plan-defaults-v100"),
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
          defaultsVersion,
          waterHistoryValue,
          waterEventsValue,
        ]) => {
          if (value) {
            const saved = JSON.parse(value) as {
              meals?: Meal[];
              eaten?: Record<string, boolean>;
              appliedTarget?: string;
            };
            if (saved.meals) {
                setMeals(normalizeMealsTo100Grams(saved.meals));
            }
            if (defaultsVersion !== "1") {
              AsyncStorage.setItem("meal-plan-defaults-v100", "1").catch(
                () => undefined,
              );
            }
            if (saved.appliedTarget) setAppliedTarget(saved.appliedTarget);
            if (saved.eaten) setEaten(saved.eaten);
          }
          if (eatenHistoryValue) {
            const savedHistory = JSON.parse(eatenHistoryValue) as Record<
              string,
              Record<string, boolean>
            >;
            setEatenHistory(savedHistory);
            setEaten(savedHistory[todayKey()] ?? {});
          } else if (value) {
            const saved = JSON.parse(value) as {
              eaten?: Record<string, boolean>;
            };
            if (saved.eaten) {
              setEaten(saved.eaten);
              setEatenHistory({ [todayKey()]: saved.eaten });
            }
          }
          if (mealHistoryValue) {
            const savedHistory = JSON.parse(mealHistoryValue) as Record<string, DailyMealSnapshot>;
            const normalizedHistory = Object.fromEntries(Object.entries(savedHistory).map(([date, snapshot]) => [date, {
              meals: normalizeMealsTo100Grams(snapshot?.meals ?? []),
              eaten: snapshot?.eaten ?? {},
            }])) as Record<string, DailyMealSnapshot>;
            setMealHistoryByDate(normalizedHistory);
            const todaySnapshot = normalizedHistory[todayKey()];
            if (todaySnapshot?.meals.length) {
              setMeals(todaySnapshot.meals);
              setEaten(todaySnapshot.eaten);
            }
          }
          setHasFavorite(Boolean(favorite));
          if (versions) {
            const savedVersions = JSON.parse(versions) as MealPlanVersions;
            const normalizedVersions = Object.fromEntries(
              Object.entries(savedVersions).map(([goal, goalVersions]) => [
                goal,
                goalVersions.map((version) => ({
                  ...version,
                  meals: normalizeMealsTo100Grams(version.meals),
                })),
              ]),
            ) as MealPlanVersions;
            setVersionsByGoal({ ...emptyMealPlanVersions(), ...normalizedVersions });
          }
          if (waterHistoryValue) {
            const savedWater = JSON.parse(waterHistoryValue) as Record<string, { consumed?: number; goal?: number }>;
            const normalizedWater = Object.fromEntries(
              Object.entries(savedWater).map(([date, value]) => [date, {
                consumed: Math.max(0, Number(value?.consumed) || 0),
                goal: Math.max(250, Number(value?.goal) || 2000),
              }]),
            );
            setWaterHistory(normalizedWater);
          }
          if (waterEventsValue) {
            const savedEvents = JSON.parse(waterEventsValue) as Record<string, WaterEntry[]>;
            const normalizedEvents = Object.fromEntries(
              Object.entries(savedEvents).map(([date, entries]) => [date, (entries ?? []).filter((entry) => Number(entry?.amount) > 0 && Boolean(entry?.at)).map((entry) => ({ id: String(entry.id ?? entry.at), amount: Math.round(Number(entry.amount)), at: String(entry.at) }))]),
            ) as Record<string, WaterEntry[]>;
            setWaterEvents(normalizedEvents);
          }
          if (profiles) {
            const savedProfiles = JSON.parse(profiles) as MenuProfiles;
            setMenuProfiles(savedProfiles);
            const savedActive =
              savedProfiles[nutritionProfile.goal] ?? savedProfiles.ניטרלי;
            setActiveGoal(savedActive.goal);
          }
          setHydrated(true);
        },
      )
      .catch(() => setHydrated(true));
  }, [nutritionProfile.goal]);
  useEffect(() => {
    if (hydrated) {
      const nextMealsState = JSON.stringify({
          meals,
          eaten:
            selectedDate === todayKey()
              ? eaten
              : (eatenHistory[todayKey()] ?? {}),
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
      ]).then(requestNutritionCloudSave).catch(() => undefined);
    }
  }, [
    meals,
    eaten,
    eatenHistory,
    mealHistoryByDate,
    selectedDate,
    hydrated,
    appliedTarget,
    menuProfiles,
    versionsByGoal,
    waterHistory,
    waterEvents,
  ]);
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
  const patchActiveProfile = (patch: Partial<MenuProfile>) =>
    commitProfile({ ...activeProfile, ...patch });
  const completeActiveProfile = () =>
    commitProfile(completeMenuProfile(activeProfile));
  const buildProfileFromWeight = () => {
    const result = buildBodyweightTargets(
      Number(bodyWeight),
      targetCalories,
      activeGoal,
    );
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
    setRebalanceMessage(
      result.warning ??
        `היעדים נבנו לפי ${bodyWeight} ק״ג במצב ${mealPlanGoalLabel(activeGoal)}.`,
    );
  };
  useEffect(() => {
    setWaterGoalDraft(String(activeWater.goal));
  }, [selectedDate, activeWater.goal]);

  const addWater = (amount: number) => {
    const entry: WaterEntry = { id: `${Date.now()}-${amount}`, amount, at: new Date().toISOString() };
    setWaterEvents((current) => ({
      ...current,
      [selectedDate]: [...(current[selectedDate] ?? []), entry],
    }));
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
    const nextProfiles = {
      ...menuProfiles,
      [activeProfile.goal]: activeProfile,
    };
    await AsyncStorage.setItem(
      "meal-plan-profiles",
      JSON.stringify(nextProfiles),
    );
    setMenuProfiles(nextProfiles);
    setRebalanceMessage(
      `יעד ${mealPlanGoalLabel(activeProfile.goal)} נשמר בהצלחה.`,
    );
  };
  const saveVersion = () => {
    triggerFavoriteHaptic();
    const name =
      versionName.trim() || `גרסת ${versionsByGoal[activeGoal].length + 1}`;
    const version: MealPlanVersion = {
      id: `${activeGoal}-${Date.now()}`,
      name,
      goal: activeGoal,
      profile: { ...activeProfile },
      meals: cloneMeals(meals),
      savedAt: new Date().toISOString(),
      favorite: false,
    };
    setVersionsByGoal((current) => ({
      ...current,
      [activeGoal]: [version, ...current[activeGoal]],
    }));
    setVersionName("");
    setRebalanceMessage(
      `הגרסה "${name}" נשמרה תחת ${mealPlanGoalLabel(activeGoal)}.`,
    );
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
      setAppliedTarget(
        `${version.profile.goal}:${version.profile.calories}:${version.profile.protein}:${version.profile.carbohydrates}:${version.profile.fats}`,
      );
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
  const favoriteVersion = versionsByGoal[activeGoal].find(
    (version) => version.favorite,
  );
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
      carbohydrates:
        nutritionProfile.carbohydratesTarget ?? activeProfile.carbohydrates,
      fats: nutritionProfile.fatsTarget ?? activeProfile.fats,
    };
    const changed =
      syncedProfile.calories !== activeProfile.calories ||
      syncedProfile.protein !== activeProfile.protein ||
      syncedProfile.carbohydrates !== activeProfile.carbohydrates ||
      syncedProfile.fats !== activeProfile.fats;
    if (changed) {
      setMenuProfiles((current) => ({
        ...current,
        [activeGoal]: syncedProfile,
      }));
      setAppliedTarget("");
    }
  }, [
    activeGoal,
    activeProfile,
    hydrated,
    nutritionProfile.goal,
    nutritionProfile.calorieTarget,
    nutritionProfile.proteinTarget,
    nutritionProfile.carbohydratesTarget,
    nutritionProfile.fatsTarget,
  ]);
  const targetKey = `${activeProfile.goal}:${targetCalories}:${activeProfile.protein}:${activeProfile.carbohydrates}:${activeProfile.fats}`;
  const currentPlanTotals = useMemo(() => dailyMealTotals(meals), [meals]);
  const targetAligned =
    (!activeProfile.protein ||
      Math.abs(currentPlanTotals.protein - Number(activeProfile.protein)) <=
        2) &&
    (!activeProfile.carbohydrates ||
      Math.abs(
        currentPlanTotals.carbohydrates - Number(activeProfile.carbohydrates),
      ) <= 2) &&
    (!activeProfile.fats ||
      Math.abs(currentPlanTotals.fats - Number(activeProfile.fats)) <= 2);
  useEffect(() => {
    if (manualMealEditRef.current) {
      manualMealEditRef.current = false;
      return;
    }
    if (
      !hydrated ||
      !targetCalories ||
      (appliedTarget === targetKey && targetAligned)
    )
      return;
    setMeals((current) =>
      scaleMealsToTargets(current, {
        calories: targetCalories,
        protein: Number(activeProfile.protein) || 0,
        carbohydrates: Number(activeProfile.carbohydrates) || 0,
        fats: Number(activeProfile.fats) || 0,
      }),
    );
    setAppliedTarget(targetKey);
  }, [
    hydrated,
    targetCalories,
    targetKey,
    appliedTarget,
    targetAligned,
    activeProfile.protein,
    activeProfile.carbohydrates,
    activeProfile.fats,
  ]);
  const toggleEaten = (id: string) =>
    setEaten((current) => ({ ...current, [id]: !current[id] }));
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
  const changeSelectedDate = (offset: number) => {
    selectMealDate(shiftDateKey(selectedDate, offset));
  };
  const openCalendar = () => {
    setCalendarDraftDate(selectedDate);
    setCalendarMonthKey(selectedDate.slice(0, 7));
    setCalendarOpen(true);
  };
  const confirmCalendarDate = () => {
    selectMealDate(calendarDraftDate);
    setCalendarOpen(false);
  };
  const calendarCells = useMemo(
    () => buildCalendarCells(calendarMonthKey),
    [calendarMonthKey],
  );
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
      }),
    );
    setAppliedTarget(targetKey);
    setRebalanceMessage(`הכמויות אוזנו מחדש ליעד של ${targetCalories} קק״ל.`);
  };
  const resetToOriginal = () => {
    setMeals(JSON.parse(JSON.stringify(defaultMeals)) as Meal[]);
    setAppliedTarget(targetKey);
    setRebalanceMessage("התפריט חזר לתפריט המקורי. סימוני נאכל נשמרו.");
  };
  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  const exportPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    setShareStatus(null);
    const html = buildMealPlanHtml(
      activeGoal,
      activeProfile,
      targetCalories,
      meals,
      user?.name ?? "",
      bodyWeight,
    );
    try {
      if (Platform.OS === "web") {
        await Print.printAsync({ html });
        setShareStatus({
          type: "success",
          message: "חלון ההדפסה נפתח. בחרת באפשרות שמירה כ־PDF.",
        });
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
          setShareStatus({
            type: "success",
            message: "קובץ ה־PDF נוצר ונפתח לשיתוף.",
          });
        } else {
          setShareStatus({
            type: "success",
            message: "קובץ ה־PDF נוצר בהצלחה במכשיר.",
          });
        }
      }
    } catch {
      setShareStatus({
        type: "error",
        message: "יצירת או שיתוף ה־PDF נכשלו. נסה שוב.",
      });
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
        const foods = meal.foods
          .map((food) => `• ${food.name}: ${food.quantity}`)
          .join("\n");
        return `ארוחה ${index + 1} — ${meal.title}\n${foods}`;
      }),
    ];
    try {
      await Share.share({
        title: `תפריט ${meals.length} ארוחות`,
        message: lines.join("\n\n"),
      });
      setShareStatus({
        type: "success",
        message: "חלון השיתוף נפתח. אפשר לבחור WhatsApp או דוא״ל.",
      });
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
            targetKey,
            savedAt: new Date().toISOString(),
          }),
        ),
        wait(450),
      ]);
      setHasFavorite(true);
      setFavoriteStatus({
        type: "success",
        message: "התפריט נשמר כמועדף וזמין לטעינה מהירה.",
      });
    } catch {
      setFavoriteStatus({
        type: "error",
        message: "שמירת התפריט המועדף נכשלה. נסה שוב.",
      });
    } finally {
      setFavoriteBusy(null);
    }
  };
  const loadFavorite = async () => {
    if (favoriteBusy) return;
    setFavoriteBusy("load");
    setFavoriteStatus(null);
    try {
      const [value] = await Promise.all([
        AsyncStorage.getItem("meal-plan-favorite"),
        wait(450),
      ]);
      if (!value) {
        setHasFavorite(false);
        setFavoriteStatus({
          type: "error",
          message: "עדיין לא נשמר תפריט מועדף.",
        });
        return;
      }
      const saved = JSON.parse(value) as { meals?: Meal[]; targetKey?: string };
      if (saved.meals) setMeals(normalizeMealsTo100Grams(saved.meals));
      if (saved.targetKey) setAppliedTarget(saved.targetKey);
      setFavoriteStatus({
        type: "success",
        message: "התפריט המועדף נטען בהצלחה.",
      });
    } catch {
      setFavoriteStatus({
        type: "error",
        message: "טעינת התפריט המועדף נכשלה. נסה שוב.",
      });
    } finally {
      setFavoriteBusy(null);
    }
  };
  const totals = useMemo(() => dailyMealTotals(meals), [meals]);
  const displayedMeals = useMemo(
    () =>
      viewMode === "planned"
        ? meals
        : meals.map((meal) => ({
            ...meal,
            foods: meal.foods.filter((food) => eaten[food.id]),
          })),
    [meals, eaten, viewMode],
  );
  const displayedTotals = useMemo(
    () => dailyMealTotals(displayedMeals),
    [displayedMeals],
  );
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
          { calories: 0, protein: 0, carbohydrates: 0, fats: 0 },
        ),
    [meals, eaten],
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
        return AsyncStorage.setItem(
          "nutrition-daily-history",
          JSON.stringify(next),
        );
      })
      .catch(() => undefined);
  }, [consumed, hydrated, selectedDate]);
  const targets = {
    calories: targetCalories || totals.calories,
    protein: Number(activeProfile.protein) || 0,
    carbohydrates: Number(activeProfile.carbohydrates) || 0,
    fats: Number(activeProfile.fats) || 0,
  };
  const macroDistribution = useMemo(
    () => calculateMacroDistribution(displayedTotals),
    [displayedTotals],
  );
  const triggerFavoriteHaptic = () => {
    if (Platform.OS !== "web")
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
        () => undefined,
      );
  };
  const toggleConversionFavorite = (targetId: string) => {
    triggerFavoriteHaptic();
    const willFavorite = !favoriteConversionIds.includes(targetId);
    setFavoriteConversionIds((current) =>
      current.includes(targetId)
        ? current.filter((id) => id !== targetId)
        : [...current, targetId],
    );
    setAnimatedFavoriteId(targetId);
    setFavoriteNotice(
      willFavorite ? "החלופה נוספה למועדפים" : "החלופה הוסרה מהמועדפים",
    );
    Animated.sequence([
      Animated.timing(favoriteScale, {
        toValue: 1.2,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(favoriteScale, {
        toValue: 1,
        duration: 180,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setAnimatedFavoriteId(null));
    setTimeout(() => setFavoriteNotice(null), 1800);
  };
  const chooseSwap = (
    mealIndex: number,
    foodIndex: number,
    target: ConversionFood,
  ) => {
    const food = meals[mealIndex].foods[foodIndex];
    const source = sourceForFood(food.name);
    const grams = Number(
      food.quantity.match(/^[0-9]+(?:\.[0-9]+)?/)?.[0] ?? 100,
    );
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
          mealFoodTotals(food)[source.group === "חלבון" ? "protein" : source.group === "פחמימה" ? "carbohydrates" : "fats"],
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
                },
          ),
        };
      }),
    );
    setPending(null);
  };
  const toggleMeal = (mealId: string) => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        260,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.scaleXY,
      ),
    );
    setExpandedMealIds((current) =>
      current.includes(mealId)
        ? current.filter((id) => id !== mealId)
        : [...current, mealId],
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
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length)
        return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };
  const updateMealTitle = (mealId: string, title: string) =>
    setMeals((current) =>
      current.map((meal) => (meal.id === mealId ? { ...meal, title } : meal)),
    );
  const beginMealEdit = (meal: Meal) => {
    setMealEditBackup(JSON.parse(JSON.stringify(meal)) as Meal);
    setEditingMealId(meal.id);
    setExpandedMealIds((current) =>
      current.includes(meal.id) ? current : [...current, meal.id],
    );
    setMealFoodSearch("");
    setAddFoodGroupFilter(null);
    setSelectedAddFoodKey(null);
    setSelectedMealFoodKey(null);
  };
  const openMealFoodGroup = (meal: Meal, group: FoodGroup) => {
    setMealEditBackup((current) => current ?? (JSON.parse(JSON.stringify(meal)) as Meal));
    setEditingMealId(meal.id);
    setExpandedMealIds((current) => current.includes(meal.id) ? current : [...current, meal.id]);
    setMealFoodSearch("");
    setPressedAddFoodGroup(group);
    setSelectedAddFoodKey(`${meal.id}:${group}`);
    setSelectedMealFoodKey(null);
    setAddFoodGroupFilter(group);
  };
  const updateMealFoodQuantity = (
    mealId: string,
    foodId: string,
    quantity: string,
  ) => {
    manualMealEditRef.current = true;
    setMeals((current) =>
      current.map((meal) =>
        meal.id !== mealId
          ? meal
          : {
              ...meal,
              foods: meal.foods.map((food) =>
                food.id === foodId ? { ...food, quantity, servingGrams: food.servingGrams ?? Number(food.quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)/)?.[1] ?? 100) } : food,
              ),
            },
      ),
    );
  };
  const saveMealFoodQuantity = (
    mealId: string,
    foodId: string,
    draftOverride?: string,
  ) => {
    const meal = meals.find((item) => item.id === mealId);
    const food = meal?.foods.find((item) => item.id === foodId);
    const raw = (draftOverride ?? food?.quantity ?? "").trim().replace(",", ".");
    const match = raw.match(/^([0-9]+(?:\.[0-9]+)?)/);
    const parsed = match ? Number(match[1]) : 0;
    const normalized = Number.isFinite(parsed)
      ? Math.max(0, Math.round(parsed * 10) / 10)
      : 0;
    updateMealFoodQuantity(mealId, foodId, `${normalized} גרם`);
  };
  const resetMealFoodQuantity = (mealId: string, foodId: string) => {
    setQuantityDraft("100");
    updateMealFoodQuantity(mealId, foodId, "100 גרם");
  };
  const openManualNutritionEditor = (mealId: string, food: Meal["foods"][number]) => {
    const totals = mealFoodTotals(food);
    const key = `${mealId}:${food.id}`;
    if (editingNutritionKey === key) {
      setEditingNutritionKey(null);
      Keyboard.dismiss();
      return;
    }
    setNutritionDraft({
      calories: String(totals.calories),
      protein: String(totals.protein),
      carbohydrates: String(totals.carbohydrates),
      fats: String(totals.fats),
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
    setMeals((current) => current.map((meal) => meal.id !== mealId ? meal : {
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
    }));
    manualMealEditRef.current = true;
    setEditingNutritionKey(null);
    Keyboard.dismiss();
    setRebalanceMessage("ערכי התזונה נשמרו ידנית והסיכומים עודכנו.");
  };
  const restoreNutritionLabel = (mealId: string, foodId: string) => {
    setMeals((current) => current.map((meal) => meal.id !== mealId ? meal : normalizeMealsTo100Grams([{
      ...meal,
      foods: meal.foods.map((food) => food.id === foodId ? { ...food, manualNutrition: false } : food),
    }])[0]));
    setEditingNutritionKey(null);
    setRebalanceMessage("ערכי התווית המקוריים שוחזרו לכרטיס.");
  };
  const updateMealFoodWeightMode = (
    mealId: string,
    foodId: string,
    mode: WeightMode,
  ) => {
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
                        converted.quantity.match(/^\s*([0-9]+(?:\.[0-9]+)?)/)?.[1],
                      );
                      return food.manualNutrition && Number.isFinite(convertedGrams)
                        ? { ...converted, servingGrams: convertedGrams }
                        : converted;
                    })()
                  : food,
              ),
            },
      ),
    );
  };

  const adjustMealFoodQuantity = (
    mealId: string,
    foodId: string,
    delta: number,
  ) => {
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
    setMeals((current) => current.map((item) => item.id !== mealId ? item : { ...item, foods: item.foods.filter((food) => food.id !== foodId) }));
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
            },
      ),
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
        current.map((meal) =>
          meal.id === mealEditBackup.id ? normalizeMealsTo100Grams([mealEditBackup])[0] : meal,
        ),
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
    .filter((item) =>
      `${item.name} ${item.group} ${item.reference}`.includes(
        mealFoodSearch.trim(),
      ),
    )
    .slice(0, 10);
  const openSwap = (mealId: string, foodId: string, group: ConversionGroup) => {
    setActiveSwapKey(`${mealId}:${foodId}`);
    setSwapGroup(group);
    setConversionSearch("");
    setExpandedFoodId(null);
  };
  const openMealConversion = (meal: Meal) => {
    const defaults: Record<string, ConversionFood | null> = {};
    (['חלבון', 'פחמימה', 'שומן'] as ConversionGroup[]).forEach((group) => {
      const source = meal.foods.find((food) => foodMacroLabel(food.name, food.protein, food.carbohydrates, food.fats) === group);
      defaults[group] = sourceForFood(source?.name ?? '') ?? mealConversionFoods.find((food) => food.group === group) ?? null;
    });
    setMealConversionSelection(defaults);
    setMealConversionId(meal.id);
  };
  const applyMealConversion = () => {
    if (!mealConversionId) return;
    const meal = meals.find((item) => item.id === mealConversionId);
    if (!meal) return;
    const groups: ConversionGroup[] = ["חלבון", "פחמימה", "שומן"];
    const nextFoods = groups.map((group) => {
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
    }).filter(Boolean) as Meal["foods"];
    setMeals((current) => current.map((item) => item.id === meal.id ? { ...item, foods: nextFoods } : item));
    setMealConversionId(null);
    setRebalanceMessage(`${meal.title} הומרה לפי יעדי המאקרו המקוריים: חלבון, פחמימה ושומן.`);
  };
  return (
    <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
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
          {standalone ? <Pressable onPress={() => router.back()} style={styles.menuButton}><Text style={styles.menuText}>‹ חזרה</Text></Pressable> : <Pressable onPress={() => router.push("/menu")} style={styles.menuButton}><Text style={styles.menuText}>☰ תפריט</Text></Pressable>}
          <Text style={styles.eyebrow}>תזונה יומית</Text>
          <Text style={styles.title}>{standalone ? "הארוחות שלי" : `תפריט ${meals.length} ארוחות`}</Text>
          <Text style={styles.subtitle}>
            יעד פעיל: {mealPlanGoalLabel(activeGoal)} ·{" "}
            {targetCalories || "לא הוגדר"} קק״ל · לפי המחשבון הקלורי
          </Text>
          <Pressable onPress={() => router.push("/scroll-test")} style={styles.scrollTestButton}>
            <Text style={styles.scrollTestButtonText}>בדיקת גלילה</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/nutrition-calendar" as never)} style={styles.scrollTestButton}>
            <Text style={styles.scrollTestButtonText}>לוח תזונה: יום · שבוע · חודש</Text>
          </Pressable>
          <PermanentSaveBanner />
          <View style={styles.datePicker}>
            <Pressable
              onPress={() => changeSelectedDate(-1)}
              style={styles.dateButton}
            >
              <Text style={styles.dateButtonText}>‹</Text>
            </Pressable>
            <Pressable onPress={openCalendar} style={styles.dateCenter}>
              <Text style={styles.dateLabel}>
                {selectedDate === todayKey()
                  ? "היום"
                  : formatDateLabel(selectedDate)}
              </Text>
              <Text style={styles.dateHint}>
                לחץ לפתיחת לוח שנה ·{" "}
                {selectedDate === todayKey() ? "מעקב יומי" : "היסטוריית אכילה"}
              </Text>
            </Pressable>
            <Pressable
              disabled={selectedDate === todayKey()}
              onPress={() => changeSelectedDate(1)}
              style={[
                styles.dateButton,
                selectedDate === todayKey() && styles.dateButtonDisabled,
              ]}
            >
              <Text style={styles.dateButtonText}>›</Text>
            </Pressable>
          </View>
        </View>
        <Modal
          transparent
          visible={calendarOpen}
          animationType="fade"
          onRequestClose={() => setCalendarOpen(false)}
        >
          <View style={styles.calendarBackdrop}>
            <View style={styles.calendarModal}>
              <View style={styles.calendarHeader}>
                <Pressable
                  onPress={() =>
                    setCalendarMonthKey(shiftMonthKey(calendarMonthKey, 1))
                  }
                  style={styles.calendarNav}
                >
                  <Text style={styles.calendarNavText}>›</Text>
                </Pressable>
                <Text style={styles.calendarTitle}>
                  {formatMonthLabel(calendarMonthKey)}
                </Text>
                <Pressable
                  onPress={() =>
                    setCalendarMonthKey(shiftMonthKey(calendarMonthKey, -1))
                  }
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
                    dateKey &&
                    eatenHistory[dateKey] &&
                    Object.values(eatenHistory[dateKey]).some(Boolean),
                  );
                  return (
                    <View
                      key={`${dateKey ?? "empty"}-${index}`}
                      style={styles.calendarCell}
                    >
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
                          {hasData ? (
                            <View style={styles.calendarDataDot} />
                          ) : null}
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
              <View style={styles.calendarActions}>
                <Pressable
                  onPress={() => setCalendarOpen(false)}
                  style={styles.calendarCancel}
                >
                  <Text style={styles.calendarCancelText}>ביטול</Text>
                </Pressable>
                <Pressable
                  onPress={confirmCalendarDate}
                  style={styles.calendarConfirm}
                >
                  <Text style={styles.calendarConfirmText}>אישור תאריך</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        <View style={styles.profileEditor}>
          <Text style={styles.profileTitle}>הגדרת יעד בתוך התפריט</Text>
          <Text style={styles.profileHint}>
            בחר מצב, ערוך את הכמויות ושמור כל מצב בנפרד.
          </Text>
          <View style={styles.goalRow}>
            {(["מסה", "חיטוב", "ניטרלי"] as const).map((goal) => (
              <Pressable
                key={goal}
                accessibilityRole="button"
                accessibilityState={{ selected: activeGoal === goal }}
                onPress={() => selectGoal(goal)}
                style={[
                  styles.goalButton,
                  activeGoal === goal && styles.goalButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.goalText,
                    activeGoal === goal && styles.goalTextActive,
                  ]}
                >
                  {goal}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.profileFields}>
            <ProfileField
              label="קלוריות"
              value={activeProfile.calories}
              onChange={(value) => patchActiveProfile({ calories: value })}
            />
            <ProfileField
              label="חלבון (ג׳)"
              value={activeProfile.protein}
              onChange={(value) => patchActiveProfile({ protein: value })}
            />
            <ProfileField
              label="פחמימות (ג׳)"
              value={activeProfile.carbohydrates}
              onChange={(value) => patchActiveProfile({ carbohydrates: value })}
            />
            <ProfileField
              label="שומן (ג׳)"
              value={activeProfile.fats}
              onChange={(value) => patchActiveProfile({ fats: value })}
            />
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
                style={[
                  styles.autoButton,
                  activeProfile.autoField === field && styles.autoButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.autoText,
                    activeProfile.autoField === field && styles.autoTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.weightBuilder}>
            <Text style={styles.profileHint}>בניית תפריט לפי משקל גוף</Text>
            <View style={styles.weightRow}>
              <TextInput
                value={bodyWeight}
                onChangeText={(value) =>
                  setBodyWeight(value.replace(/[^0-9.]/g, ""))
                }
                placeholder="משקל בק״ג"
                placeholderTextColor="#7E8DA4"
                keyboardType="numeric"
                style={styles.weightInput}
              />
              <Pressable
                onPress={buildProfileFromWeight}
                style={styles.weightButton}
              >
                <Text style={styles.weightButtonText}>בנה לפי משקל</Text>
              </Pressable>
            </View>
            <Text style={styles.weightHint}>
              החלבון והשומן יחושבו לפי המצב, והפחמימות ימלאו את יתרת הקלוריות.
            </Text>
          </View>
          <Pressable
            onPress={completeActiveProfile}
            style={styles.completeButton}
          >
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
              placeholderTextColor="#7E8DA4"
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
              style={[
                styles.favoriteVersionButton,
                versionTransitionBusy && styles.versionButtonDisabled,
              ]}
            >
              <Text style={styles.favoriteVersionText}>
                ★ טען מועדפת: {favoriteVersion.name}
              </Text>
            </Pressable>
          ) : null}
          {versionsByGoal[activeGoal].length > 0 ? (
            <View style={styles.versionList}>
              {versionsByGoal[activeGoal].map((version) => (
                <View key={version.id} style={styles.versionItem}>
                  <Pressable
                    disabled={versionTransitionBusy}
                    onPress={() => loadVersion(version)}
                    style={[
                      styles.versionLoadButton,
                      versionTransitionBusy && styles.versionButtonDisabled,
                    ]}
                  >
                    <Text style={styles.versionLoad}>טען</Text>
                  </Pressable>
                  <Text style={styles.versionName}>{version.name}</Text>
                  <Pressable
                    onPress={() => toggleVersionFavorite(version.id)}
                    style={[
                      styles.versionFavoriteButton,
                      version.favorite && styles.versionFavoriteButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.versionFavoriteText,
                        version.favorite && styles.versionFavoriteTextActive,
                      ]}
                    >
                      {version.favorite ? "★" : "☆"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noVersions}>
              אין עדיין גרסאות שמורות למצב הזה.
            </Text>
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
                placeholderTextColor="#7E8DA4"
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
                const cumulative = activeWaterEvents
                  .slice(index)
                  .reduce((sum, current) => sum + current.amount, 0);
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
            <Text style={styles.mealManagementHint}>
              {meals.length} ארוחות בתפריט
            </Text>
          </View>
          <Pressable onPress={addMeal} style={styles.addMealButton}>
            <Text style={styles.addMealButtonText}>＋ הוסף ארוחה חדשה</Text>
          </Pressable>
        </View>
        <Animated.View
          style={[styles.mealsTransition, { opacity: mealPlanOpacity }]}
        >
          {displayedMeals.map((meal, mealIndex) => {
            const total = mealTotals(meal);
            const previous = meals
              .slice(0, mealIndex + 1)
              .reduce((sum, current) => sum + mealTotals(current).calories, 0);
            const proteinSources = meal.foods.filter(
              (food) =>
                foodMacroLabel(
                  food.name,
                  food.protein,
                  food.carbohydrates,
                  food.fats,
                ) === "חלבון",
            ).length;
            return (
              <View
                key={meal.id}
                style={[
                  styles.meal,
                  expandedMealIds.includes(meal.id) && styles.mealActive,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${meal.title}, ${expandedMealIds.includes(meal.id) ? "פתוח" : "סגור"}. לחץ כדי ${expandedMealIds.includes(meal.id) ? "לסגור" : "לפתוח"}`}
                  accessibilityState={{ expanded: expandedMealIds.includes(meal.id) }}
                  onPress={() => toggleMeal(meal.id)}
                  style={({ pressed }) => [
                    styles.mealHeader,
                    expandedMealIds.includes(meal.id) && styles.mealHeaderActive,
                    pressed && styles.mealHeaderPressed,
                  ]}
                >
                  <Text style={[styles.mealTotal, expandedMealIds.includes(meal.id) && styles.mealTotalActive]}>
                    {Math.round(total.calories)} קק״ל · מצטבר{" "}
                    {Math.round(previous)}
                  </Text>
                  <View style={styles.mealTitleRow}>
                    <Text style={[styles.mealTitle, expandedMealIds.includes(meal.id) && styles.mealTitleActive]}>{meal.title}</Text>
                    <View style={[styles.mealFoodCountBadge, expandedMealIds.includes(meal.id) && styles.mealFoodCountBadgeActive]}><Text style={[styles.mealFoodCountText, expandedMealIds.includes(meal.id) && styles.mealFoodCountTextActive]}>{meal.foods.length} {meal.foods.length === 1 ? "רכיב" : "רכיבים"}</Text></View>
                    {meal.id === "meal-1" ? (
                      <Text style={[styles.breakfastProteinBadge, expandedMealIds.includes(meal.id) && styles.breakfastProteinBadgeActive]}>
                        {proteinSources} מקורות חלבון
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.mealToggle, expandedMealIds.includes(meal.id) && styles.mealToggleActive]}>
                    {expandedMealIds.includes(meal.id) ? "סגור ▲" : "פתח ▼"}
                  </Text>
                </Pressable>
                <View style={styles.mealQuickActions}>
                  <Pressable
                    onPress={() => moveMeal(meal.id, 1)}
                    disabled={mealIndex === meals.length - 1}
                    style={[
                      styles.mealMoveButton,
                      mealIndex === meals.length - 1 && styles.disabledAction,
                    ]}
                  >
                    <Text style={styles.mealMoveText}>↓</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => moveMeal(meal.id, -1)}
                    disabled={mealIndex === 0}
                    style={[
                      styles.mealMoveButton,
                      mealIndex === 0 && styles.disabledAction,
                    ]}
                  >
                    <Text style={styles.mealMoveText}>↑</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deleteMeal(meal)}
                    style={styles.deleteMealButton}
                  >
                    <Text style={styles.deleteMealText}>מחק ארוחה</Text>
                  </Pressable>
                </View>
                {expandedMealIds.includes(meal.id) ? (
                  <View style={styles.mealFoodEditor}>
                    <View style={styles.mealFoodListHeader}>
                      <Text style={styles.mealFoodListTitle}>רשימת המאכלים המדויקת</Text>
                      <Text style={styles.mealFoodListCount}>{meal.foods.length} רכיבים</Text>
                    </View>
                    {meal.foods.map((food, foodIndex) => {
                      const source = sourceForFood(food.name);
                      const macroGroup = foodMacroLabel(
                        food.name,
                        food.protein,
                        food.carbohydrates,
                        food.fats,
                      );
                      const macroIcon: IconSymbolName =
                        macroGroup === "חלבון"
                          ? "fork.knife"
                          : macroGroup === "פחמימה"
                            ? "leaf.fill"
                            : "drop.fill";
                      const quantityGramsMatch = food.quantity.match(
                        /^\s*([0-9]+(?:\.[0-9]+)?)\s*גרם/,
                      );
                      const quantityGrams = quantityGramsMatch
                        ? Number(quantityGramsMatch[1])
                        : null;
                      const weightMode = food.weightMode ?? "cooked";
                      const weightInfo = cookingConversionInfo(
                        food.id,
                        weightMode,
                      );
                      const weightInfoKey = `${meal.id}:${food.id}`;
                      const weightInfoOpen = weightInfoFoodId === weightInfoKey;
                      const quantityEditKey = `${meal.id}:${food.id}`;
                      const quantityEditOpen =
                        editingQuantityKey === quantityEditKey;
                      const nutritionEditOpen = editingNutritionKey === quantityEditKey;
                      const swapKey = `${meal.id}:${food.id}`;
                      const swapOpen = activeSwapKey === swapKey;
                      const swapTargets =
                        source && swapGroup === source.group
                          ? alternativesFor(source)
                              .filter((target) =>
                                target.name.includes(conversionSearch.trim()),
                              )
                              .sort(
                                (a, b) =>
                                  Number(favoriteConversionIds.includes(b.id)) -
                                  Number(favoriteConversionIds.includes(a.id)),
                              )
                          : [];
                      const foodPending =
                        pending?.mealIndex === mealIndex &&
                        pending.foodIndex === foodIndex;
                      return (
                        <View
                          key={food.id}
                          style={[
                            styles.food,
                            foodPending && styles.foodSelected,
                          ]}
                        >
                          <View style={styles.foodTop}>
                            <Text style={styles.foodMacros}>
                              {mealFoodTotals(food).calories} קק״ל · חלבון{" "}
                              {mealFoodTotals(food).protein} · פחמ׳{" "}
                              {mealFoodTotals(food).carbohydrates} · שומן{" "}
                              {mealFoodTotals(food).fats}
                            </Text>
                            <Text style={styles.foodName}>{food.name}</Text>
                          </View>
                          <View style={styles.foodMetaRow}>
                            <Text
                              style={[
                                styles.foodMacroLabel,
                                foodMacroLabel(
                                  food.name,
                                  food.protein,
                                  food.carbohydrates,
                                  food.fats,
                                ) === "חלבון"
                                  ? styles.foodMacroProtein
                                  : foodMacroLabel(
                                        food.name,
                                        food.protein,
                                        food.carbohydrates,
                                        food.fats,
                                      ) === "פחמימה"
                                    ? styles.foodMacroCarb
                                    : styles.foodMacroFat,
                              ]}
                            >
                              {foodMacroLabel(
                                food.name,
                                food.protein,
                                food.carbohydrates,
                                food.fats,
                              )}
                            </Text>
                            <Text style={styles.foodMeta}>
                              {food.quantity} · {food.reference}
                            </Text>
                            {quantityGrams !== null ? (
                              <Pressable
                                onPress={() =>
                                  setWeightInfoFoodId(
                                    weightInfoOpen ? null : weightInfoKey,
                                  )
                                }
                                accessibilityRole="button"
                                accessibilityLabel={`מידע על מקדם ההמרה של ${food.name}`}
                                style={styles.weightInfoButton}
                              >
                                <Text style={styles.weightInfoButtonText}>
                                  i
                                </Text>
                              </Pressable>
                            ) : null}
                          </View>
                          {weightInfoOpen ? (
                            <View style={styles.weightInfoPanel}>
                              <Text style={styles.weightInfoTitle}>
                                מקדם ההמרה — {weightModeLabels[weightMode]}
                              </Text>
                              <Text style={styles.weightInfoText}>
                                {weightInfo.factorText}
                              </Text>
                              <Text style={styles.weightInfoText}>
                                {weightInfo.calculationText}
                              </Text>
                              <Text style={styles.weightInfoNote}>
                                המקדם הוא אומדן ותלוי בשיטת הבישול.
                              </Text>
                            </View>
                          ) : null}
                          <Pressable
                            onPress={() => toggleEaten(food.id)}
                            style={[
                              styles.eatenButton,
                              eaten[food.id] && styles.eatenButtonActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.eatenText,
                                eaten[food.id] && styles.eatenTextActive,
                              ]}
                            >
                              {eaten[food.id] ? "✓ נאכל" : "סמן כנאכל"}
                            </Text>
                          </Pressable>
                          {meal.foods.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={`הסר את ${food.name} מהארוחה`} onPress={() => removeMealFood(meal.id, food.id)} style={({ pressed }) => [styles.removeMealFoodButton, pressed && styles.removeMealFoodPressed]}><Text style={styles.removeMealFoodText}>− הסר רכיב</Text></Pressable> : null}
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`${nutritionEditOpen ? "סגור" : "ערוך"} ערכים תזונתיים של ${food.name}`}
                            onPress={() => openManualNutritionEditor(meal.id, food)}
                            style={({ pressed }) => [nutritionEditStyles.openButton, nutritionEditOpen && nutritionEditStyles.openButtonActive, pressed && nutritionEditStyles.pressed]}
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
                                {([
                                  ["calories", "קק״ל"],
                                  ["protein", "חלבון"],
                                  ["carbohydrates", "פחמימות"],
                                  ["fats", "שומן"],
                                ] as [keyof NutritionDraft, string][]).map(([field, label]) => (
                                  <View key={field} style={nutritionEditStyles.field}>
                                    <Text style={nutritionEditStyles.label}>{label}</Text>
                                    <TextInput
                                      value={nutritionDraft[field]}
                                      onChangeText={(value) => setNutritionDraft((current) => ({ ...current, [field]: value.replace(/[^0-9.,]/g, "").replace(",", ".") }))}
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
                                <Pressable accessibilityRole="button" accessibilityLabel="שמור ערכים תזונתיים ידניים" onPress={() => saveManualNutrition(meal.id, food.id)} style={nutritionEditStyles.saveButton}><Text style={nutritionEditStyles.saveText}>שמור ערכים</Text></Pressable>
                                <Pressable accessibilityRole="button" accessibilityLabel="שחזר ערכי תווית מקוריים" onPress={() => restoreNutritionLabel(meal.id, food.id)} style={nutritionEditStyles.restoreButton}><Text style={nutritionEditStyles.restoreText}>שחזר תווית</Text></Pressable>
                              </View>
                            </View>
                          ) : null}
                          <View style={styles.foodEdit}>
                            {quantityEditOpen ? (
                              <>
                                {quantityGrams !== null ? (
                                  <View style={styles.quantityStepper}>
                                    <Pressable
                                      onPress={() =>
                                        adjustMealFoodQuantity(
                                          meal.id,
                                          food.id,
                                          -10,
                                        )
                                      }
                                      accessibilityRole="button"
                                      accessibilityLabel="הפחת 10 גרם"
                                      style={styles.quantityStepButton}
                                    >
                                      <Text style={styles.quantityStepText}>
                                        −10
                                      </Text>
                                    </Pressable>
                                    <Pressable
                                      onPress={() =>
                                        adjustMealFoodQuantity(
                                          meal.id,
                                          food.id,
                                          10,
                                        )
                                      }
                                      accessibilityRole="button"
                                      accessibilityLabel="הוסף 10 גרם"
                                      style={styles.quantityStepButton}
                                    >
                                      <Text style={styles.quantityStepText}>
                                        +10
                                      </Text>
                                    </Pressable>
                                  </View>
                                ) : null}
                                {quantityGrams !== null ? (
                                  <View style={styles.weightModeRow}>
                                    <Text style={styles.weightModeLabel}>
                                      שקילה:
                                    </Text>
                                    {(["raw", "cooked"] as WeightMode[]).map(
                                      (mode) => {
                                        const activeMode =
                                          food.weightMode ?? "cooked";
                                        return (
                                          <Pressable
                                            key={mode}
                                            onPress={() =>
                                              updateMealFoodWeightMode(
                                                meal.id,
                                                food.id,
                                                mode,
                                              )
                                            }
                                            accessibilityRole="button"
                                            accessibilityLabel={
                                              weightModeLabels[mode]
                                            }
                                            style={[
                                              styles.weightModeButton,
                                              activeMode === mode &&
                                                styles.weightModeButtonActive,
                                            ]}
                                          >
                                            <Text
                                              style={[
                                                styles.weightModeText,
                                                activeMode === mode &&
                                                  styles.weightModeTextActive,
                                              ]}
                                            >
                                              {weightModeLabels[mode]}
                                            </Text>
                                          </Pressable>
                                        );
                                      },
                                    )}
                                  </View>
                                ) : null}
                                <TextInput
                                  value={quantityDraft}
                                  editable
                                  keyboardType="decimal-pad"
                                  inputMode="decimal"
                                  selectTextOnFocus
                                  accessibilityLabel={`כמות ${food.name} בגרמים`}
                                  onChangeText={(value) =>
                                    setQuantityDraft(
                                      value.replace(/[^0-9.,]/g, "").replace(",", "."),
                                    )
                                  }
                                  onSubmitEditing={() => {
                                    saveMealFoodQuantity(meal.id, food.id, quantityDraft);
                                    Keyboard.dismiss();
                                  }}
                                  style={[
                                    styles.quantityInput,
                                    styles.quantityInputEditable,
                                  ]}
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
                                  <Text style={styles.saveQuantityText}>
                                    שמור
                                  </Text>
                                </Pressable>
                                <Pressable
                                  onPress={() =>
                                    resetMealFoodQuantity(meal.id, food.id)
                                  }
                                  accessibilityRole="button"
                                  accessibilityLabel="אפס כמות ל־100 גרם"
                                  style={styles.resetQuantityButton}
                                >
                                  <Text style={styles.resetQuantityText}>
                                    אפס ל־100 גרם
                                  </Text>
                                </Pressable>
                                <Text style={styles.quantityLabel}>
                                  כמות לעריכה
                                </Text>
                                {editingMealId === meal.id ? (
                                  <Pressable
                                    onPress={() =>
                                      removeMealFood(meal.id, food.id)
                                    }
                                    disabled={meal.foods.length <= 1}
                                    style={styles.removeFoodButton}
                                  >
                                    <Text style={styles.removeFoodText}>
                                      הסר
                                    </Text>
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
                                  const numericQuantity = food.quantity.match(/^\\s*([0-9]+(?:\\.[0-9]+)?)/)?.[1] ?? "100";
                                  setQuantityDraft(numericQuantity);
                                  setEditingQuantityKey(quantityEditKey);
                                }
                                if (!quantityEditOpen && swapOpen) {
                                  setActiveSwapKey(null);
                                }
                              }}
                              accessibilityRole="button"
                              accessibilityLabel={
                                quantityEditOpen
                                  ? "סגור עריכת כמות"
                                  : "ערוך כמות"
                              }
                              style={[
                                styles.quantityEditButton,
                                macroGroup === "חלבון" &&
                                  styles.quantityEditProtein,
                                macroGroup === "פחמימה" &&
                                  styles.quantityEditCarb,
                                macroGroup === "שומן" && styles.quantityEditFat,
                                quantityEditOpen &&
                                  styles.quantityEditButtonActive,
                              ]}
                            >
                              <View
                                style={styles.quantityEditButtonContent}
                                accessible
                                accessibilityLabel={`קבוצת מזון: ${macroGroup}`}
                              >
                                <IconSymbol
                                  name={macroIcon}
                                  size={14}
                                  color={
                                    quantityEditOpen
                                      ? "#07131F"
                                      : macroGroup === "חלבון"
                                        ? "#5B9FE3"
                                        : macroGroup === "פחמימה"
                                          ? "#65BDF6"
                                          : "#5B9FE3"
                                  }
                                />
                                <Text
                                  style={[
                                    styles.quantityEditButtonText,
                                    macroGroup === "חלבון" &&
                                      styles.quantityEditProteinText,
                                    macroGroup === "פחמימה" &&
                                      styles.quantityEditCarbText,
                                    macroGroup === "שומן" &&
                                      styles.quantityEditFatText,
                                    quantityEditOpen &&
                                      styles.quantityEditButtonTextActive,
                                  ]}
                                >
                                  {quantityEditOpen
                                    ? "סגור עריכת כמות"
                                    : "ערוך כמות"}
                                </Text>
                              </View>
                            </Pressable>
                          ) : null}
                          {source ? (
                            <>
                              <Pressable
                                onPress={() =>
                                  swapOpen
                                    ? setActiveSwapKey(null)
                                    : openSwap(meal.id, food.id, source.group)
                                }
                                style={[
                                  styles.openSwapButton,
                                  swapOpen && styles.openSwapButtonActive,
                                ]}
                              >
                                <Text style={styles.openSwapText}>
                                  {swapOpen
                                    ? "סגור החלפת מזון"
                                    : `החלף ${source.group}`}
                                </Text>
                              </Pressable>
                              {swapOpen ? (
                                <View style={styles.swapArea}>
                                  <Text style={styles.swapLabel}>
                                    החלפת {food.name} · בחר חלופה מאותה קבוצת
                                    מאקרו
                                  </Text>
                                  <View style={styles.swapCategoryRow}>
                                    {(
                                      [
                                        "חלבון",
                                        "פחמימה",
                                        "שומן",
                                      ] as ConversionGroup[]
                                    ).map((group) => (
                                      <Pressable
                                        key={group}
                                        onPress={() => setSwapGroup(group)}
                                        disabled={group !== source.group}
                                        style={[
                                          styles.swapCategoryButton,
                                          swapGroup === group &&
                                            styles.swapCategoryButtonActive,
                                          group !== source.group &&
                                            styles.disabledAction,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.swapCategoryText,
                                            swapGroup === group &&
                                              styles.swapCategoryTextActive,
                                          ]}
                                        >
                                          {group}
                                        </Text>
                                      </Pressable>
                                    ))}
                                  </View>
                                  <TextInput
                                    value={conversionSearch}
                                    onChangeText={setConversionSearch}
                                    placeholder={`חפש ${source.group} להחלפה`}
                                    placeholderTextColor="#7E8DA4"
                                    style={styles.conversionSearch}
                                    returnKeyType="done"
                                  />
                                  {swapTargets
                                    .slice(
                                      0,
                                      expandedFoodId === food.id ||
                                        conversionSearch.trim()
                                        ? swapTargets.length
                                        : 4,
                                    )
                                    .map((target) => (
                                      <View
                                        key={target.id}
                                        style={styles.swapChoice}
                                      >
                                        <Pressable
                                          onPress={() =>
                                            chooseSwap(
                                              mealIndex,
                                              foodIndex,
                                              target,
                                            )
                                          }
                                          style={({ pressed }) => [
                                            styles.swapButton,
                                            pressed && styles.swapButtonPressed,
                                          ]}
                                        >
                                          <Text style={styles.swapText}>
                                            {target.name}
                                          </Text>
                                          <Text style={styles.swapQuantityHint}>
                                            המרה לפי {source.group} · כמות חדשה
                                            תוצג לפני אישור
                                          </Text>
                                        </Pressable>
                                        <Animated.View
                                          style={{
                                            transform: [
                                              {
                                                scale:
                                                  animatedFavoriteId ===
                                                  target.id
                                                    ? favoriteScale
                                                    : 1,
                                              },
                                            ],
                                          }}
                                        >
                                          <Pressable
                                            onPress={() =>
                                              toggleConversionFavorite(
                                                target.id,
                                              )
                                            }
                                            style={styles.swapFavoriteButton}
                                          >
                                            <Text
                                              style={styles.swapFavoriteText}
                                            >
                                              {favoriteConversionIds.includes(
                                                target.id,
                                              )
                                                ? "★"
                                                : "☆"}
                                            </Text>
                                          </Pressable>
                                        </Animated.View>
                                      </View>
                                    ))}
                                  {conversionSearch.trim() &&
                                  swapTargets.length === 0 ? (
                                    <Text style={styles.noSwapResults}>
                                      לא נמצאו חלופות בשם הזה בקבוצת{" "}
                                      {source.group}.
                                    </Text>
                                  ) : null}
                                  {!conversionSearch.trim() &&
                                  swapTargets.length > 4 ? (
                                    <Pressable
                                      onPress={() =>
                                        setExpandedFoodId(
                                          expandedFoodId === food.id
                                            ? null
                                            : food.id,
                                        )
                                      }
                                      style={styles.moreSwapButton}
                                    >
                                      <Text style={styles.moreSwapText}>
                                        {expandedFoodId === food.id
                                          ? "הצג פחות"
                                          : `הצג עוד ${swapTargets.length - 4}`}
                                      </Text>
                                    </Pressable>
                                  ) : null}
                                  {foodPending ? (
                                    <View style={styles.localConversionPreview}>
                                      <Text style={styles.localConversionTitle}>
                                        המרה מוכנה לבדיקה
                                      </Text>
                                      <Text style={styles.localConversionLine}>
                                        מקור: {pending.sourceQuantity}{" "}
                                        {pending.sourceName}
                                      </Text>
                                      <Text style={styles.localConversionLine}>
                                        חלופה: {pending.result.grams} גרם{" "}
                                        {pending.target.name}
                                      </Text>
                                      <Text
                                        style={styles.localConversionDetail}
                                      >
                                        נשמר בעיקר: {pending.result.preserved} ·{" "}
                                        {pending.result.calories} קק״ל · חלבון{" "}
                                        {pending.result.protein} · פחמימות{" "}
                                        {pending.result.carbohydrates} · שומן{" "}
                                        {pending.result.fats}
                                      </Text>
                                      <View
                                        style={styles.localConversionActions}
                                      >
                                        <Pressable
                                          onPress={() => setPending(null)}
                                          style={styles.cancel}
                                        >
                                          <Text style={styles.cancelText}>
                                            ביטול
                                          </Text>
                                        </Pressable>
                                        <Pressable
                                          onPress={confirmSwap}
                                          style={styles.confirm}
                                        >
                                          <Text style={styles.confirmText}>
                                            אישור החלפה
                                          </Text>
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
                  <View style={styles.addFoodRow}><Text style={styles.addFoodRowTitle}>הוסף רכיב</Text>{(["חלבון", "פחמימה", "שומן"] as FoodGroup[]).map((group) => <Pressable key={group} accessibilityRole="button" accessibilityState={{ selected: selectedAddFoodKey === `${meal.id}:${group}` }} accessibilityLabel={`פתח תפריט ${group} להוספה ל${meal.title}`} android_ripple={{ color: "rgba(245,183,44,0.22)" }} onPressIn={() => setPressedAddFoodGroup(group)} onPressOut={() => setPressedAddFoodGroup(null)} onPress={() => { openMealFoodGroup(meal, group); setRebalanceMessage(`נפתחה בחירת ${group} ב${meal.title}. בחר פריט מהרשימה.`); }} style={({ pressed }) => { const isSelected = selectedAddFoodKey === `${meal.id}:${group}`; const selectedColor = group === "חלבון" ? "#F7F9FC" : group === "פחמימה" ? "#1687C4" : "#D99B16"; const selectedBorder = group === "חלבון" ? "#FFFFFF" : group === "פחמימה" ? "#8ED8FF" : "#FFE58A"; return [styles.addFoodGroupButton, group === "חלבון" && styles.addFoodProtein, group === "פחמימה" && styles.addFoodCarb, group === "שומן" && styles.addFoodFat, group === pressedAddFoodGroup && styles.addFoodGroupButtonPressed, pressed && styles.addFoodGroupButtonPressed, isSelected && { backgroundColor: selectedColor, borderColor: selectedBorder, borderWidth: 3, opacity: 1, transform: [{ scale: 1.02 }], shadowColor: selectedBorder, shadowOpacity: 0.8, shadowRadius: 10, elevation: 8 }, pressed && { backgroundColor: selectedColor, borderColor: selectedBorder, borderWidth: 3, opacity: 1, transform: [{ scale: 0.97 }], shadowColor: selectedBorder, shadowOpacity: 0.65, shadowRadius: 7, elevation: 6 }]; }}><Text style={[styles.addFoodGroupText, selectedAddFoodKey === `${meal.id}:${group}` && styles.addFoodGroupTextActive]}>{selectedAddFoodKey === `${meal.id}:${group}` ? "✓" : "＋"} {group}</Text></Pressable>)}{addFoodGroupFilter && editingMealId === meal.id ? <View style={styles.addFoodFeedback}><Text style={styles.addFoodFeedbackIcon}>✓</Text><Text style={styles.addFoodFeedbackText}>נבחרה קבוצת {addFoodGroupFilter} ב{meal.title} — החיפוש פתוח, בחר מזון להוספה</Text></View> : null}</View>
                  {editingMealId === meal.id ? (
                    <>
                      <TextInput
                        value={meal.title}
                        onChangeText={(value) =>
                          updateMealTitle(meal.id, value)
                        }
                        placeholder="שם הארוחה"
                        placeholderTextColor="#7E8DA4"
                        style={styles.mealTitleInput}
                        textAlign="right"
                      />
                      <Pressable
                        onPress={saveMealEdit}
                        style={styles.mealSaveButton}
                      >
                        <Text style={styles.mealSaveText}>שמור ארוחה</Text>
                      </Pressable>
                      <Pressable
                        onPress={cancelMealEdit}
                        style={styles.mealCancelButton}
                      >
                        <Text style={styles.mealCancelText}>בטל</Text>
                      </Pressable>
                      {addFoodGroupFilter ? <Text style={styles.quickSearchLabel}>חיפוש מהיר · {addFoodGroupFilter}</Text> : null}
                      <TextInput
                        value={mealFoodSearch}
                        onChangeText={setMealFoodSearch}
                        autoFocus={Boolean(addFoodGroupFilter)}
                        accessibilityLabel={addFoodGroupFilter ? `חיפוש מהיר של ${addFoodGroupFilter}` : "חיפוש מזון להוספה"}
                        placeholder={addFoodGroupFilter ? `חפש ${addFoodGroupFilter} להוספה...` : "חפש מזון להוספה"}
                        placeholderTextColor="#7E8DA4"
                        style={styles.mealFoodSearch}
                        textAlign="right"
                      />
                      {mealFoodSearch.trim() || addFoodGroupFilter ? (
                        <View style={styles.mealFoodResults}>
                          {filteredMealFoods.map((item) => (
                            <Pressable
                              key={item.id}
                              onPress={() => addFoodToMeal(meal.id, item)}
                              style={({ pressed }) => [styles.mealFoodResult, selectedMealFoodKey === `${meal.id}:${item.id}` && styles.mealFoodResultSelected, pressed && styles.mealFoodResultPressed]}
                              accessibilityRole="button"
                              accessibilityState={{ selected: selectedMealFoodKey === `${meal.id}:${item.id}` }}
                            >
                              <View style={styles.mealFoodResultHeader}>
                                <Text style={[styles.mealFoodResultName, selectedMealFoodKey === `${meal.id}:${item.id}` && styles.mealFoodResultNameSelected]}>
                                  {selectedMealFoodKey === `${meal.id}:${item.id}` ? "✓ " : "＋ "}{item.name}
                                </Text>
                                {selectedMealFoodKey === `${meal.id}:${item.id}` ? <Text style={styles.mealFoodResultConfirm}>נוסף</Text> : null}
                              </View>
                              <Text style={styles.mealFoodResultMeta}>
                                {item.group} · בסיס חישוב 100 ג׳
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <Pressable
                      onPress={() => beginMealEdit(meal)}
                      style={styles.mealEditButton}
                    >
                      <Text style={styles.mealEditText}>ערוך ארוחה</Text>
                    </Pressable>
                  )}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`המרת ${meal.title}`} onPress={() => openMealConversion(meal)} style={({ pressed }) => [styles.mealConversionBanner, pressed && styles.mealConversionPressed]}><Text style={styles.mealConversionTitle}>המרת ארוחה</Text><Text style={styles.mealConversionSubtitle}>חלבון · פחמימה · שומן · חישוב לפי 100 ג׳</Text><Text style={styles.mealConversionArrow}>פתח ›</Text></Pressable>
              </View>
            );
          })}
        </Animated.View>
        <Modal visible={Boolean(mealConversionId)} animationType="slide" transparent onRequestClose={() => setMealConversionId(null)}><View style={styles.mealConversionBackdrop}><View style={styles.mealConversionModal}><View style={styles.mealConversionHeader}><View><Text style={styles.mealConversionModalTitle}>המרת ארוחה</Text><Text style={styles.mealConversionModalHint}>בחר רכיב חלופי בכל קבוצת מאקרו</Text></View><Pressable accessibilityRole="button" accessibilityLabel="סגור המרת ארוחה" onPress={() => setMealConversionId(null)} style={styles.mealConversionClose}><Text style={styles.mealConversionCloseText}>×</Text></Pressable></View>{(['חלבון', 'פחמימה', 'שומן'] as ConversionGroup[]).map((group) => <View key={group} style={styles.mealConversionGroup}><Text style={styles.mealConversionGroupTitle}>{group}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mealConversionChoices}><Pressable key={`none-${group}`} onPress={() => setMealConversionSelection((current) => ({ ...current, [group]: null }))} style={[styles.mealConversionChoice, !mealConversionSelection[group] && styles.mealConversionChoiceActive]}><Text style={[styles.mealConversionChoiceText, !mealConversionSelection[group] && styles.mealConversionChoiceTextActive]}>ללא</Text><Text style={styles.mealConversionChoiceMeta}>ללא רכיב</Text></Pressable>{mealConversionFoods.filter((food) => food.group === group).map((food) => <Pressable key={food.id} onPress={() => setMealConversionSelection((current) => ({ ...current, [group]: food }))} style={[styles.mealConversionChoice, mealConversionSelection[group]?.id === food.id && styles.mealConversionChoiceActive]}><Text style={[styles.mealConversionChoiceText, mealConversionSelection[group]?.id === food.id && styles.mealConversionChoiceTextActive]}>{food.name}</Text><Text style={styles.mealConversionChoiceMeta}>{food.calories} קק״ל · 100 ג׳</Text></Pressable>)}</ScrollView>{mealConversionSelection[group] ? <Text style={styles.mealConversionSelected}>נבחר: {mealConversionSelection[group]?.name} · החישוב יתאים את הכמות לערך המרכזי של הקבוצה</Text> : <Text style={styles.mealConversionSelected}>לא נבחר רכיב בקבוצה זו</Text>}</View>)}<View style={styles.mealConversionActions}><Pressable onPress={() => setMealConversionId(null)} style={styles.mealConversionCancel}><Text style={styles.mealConversionCancelText}>ביטול</Text></Pressable><Pressable onPress={applyMealConversion} style={styles.mealConversionApply}><Text style={styles.mealConversionApplyText}>החל והצג ערכים</Text></Pressable></View></View></View></Modal>
        {viewMode === "eaten" && displayedTotals.calories === 0 ? (
          <Text style={styles.emptyEaten}>עדיין לא סומן מזון כנאכל היום.</Text>
        ) : null}
        <Text style={styles.note}>
          הכמויות המתוכננות מותאמות אוטומטית ליעד הקלורי ולמצב שנבחר במחשבון.
          ניתן לשנות כל מזון או כמות ידנית; ההמרה שומרת על המאקרו המרכזי ככל
          האפשר.
        </Text>
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>
            {viewMode === "planned" ? "תפריט מתוכנן" : "מה שנאכל היום"} · יעד{" "}
            {targetCalories || "—"} קק״ל
          </Text>
          <View style={styles.viewModeRow}>
            <Pressable
              onPress={() => setViewMode("planned")}
              style={[
                styles.viewModeButton,
                viewMode === "planned" && styles.viewModeButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.viewModeText,
                  viewMode === "planned" && styles.viewModeTextActive,
                ]}
              >
                תפריט מתוכנן
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode("eaten")}
              style={[
                styles.viewModeButton,
                viewMode === "eaten" && styles.viewModeButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.viewModeText,
                  viewMode === "eaten" && styles.viewModeTextActive,
                ]}
              >
                נאכל היום
              </Text>
            </Pressable>
          </View>
          <View style={styles.summaryGrid}>
            <Stat
              label="מוצג · קלוריות"
              value={`${Math.round(displayedTotals.calories)}`}
            />
            <Stat
              label="מוצג · חלבון"
              value={`${Math.round(displayedTotals.protein)} ג׳`}
            />
            <Stat
              label="מוצג · פחמימות"
              value={`${Math.round(displayedTotals.carbohydrates)} ג׳`}
            />
            <Stat
              label="מוצג · שומן"
              value={`${Math.round(displayedTotals.fats)} ג׳`}
            />
          </View>
          <View style={styles.summaryActions}>
            <Pressable
              disabled={pdfBusy || shareBusy || Boolean(favoriteBusy)}
              onPress={exportPdf}
              style={({ pressed }) => [
                styles.pdfButton,
                (pdfBusy || shareBusy || favoriteBusy) && styles.busyButton,
                pressed && styles.swapButtonPressed,
              ]}
            >
              {pdfBusy ? (
                <ActivityIndicator color="#0B1224" size="small" />
              ) : (
                <Text style={styles.pdfText}>ייצא ושתף PDF</Text>
              )}
            </Pressable>
            <Pressable
              disabled={shareBusy || Boolean(favoriteBusy)}
              onPress={shareMealPlan}
              style={({ pressed }) => [
                styles.shareButton,
                (shareBusy || favoriteBusy) && styles.busyButton,
                pressed && styles.swapButtonPressed,
              ]}
            >
              {shareBusy ? (
                <ActivityIndicator color="#0B1224" size="small" />
              ) : (
                <Text style={styles.shareText}>שתף תפריט</Text>
              )}
            </Pressable>
            <Pressable
              disabled={Boolean(favoriteBusy)}
              onPress={saveFavorite}
              style={({ pressed }) => [
                styles.favoriteButton,
                favoriteBusy && styles.busyButton,
                pressed && styles.swapButtonPressed,
              ]}
            >
              {favoriteBusy === "save" ? (
                <ActivityIndicator color="#0B1224" size="small" />
              ) : (
                <Text style={styles.favoriteText}>שמור כתפריט מועדף</Text>
              )}
            </Pressable>
            {hasFavorite && (
              <Pressable
                disabled={Boolean(favoriteBusy)}
                onPress={loadFavorite}
                style={({ pressed }) => [
                  styles.loadFavoriteButton,
                  favoriteBusy && styles.busyButton,
                  pressed && styles.swapButtonPressed,
                ]}
              >
                {favoriteBusy === "load" ? (
                  <ActivityIndicator color="#B8CBE0" size="small" />
                ) : (
                  <Text style={styles.loadFavoriteText}>טען תפריט מועדף</Text>
                )}
              </Pressable>
            )}
            <Pressable
              onPress={rebalanceToTarget}
              style={({ pressed }) => [
                styles.rebalanceButton,
                pressed && styles.swapButtonPressed,
              ]}
            >
              <Text style={styles.rebalanceText}>התאם מחדש ליעד</Text>
            </Pressable>
            <Pressable
              onPress={resetToOriginal}
              style={({ pressed }) => [
                styles.resetButton,
                pressed && styles.swapButtonPressed,
              ]}
            >
              <Text style={styles.resetText}>איפוס לתפריט המקורי</Text>
            </Pressable>
          </View>
          {favoriteStatus ? (
            <View
              style={[
                styles.favoriteStatus,
                favoriteStatus.type === "error" && styles.favoriteStatusError,
              ]}
            >
              <Text style={styles.favoriteStatusIcon}>
                {favoriteStatus.type === "success" ? "✓" : "!"}
              </Text>
              <Text style={styles.favoriteStatusText}>
                {favoriteStatus.message}
              </Text>
            </View>
          ) : null}
          {shareStatus ? (
            <View
              style={[
                styles.shareStatus,
                shareStatus.type === "error" && styles.favoriteStatusError,
              ]}
            >
              <Text style={styles.favoriteStatusIcon}>
                {shareStatus.type === "success" ? "✓" : "!"}
              </Text>
              <Text style={styles.favoriteStatusText}>
                {shareStatus.message}
              </Text>
            </View>
          ) : null}
          {rebalanceMessage ? (
            <Text style={styles.rebalanceMessage}>{rebalanceMessage}</Text>
          ) : null}
        </View>
        <View style={styles.chart}>
          <Text style={styles.chartTitle}>צריכה יומית מול יעד</Text>
          <ProgressBar
            label="קלוריות"
            value={displayedTotals.calories}
            target={targets.calories}
            color="#5B9FE3"
            unit="קק״ל"
          />
          <ProgressBar
            label="חלבון"
            value={displayedTotals.protein}
            target={targets.protein}
            color="#F7F9FC"
            unit="ג׳"
          />
          <ProgressBar
            label="פחמימות"
            value={displayedTotals.carbohydrates}
            target={targets.carbohydrates}
            color="#B87955"
            unit="ג׳"
          />
          <ProgressBar
            label="שומן"
            value={displayedTotals.fats}
            target={targets.fats}
            color="#FFD54A"
            unit="ג׳"
          />
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
    ...Array.from(
      { length: daysInMonth },
      (_, index) => `${monthKey}-${String(index + 1).padStart(2, "0")}`,
    ),
  ];
}
function shiftMonthKey(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}
function shiftDateKey(dateKey: string, offset: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return todayKey(date);
}
function formatDateLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
function foodMacroLabel(
  name: string,
  protein: number,
  carbohydrates: number,
  fats: number,
): ConversionGroup {
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
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}
function buildMealPlanHtml(
  goal: MenuProfile["goal"],
  profile: MenuProfile,
  targetCalories: number,
  meals: Meal[],
  userName: string,
  bodyWeight: string,
) {
  const mealsHtml = meals
    .map(
      (meal, index) =>
        `<section class="meal"><div class="meal-head"><strong>ארוחה ${index + 1} — ${escapeHtml(meal.title)}</strong><span>${Math.round(mealTotals(meal).calories)} קק״ל</span></div>${meal.foods.map((food) => `<div class="food"><span>${escapeHtml(food.name)}</span><span>${escapeHtml(food.quantity)}</span></div>`).join("")}</section>`,
    )
    .join("");
  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>@page{size:A4;margin:28px}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#16233A;background:#fff;direction:rtl}h1{color:#10243A;margin:0 0 6px;font-size:26px}.subtitle{color:#53657C;margin-bottom:16px}.identity{display:flex;align-items:center;gap:12px;background:#10243A;color:#fff;border-radius:14px;padding:14px;margin-bottom:16px}.logo{width:46px;height:46px;border-radius:13px;background:#5B9FE3;color:#10243A;display:flex;align-items:center;justify-content:center;font-size:25px;font-weight:900}.identity-info{flex:1}.identity-name{font-size:17px;font-weight:700}.identity-meta{font-size:11px;color:#D2DFEF;margin-top:4px}.targets{display:flex;gap:8px;margin-bottom:18px}.target{flex:1;background:#EAF4FF;border:1px solid #9BC8E8;border-radius:10px;padding:9px;text-align:center}.target b{display:block;color:#10243A;font-size:16px}.target span{font-size:10px;color:#53657C}.meal{border:1px solid #C8D5E3;border-radius:11px;padding:11px;margin-bottom:10px;page-break-inside:avoid}.meal-head{display:flex;justify-content:space-between;color:#10243A;border-bottom:1px solid #DCE5EE;padding-bottom:7px;margin-bottom:4px}.meal-head span{color:#8A6B20}.food{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #EEF2F6;font-size:12px}.food:last-child{border-bottom:0}</style></head><body><div class="identity"><div class="logo">W</div><div class="identity-info"><div class="identity-name">${escapeHtml(userName.trim() || "משתמש")}</div><div class="identity-meta">${bodyWeight.trim() ? `משקל: ${escapeHtml(bodyWeight.trim())} ק״ג · ` : ""}תפריט ${meals.length} ארוחות · מצב ${escapeHtml(mealPlanGoalLabel(goal))}</div></div></div><h1>תפריט ${meals.length} ארוחות</h1><div class="subtitle">מצב: ${escapeHtml(mealPlanGoalLabel(goal))} · יעד יומי: ${targetCalories || "לא הוגדר"} קק״ל</div><div class="targets"><div class="target"><b>${escapeHtml(profile.protein || "—")} ג׳</b><span>חלבון</span></div><div class="target"><b>${escapeHtml(profile.carbohydrates || "—")} ג׳</b><span>פחמימות</span></div><div class="target"><b>${escapeHtml(profile.fats || "—")} ג׳</b><span>שומן</span></div></div>${mealsHtml}</body></html>`;
}
function ProfileField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.profileField}>
      <Text style={styles.profileLabel}>{label}</Text>
      <View style={styles.profileInputRow}>
        <TextInput
          value={value}
          onChangeText={(nextValue) =>
            onChange(nextValue.replace(/[^0-9.]/g, ""))
          }
          keyboardType="numeric"
          style={styles.profileInput}
        />
        {value ? (
          <Pressable
            onPress={() => onChange("")}
            accessibilityRole="button"
            accessibilityLabel={`נקה ${label}`}
            style={styles.clearProfileFieldButton}
          >
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
function ProgressBar({
  label,
  value,
  target,
  color,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  unit: string;
}) {
  const ratio = target > 0 ? Math.min(value / target, 1) : 0;
  const percent = target > 0 ? Math.round((value / target) * 100) : 0;
  return (
    <View style={styles.progress}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressValue}>
          {Math.round(value)} / {Math.round(target)} {unit} · {percent}%
        </Text>
        <Text style={styles.progressLabel}>{label}</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.round(ratio * 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}
function MacroDistributionCard({
  distribution,
}: {
  distribution: MacroDistribution;
}) {
  const items = [
    {
      label: "חלבון",
      percent: distribution.proteinPercent,
      grams: distribution.proteinGrams,
      calories: distribution.proteinCalories,
      color: "#F7F9FC",
      style: styles.macroProtein,
    },
    {
      label: "פחמימות",
      percent: distribution.carbohydratesPercent,
      grams: distribution.carbohydratesGrams,
      calories: distribution.carbohydratesCalories,
      color: "#5B9FE3",
      style: styles.macroCarb,
    },
    {
      label: "שומן",
      percent: distribution.fatsPercent,
      grams: distribution.fatsGrams,
      calories: distribution.fatsCalories,
      color: "#F5B72C",
      style: styles.macroFat,
    },
  ];
  return (
    <View style={styles.macroDistribution}>
      <Text style={styles.chartTitle}>התפלגות אבות המזון · התפריט היומי</Text>
      <Text style={styles.macroDistributionSubtitle}>
        {distribution.totalCalories
          ? `${Math.round(distribution.totalCalories)} קק״ל ממאקרו`
          : "הזן כמויות כדי לראות התפלגות"}
      </Text>
      <View style={styles.macroStack}>
        {items.map((item) => (
          <View
            key={item.label}
            style={[
              styles.macroSegment,
              { flex: item.percent || 0.001, backgroundColor: item.color },
            ]}
          />
        ))}
      </View>
      <View style={styles.macroLegend}>
        {items.map((item) => (
          <View key={item.label} style={styles.macroLegendItem}>
            <View style={[styles.macroDot, { backgroundColor: item.color }]} />
            <View style={styles.macroLegendText}>
              <Text style={styles.macroLegendLabel}>
                {item.label} · {item.percent}%
              </Text>
              <Text style={styles.macroLegendValues}>
                {Math.round(item.grams)} ג׳ · {Math.round(item.calories)} קק״ל
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
const nutritionEditStyles = StyleSheet.create({
  openButton: { alignSelf: "flex-end", borderColor: "#5B9FE3", borderWidth: 1, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8, marginTop: 8 },
  openButtonActive: { backgroundColor: "#5B9FE3" },
  openButtonText: { color: "#8FD3F4", fontSize: 11, fontWeight: "900", writingDirection: "rtl" },
  openButtonTextActive: { color: "#07131F" },
  panel: { backgroundColor: "#10243A", borderColor: "#5B9FE3", borderWidth: 1, borderRadius: 12, padding: 11, gap: 9, marginTop: 9 },
  title: { color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  hint: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right", writingDirection: "rtl" },
  fields: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
  field: { width: "47%", gap: 4 },
  label: { color: "#8FD3F4", fontSize: 10, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  input: { minHeight: 40, backgroundColor: "#0B1224", borderColor: "#3F76A7", borderWidth: 1, borderRadius: 8, color: "#F7F9FC", paddingHorizontal: 9, textAlign: "center", writingDirection: "ltr" },
  actions: { flexDirection: "row-reverse", gap: 7 },
  saveButton: { flex: 1, minHeight: 42, backgroundColor: "#F5B72C", borderRadius: 9, alignItems: "center", justifyContent: "center" },
  saveText: { color: "#0B1224", fontSize: 11, fontWeight: "900", writingDirection: "rtl" },
  restoreButton: { flex: 1, minHeight: 42, borderColor: "#5B9FE3", borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  restoreText: { color: "#D9EEFF", fontSize: 11, fontWeight: "900", writingDirection: "rtl" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
const styles = StyleSheet.create({
  mealPlanScroll: { flex: 1, minHeight: 0 },
  content: {
    flexGrow: 1,
    minHeight: 1,
    gap: 13,
    paddingBottom: 320,
    writingDirection: "rtl",
  },
  header: { alignItems: "flex-end" },
  eyebrow: { color: "#5B9FE3", fontSize: 13, fontWeight: "800" },
  title: { color: "#F7F9FC", fontSize: 30, fontWeight: "900" },
  subtitle: { color: "#AAB7C8", fontSize: 13, marginTop: 5 },
  scrollTestButton: { alignSelf: "stretch", minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: "#F5B72C", alignItems: "center", justifyContent: "center", marginTop: 8 },
  scrollTestButtonText: { color: "#F5B72C", fontSize: 14, fontWeight: "900", writingDirection: "rtl" },
  menuButton: {
    backgroundColor: "#253653",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginBottom: 8,
  },
  menuText: { color: "#5B9FE3", fontWeight: "900", fontSize: 11 },
  datePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    marginTop: 10,
    backgroundColor: "#13233D",
    borderColor: "#3F76A7",
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dateCenter: { alignItems: "center", gap: 2, flex: 1 },
  calendarBackdrop: {
    flex: 1,
    backgroundColor: "rgba(5, 12, 28, 0.78)",
    justifyContent: "center",
    padding: 20,
  },
  calendarModal: {
    backgroundColor: "#16233A",
    borderColor: "#3F76A7",
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    gap: 12,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "900" },
  calendarNav: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#253653",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarNavText: {
    color: "#5B9FE3",
    fontSize: 26,
    lineHeight: 29,
    fontWeight: "900",
  },
  weekdayRow: { flexDirection: "row-reverse" },
  weekday: {
    flex: 1,
    color: "#AAB7C8",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  calendarGrid: { flexDirection: "row-reverse", flexWrap: "wrap" },
  calendarCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDaySelected: { backgroundColor: "#65BDF6" },
  calendarDayDisabled: { opacity: 0.35 },
  calendarDayText: { color: "#F7F9FC", fontSize: 11, fontWeight: "800" },
  calendarDayTextSelected: { color: "#0B1224" },
  calendarDayTextDisabled: { color: "#7E8DA4" },
  calendarDataDot: {
    position: "absolute",
    bottom: 1,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#5B9FE3",
  },
  calendarActions: { flexDirection: "row-reverse", gap: 8 },
  calendarCancel: {
    flex: 1,
    borderColor: "#6C8C87",
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: "center",
  },
  calendarCancelText: { color: "#D9E2EF", fontWeight: "800", fontSize: 11 },
  calendarConfirm: {
    flex: 1,
    backgroundColor: "#5B9FE3",
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: "center",
  },
  calendarConfirmText: { color: "#0B1224", fontWeight: "900", fontSize: 11 },
  dateButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#253653",
    alignItems: "center",
    justifyContent: "center",
  },
  dateButtonDisabled: { opacity: 0.35 },
  dateButtonText: {
    color: "#5B9FE3",
    fontSize: 25,
    lineHeight: 28,
    fontWeight: "900",
  },
  dateLabel: { color: "#F7F9FC", fontSize: 13, fontWeight: "900" },
  dateHint: { color: "#AAB7C8", fontSize: 9 },
  profileEditor: {
    backgroundColor: "#16233A",
    borderColor: "#8A6B20",
    borderWidth: 1,
    borderRadius: 17,
    padding: 14,
    gap: 10,
  },
  profileTitle: {
    color: "#F7F9FC",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
  },
  profileHint: { color: "#B8CBE0", fontSize: 10, textAlign: "right" },
  goalRow: { flexDirection: "row-reverse", gap: 7 },
  goalButton: {
    flex: 1,
    borderColor: "#8A6B20",
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: "center",
  },
  goalButtonActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C", shadowColor: "#F5B72C", shadowOpacity: 0.22, shadowRadius: 8, elevation: 3 },
  goalText: { color: "#B8CBE0", fontWeight: "800", fontSize: 11 },
  goalTextActive: { color: "#0B1224" },
  profileFields: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between" },
  profileField: { width: "47%", marginBottom: 10, alignItems: "stretch" },
  profileLabel: { color: "#AAB7C8", fontSize: 10, textAlign: "right" },
  profileInputRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "stretch",
  },
  clearProfileFieldButton: {
    borderColor: "#F5B72C",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  clearProfileFieldText: { color: "#F5B72C", fontSize: 10, fontWeight: "900" },
  profileInput: {
    flex: 1,
    minWidth: 0,
    width: "100%",
    backgroundColor: "#0B1224",
    borderColor: "#2C3B55",
    borderWidth: 1,
    borderRadius: 9,
    color: "#F7F9FC",
    padding: 9,
    textAlign: "right",
    writingDirection: "rtl",
    minHeight: 44,
  },
  autoButton: {
    flex: 1,
    borderColor: "#8A6B20",
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: "center",
  },
  autoButtonActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C", shadowColor: "#F5B72C", shadowOpacity: 0.22, shadowRadius: 8, elevation: 3 },
  autoText: { color: "#B8CBE0", fontSize: 10, fontWeight: "800" },
  autoTextActive: { color: "#0B1224" },
  completeButton: {
    backgroundColor: "#203A63",
    borderColor: "#F5B72C",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  completeText: { color: "#F5D27A", fontWeight: "900", fontSize: 11, writingDirection: "rtl" },
  saveProfileButton: {
    width: "100%",
    minHeight: 52,
    backgroundColor: "#F5B72C",
    borderColor: "#F5B72C",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F5B72C",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveProfileText: { color: "#0B1224", fontWeight: "900", fontSize: 14, writingDirection: "rtl" },
  bannerPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  versionComposer: { flexDirection: "row-reverse", gap: 7 },
  versionInput: {
    flex: 1,
    backgroundColor: "#0B1224",
    borderColor: "#2C3B55",
    borderWidth: 1,
    borderRadius: 9,
    color: "#F7F9FC",
    padding: 9,
    textAlign: "right",
    writingDirection: "rtl",
    fontSize: 11,
  },
  versionSaveButton: {
    backgroundColor: "#253653",
    borderColor: "#F5B72C",
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 13,
    justifyContent: "center",
  },
  versionSaveText: { color: "#F5D27A", fontSize: 11, fontWeight: "900" },
  weightBuilder: {
    backgroundColor: "#10243A",
    borderColor: "#2C5A75",
    borderWidth: 1,
    borderRadius: 10,
    padding: 9,
    gap: 6,
  },
  weightRow: { flexDirection: "row-reverse", gap: 7 },
  weightInput: {
    flex: 1,
    backgroundColor: "#0B1224",
    borderColor: "#2C3B55",
    borderWidth: 1,
    borderRadius: 8,
    color: "#F7F9FC",
    padding: 9,
    textAlign: "right",
    writingDirection: "rtl",
    fontSize: 11,
  },
  weightButton: {
    backgroundColor: "#F5B72C",
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  weightButtonText: { color: "#0B1224", fontSize: 10, fontWeight: "900" },
  weightHint: { color: "#8FB1C9", fontSize: 9, textAlign: "right" },
  favoriteVersionButton: {
    backgroundColor: "#F5B72C",
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: "center",
  },
  favoriteVersionText: { color: "#0B1224", fontWeight: "900", fontSize: 11 },
  versionList: { gap: 6 },
  versionItem: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0B1224",
    borderColor: "#8A6B20",
    borderWidth: 1,
    borderRadius: 9,
    padding: 7,
  },
  versionLoadButton: { paddingHorizontal: 7, paddingVertical: 4 },
  versionFavoriteButton: {
    borderColor: "#6C8C87",
    borderWidth: 1,
    borderRadius: 7,
    minWidth: 28,
    paddingVertical: 3,
    alignItems: "center",
  },
  versionFavoriteButtonActive: {
    backgroundColor: "#F5B72C",
    borderColor: "#F5B72C",
  },
  versionFavoriteText: { color: "#AAB7C8", fontSize: 16 },
  versionFavoriteTextActive: { color: "#0B1224" },
  versionName: { color: "#F7F9FC", fontSize: 11, fontWeight: "800" },
  versionLoad: { color: "#F5B72C", fontSize: 10, fontWeight: "900" },
  noVersions: { color: "#7E8DA4", fontSize: 10, textAlign: "right" },
  summary: {
    backgroundColor: "#1C3152",
    borderColor: "#3F76A7",
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    gap: 10,
  },
  viewModeRow: { flexDirection: "row-reverse", gap: 8 },
  viewModeButton: {
    flex: 1,
    borderColor: "#3F76A7",
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 8,
    alignItems: "center",
  },
  viewModeButtonActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
  viewModeText: { color: "#D9EEFF", fontSize: 10, fontWeight: "800" },
  viewModeTextActive: { color: "#0B1224" },
  emptyEaten: {
    color: "#5B9FE3",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
    backgroundColor: "#332C16",
    borderColor: "#5B9FE3",
    borderWidth: 1,
    borderRadius: 9,
    padding: 10,
  },
  summaryTitle: {
    color: "#F7F9FC",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "right",
  },
  summaryGrid: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  summaryActions: { gap: 8 },
  pdfButton: {
    backgroundColor: "#5B9FE3",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  pdfText: { color: "#0B1224", fontWeight: "900", fontSize: 12 },
  shareButton: {
    backgroundColor: "#65BDF6",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  shareText: { color: "#0B1224", fontWeight: "900", fontSize: 12 },
  shareStatus: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D9EEFF",
    borderColor: "#65BDF6",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  favoriteButton: {
    backgroundColor: "#5B9FE3",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  favoriteText: { color: "#0B1224", fontWeight: "900", fontSize: 12 },
  busyButton: { opacity: 0.72 },
  favoriteStatus: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D8F8E9",
    borderColor: "#5B9FE3",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  favoriteStatusError: { backgroundColor: "#3D2028", borderColor: "#F16B7A" },
  favoriteStatusIcon: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: "#5B9FE3",
    color: "#0B1224",
    textAlign: "center",
    lineHeight: 23,
    fontWeight: "900",
  },
  favoriteStatusText: {
    flex: 1,
    color: "#0B1224",
    textAlign: "right",
    fontSize: 11,
    fontWeight: "900",
  },
  loadFavoriteButton: {
    borderColor: "#5B9FE3",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  loadFavoriteText: { color: "#B8CBE0", fontWeight: "800", fontSize: 11 },
  rebalanceButton: {
    backgroundColor: "#5B9FE3",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  rebalanceText: { color: "#0B1224", fontWeight: "900", fontSize: 12 },
  resetButton: {
    borderColor: "#6C8C87",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  resetText: { color: "#D9E2EF", fontWeight: "800", fontSize: 11 },
  rebalanceMessage: {
    color: "#B8CBE0",
    fontSize: 11,
    textAlign: "right",
    fontWeight: "800",
  },
  macroDistribution: {
    backgroundColor: "#11203A",
    borderColor: "#2C3B55",
    borderWidth: 1,
    borderRadius: 15,
    padding: 14,
    gap: 9,
  },
  macroDistributionSubtitle: {
    color: "#AAB7C8",
    fontSize: 10,
    textAlign: "right",
  },
  macroStack: {
    flexDirection: "row-reverse",
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#0B1224",
  },
  macroSegment: { minWidth: 2 },
  macroLegend: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: 7,
  },
  macroLegendItem: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 5,
  },
  macroDot: { width: 9, height: 9, borderRadius: 5, marginTop: 3 },
  macroLegendText: { flex: 1 },
  macroLegendLabel: {
    color: "#F7F9FC",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "right",
  },
  macroLegendValues: {
    color: "#AAB7C8",
    fontSize: 9,
    textAlign: "right",
    marginTop: 2,
  },
  macroProtein: {},
  macroCarb: {},
  macroFat: {},
  waterHistoryCard: {
    backgroundColor: "#16233A",
    borderColor: "#8A6B20",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 7,
    writingDirection: "rtl",
  },
  waterHistoryHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  waterHistoryTitle: { color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  waterHistoryCount: { color: "#F5D27A", fontSize: 9, fontWeight: "800", textAlign: "left", writingDirection: "rtl" },
  waterHistoryEmpty: { color: "#AAB7C8", fontSize: 10, textAlign: "right", writingDirection: "rtl" },
  waterHistoryList: { gap: 5 },
  waterHistoryRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 32,
    backgroundColor: "#0B1224",
    borderColor: "#2C3B55",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  waterHistoryTime: { width: 62, color: "#F7F9FC", fontSize: 11, fontWeight: "900", textAlign: "right", writingDirection: "ltr" },
  waterHistoryAmount: { flex: 1, color: "#F5B72C", fontSize: 11, fontWeight: "900", textAlign: "center", writingDirection: "rtl" },
  waterHistoryCumulative: { color: "#AAB7C8", fontSize: 9, textAlign: "left", writingDirection: "rtl" },
  waterCard: {
    backgroundColor: "#16233A",
    borderColor: "#8A6B20",
    borderWidth: 1,
    borderRadius: 17,
    padding: 14,
    gap: 10,
    writingDirection: "rtl",
  },
  waterHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  waterHeaderCopy: { flex: 1, gap: 3 },
  waterIcon: { color: "#F5B72C", fontSize: 24, fontWeight: "900" },
  waterTitle: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  waterSubtitle: { color: "#AAB7C8", fontSize: 10, textAlign: "right", writingDirection: "rtl" },
  waterStatsRow: { flexDirection: "row-reverse", alignItems: "stretch", justifyContent: "space-between", gap: 8 },
  waterStat: { flex: 1, alignItems: "flex-end", gap: 2 },
  waterStatDivider: { width: 1, backgroundColor: "#8A6B20" },
  waterStatValue: { color: "#F7F9FC", fontSize: 14, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  waterStatValueDone: { color: "#F5B72C" },
  waterStatLabel: { color: "#AAB7C8", fontSize: 9, textAlign: "right" },
  waterProgressHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  waterProgressCaption: { color: "#AAB7C8", fontSize: 10, fontWeight: "800", textAlign: "right", writingDirection: "rtl" },
  waterProgressPercent: { color: "#F5B72C", fontSize: 20, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  waterProgressPercentDone: { color: "#F5B72C" },
  waterProgressTrack: { height: 16, backgroundColor: "#0B1224", borderColor: "#8A6B20", borderWidth: 1, borderRadius: 10, overflow: "hidden", position: "relative" },
  waterProgressFill: { height: "100%", minWidth: 4, backgroundColor: "#F5B72C", borderRadius: 9, overflow: "hidden" },
  waterProgressFillDone: { backgroundColor: "#F5B72C" },
  waterProgressGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: "#FFE69A", opacity: 0.9 },
  waterProgressMarker: { position: "absolute", top: 1, bottom: 1, width: 2, backgroundColor: "#F7F9FC", opacity: 0.9 },
  waterProgressScale: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  waterProgressScaleText: { color: "#B8CBE0", fontSize: 8, textAlign: "right", writingDirection: "rtl" },
  waterRemaining: { color: "#D9E2EF", fontSize: 10, textAlign: "right", writingDirection: "rtl" },
  waterQuickTitle: { color: "#F7F9FC", fontSize: 11, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  waterQuickRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
  waterQuickButton: { flex: 1, minWidth: 72, minHeight: 62, borderRadius: 11, backgroundColor: "#203A63", borderColor: "#8A6B20", borderWidth: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  waterQuickButtonPressed: { backgroundColor: "#F5B72C", borderColor: "#F5B72C", transform: [{ scale: 0.97 }] },
  waterQuickIcon: { color: "#F5B72C", fontSize: 13, fontWeight: "900", lineHeight: 15 },
  waterQuickButtonText: { color: "#D9E2EF", fontSize: 10, fontWeight: "900", writingDirection: "rtl" },
  waterQuickAmount: { color: "#F7F9FC", fontSize: 10, fontWeight: "900", writingDirection: "rtl" },
  waterSettingsRow: { flexDirection: "row-reverse", alignItems: "flex-end", gap: 8 },
  waterResetButton: { borderColor: "#8A6B20", borderWidth: 1, borderRadius: 8, paddingHorizontal: 13, paddingVertical: 9, minHeight: 40, justifyContent: "center" },
  waterResetText: { color: "#F5D27A", fontSize: 10, fontWeight: "800" },
  waterGoalEditor: { flex: 1, gap: 3 },
  waterGoalInput: { minHeight: 40, backgroundColor: "#0B1224", borderColor: "#8A6B20", borderWidth: 1, borderRadius: 8, color: "#F7F9FC", paddingHorizontal: 10, textAlign: "right", writingDirection: "rtl" },
  waterGoalLabel: { color: "#AAB7C8", fontSize: 9, textAlign: "right", writingDirection: "rtl" },
  chart: {
    backgroundColor: "#11203A",
    borderColor: "#2C3B55",
    borderWidth: 1,
    borderRadius: 15,
    padding: 14,
    gap: 10,
  },
  chartTitle: {
    color: "#F7F9FC",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "right",
  },
  progress: { gap: 5 },
  progressHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  progressLabel: { color: "#D9E2EF", fontSize: 10, fontWeight: "800" },
  progressValue: { color: "#AAB7C8", fontSize: 9 },
  track: {
    height: 8,
    backgroundColor: "#0B1224",
    borderRadius: 6,
    overflow: "hidden",
  },
  fill: { height: 8, borderRadius: 6 },
  stickySummary: {
    position: "absolute",
    alignSelf: "flex-end",
    right: 10,
    bottom: 64,
    backgroundColor: "#0B1224",
    borderTopColor: "#2C3B55",
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  stickySummaryCollapsed: { width: 58, borderColor: "#66C7D9", borderWidth: 1, borderRadius: 16, paddingHorizontal: 6, paddingTop: 4, paddingBottom: 4, backgroundColor: "#172943" },
  summaryRevealTab: { position: "absolute", right: 0, width: 24, height: 46, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, backgroundColor: "#172943", borderColor: "#66C7D9", borderWidth: 1, alignItems: "center", justifyContent: "center", zIndex: 50, elevation: 50 },
  summaryRevealText: { color: "#66C7D9", fontSize: 15, fontWeight: "900" },
  summaryDragHandle: { alignSelf: "center", minWidth: 112, minHeight: 44, borderRadius: 14, backgroundColor: "#203A63", borderColor: "#66C7D9", borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 3 },
  summaryDragText: { color: "#8FD3F4", fontSize: 10, fontWeight: "900" },
  summaryHideButton: { alignItems: "center", paddingVertical: 7, marginTop: 4, borderTopColor: "#2C3B55", borderTopWidth: 1 },
  summaryHideText: { color: "#AAB7C8", fontSize: 10, fontWeight: "800" },
  stickySummaryExpanded: { width: 238, borderColor: "#66C7D9", borderWidth: 1, borderRadius: 16, paddingTop: 6, paddingHorizontal: 10, backgroundColor: "#101C31" },
  stickySummaryToggle: {
    minHeight: 44,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  stickySummaryToggleText: {
    color: "#5B9FE3",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
  },
  stickySummaryQuickValue: {
    color: "#D9E2EF",
    fontSize: 9,
    flex: 1,
    textAlign: "right",
    writingDirection: "rtl",
  },
  compactMacroProgressRow: {
    flexDirection: "row-reverse",
    gap: 7,
    paddingBottom: 4,
  },
  compactMacroProgress: { flex: 1, gap: 3 },
  compactMacroProgressAtTarget: {
    backgroundColor: "#2A2413",
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  compactMacroProgressHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compactMacroProgressLabel: {
    fontSize: 9,
    fontWeight: "900",
    textAlign: "right",
  },
  compactMacroProgressValue: {
    color: "#D9E2EF",
    fontSize: 9,
    fontWeight: "900",
  },
  compactMacroProgressValueOver: { color: "#FF6B6B" },
  compactMacroProgressLabelAtTarget: { color: "#6EE7B7" },
  compactMacroProgressValueAtTarget: { color: "#6EE7B7" },
  compactMacroProgressTrack: {
    height: 5,
    backgroundColor: "#1B2942",
    borderRadius: 4,
    overflow: "hidden",
  },
  compactMacroProgressFill: { height: 5, borderRadius: 4 },
  finalNutritionSummary: {
    backgroundColor: "#16233A",
    borderColor: "#5B9FE3",
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    gap: 8,
    marginTop: 12,
  },
  finalNutritionTitle: {
    color: "#F7F9FC",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
  },
  finalNutritionSubtitle: {
    color: "#B8CBE0",
    fontSize: 10,
    textAlign: "right",
  },
  finalNutritionGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  finalNutritionMetric: {
    width: "48%",
    backgroundColor: "#0B1224",
    borderColor: "#2C3B55",
    borderWidth: 1,
    borderRadius: 10,
    padding: 9,
    gap: 5,
  },
  finalNutritionMetricOver: {
    borderColor: "#FF6B6B",
    backgroundColor: "#2A1A28",
  },
  finalNutritionMetricAtTarget: {
    borderColor: "#5B9FE3",
    backgroundColor: "#2A2413",
  },
  finalNutritionMetricHeader: { gap: 3 },
  finalNutritionMetricLabel: {
    fontSize: 11,
    fontWeight: "900",
    textAlign: "right",
  },
  finalNutritionMetricValue: {
    color: "#F7F9FC",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
  },
  finalNutritionMetricValueOver: { color: "#FF6B6B" },
  finalNutritionMetricValueAtTarget: { color: "#6EE7B7" },
  finalNutritionTrack: {
    height: 7,
    backgroundColor: "#0B1224",
    borderRadius: 5,
    overflow: "hidden",
  },
  finalNutritionFill: { height: 7, borderRadius: 5 },
  finalNutritionTarget: {
    color: "#AAB7C8",
    fontSize: 8,
    textAlign: "right",
    lineHeight: 13,
  },
  finalNutritionTargetOver: { color: "#FF9B9B", fontWeight: "800" },
  finalNutritionTargetAtTarget: { color: "#6EE7B7", fontWeight: "900" },
  stat: { alignItems: "flex-end" },
  statValue: { color: "#5B9FE3", fontSize: 18, fontWeight: "900" },
  statLabel: { color: "#AAB7C8", fontSize: 10, marginTop: 3 },
  preview: {
    backgroundColor: "#16233A",
    borderColor: "#5B9FE3",
    borderWidth: 1,
    borderRadius: 15,
    padding: 13,
    gap: 6,
  },
  previewTitle: { color: "#B8CBE0", fontWeight: "900", textAlign: "right" },
  previewText: { color: "#D9E2EF", fontSize: 11, textAlign: "right" },
  previewActions: { flexDirection: "row-reverse", gap: 8, marginTop: 5 },
  confirm: {
    flex: 1,
    minHeight: 48,
    backgroundColor: "#F5B72C",
    borderColor: "#F5B72C",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F5B72C",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmText: { color: "#0B1224", fontWeight: "900", fontSize: 12, writingDirection: "rtl" },
  cancel: {
    flex: 1,
    borderColor: "#6C8C87",
    borderWidth: 1,
    borderRadius: 9,
    padding: 10,
    alignItems: "center",
  },
  cancelText: { color: "#D9E2EF", fontWeight: "800" },
  mealManagement: {
    backgroundColor: "#16233A",
    borderColor: "#8A6B20",
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
    gap: 8,
  },
  mealManagementHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealManagementTitle: { color: "#F7F9FC", fontSize: 13, fontWeight: "900" },
  mealManagementHint: { color: "#B8CBE0", fontSize: 10 },
  addMealButton: {
    width: "100%",
    minHeight: 52,
    backgroundColor: "#F5B72C",
    borderColor: "#F5B72C",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F5B72C",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  addMealButtonText: { color: "#0B1224", fontWeight: "900", fontSize: 13, writingDirection: "rtl" },
  meal: {
    backgroundColor: "#172943",
    borderColor: "#3B587A",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    marginBottom: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  mealActive: {
    borderColor: "#F5B72C",
    shadowColor: "#F5B72C",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  mealHeader: {
    minHeight: 94,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "stretch",
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 6,
    borderRadius: 12,
  },
  mealHeaderActive: { backgroundColor: "#F5B72C" },
  mealHeaderPressed: { backgroundColor: "#F5B72C", opacity: 0.92, transform: [{ scale: 0.99 }] },
  mealToggle: { color: "#8FD3F4", fontSize: 12, fontWeight: "900", writingDirection: "rtl", textAlign: "right" },
  mealToggleActive: { color: "#0B1224" },
  mealFoodEditor: { gap: 12, paddingTop: 4 },
  mealFoodListHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 3,
  },
  mealFoodListTitle: { color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  mealFoodListCount: { color: "#F5D27A", fontSize: 10, fontWeight: "800", textAlign: "left", writingDirection: "rtl" },
  mealSummaryFooter: {
    backgroundColor: "#0B1224",
    borderColor: "#8A6B20",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 7,
    marginTop: 2,
    writingDirection: "rtl",
  },
  mealSummaryTitle: { color: "#F5D27A", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  mealSummaryValues: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: 6 },
  mealSummaryCalories: { color: "#F7F9FC", fontSize: 11, fontWeight: "900", writingDirection: "rtl" },
  mealSummaryProtein: { color: "#F7F9FC", fontSize: 10, fontWeight: "800", writingDirection: "rtl" },
  mealSummaryCarbs: { color: "#5B9FE3", fontSize: 10, fontWeight: "800", writingDirection: "rtl" },
  mealSummaryFats: { color: "#F5B72C", fontSize: 10, fontWeight: "800", writingDirection: "rtl" },
  mealActions: { gap: 8, marginTop: 8, paddingTop: 8, borderTopColor: "#2C4565", borderTopWidth: 1 },
  mealConversionBanner: { minHeight: 58, backgroundColor: "#253653", borderColor: "#5B9FE3", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, marginTop: 4, justifyContent: "center", alignItems: "flex-end", gap: 2 },
  mealConversionPressed: { backgroundColor: "#314A6C", transform: [{ scale: 0.99 }] },
  mealConversionTitle: { color: "#F5D27A", fontSize: 14, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  mealConversionSubtitle: { color: "#D9E2EF", fontSize: 10, textAlign: "right", writingDirection: "rtl" },
  mealConversionArrow: { color: "#8FD3F4", fontSize: 10, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
  mealConversionBackdrop: { flex: 1, backgroundColor: "rgba(5,10,24,0.78)", justifyContent: "flex-end" },
  mealConversionModal: { maxHeight: "86%", backgroundColor: "#16233A", borderColor: "#F5B72C", borderWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, gap: 12 },
  mealConversionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  mealConversionModalTitle: { color: "#F7F9FC", fontSize: 20, fontWeight: "900", textAlign: "right" },
  mealConversionModalHint: { color: "#AAB7C8", fontSize: 10, textAlign: "right", marginTop: 3 },
  mealConversionClose: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#253653", borderColor: "#52759C", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  mealConversionCloseText: { color: "#D9E2EF", fontSize: 24, lineHeight: 25 },
  mealConversionGroup: { backgroundColor: "#101B30", borderColor: "#2C4565", borderWidth: 1, borderRadius: 12, padding: 10, gap: 7 },
  mealConversionGroupTitle: { color: "#F5D27A", fontSize: 13, fontWeight: "900", textAlign: "right" },
  mealConversionChoices: { flexDirection: "row-reverse", gap: 7, paddingVertical: 2 },
  mealConversionChoice: { minWidth: 112, backgroundColor: "#253653", borderColor: "#52759C", borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8, alignItems: "flex-end" },
  mealConversionChoiceActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
  mealConversionChoiceText: { color: "#D9E2EF", fontSize: 10, fontWeight: "900", textAlign: "right" },
  mealConversionChoiceTextActive: { color: "#0B1224" },
  mealConversionChoiceMeta: { color: "#8FD3F4", fontSize: 9, marginTop: 3, textAlign: "right" },
  mealConversionSelected: { color: "#AAB7C8", fontSize: 9, textAlign: "right", lineHeight: 14 },
  mealConversionActions: { flexDirection: "row-reverse", gap: 8, paddingTop: 3 },
  mealConversionCancel: { flex: 1, minHeight: 46, borderColor: "#52759C", borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  mealConversionCancelText: { color: "#D9E2EF", fontSize: 12, fontWeight: "900" },
  mealConversionApply: { flex: 1.4, minHeight: 46, backgroundColor: "#F5B72C", borderColor: "#F5B72C", borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  mealConversionApplyText: { color: "#0B1224", fontSize: 12, fontWeight: "900" },
  mealQuickActions: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
  },
  mealMoveButton: {
    width: 30,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#253653",
    alignItems: "center",
    justifyContent: "center",
  },
  mealMoveText: { color: "#65BDF6", fontSize: 16, fontWeight: "900" },
  deleteMealButton: {
    borderColor: "#8F3C4B",
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "#3B1D2A",
  },
  deleteMealText: { color: "#FB7185", fontSize: 10, fontWeight: "900" },
  disabledAction: { opacity: 0.35 },
  mealTitleInput: {
    backgroundColor: "#0B1224",
    borderColor: "#3D587C",
    borderWidth: 1,
    borderRadius: 9,
    color: "#F7F9FC",
    padding: 9,
    textAlign: "right",
    writingDirection: "rtl",
  },
  mealEditButton: {
    alignSelf: "flex-end",
    borderColor: "#3F76A7",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  mealEditText: { color: "#65BDF6", fontWeight: "900", fontSize: 11 },
  mealSaveButton: {
    backgroundColor: "#5B9FE3",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 9,
  },
  mealSaveText: { color: "#0B1224", fontWeight: "900" },
  mealCancelButton: {
    borderColor: "#7E8DA4",
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 8,
  },
  mealCancelText: { color: "#D9E2EF", fontWeight: "800" },
  addFoodRow: { flexDirection: "row-reverse", alignItems: "center", flexWrap: "wrap", gap: 7, padding: 9, backgroundColor: "#101C31", borderRadius: 10, borderColor: "#2C3B55", borderWidth: 1 }, quickSearchLabel: { color: "#F5B72C", fontSize: 11, fontWeight: "900", textAlign: "right", width: "100%" }, addFoodRowTitle: { width: "100%", color: "#F7F9FC", fontSize: 12, fontWeight: "900", textAlign: "right" }, addFoodGroupButton: { flex: 1, minWidth: 90, borderRadius: 8, paddingVertical: 9, alignItems: "center", borderWidth: 1 },   addFoodProtein: { backgroundColor: "#253653", borderColor: "#D9E2EF" }, addFoodCarb: { backgroundColor: "#17364C", borderColor: "#65BDF6" }, addFoodFat: { backgroundColor: "#403518", borderColor: "#FFD54A" }, addFoodGroupText: { color: "#F7F9FC", fontSize: 11, fontWeight: "900" }, addFoodGroupTextActive: { color: "#07111F" }, addFoodGroupButtonPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] }, addFoodProteinActive: { backgroundColor: "#F7F9FC", borderColor: "#FFFFFF", borderWidth: 2, shadowColor: "#FFFFFF", shadowOpacity: 0.48, shadowRadius: 8, elevation: 5 }, addFoodCarbActive: { backgroundColor: "#1687C4", borderColor: "#8ED8FF", borderWidth: 2, shadowColor: "#65BDF6", shadowOpacity: 0.48, shadowRadius: 8, elevation: 5 }, addFoodFatActive: { backgroundColor: "#D99B16", borderColor: "#FFE58A", borderWidth: 2, shadowColor: "#FFD54A", shadowOpacity: 0.5, shadowRadius: 8, elevation: 5 }, addFoodGroupButtonActive: { borderWidth: 2 },
  addFoodFeedback: { width: "100%", flexDirection: "row-reverse", alignItems: "center", gap: 7, backgroundColor: "#173A36", borderColor: "#42D392", borderWidth: 1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 8 },
  addFoodFeedbackIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#42D392", color: "#07111F", textAlign: "center", lineHeight: 20, fontWeight: "900" },
  addFoodFeedbackText: { flex: 1, color: "#A7F3D0", fontSize: 10, fontWeight: "900", textAlign: "right" }, mealFoodSearch: {
    backgroundColor: "#0B1224",
    borderColor: "#3D587C",
    borderWidth: 1,
    borderRadius: 10,
    color: "#F7F9FC",
    padding: 10,
    textAlign: "right",
    writingDirection: "rtl",
  },
  mealFoodResults: { gap: 6 },
  mealFoodResult: { backgroundColor: "#203252", borderRadius: 9, padding: 9, borderWidth: 1, borderColor: "#365276" },
  mealFoodResultPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  mealFoodResultSelected: { backgroundColor: "#174A3D", borderColor: "#42D392", borderWidth: 2 },
  mealFoodResultHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  mealFoodResultName: {
    flex: 1,
    color: "#F7F9FC",
    fontWeight: "800",
    textAlign: "right",
  },
  mealFoodResultNameSelected: { color: "#A7F3D0" },
  mealFoodResultConfirm: { color: "#42D392", fontSize: 11, fontWeight: "900" },
  mealFoodResultMeta: { color: "#AAB7C8", fontSize: 10, textAlign: "right" },
  removeFoodButton: {
    backgroundColor: "#5C2632",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 4,
  },
  removeFoodText: { color: "#FB7185", fontSize: 10, fontWeight: "900" },
  removeMealFoodButton: { alignSelf: "flex-start", backgroundColor: "#4A1F2B", borderColor: "#F16B7A", borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 8, marginTop: 6 },
  removeMealFoodPressed: { backgroundColor: "#F16B7A", opacity: 0.78, transform: [{ scale: 0.96 }] },
  removeMealFoodText: { color: "#FFD5DB", fontSize: 10, fontWeight: "900" },
  mealTitleRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  breakfastProteinBadge: {
    color: "#5B9FE3",
    fontSize: 11,
    fontWeight: "800",
    borderColor: "#5B9FE3",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  breakfastProteinBadgeActive: { color: "#0B1224", borderColor: "#0B1224" },
  mealTitle: {
    color: "#F7F9FC",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
    writingDirection: "rtl",
  },
  mealTitleActive: { color: "#F7F9FC" },
  mealFoodCountBadge: { backgroundColor: "#2A3E5F", borderColor: "#6F90B9", borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginLeft: 7 },
  mealFoodCountBadgeActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
  mealFoodCountText: { color: "#D7E5F5", fontSize: 11, fontWeight: "900", textAlign: "center" },
  mealFoodCountTextActive: { color: "#101C31" },
  mealTotal: { color: "#8FD3F4", fontSize: 10, fontWeight: "800", textAlign: "right", width: "100%" },
  mealTotalActive: { color: "#0B1224" },
  food: {
    backgroundColor: "#1D3150",
    borderColor: "#3B587A",
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
    gap: 8,
    marginBottom: 2,
  },
  foodSelected: {
    backgroundColor: "#2A2413",
    borderColor: "#5B9FE3",
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 8,
  },
  foodTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: 8,
  },
  foodName: {
    color: "#5B9FE3",
    fontWeight: "900",
    flex: 1,
    textAlign: "right",
  },
  foodMacros: { color: "#BFD2E6", fontSize: 9, textAlign: "right", writingDirection: "rtl", flex: 1 },
  foodMetaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },
  weightInfoButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#65BDF6",
    backgroundColor: "#152A47",
    alignItems: "center",
    justifyContent: "center",
  },
  weightInfoButtonText: {
    color: "#65BDF6",
    fontSize: 13,
    fontWeight: "900",
    fontStyle: "italic",
  },
  weightInfoPanel: {
    backgroundColor: "#1C3152",
    borderColor: "#65BDF6",
    borderWidth: 1,
    borderRadius: 9,
    padding: 8,
    gap: 3,
  },
  weightInfoTitle: {
    color: "#5B9FE3",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "right",
  },
  weightInfoText: {
    color: "#E8F1FB",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
  },
  weightInfoNote: {
    color: "#AAB7C8",
    fontSize: 9,
    textAlign: "right",
  },
  foodMacroLabel: {
    fontSize: 12,
    fontWeight: "800",
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  foodMacroProtein: { color: "#F7F9FC", backgroundColor: "#334155", borderColor: "#CBD5E1", borderWidth: 1 },
  foodMacroCarb: { color: "#E8C39E", backgroundColor: "#4A2F22", borderColor: "#B87955", borderWidth: 1 },
  foodMacroFat: { color: "#FFD54A", backgroundColor: "#4A3A12", borderColor: "#D9A91A", borderWidth: 1 },
  foodMeta: { color: "#AAB7C8", fontSize: 10, textAlign: "right", writingDirection: "rtl" },
  eatenButton: {
    alignSelf: "flex-start",
    borderColor: "#3D587C",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  eatenButtonActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
  eatenText: { color: "#AAB7C8", fontSize: 10, fontWeight: "800" },
  eatenTextActive: { color: "#0B1224" },
  foodEdit: {
    width: "100%",
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  },
  quantityInput: {
    width: "100%",
    minHeight: 46,
    backgroundColor: "#0B1224",
    borderColor: "#2C3B55",
    borderWidth: 1,
    borderRadius: 8,
    color: "#F7F9FC",
    fontSize: 17,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: "right",
    writingDirection: "rtl",
  },
  quantityStepper: {
    flexDirection: "row-reverse",
    gap: 4,
  },
  weightModeRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  weightModeLabel: {
    color: "#9BAAC2",
    fontSize: 11,
    fontWeight: "700",
  },
  weightModeButton: {
    minHeight: 30,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4C6A92",
    backgroundColor: "#17243B",
    alignItems: "center",
    justifyContent: "center",
  },
  weightModeButtonActive: {
    backgroundColor: "#F5B72C",
    borderColor: "#F5B72C",
  },
  weightModeText: { color: "#C7D2E5", fontSize: 11, fontWeight: "800" },
  weightModeTextActive: { color: "#07131F" },
  quantityEditButtonContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
  },
  quantityEditButton: {
    alignSelf: "flex-start",
    borderColor: "#65BDF6",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#152A47",
  },
  quantityEditButtonActive: {
    backgroundColor: "#F5B72C",
    borderColor: "#F5B72C",
  },
  quantityEditProtein: {
    borderColor: "#5B9FE3",
    backgroundColor: "#2A2413",
  },
  quantityEditCarb: {
    borderColor: "#65BDF6",
    backgroundColor: "#12314A",
  },
  quantityEditFat: {
    borderColor: "#5B9FE3",
    backgroundColor: "#4A3510",
  },
  quantityEditProteinText: { color: "#F7F9FC" },
  quantityEditCarbText: { color: "#65BDF6" },
  quantityEditFatText: { color: "#FFD54A" },
  quantityEditButtonText: {
    color: "#F5B72C",
    fontSize: 11,
    fontWeight: "900",
  },
  quantityEditButtonTextActive: { color: "#07131F" },
  quantityStepButton: {
    minWidth: 34,
    minHeight: 32,
    borderRadius: 7,
    backgroundColor: "#253653",
    borderColor: "#4C6A92",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityStepText: { color: "#F7F9FC", fontSize: 10, fontWeight: "900" },
  quantityInputEditable: {
    borderColor: "#F5B72C",
    borderWidth: 2,
  },
  saveQuantityButton: {
    backgroundColor: "#F5B72C",
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 7,
  },
  saveQuantityText: { color: "#0B1224", fontSize: 10, fontWeight: "900" },
  resetQuantityButton: {
    backgroundColor: "#1B2A46",
    borderColor: "#F5B72C",
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 7,
  },
  resetQuantityText: { color: "#F5B72C", fontSize: 10, fontWeight: "900" },
  quantityLabel: { color: "#F5B72C", fontSize: 10, fontWeight: "800" },
  mealsTransition: { gap: 0 },
  versionLoading: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    backgroundColor: "#1C3152",
    borderColor: "#5B9FE3",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  versionLoadingText: { color: "#F5D27A", fontSize: 11, fontWeight: "800" },
  versionButtonDisabled: { opacity: 0.55 },
  swapArea: {
    gap: 7,
    backgroundColor: "#16233A",
    borderColor: "#8A6B20",
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
  },
  openSwapButton: {
    alignSelf: "flex-start",
    borderColor: "#3F76A7",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  openSwapButtonActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C" },
  openSwapText: { color: "#F5D27A", fontSize: 10, fontWeight: "900" },
  swapCategoryRow: { flexDirection: "row-reverse", gap: 5 },
  swapCategoryButton: {
    flex: 1,
    borderColor: "#3D587C",
    borderWidth: 1,
    borderRadius: 7,
    paddingVertical: 6,
    alignItems: "center",
  },
  swapCategoryButtonActive: {
    backgroundColor: "#F5B72C",
    borderColor: "#F5B72C",
  },
  swapCategoryText: { color: "#AAB7C8", fontSize: 10, fontWeight: "800" },
  swapCategoryTextActive: { color: "#0B1224" },
  swapQuantityHint: { color: "#7E8DA4", fontSize: 8, marginTop: 2 },
  swapRow: { flexDirection: "row-reverse", gap: 5, alignItems: "center" },
  swapLabel: { color: "#7E8DA4", fontSize: 9 },
  conversionSearch: {
    backgroundColor: "#0B1224",
    borderColor: "#3D587C",
    borderWidth: 1,
    borderRadius: 8,
    color: "#F7F9FC",
    paddingHorizontal: 9,
    paddingVertical: 7,
    textAlign: "right",
    fontSize: 10,
  },
  noSwapResults: { color: "#F5B72C", fontSize: 9, textAlign: "right" },
  swapButton: {
    backgroundColor: "#253653",
    borderColor: "#3D587C",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  swapChoice: { flexDirection: "row-reverse", alignItems: "center", gap: 3 },
  swapFavoriteButton: { paddingHorizontal: 3, paddingVertical: 2 },
  swapFavoriteText: { color: "#F5B72C", fontSize: 14 },
  conversionNotice: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 7,
    backgroundColor: "#1C3152",
    borderColor: "#5B9FE3",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  conversionNoticeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#5B9FE3",
    color: "#0B1224",
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "900",
    fontSize: 11,
  },
  conversionNoticeText: { color: "#BFF2D7", fontSize: 10, fontWeight: "800" },
  localConversionPreview: {
    backgroundColor: "#1C3152",
    borderColor: "#5B9FE3",
    borderWidth: 1,
    borderRadius: 10,
    padding: 9,
    gap: 5,
  },
  localConversionTitle: {
    color: "#BFF2D7",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
  },
  localConversionLine: {
    color: "#F7F9FC",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "right",
  },
  localConversionDetail: {
    color: "#B8CBE0",
    fontSize: 9,
    lineHeight: 15,
    textAlign: "right",
  },
  localConversionActions: {
    flexDirection: "row-reverse",
    gap: 7,
    marginTop: 4,
  },
  swapText: { color: "#C9D5E3", fontSize: 9, fontWeight: "800" },
  moreSwapButton: {
    backgroundColor: "#F5B72C",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  moreSwapText: { color: "#0B1224", fontSize: 9, fontWeight: "900" },
  swapButtonPressed: { opacity: 0.55, transform: [{ scale: 0.97 }] },
  note: { color: "#D7C89C", fontSize: 10, lineHeight: 16, textAlign: "right" },
});
