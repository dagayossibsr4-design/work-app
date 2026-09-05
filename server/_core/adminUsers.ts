import { getSupabaseAdminClient } from "./supabaseAdmin";
import { listUsersForAdmin, SUPABASE_OPEN_ID_PREFIX } from "../db";
import { listSupabaseSubscriptionStates } from "./subscriptionState";
import { ENV } from "./env";

export type AdminUserRow = {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  lastActiveAt: Date | null;
  isSuspended: boolean;
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
};

/**
 * The real, authoritative account list: every user who has ever registered
 * through Supabase Auth, whether or not they have made an authenticated API
 * call yet (the MySQL `users` table only gets a row lazily, on first such
 * call - relying on it alone as "who's registered" undercounts real users).
 * Supabase data is merged with whatever subscription/trial state the MySQL
 * bridge has recorded, when available.
 */
export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    // Surfaced to the client deliberately: an empty array here would look
    // identical to "genuinely zero users registered" and hide a
    // misconfigured server from the person trying to diagnose it.
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to list Supabase users.");
  }

  // Subscription/trial state lives in a separate system from Supabase Auth
  // (the legacy MySQL database, or - once SUBSCRIPTION_SOURCE=supabase -
  // public.subscription_state). If that lookup is unreachable or
  // misconfigured, that must not hide the real, authoritative Supabase user
  // list - degrade to showing users without subscription/trial info instead
  // of failing outright.
  let byOpenId = new Map<string, { subscriptionStatus: string | null; trialEndsAt: Date | null; lastActiveAt?: Date | null }>();
  try {
    if (ENV.subscriptionSource === "supabase") {
      const byUserId = await listSupabaseSubscriptionStates();
      byOpenId = new Map(Array.from(byUserId.entries()).map(([userId, state]) => [`${SUPABASE_OPEN_ID_PREFIX}${userId}`, state]));
    } else {
      const mysqlUsers = await listUsersForAdmin();
      byOpenId = new Map(mysqlUsers.map((user) => [user.openId, user] as const));
    }
  } catch (subscriptionError) {
    console.error("[adminUsers] Failed to read subscription data:", subscriptionError);
  }

  return data.users
    .map((user) => {
      const subscriptionState = byOpenId.get(`${SUPABASE_OPEN_ID_PREFIX}${user.id}`);
      const bannedUntil = user.banned_until ? new Date(user.banned_until) : null;
      return {
        id: user.id,
        email: user.email ?? null,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        lastActiveAt: subscriptionState?.lastActiveAt ?? null,
        isSuspended: Boolean(bannedUntil && bannedUntil.getTime() > Date.now()),
        subscriptionStatus: subscriptionState?.subscriptionStatus ?? null,
        trialEndsAt: subscriptionState?.trialEndsAt ?? null,
      };
    })
    .sort((a, b) => {
      const aTime = Math.max(new Date(a.lastSignInAt ?? a.createdAt).getTime(), a.lastActiveAt?.getTime() ?? 0);
      const bTime = Math.max(new Date(b.lastSignInAt ?? b.createdAt).getTime(), b.lastActiveAt?.getTime() ?? 0);
      return bTime - aTime;
    });
}

// ~100 years - Supabase's own documented convention for an effectively
// permanent suspension (there is no literal "forever" value).
const SUSPEND_DURATION = "876000h";

/**
 * Suspends or restores an account via the Supabase Admin API. This blocks
 * the account from signing in or refreshing its session from this point on;
 * it is not an instant kill switch for an already-issued access token, which
 * (per Supabase's own docs) keeps working until it naturally expires -
 * normally within about an hour. Callers must be honest about this in the UI.
 */
export async function setUserSuspended(userId: string, suspended: boolean): Promise<void> {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) throw new Error("Supabase admin client is not configured");

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: suspended ? SUSPEND_DURATION : "none",
  });
  if (error) throw new Error(error.message);
}

/**
 * Sets a new password for an account directly via the Supabase Admin API -
 * for when a user is locked out and cannot use the self-service "forgot
 * password" email flow. The new password is never logged.
 */
export async function setUserPassword(userId: string, newPassword: string): Promise<void> {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) throw new Error("Supabase admin client is not configured");

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw new Error(error.message);
}
