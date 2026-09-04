/**
 * Sanitizes free-text numeric input (reps, weight, distance, speed, etc.) as the
 * user types: strips everything but digits and a single decimal separator, so
 * letters and negative signs can never be saved into a workout set.
 */
export function sanitizeNonNegativeDecimalInput(value: string): string {
  const normalized = value.replace(",", ".");
  const digitsAndDots = normalized.replace(/[^0-9.]/g, "");
  const firstDot = digitsAndDots.indexOf(".");
  if (firstDot === -1) return digitsAndDots;
  return digitsAndDots.slice(0, firstDot + 1) + digitsAndDots.slice(firstDot + 1).replace(/\./g, "");
}
