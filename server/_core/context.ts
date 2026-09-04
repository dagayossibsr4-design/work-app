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
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    // The legacy OAuth cookie/token session is absent or invalid - this may
    // be a user who signed in through the app's real, live Supabase auth
    // flow instead, so fall through to checking that.
  }

  const token = bearerToken(req);
  if (!token) return null;

  try {
    const identity = await getSupabaseIdentityFromToken(token);
    if (!identity) return null;
    return (await resolveUserFromSupabaseIdentity(identity)) ?? null;
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
