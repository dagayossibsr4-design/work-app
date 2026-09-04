import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

let client: SupabaseClient | null | undefined;

/**
 * Server-only Supabase client authenticated with the service_role key -
 * bypasses RLS and can call the Admin API (list every registered user,
 * suspend/unsuspend accounts, etc). Never expose this key or client to any
 * browser-reachable code path.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  client =
    ENV.supabaseUrl && ENV.supabaseServiceRoleKey
      ? createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;
  return client;
}
