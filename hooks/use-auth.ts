import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const authTimestamp = await AsyncStorage.getItem("auth_timestamp");
      const authKey = await AsyncStorage.getItem("auth_user_key");
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const now = Date.now();

      if (authTimestamp && authKey) {
        const timePassed = now - Number.parseInt(authTimestamp, 10);

        if (timePassed < ONE_DAY_MS) {
          setUser({
            id: Number.parseInt(authKey, 10) || 0,
            openId: authKey,
            name: authKey.includes("_") ? authKey.split("_")[0] : authKey,
            email: `${authKey}@local.app`,
            loginMethod: "local",
            lastSignedIn: new Date(Number.parseInt(authTimestamp, 10)),
          });
          setLoading(false);
          return;
        }

        await AsyncStorage.removeItem("auth_timestamp");
        await AsyncStorage.removeItem("auth_user_key");
      }

      if (Platform.OS === "web") {
        const apiUser = await Api.getMe();
        if (apiUser) {
          const userInfo: Auth.User = {
            id: apiUser.id,
            openId: apiUser.openId,
            name: apiUser.name,
            email: apiUser.email,
            loginMethod: apiUser.loginMethod,
            lastSignedIn: new Date(apiUser.lastSignedIn),
          };
          setUser(userInfo);
          await Auth.setUserInfo(userInfo);
        } else {
          setUser(null);
          await Auth.clearUserInfo();
        }
        return;
      }

      const sessionToken = await Auth.getSessionToken();
      if (!sessionToken) {
        setUser(null);
        return;
      }

      const cachedUser = await Auth.getUserInfo();
      setUser(cachedUser ?? null);
    } catch (err) {
      const authError = err instanceof Error ? err : new Error("Failed to fetch user");
      setError(authError);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch {
      // ממשיכים לנקות את ההתחברות המקומית גם אם הקריאה לרשת נכשלה.
    } finally {
      await AsyncStorage.removeItem("auth_timestamp");
      await AsyncStorage.removeItem("auth_user_key");
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    if (autoFetch) {
      void fetchUser();
    } else {
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
  };
}
