import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

/**
 * Verifies a Supabase access token server-side (via Supabase's own /user
 * endpoint) and returns the identity it belongs to, or null for a missing,
 * expired, or forged token. This is the only trust boundary for bridging a
 * Supabase-authenticated request into the app's own user record.
 */
export async function getSupabaseIdentityFromToken(token: string): Promise<SupabaseIdentity | null> {
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
