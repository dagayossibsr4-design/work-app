import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";
import { ENV } from "./env";

let client: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  client = ENV.supabaseUrl && ENV.supabaseAnonKey ? createClient(ENV.supabaseUrl, ENV.supabaseAnonKey) : null;
  return client;
}

export type SupabaseIdentity = {
  id: string;
  email: string | null;
  name: string | null;
};

// Every tRPC request resolves the caller's identity once for context, even
// requests that turn out not to need it - so a short positive cache avoids
// re-verifying (and, in the network fallback below, re-hitting Supabase for)
// the same token on every single call a client makes in quick succession.
const verifiedTokenCache = new Map<string, { identity: SupabaseIdentity; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 5000;

function getCached(token: string): SupabaseIdentity | null {
  const entry = verifiedTokenCache.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    verifiedTokenCache.delete(token);
    return null;
  }
  return entry.identity;
}

function setCached(token: string, identity: SupabaseIdentity) {
  if (verifiedTokenCache.size >= MAX_CACHE_ENTRIES) verifiedTokenCache.clear();
  verifiedTokenCache.set(token, { identity, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Verifies the token's signature locally against the Supabase project's JWT
 * secret - no network call. This is the preferred path: it is instant and
 * cannot fail because Supabase's own API happened to be slow or unreachable
 * for that one request.
 */
async function verifyLocally(token: string): Promise<SupabaseIdentity | null> {
  if (!ENV.supabaseJwtSecret) return null;
  try {
    const secret = new TextEncoder().encode(ENV.supabaseJwtSecret);
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    const metadata = payload.user_metadata as { name?: unknown } | undefined;
    return {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
      name: typeof metadata?.name === "string" ? metadata.name : null,
    };
  } catch {
    return null;
  }
}

/**
 * Fallback used only when SUPABASE_JWT_SECRET is not configured: asks
 * Supabase's own /user endpoint to verify the token. This is a real network
 * round-trip per (uncached) call, so it is slower and depends on Supabase's
 * API being reachable - prefer setting SUPABASE_JWT_SECRET instead.
 */
async function verifyRemotely(token: string): Promise<SupabaseIdentity | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const metadataName = data.user.user_metadata?.name;
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    name: typeof metadataName === "string" ? metadataName : null,
  };
}

/**
 * Verifies a Supabase access token server-side and returns the identity it
 * belongs to, or null for a missing, expired, or forged token. This is the
 * only trust boundary for bridging a Supabase-authenticated request into the
 * app's own user record.
 */
export async function getSupabaseIdentityFromToken(token: string): Promise<SupabaseIdentity | null> {
  const cached = getCached(token);
  if (cached) return cached;

  const identity = (await verifyLocally(token)) ?? (await verifyRemotely(token));
  if (identity) setCached(token, identity);
  return identity;
}
