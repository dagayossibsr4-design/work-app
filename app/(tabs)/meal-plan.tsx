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
import { IconSymbol, type IconSymbolName } from "@/components/ui/icon-symbol";
import {
  dailyMealTotals,
  defaultMeals,
  mealFoodTotals,
  mealTotals,
  normalizeMealsTo100Grams,
  type Meal,
} from "@/lib/meal-plan";
import { useWorkoutStore } from "@/lib/workout-store";
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
  const store = useWorkoutStore() as any;
  const { nutritionProfile, updateNutritionProfile } = store;
  const user = { name: store.accountName || store.userDisplayName || "משתמש" };
  
  const mealFoods = useMemo(() => [...(nutritionProfile?.customFoods ?? []), ...foodItems], [nutritionProfile?.customFoods]);
  const mealConversionFoods = useMemo(() => [...conversionFoods, ...(nutritionProfile?.customFoods ?? []).filter((food: any) => food.group !== "ירק ופרי").map((food: any) => ({ id: food.id, name: food.name, group: food.group as ConversionGroup, calories: food.calories, protein: food.protein, carbohydrates: food.carbohydrates, fats: food.fats }))], [nutritionProfile?.customFoods]);
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
  const [favoriteBusy, setFavoriteBusy] = useState<"save" | "load" | null>(null);
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
  const [activeGoal, setActiveGoal] = useState(nutritionProfile?.goal || "ניטרלי");
  const [versionsByGoal, setVersionsByGoal] = useState<MealPlanVersions>(
    emptyMealPlanVersions,
  );
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
              savedProfiles[nutritionProfile?.goal] ?? savedProfiles.ניטרלי;
            setActiveGoal(savedActive.goal);
          }
          setHydrated(true);
        },
      )
      .catch(() => setHydrated(true));
  }, [nutritionProfile?.goal]);

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
      ]).then(() => {
        if (typeof store.syncAccount === "function" && store.accountName) {
            store.syncAccount(store.accountName);
        }
      }).catch(() => undefined);
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

  const activeProfile = menuProfiles[activeGoal] || menuProfiles.ניטרלי;
  const targetCalories = Number(activeProfile?.calories) || 0;

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

  const favoriteVersion = versionsByGoal[activeGoal]?.find(
    (version) => version.favorite,
  );

  const loadFavoriteVersion = () => {
    if (favoriteVersion) loadVersion(favoriteVersion);
    else setRebalanceMessage("עדיין לא סומנה גרסה מועדפת למצב הזה.");
  };

  const selectGoal = (goal: MenuProfile["goal"]) => {
    setActiveGoal(goal);
    const next = menuProfiles[goal];
    if (next) {
      updateNutritionProfile({
        ...nutritionProfile,
        goal,
        calorieTarget: next.calories,
        proteinTarget: next.protein,
        carbohydratesTarget: next.carbohydrates,
        fatsTarget: next.fats,
        autoMacroField: next.autoField,
      });
    }
  };

  useEffect(() => {
    if (!hydrated || nutritionProfile?.goal !== activeGoal || !activeProfile) return;
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
    nutritionProfile?.goal,
    nutritionProfile?.calorieTarget,
    nutritionProfile?.proteinTarget,
    nutritionProfile?.carbohydratesTarget,
    nutritionProfile?.fatsTarget,
  ]);

  const targetKey = activeProfile ? `${activeProfile.goal}:${targetCalories}:${activeProfile.protein}:${activeProfile.carbohydrates}:${activeProfile.fats}` : "";
  const currentPlanTotals = useMemo(() => dailyMealTotals(meals), [meals]);
  const targetAligned =
    activeProfile &&
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
      (appliedTarget === targetKey && targetAligned) ||
      !activeProfile
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
    activeProfile,
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
    if (!targetCalories || !activeProfile) {
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
    if (pdfBusy || !activeProfile) return;
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
    if (shareBusy || !activeProfile) return;
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
    protein: Number(activeProfile?.protein) || 0,
    carbohydrates: Number(activeProfile?.carbohydrates) || 0,
    fats: Number(activeProfile?.fats) || 0,
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

  if (!hydrated) {
    return (
      <ScreenContainer className="items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#F5B72C" />
      </ScreenContainer>
    );
  }

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
            יעד פעיל: {activeProfile ? mealPlanGoalLabel(activeGoal) : "לא מוגדר"} ·{" "}
            {targetCalories || "לא הוגדר"} קק״ל · לפי המחשבון הקלורי
          </Text>
          
          <View style={styles.actionRow}>
            <Pressable onPress={saveFavorite} style={styles.savePermanentBtn}>
              <Text style={styles.savePermanentText}>{favoriteBusy === "save" ? "שומר..." : "💾 שמור וקבע תפריט זה לצמיתות"}</Text>
            </Pressable>
          </View>

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