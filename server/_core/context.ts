import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import type { AppUser } from "./appUser";
import { sdk } from "./sdk";
import { getSupabaseIdentityFromToken } from "./supabaseAuth";
import { resolveUserFromSupabaseIdentity } from "../db";
import { ensureSubscriptionState } from "./subscriptionState";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  /**
   * Resolves and memoizes the caller's identity on first access. Auth is
   * lazy on purpose: a fully public procedure (e.g. the barcode lookup)
   * never touches this, so it never pays for a Manus session check or a
   * Supabase token verification - only procedures that actually call this
   * (via protectedProcedure/activeSubscriptionProcedure/adminProcedure) do.
   */
  getUser: () => Promise<AppUser | null>;
};

function bearerToken(req: CreateExpressContextOptions["req"]): string | null {
  const header = req.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

// The legacy MySQL User's numeric id is stringified so every caller sees the
// same AppUser.id: string shape regardless of which database resolved it.
function fromLegacyUser(user: User): AppUser {
  return { ...user, id: String(user.id) };
}

async function resolveUser(req: CreateExpressContextOptions["req"]): Promise<AppUser | null> {
  // Every real user signs in through Supabase now, carrying a Supabase JWT as
  // a Bearer token - checked first so the common case is fast and silent.
  // The legacy Manus session check below would otherwise run first on every
  // single request and always fail against that token (wrong secret, and
  // often a mismatched algorithm), logging noise for no reason.
  const token = bearerToken(req);
  if (token) {
    try {
      const identity = await getSupabaseIdentityFromToken(token);
      if (identity) {
        if (ENV.subscriptionSource === "supabase") {
          const user = await ensureSubscriptionState(identity);
          if (user) return user;
          console.error("[Auth] ensureSubscriptionState returned null for a verified Supabase identity", { userId: identity.id });
        } else {
          const user = await resolveUserFromSupabaseIdentity(identity);
          if (user) return fromLegacyUser(user);
        }
      } else {
        console.warn("[Auth] Bearer token present but did not verify as a Supabase identity");
      }
    } catch (error) {
      // Falls through to the legacy check below, but this is not expected
      // to ever throw for a real Supabase-signed-in user, so log it.
      console.error("[Auth] Supabase identity resolution threw:", error);
    }
  }

  try {
    return fromLegacyUser(await sdk.authenticateRequest(req));
  } catch (error) {
    if (token) console.error("[Auth] Legacy session fallback also failed for a request carrying a Bearer token:", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let cached: Promise<AppUser | null> | null = null;

  return {
    req: opts.req,
    res: opts.res,
    getUser: () => {
      if (!cached) cached = resolveUser(opts.req);
      return cached;
    },
  };
}
