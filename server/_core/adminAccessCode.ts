import { timingSafeEqual } from "crypto";
import { ENV } from "./env";

/**
 * Constant-time comparison against the owner's admin access code (set via
 * the ADMIN_ACCESS_CODE env var). This is a deliberately simple, independent
 * admin gate: the code itself is the permanent "session" the client stores
 * and resends, with no expiry and no dependency on the regular Supabase
 * sign-in / role bridge.
 */
export function isValidAdminAccessCode(candidate: unknown): boolean {
  if (!ENV.adminAccessCode || typeof candidate !== "string" || !candidate) return false;

  const expected = Buffer.from(ENV.adminAccessCode);
  const provided = Buffer.from(candidate);
  if (expected.length !== provided.length) return false;

  return timingSafeEqual(expected, provided);
}
