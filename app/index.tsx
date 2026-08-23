import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkDailyAuth = async () => {
      try {
        const lastLoginStr = await AsyncStorage.getItem("auth_timestamp");
        const authUser = await AsyncStorage.getItem("auth_user_key");

        const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 שעות
        const now = Date.now();

        if (lastLoginStr && authUser) {
          const lastLogin = parseInt(lastLoginStr, 10);
          const timePassed = now - lastLogin;

          // אם עברו פחות מ-24 שעות -> כניסה ישירה
          if (timePassed < ONE_DAY_MS) {
            router.replace("/(tabs)");
            return;
          }
        }

        // עברו יותר מ-24 שעות או כניסה ראשונה -> דרוש סיסמה
        router.replace("/register");
      } catch (e) {
        router.replace("/register");
      } finally {
        setChecking(false);
      }
    };

    void checkDailyAuth();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#f59e0b" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070b14",
    justifyContent: "center",
    alignItems: "center",
  },
});