import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "user" | "admin";

export function normalizeAppRole(value: unknown): AppRole {
  return value === "admin" ? "admin" : "user";
}

export function isAdminRole(value: unknown): value is "admin" {
  return value === "admin";
}

export async function getCurrentAppRole(client: SupabaseClient | null): Promise<{ role: AppRole | null; userId: string | null; error: string | null }> {
  if (!client) return { role: null, userId: null, error: "Supabase לא מוגדר בסביבה זו." };
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) return { role: null, userId: null, error: authError.message };
  const userId = authData.user?.id ?? null;
  if (!userId) return { role: null, userId: null, error: null };

  const { data, error } = await client.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (error) return { role: null, userId, error: error.message };
  return { role: normalizeAppRole(data?.role), userId, error: null };
}
