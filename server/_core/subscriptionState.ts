import { getSupabaseAdminClient } from "./supabaseAdmin";
import type { AppUser } from "./appUser";

const TRIAL_DAYS = 14;

// Column names match the live public.subscription_state table, which
// already existed (created outside this code path) with a "status" column
// rather than the "subscription_status" this module originally assumed -
// see the "column subscription_state.subscription_status does not exist"
// incident. Adapted here rather than altering the live table.
type SubscriptionStateRow = {
  status: AppUser["subscriptionStatus"];
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
};

// How often ensureSubscriptionState touches updated_at as an activity
// signal for the admin dashboard - Supabase Auth's own last_sign_in_at only
// changes on an actual login, not on every request a stay-signed-in
// session makes, so it under-reports how recently an account was really
// used. Throttled to keep write volume down on a table read on every
// authenticated request.
const ACTIVITY_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

function touchLastActive(admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, userId: string, currentStatus: AppUser["subscriptionStatus"]) {
  // Fire-and-forget: this must never slow down or fail the caller's actual
  // request just to refresh an activity timestamp.
  void admin
    .from("subscription_state")
    .update({ status: currentStatus })
    .eq("user_id", userId)
    .then(({ error }) => {
      if (error) console.warn("[subscriptionState] Failed to touch last-active timestamp:", error.message);
    });
}

/**
 * The Supabase-backed replacement for `resolveUserFromSupabaseIdentity` in
 * server/db.ts: reads role (public.user_roles) and subscription/trial state
 * (public.subscription_state), provisioning a 14-day trial row on first
 * sight - same default a brand new row gets today via `upsertUser`. Only
 * used when ENV.subscriptionSource === "supabase" (see server/_core/context.ts).
 */
export async function ensureSubscriptionState(identity: {
  id: string;
  email: string | null;
  name: string | null;
}): Promise<AppUser | null> {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const [{ data: roleRow }, { data: stateRow, error: stateError }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", identity.id).maybeSingle(),
    admin
      .from("subscription_state")
      .select("status, trial_ends_at, created_at, updated_at")
      .eq("user_id", identity.id)
      .maybeSingle<SubscriptionStateRow>(),
  ]);
  if (stateError) throw new Error(stateError.message);

  let state = stateRow;
  if (!state) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    const nowIso = new Date().toISOString();
    const { error: insertError } = await admin.from("subscription_state").insert({
      user_id: identity.id,
      status: "trialing",
      trial_ends_at: trialEnd.toISOString(),
    });
    if (insertError) throw new Error(insertError.message);
    state = { status: "trialing", trial_ends_at: trialEnd.toISOString(), created_at: nowIso, updated_at: nowIso };
  } else if (Date.now() - new Date(state.updated_at).getTime() > ACTIVITY_TOUCH_INTERVAL_MS) {
    touchLastActive(admin, identity.id, state.status);
  }

  return {
    id: identity.id,
    openId: identity.id,
    name: identity.name,
    email: identity.email,
    loginMethod: "supabase",
    role: roleRow?.role === "admin" ? "admin" : "user",
    subscriptionStatus: state.status,
    trialEndsAt: state.trial_ends_at ? new Date(state.trial_ends_at) : null,
    createdAt: new Date(state.created_at),
    lastSignedIn: new Date(),
  };
}

/**
 * The Supabase-backed replacement for `activateUserSubscription` in
 * server/db.ts. Only ever called after a Morning webhook signature has been
 * verified - never from a client-trusted redirect.
 */
export async function activateSupabaseSubscription(userId: string, extendByDays: number): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("Supabase admin client is not configured");

  const { data: stateRow, error: readError } = await admin
    .from("subscription_state")
    .select("trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle<Pick<SubscriptionStateRow, "trial_ends_at">>();
  if (readError) throw new Error(readError.message);

  const now = Date.now();
  const currentEnd = stateRow?.trial_ends_at ? new Date(stateRow.trial_ends_at).getTime() : now;
  const base = Number.isFinite(currentEnd) ? Math.max(currentEnd, now) : now;
  const newEnd = new Date(base + extendByDays * 24 * 60 * 60 * 1000);

  const { error } = await admin
    .from("subscription_state")
    .upsert({ user_id: userId, status: "active", trial_ends_at: newEnd.toISOString() });
  if (error) throw new Error(error.message);
}

export type SupabaseSubscriptionByUser = Map<string, { subscriptionStatus: string; trialEndsAt: Date | null; lastActiveAt: Date | null }>;

/**
 * For the admin dashboard: every known subscription_state row, keyed by the
 * Supabase Auth user id, to merge into the Supabase Auth user list the same
 * way listAdminUsers() merges in the legacy MySQL data today. updated_at
 * doubles as a real "last active" signal (see touchLastActive above) - more
 * accurate than Supabase Auth's own last_sign_in_at for a session that just
 * keeps auto-refreshing without a fresh login.
 */
export async function listSupabaseSubscriptionStates(): Promise<SupabaseSubscriptionByUser> {
  const admin = getSupabaseAdminClient();
  const byUser: SupabaseSubscriptionByUser = new Map();
  if (!admin) return byUser;

  const { data, error } = await admin.from("subscription_state").select("user_id, status, trial_ends_at, updated_at");
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    byUser.set(row.user_id as string, {
      subscriptionStatus: row.status as string,
      trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at as string) : null,
      lastActiveAt: row.updated_at ? new Date(row.updated_at as string) : null,
    });
  }
  return byUser;
}
