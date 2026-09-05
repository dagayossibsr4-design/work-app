import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getSupabaseIdentityFromToken } from "./supabaseAuth";
import { resolveUserFromSupabaseIdentity } from "../db";

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
  getUser: () => Promise<User | null>;
};

function bearerToken(req: CreateExpressContextOptions["req"]): string | null {
  const header = req.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

async function resolveUser(req: CreateExpressContextOptions["req"]): Promise<User | null> {
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
        const user = await resolveUserFromSupabaseIdentity(identity);
        if (user) return user;
      }
    } catch {
      // Falls through to the legacy check below.
    }
  }

  try {
    return await sdk.authenticateRequest(req);
  } catch {
    return null;
  }
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let cached: Promise<User | null> | null = null;

  return {
    req: opts.req,
    res: opts.res,
    getUser: () => {
      if (!cached) cached = resolveUser(opts.req);
      return cached;
    },
  };
}
