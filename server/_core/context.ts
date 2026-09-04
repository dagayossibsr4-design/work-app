import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getSupabaseIdentityFromToken } from "./supabaseAuth";
import { resolveUserFromSupabaseIdentity } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function bearerToken(req: CreateExpressContextOptions["req"]): string | null {
  const header = req.headers.authorization;
  return typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  if (!user) {
    // The legacy OAuth cookie/token session is absent - this may be a user
    // who signed in through the app's real, live Supabase auth flow instead.
    const token = bearerToken(opts.req);
    if (token) {
      try {
        const identity = await getSupabaseIdentityFromToken(token);
        if (identity) user = (await resolveUserFromSupabaseIdentity(identity)) ?? null;
      } catch (error) {
        user = null;
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
