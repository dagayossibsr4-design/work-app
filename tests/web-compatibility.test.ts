import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const readSource = (relativePath: string) =>
  readFileSync(resolve(root, relativePath), "utf8");

describe("תאימות Web ונתיבים", () => {
  it("מעלה את הניווט מיד בדפדפן ולא ממתין לאנימציית כניסה", () => {
    const rootLayout = readSource("app/_layout.tsx");
    const entryAnimation = readSource("components/entry-animation.tsx");

    expect(rootLayout).toContain('useState(Platform.OS === "web")');
    expect(rootLayout).toContain(
      'import { ThemeProvider } from "../lib/theme-provider"',
    );
    expect(entryAnimation).toContain("Platform.OS");
    expect(entryAnimation).toContain("onFinishedRef.current?.()");

    const home = readSource("app/(tabs)/index.tsx");
    expect(home).toContain("שיטות לעלייה במסת שריר");
    expect(home).toContain("/muscle-gain-methods");
    expect(home).not.toContain('section.id === "women" ? <Pressable');
    expect(home).toContain("groupSelectButton");
    expect(home).toContain("onToggleSelected(category.id)");
  });

  it("מציג עריכה לכל יום שנבחר וחיצי שבוע הפונים החוצה", () => {
    const schedule = readSource("app/(tabs)/schedule.tsx");

    expect(schedule).toContain("selected.date === day.date");
    expect(schedule).toContain("setWeekStart(previous)");
    expect(schedule).toContain("setWeekStart(next)");
    expect(schedule).toContain(
      'setSelectedDate(previous); }} style={styles.navButton}><Text style={styles.navText}>›</Text>',
    );
    expect(schedule).toContain(
      'setSelectedDate(next); }} style={styles.navButton}><Text style={styles.navText}>‹</Text>',
    );
  });

  it("מציג רק את מסכי הניווט הראשיים ומשאיר את מסך האימונים כנתיב נגיש", () => {
    const tabsLayout = readSource("app/(tabs)/_layout.tsx");
    const visibleTabs = [
      "index",
      "schedule",
      "nutrition",
      "analysis",
      "settings",
    ];
    const hiddenRoutes = [
      "profile",
      "history",
      "editor",
      "garmin",
      "cardio",
      "recovery",
      "meal-plan",
      "macro-calculator",
      "food-library",
      "weekly-summary",
    ];
    const workoutsScreen = readSource("app/(tabs)/workouts.tsx");

    visibleTabs.forEach((screen) =>
      expect(tabsLayout).toContain(`name="${screen}"`),
    );
    expect(tabsLayout).not.toContain('title="אימונים"');
    expect(workoutsScreen.length).toBeGreaterThan(0);
    hiddenRoutes.forEach((screen) =>
      expect(tabsLayout).toContain(`name="${screen}"`),
    );
  });
});
