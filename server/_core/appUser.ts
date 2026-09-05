/**
 * The shape every tRPC procedure actually relies on, independent of which
 * database currently backs it (the legacy MySQL `users` table, or the newer
 * Supabase `subscription_state`/`user_roles` tables - see
 * server/_core/subscriptionState.ts). `id` is always a string: the legacy
 * source's numeric id is stringified at the boundary so callers never branch
 * on which source produced it.
 */
export type AppUser = {
  id: string;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  subscriptionStatus: "trialing" | "active" | "expired" | "canceled" | "cancelled";
  trialEndsAt: Date | null;
  createdAt: Date;
  lastSignedIn: Date;
};
