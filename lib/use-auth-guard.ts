import { useEffect } from "react";
import { router } from "expo-router";
import { useSupabaseSession } from "./use-supabase-session";
import { supabase } from "./supabase";

export type AuthGuardState = "checking" | "authorized" | "redirecting";

/**
 * Guards a screen behind a signed-in Supabase session. Redirects to
 * `redirectTo` (default `/register`) once it is clear there is no session,
 * and again whenever the session is later cleared (e.g. sign-out from
 * another tab). Screens should render nothing but a loading state while
 * this is not "authorized", to avoid a flash of protected content.
 */
export function useAuthGuard(redirectTo: string = "/register"): AuthGuardState {
  const session = useSupabaseSession();

  useEffect(() => {
    if (supabase && session === null) router.replace(redirectTo as never);
  }, [session, redirectTo]);

  if (!supabase) return "authorized";
  if (session === undefined) return "checking";
  return session ? "authorized" : "redirecting";
}
