import type { AppUser } from "./appUser";

export type SubscriptionAccess = {
  isAdmin: boolean;
  isPaidActive: boolean;
  isTrialValid: boolean;
  hasAccess: boolean;
};

/**
 * Single source of truth for "is this user allowed to use the product right
 * now". Used both by the tRPC middleware that blocks individual gated
 * endpoints and by the `subscription.status` query the client polls to
 * enforce the site-wide lock once the 14-day trial (or a paid period) ends.
 * Takes the source-agnostic AppUser shape so it works the same whether the
 * caller was resolved from the legacy MySQL database or Supabase.
 */
export function computeSubscriptionAccess(user: Pick<AppUser, "role" | "subscriptionStatus" | "trialEndsAt">): SubscriptionAccess {
  const isAdmin = user.role === "admin";
  const isPaidActive = user.subscriptionStatus === "active";
  const isTrialValid = Boolean(user.trialEndsAt && new Date(user.trialEndsAt).getTime() > Date.now());
  return {
    isAdmin,
    isPaidActive,
    isTrialValid,
    hasAccess: isAdmin || isPaidActive || isTrialValid,
  };
}
