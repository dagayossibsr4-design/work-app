import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const isWebRuntime = Platform.OS === "web";
const serverSafeStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};
const browserSafeStorage = {
  getItem: async (key: string) => typeof window === "undefined" ? null : window.localStorage.getItem(key),
  setItem: async (key: string, value: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  },
};

export const isSupabaseConfigured = Boolean(projectUrl && publishableKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(projectUrl, publishableKey, {
      auth: {
        storage: isWebRuntime ? browserSafeStorage : AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: isWebRuntime,
        flowType: "pkce",
      },
    })
  : null;
