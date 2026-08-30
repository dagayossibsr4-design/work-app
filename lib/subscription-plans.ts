export type SubscriptionPlanId = "monthly" | "annual";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  title: string;
  periodLabel: string;
  priceLabel: string;
  priceIls: number;
  description: string;
  highlights: string[];
  featured?: boolean;
};

/**
 * מחירון ההשקה של האפליקציה. המחירים מוצגים במטבע ישראלי.
 * החיוב בפועל יופעל רק לאחר השלמת חיבור Hyp API ו־Notify.
 */
export const SUBSCRIPTION_START_DATE = "2026-08-31";

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "monthly",
    title: "מסלול חודשי",
    periodLabel: "חיוב בכל חודש",
    priceLabel: "89 ₪ לחודש",
    priceIls: 89,
    description: "גישה מלאה לאימונים, לתזונה ולמעקב ההתקדמות.",
    highlights: ["גישה מלאה לתכני האפליקציה", "שמירה וסנכרון של הנתונים", "ביטול לפי תנאי העסק"],
  },
  {
    id: "annual",
    title: "מסלול שנתי",
    periodLabel: "חיוב פעם בשנה",
    priceLabel: "700 ₪ לשנה",
    priceIls: 700,
    description: "גישה מלאה לאורך שנה במסלול מרוכז ונוח.",
    highlights: ["כל אפשרויות המסלול החודשי", "חיסכון של 368 ₪ לעומת 12 חודשים", "ניהול מנוי מסודר"],
    featured: true,
  },
];

export function getSubscriptionPlan(id: SubscriptionPlanId) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id) ?? SUBSCRIPTION_PLANS[0];
}
