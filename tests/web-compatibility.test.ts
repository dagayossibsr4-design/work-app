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
  });

  it("מציג רק את מסכי הניווט הראשיים ומשאיר את מסך האימונים כנתיב נגיש", () => {
    const tabsLayout = readSource("app/(tabs)/_layout.tsx");
    const visibleTabs = ["index", "schedule", "nutrition", "analysis", "settings"];
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
