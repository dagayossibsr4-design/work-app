import type { SetLog } from "./workout-store";

export type WeightRecommendation = {
  weight: number | null;
  reason: string;
  confidence: "high" | "medium" | "low";
};

function parseTarget(target: string) {
  const values = target.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return { min: values[0] ?? null, max: values[1] ?? values[0] ?? null };
}

function roundToIncrement(value: number, increment = 2.5) {
  return Math.max(0, Math.round(value / increment) * increment);
}

export function recommendNextWeight({ previous, currentReference, target, restPause = false }: { previous?: SetLog; currentReference?: SetLog; target: string; restPause?: boolean }): WeightRecommendation {
  const reference = currentReference?.weight ? currentReference : previous;
  if (!reference?.weight) return { weight: null, reason: "אחרי שתתעד את הסט הראשון יופיע משקל מומלץ להמשך.", confidence: "low" };
  const baseWeight = Number(reference.weight) || 0;
  const reps = Number(reference.reps) || 0;
  const { min, max } = parseTarget(target);
  if (!reps || !min) return { weight: baseWeight, reason: "שמירה על המשקל האחרון עד שיהיו מספיק חזרות להשוואה.", confidence: "low" };
  if (max !== null && reps >= max) {
    if (restPause) return { weight: baseWeight, reason: `הגעת לקצה העליון, אך בגלל Rest Pause מומלץ לבסס עוד סט יציב לפני העלאה.`, confidence: "medium" };
    return { weight: roundToIncrement(baseWeight * 1.025), reason: `הגעת לקצה העליון של הטווח (${max} חזרות), לכן מוצעת עלייה קטנה.`, confidence: "high" };
  }
  if (reps < min) return { weight: baseWeight, reason: `נשארים במשקל הנוכחי עד שתגיע לפחות ל־${min} חזרות.`, confidence: "high" };
  return { weight: baseWeight, reason: `אתה בתוך טווח היעד (${min}–${max ?? min}), לכן מומלץ לשמור על המשקל.`, confidence: "medium" };
}
