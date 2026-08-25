import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const isWebRuntime = Platform.OS === "web";
const hasBrowserStorage = typeof window !== "undefined";
const serverSafeStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

export const isSupabaseConfigured = Boolean(projectUrl && publishableKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(projectUrl, publishableKey, {
      auth: {
        storage: isWebRuntime ? (hasBrowserStorage ? undefined : serverSafeStorage) : AsyncStorage,
        persistSession: !isWebRuntime || hasBrowserStorage,
        autoRefreshToken: !isWebRuntime || hasBrowserStorage,
        detectSessionInUrl: isWebRuntime && hasBrowserStorage,
      },
    })
  : null;
