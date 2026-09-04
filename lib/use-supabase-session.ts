import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * The current Supabase session, resolved safely:
 * - `undefined` while still checking
 * - `null` once confirmed signed out
 * - the `Session` once signed in
 *
 * `onAuthStateChange` is treated as the authoritative source - it fires once
 * with the real session (including null) as soon as the client has finished
 * reading persisted storage. `getSession()` is only used as an immediate
 * positive shortcut: its result is used right away when it already has a
 * session, but a negative result from it is ignored, because on a fresh page
 * load it can resolve with `null` before the persisted session has actually
 * been read from storage. Acting on that early null was causing a
 * signed-in user to be treated as signed out on every reload - flashing to
 * the register screen or a global lock before flipping back once the real
 * session loaded a moment later.
 */
export function useSupabaseSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    let active = true;
    let resolved = false;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      resolved = true;
      setSession(nextSession);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session && !resolved) setSession(data.session);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return session;
}
