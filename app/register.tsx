import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWorkoutStore } from "../lib/workout-store";

export default function EntryIndex() {
  const router = useRouter();
  const store = useWorkoutStore() as any;
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const authTimestamp = await AsyncStorage.getItem("auth_timestamp");
        const authKey = await AsyncStorage.getItem("auth_user_key");
        const authDisplayName = await AsyncStorage.getItem("auth_user_display_name");

        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const now = Date.now();

        if (authTimestamp && authKey) {
          const timePassed = now - parseInt(authTimestamp, 10);

          if (timePassed < ONE_DAY_MS) {
            // עדיין בתוקף 24 שעות -> כניסה ישירה
            if (typeof store.setAccountName === "function") {
              await store.setAccountName(authKey);
            }
            if (typeof store.setUserName === "function" && authDisplayName) {
              await store.setUserName(authDisplayName);
            }
            if (typeof store.syncAccount === "function") {
              void store.syncAccount(authKey);
            }
            router.replace("/(tabs)");
            return;
          }
        }

        // עבר יום שלם -> עבור למסך ההתחברות
        router.replace("/register");
      } catch (err) {
        router.replace("/register");
      } finally {
        setChecking(false);
      }
    };

    void checkAuthStatus();
  }, []);

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