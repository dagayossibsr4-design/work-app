export function formatRestSeconds(restSeconds?: number) {
  if (!Number.isFinite(restSeconds) || !restSeconds || restSeconds < 0) return "מנוחה לא תועדה";
  const minutes = Math.floor(restSeconds / 60);
  const seconds = Math.round(restSeconds % 60);
  return `מנוחה ${minutes}:${String(seconds).padStart(2, "0")}`;
}

const TECHNIQUE_TIPS: Array<{ includes: string; tip: string }> = [
  { includes: "חתירה גבוהה", tip: "משוך מרפקים לאחור, שמור חזה פתוח והימנע מתנופה." },
  { includes: "תמיכה לחזה", tip: "הצמד את החזה לתמיכה והוביל את התנועה עם המרפקים." },
  { includes: "דאמבל מסור", tip: "שמור גב ניטרלי והורד את המשקולת בשליטה מלאה." },
  { includes: "פולי רחב", tip: "משוך לכיוון החזה, כתפיים מטה וללא נדנוד בגו." },
  { includes: "פול־אובר", tip: "השאר מרפקים כמעט ישרים והרגש מתיחה בגב לאורך כל הטווח." },
  { includes: "כתף אחורית", tip: "שמור צוואר ניטרלי והפרד את הזרועות בלי להרים כתפיים." },
  { includes: "שרגים", tip: "העלה כתפיים אנכית, עצור לשנייה למעלה והורד לאט." },
  { includes: "בהאמר", tip: "אחיזה ניטרלית, מרפקים צמודים לגוף וללא תנופה מהגב." },
  { includes: "דאמבלים בישיבה", tip: "השאר מרפקים קרובים לגוף והורד לאט עד מתיחה נשלטת." },
  { includes: "פולי תחתון עם כבל", tip: "שמור מרפקים לצד הגוף וייצב את הכתפיים לאורך הכפיפה." },
];

export function techniqueTipForExercise(exerciseName: string) {
  return TECHNIQUE_TIPS.find((item) => exerciseName.includes(item.includes))?.tip;
}
