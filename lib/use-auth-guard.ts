import { useEffect, useState } from "react";
import { router } from "expo-router";
import { supabase } from "./supabase";

export type AuthGuardState = "checking" | "authorized" | "redirecting";

/**
 * Guards a screen behind a signed-in Supabase session. Redirects to
 * `redirectTo` (default `/register`) as soon as it's clear there's no
 * session, and again whenever the session is later cleared (e.g. sign-out
 * from another tab). Screens should render nothing but a loading state while
 * this is not "authorized", to avoid a flash of protected content.
 */
export function useAuthGuard(redirectTo: string = "/register"): AuthGuardState {
  const [state, setState] = useState<AuthGuardState>("checking");

  useEffect(() => {
    if (!supabase) {
      // Supabase isn't configured in this environment; don't block access.
      setState("authorized");
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        setState("authorized");
      } else {
        setState("redirecting");
        router.replace(redirectTo as never);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        setState("redirecting");
        router.replace(redirectTo as never);
      } else {
        setState("authorized");
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [redirectTo]);

  return state;
}
