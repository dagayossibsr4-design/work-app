import { expect, test, type Page } from "@playwright/test";

async function openApp(page: Page) {
  await page.goto("/");
  await expect(page.getByText("יומן האימונים")).toBeVisible();
}

test.describe("זרימות ליבה", () => {
  test("מסך הבית מציג קיצורי דרך ותוכנית נוכחית", async ({ page }) => {
    await openApp(page);
    await expect(page.getByText("מוכנים לעבוד?")).toBeVisible();
    await expect(page.getByText("תפריט ותזונה יומית")).toBeVisible();
    await expect(page.getByText("התוכנית הקבועה שלי").first()).toBeVisible();
    await expect(page.getByText("בחר סדרה מהרשימה — ללא גרירה")).toBeVisible();
    await expect(page.getByText("חלוקת האימונים").first()).toBeVisible();
    await expect(page.getByText("תרגילים").first()).toBeVisible();
  });

  test("כרטיס אירובי פותח בחירת מסלול וכל המסלולים לחיצים", async ({ page }) => {
    await openApp(page);
    await page.getByTestId("cardio-method-card").click();
    await expect(page.getByText("בחר סוג אירובי").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "בחר הליכון" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "בחר ריצה בחוץ" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "בחר שחייה" }).first()).toBeVisible();
    await page.getByRole("button", { name: "בחר הליכון" }).first().click();
    await expect(page.getByText("הליכון").first()).toBeVisible();
    await expect(page.getByText("תרגילי האימון")).toBeVisible();
  });

  test("ניווט למסך האימונים מציג קבוצות תוכנית", async ({ page }) => {
    await openApp(page);
    await page.locator('a[href*="/workouts"]').last().click();
    await expect(page).toHaveURL(/\/workouts/);
    await expect(page.getByText("האימונים שלך")).toBeVisible();
    await expect(page.getByText("תוכנית ABCD")).toBeVisible();
    await expect(page.getByText("תוכנית ABC").first()).toBeVisible();
  });

  test("התחלת אימון מציגה שדות סטים ויציאה בטוחה", async ({ page }) => {
    await page.goto("/workouts");
    await expect(page.getByText("האימונים שלך")).toBeVisible();
    const startButton = page.getByRole("button", { name: "התחל אימון חדש Push 1" });
    await expect(startButton).toBeEnabled();
    await page.waitForTimeout(500);
    await startButton.click();
    await expect(page).toHaveURL(/\/active-workout/);
    await expect(page.getByText("אימון פעיל").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "סגור אימון פעיל" })).toBeVisible();
    await expect(page.getByRole("button", { name: "סיים ושמור את האימון" })).toBeVisible();
  });

  test("היסטוריה מאפשרת עריכה ומחיקה", async ({ page }) => {
    await page.goto("/history");
    await expect(page.getByText("היסטוריה").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "ערוך אימון מההיסטוריה" })).toBeVisible();
    await expect(page.getByRole("button", { name: "מחק אימון מההיסטוריה" })).toBeVisible();
    await page.getByRole("button", { name: "ערוך אימון מההיסטוריה" }).click();
    await expect(page.getByRole("button", { name: "שמירת עריכת האימון" })).toBeVisible();
    await page.getByRole("button", { name: "ביטול עריכת האימון" }).click();
  });

  test("מאגר המזון מציג בסיס 100 גרם ופתיחת פירוט", async ({ page }) => {
    await page.goto("/food-library");
    await expect(page.getByText("מאגר מזון והמרות")).toBeVisible();
    await expect(page.getByText("בסיס חישוב 100 ג׳").first()).toBeVisible();
    const foodCard = page.getByRole("button", { name: "פתח פירוט חזה עוף מבושל" });
    await expect(foodCard).toBeVisible();
    await page.waitForTimeout(500);
    await foodCard.click();
    await expect(page.getByText("פרטי מוצר").first()).toHaveCount(1);
  });

  test("יומן המעקב מאפשר הוספת תוסף ושמירת רשומה", async ({ page }) => {
    await page.goto("/hormone-tracking");
    await expect(page.getByText("מעקב בריאות ותוספים")).toBeVisible();
    const supplementName = page.getByLabel("שם התוסף");
    const addSupplement = page.getByRole("button", { name: "הוסף תוסף לרשומה" });
    await expect(supplementName).toBeVisible();
    await expect(addSupplement).toBeEnabled();
    await page.waitForTimeout(500);
    await supplementName.fill("תוסף בדיקה E2E");
    await addSupplement.click();
    await expect(page.getByText("תוסף בדיקה E2E").first()).toHaveCount(1);
    await page.getByRole("button", { name: "שמור רשומת מעקב" }).click();
    await expect(page.getByText("הרשומה נשמרה במכשיר.")).toBeVisible();
  });

  test("מסך חילוץ תווית AI מציג אימות לפני שמירה", async ({ page }) => {
    await page.goto("/food-label");
    await expect(page.getByText("חילוץ תווית מזון")).toBeVisible();
    await expect(page.getByRole("button", { name: "בחר תמונה של תווית מזון" })).toBeEnabled();
    await expect(page.getByText("אימות ועריכה לפני שמירה")).toBeVisible();
    await expect(page.getByRole("button", { name: "שמור מוצר שחולץ למאגר האישי" })).toBeEnabled();
  });

  test("הגדרות מציגות שחזור JSON", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("button", { name: "שחזר נתונים מקובץ JSON" })).toBeEnabled();
  });

  test("הגדרות ותפריט מציגים קישורים למידע ולמעקב", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("ניהול אישי")).toBeVisible();
    await expect(page.getByText("הגדרות").first()).toBeVisible();
    await expect(page.getByText("יומן מעקב אישי ותוספים")).toBeVisible();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "פתח יומן מעקב אישי ותוספים" }).click();
    await expect(page).toHaveURL(/hormone-tracking/);
  });
});
