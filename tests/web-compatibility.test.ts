import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const readSource = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

describe("תאימות Web ונתיבים", () => {
  it("מציג מסך פתיחה מונפש לפני הניווט בכל הפלטפורמות", () => {
    const rootLayout = readSource("app/_layout.tsx");
    const entryAnimation = readSource("components/entry-animation.tsx");
    expect(rootLayout).toContain("useState(false)");
    expect(rootLayout).toContain('import { ThemeProvider } from "../lib/theme-provider"');
    expect(entryAnimation).toContain("useState(true)");
    expect(entryAnimation).toContain("Created by Yossi Daga");
    expect(entryAnimation).toContain("onFinishedRef.current?.()");
    const home = readSource("app/(tabs)/index.tsx");
    expect(home).toContain("שיטות לעלייה במסת שריר");
    expect(home).toContain("/muscle-gain-methods");
    expect(home).not.toContain('section.id === "women" ? <Pressable');
    expect(home).toContain("groupSelectButton");
    expect(home).toContain("onToggleSelected(category.id)");
    expect(home).toContain("עבור ליומן האימונים לשיבוץ");
    expect(home).toContain('router.push("/schedule" as never)');
    const myProgramsModal = home.slice(home.indexOf("function MyProgramsModal"), home.indexOf("const styles = StyleSheet.create"));
    expect(myProgramsModal).toContain("התוכניות שנבחרו");
    expect(myProgramsModal).not.toContain("assignWorkoutTemplateToDate");
    expect(myProgramsModal).not.toContain("days.map");
  });

  it("מציג עריכה לכל יום שנבחר וחיצי שבוע הפונים החוצה", () => {
    const schedule = readSource("app/(tabs)/schedule.tsx");
    expect(schedule).toContain("selected.date === day.date");
    expect(schedule).toContain("setWeekStart(previous)");
    expect(schedule).toContain("setWeekStart(next)");
    expect(schedule).toContain('setSelectedDate(previous); }} style={styles.navButton}><Text style={styles.navText}>›</Text>');
    expect(schedule).toContain('setSelectedDate(next); }} style={styles.navButton}><Text style={styles.navText}>‹</Text>');
  });

  it("מציג רק את מסכי הניווט הראשיים ומשאיר את מסך האימונים כנתיב נגיש", () => {
    const tabsLayout = readSource("app/(tabs)/_layout.tsx");
    const visibleTabs = ["index", "schedule", "nutrition", "analysis", "settings"];
    const hiddenRoutes = ["profile", "history", "editor", "garmin", "cardio", "recovery", "meal-plan", "macro-calculator", "food-library", "weekly-summary"];
    const workoutsScreen = readSource("app/(tabs)/workouts.tsx");
    visibleTabs.forEach((screen) => expect(tabsLayout).toContain(`name="${screen}"`));
    expect(tabsLayout).not.toContain('title="אימונים"');
    expect(workoutsScreen.length).toBeGreaterThan(0);
    hiddenRoutes.forEach((screen) => expect(tabsLayout).toContain(`name="${screen}"`));
  });

  it("מציג מצב ריק מודרך למשתמש ללא תוכניות", () => {
    const home = readSource("app/(tabs)/index.tsx");
    const myProgramsModal = home.slice(home.indexOf("function MyProgramsModal"), home.indexOf("const styles = StyleSheet.create"));
    expect(myProgramsModal).toContain("בוא נבנה את התוכנית שלך");
    expect(myProgramsModal).toContain("הוסף עד 5 תוכניות מועדפות");
    expect(myProgramsModal).toContain("בחירת תוכנית אימונים");
    expect(home).toContain('router.push("/(tabs)/workouts" as never)');
  });

  it("סוגר את באנר הקוקיז באישור או בדחייה", () => {
    const overlay = readSource("components/web-compliance-overlay.tsx");
    expect(overlay).toContain("setCookieSettingsOpen(false)");
    expect(overlay).toContain("setAccessibilityOpen(false)");
    expect(overlay).toContain("onPressIn={() => setConsent(\"rejected\")}");
    expect(overlay).toContain("onPressIn={() => setConsent(\"accepted\")}");
    expect(overlay).toContain("saveCookieConsent(value)");
  });

  it("מציג תבניות ותרגילים בהגדרות בקבוצות נפתחות", () => {
    const editor = readSource("app/(tabs)/editor.tsx");
    expect(editor).toContain("templateGroupList");
    expect(editor).toContain("libraryCategoryList");
    expect(editor).toContain("toggleTemplateGroup");
    expect(editor).toContain("toggleExerciseCategory");
    expect(editor).toContain("addExerciseFromLibrary");
  });

  it("מציג בונה תוכנית מחולק לקטגוריות נפתחות", () => {
    const home = readSource("app/(tabs)/index.tsx");
    expect(home).toContain("exerciseCategoryList");
    expect(home).toContain("exerciseCategorySection");
    expect(home).toContain("builderSelectionBadge");
    expect(home).toContain("toggleBuilderCategory");
    expect(home).toContain("ללא שיוך מגדרי");
  });

  it("מאפשר לבחור מאקרו חורג ולסנן את המלצת הקיצוץ", () => {
    const mealPlan = readSource("app/(tabs)/meal-plan.tsx");
    expect(mealPlan).toContain("selectedDeviationMacros");
    expect(mealPlan).toContain("toggleDeviationMacro");
    expect(mealPlan).toContain("filteredDeviationSuggestions");
    expect(mealPlan).toContain("בחר ממה להפחית לפי הערכים שחרגו מהיעד");
  });
});
