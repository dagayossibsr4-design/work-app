import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import {
  getNutritionCloudSaveStatus,
  subscribeNutritionCloudSaveStatus,
  type NutritionCloudSaveStatus,
} from "@/lib/nutrition-persistence";
import { supabase } from "@/lib/supabase";

type SaveState = "checking" | "saved" | "saving" | "failed" | "sign-in" | "unavailable";

/** Explains where meal records are saved and gives a direct sign-in path. */
export function PermanentSaveBanner() {
  const [state, setState] = useState<SaveState>("checking");
  const [cloudStatus, setCloudStatus] = useState<NutritionCloudSaveStatus>(
    getNutritionCloudSaveStatus(),
  );

  useEffect(() => subscribeNutritionCloudSaveStatus(setCloudStatus), []);

  useEffect(() => {
    if (!supabase) {
      setState("unavailable");
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setState(data.session ? "saving" : "sign-in");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState(session ? "saving" : "sign-in");
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (state === "sign-in" || state === "unavailable") return;
    if (cloudStatus === "saved") setState("saved");
    if (cloudStatus === "saving") setState("saving");
    if (cloudStatus === "failed") setState("failed");
  }, [cloudStatus, state]);

  if (state === "checking") {
    return <View style={styles.card}><Text style={styles.loadingText}>בודק שמירה קבועה…</Text></View>;
  }
  if (state === "saved") {
    return <View accessibilityLabel="הארוחות נשמרות בענן" style={[styles.card, styles.savedCard]}><Text style={styles.icon}>✓</Text><View style={styles.textBlock}><Text style={styles.savedTitle}>הארוחות נשמרות קבוע בענן</Text><Text style={styles.description}>כל שינוי מגובה לחשבון שלך וזמין גם במכשיר אחר.</Text></View></View>;
  }
  if (state === "saving") {
    return <View accessibilityLabel="הארוחות נשמרות בענן" style={[styles.card, styles.savingCard]}><Text style={styles.icon}>…</Text><View style={styles.textBlock}><Text style={styles.signInTitle}>שומר את הארוחות בענן</Text><Text style={styles.description}>השינוי נשמר מקומית ומגובה לחשבון שלך.</Text></View></View>;
  }
  if (state === "failed") {
    return <View accessibilityLabel="שמירת הענן נכשלה" style={[styles.card, styles.unavailableCard]}><Text style={styles.icon}>!</Text><View style={styles.textBlock}><Text style={styles.signInTitle}>הגיבוי לענן לא הושלם</Text><Text style={styles.description}>הנתונים נשמרו במכשיר. בדוק את חיבור Supabase והתחבר מחדש.</Text></View></View>;
  }
  if (state === "sign-in") {
    return <Pressable accessibilityRole="button" accessibilityLabel="התחבר כדי לשמור ארוחות בענן" onPress={() => router.push("/register" as never)} style={({ pressed }) => [styles.card, styles.signInCard, pressed && styles.pressed]}><Text style={styles.icon}>☁</Text><View style={styles.textBlock}><Text style={styles.signInTitle}>התחבר לשמירה קבועה</Text><Text style={styles.description}>כך הארוחות לא יאבדו ברענון או במעבר מכשיר.</Text></View><Text style={styles.arrow}>‹</Text></Pressable>;
  }
  return <View style={[styles.card, styles.unavailableCard]}><Text style={styles.icon}>!</Text><View style={styles.textBlock}><Text style={styles.signInTitle}>השמירה המקומית פעילה</Text><Text style={styles.description}>חיבור הענן לא הוגדר ב־Render. הוסף את משתני Supabase כדי לגבות לחשבון.</Text></View></View>;
}

const styles = StyleSheet.create({
  card: { flexDirection: "row-reverse", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  savedCard: { backgroundColor: "#102E2A", borderColor: "#42D392" },
  savingCard: { backgroundColor: "#172943", borderColor: "#5DB4FF" },
  signInCard: { backgroundColor: "#1C3152", borderColor: "#5DB4FF" },
  unavailableCard: { backgroundColor: "#2A2413", borderColor: "#F5B72C" },
  icon: { width: 27, height: 27, borderRadius: 14, overflow: "hidden", textAlign: "center", lineHeight: 27, backgroundColor: "#0B1224", color: "#F7F9FC", fontSize: 15, fontWeight: "900" },
  textBlock: { flex: 1, alignItems: "flex-end" },
  savedTitle: { color: "#7DE2B8", fontSize: 13, fontWeight: "900", textAlign: "right" },
  signInTitle: { color: "#F7F9FC", fontSize: 13, fontWeight: "900", textAlign: "right" },
  description: { color: "#B9C5D6", fontSize: 11, lineHeight: 16, marginTop: 2, textAlign: "right" },
  loadingText: { color: "#AAB7C8", fontSize: 12, fontWeight: "700", textAlign: "right", width: "100%" },
  arrow: { color: "#F7F9FC", fontSize: 24, fontWeight: "900" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
