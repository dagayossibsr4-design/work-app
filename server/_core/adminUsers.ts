import { getSupabaseAdminClient } from "./supabaseAdmin";
import { listUsersForAdmin, SUPABASE_OPEN_ID_PREFIX } from "../db";

export type AdminUserRow = {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
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
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error || !data) {
    console.warn("[Admin] Failed to list Supabase users:", error?.message);
    return [];
  }

  const mysqlUsers = await listUsersForAdmin();
  const byOpenId = new Map(mysqlUsers.map((user) => [user.openId, user] as const));

  return data.users
    .map((user) => {
      const mysqlUser = byOpenId.get(`${SUPABASE_OPEN_ID_PREFIX}${user.id}`);
      const bannedUntil = user.banned_until ? new Date(user.banned_until) : null;
      return {
        id: user.id,
        email: user.email ?? null,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        isSuspended: Boolean(bannedUntil && bannedUntil.getTime() > Date.now()),
        subscriptionStatus: mysqlUser?.subscriptionStatus ?? null,
        trialEndsAt: mysqlUser?.trialEndsAt ?? null,
      };
    })
    .sort((a, b) => new Date(b.lastSignInAt ?? b.createdAt).getTime() - new Date(a.lastSignInAt ?? a.createdAt).getTime());
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
