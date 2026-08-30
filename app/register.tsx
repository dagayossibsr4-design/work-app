import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { BrandMark } from "@/components/ui/brand-mark";
import { supabase } from "@/lib/supabase";
import { getCurrentAppRole } from "@/lib/admin-role";
import { existingUserOtpOptions, NEW_USER_ACCESS_MESSAGE } from "@/lib/access-policy";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const incomingUrl = Linking.useURL();
  const goHome = () => router.replace("/(tabs)" as never);

  useEffect(() => {
    if (!supabase) return;
    const updateSessionState = (session: Session | null) => {
      const sessionExists = Boolean(session);
      setIsSignedIn(sessionExists);
      if (!sessionExists) {
        setIsAdmin(false);
        return;
      }
      void getCurrentAppRole(supabase).then((result) => setIsAdmin(result.role === "admin"));
      goHome();
    };
    void supabase.auth.getSession().then(({ data }) => updateSessionState(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => updateSessionState(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !incomingUrl) return;
    const client = supabase;
    const code = Linking.parse(incomingUrl).queryParams?.code;
    if (typeof code !== "string") return;
    void client.auth.exchangeCodeForSession(code).then(({ error: authError }) => {
      if (authError) {
        setError("לא ניתן להשלים את הכניסה מהקישור. נסה לשלוח קישור חדש.");
        return;
      }
      setMessage("החשבון התחבר ונשמר בדפדפן זה.");
      void client.auth.getSession().then(({ data }) => {
        setIsSignedIn(Boolean(data.session));
        if (data.session) goHome();
      });
    });
  }, [incomingUrl]);

  const continueWithAccount = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !supabase) {
      setError("הזן כתובת דוא״ל תקינה כדי להתחבר לחשבון האישי.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const redirectTo = Platform.OS === "web" && typeof window !== "undefined"
      ? `${window.location.origin}/register`
      : Linking.createURL("register");
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: existingUserOtpOptions(redirectTo),
    });
    setBusy(false);
    if (authError) {
      setError(`הכתובת אינה מאושרת לכניסה. ${NEW_USER_ACCESS_MESSAGE}`);
      return;
    }
    setMessage("קישור כניסה נשלח לדוא״ל. פתח אותו כדי להשלים את החיבור והסנכרון.");
  };

  return (
    <ScreenContainer className="px-5 pt-5">
      <View style={styles.content}>
        <BrandMark />
        <Text style={styles.eyebrow}>חשבון אישי</Text>
        <Text style={styles.title}>{isSignedIn ? "החשבון מחובר" : "כניסת משתמש מאושר"}</Text>
        <Text style={styles.subtitle}>רק משתמשים שנוצרו ואושרו מראש יכולים להתחבר. משתמש חדש מתחיל קודם במסלול ובתשלום, ורק לאחר מכן החשבון מופעל על ידי מנהל.</Text>

        {isSignedIn ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>הסנכרון פעיל</Text>
            <Text style={styles.note}>נתוני החשבון נטענים ונשמרים באופן פרטי תחת המשתמש המחובר.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="חזרה למסך הבית" onPress={goHome} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>חזרה למסך הבית</Text>
            </Pressable>
            {isAdmin ? <Pressable accessibilityRole="button" accessibilityLabel="פתיחת לוח אדמין" onPress={() => router.push("/admin" as never)} style={({ pressed }) => [styles.adminButton, pressed && styles.pressed]}><Text style={styles.adminButtonText}>פתיחת לוח אדמין</Text></Pressable> : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>כניסה למשתמש קיים</Text>
            <Text style={styles.note}>נשלח קישור חד־פעמי רק לכתובת שכבר אושרה במערכת. משתמש חדש צריך להתחיל במסלול תשלום.</Text>
            <TextInput
              accessibilityLabel="כתובת דוא״ל"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="name@example.com"
              placeholderTextColor="#7E8DA4"
              style={styles.input}
              textAlign="right"
              value={email}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="שליחת קישור כניסה" onPress={() => void continueWithAccount()} disabled={busy} style={({ pressed }) => [styles.primary, pressed && styles.pressed, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color="#0B1224" /> : <Text style={styles.primaryText}>שלח קישור כניסה</Text>}
            </Pressable>
            {message ? <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text> : null}
            {error ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
          </View>
        )}

        <Pressable accessibilityRole="button" accessibilityLabel="הרשמה ובחירת מסלול" onPress={() => router.push("/subscription" as never)} style={({ pressed }) => [styles.subscriptionButton, pressed && styles.pressed]}>
          <Text style={styles.subscriptionButtonText}>הרשמה ובחירת מסלול</Text>
        </Pressable>
        <Text style={styles.privacy}>משתמש חדש: בחר מסלול, בצע תשלום, וקבל אישור מנהל לפני יצירת החשבון. משתמשים קיימים יכולים להתחבר כאן.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 35 },
  eyebrow: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" },
  title: { color: "#F7F9FC", fontSize: 32, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", fontSize: 14, lineHeight: 21, textAlign: "right" },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  cardTitle: { color: "#F7F9FC", fontSize: 18, fontWeight: "900", textAlign: "right" },
  note: { color: "#AAB7C8", fontSize: 12, lineHeight: 19, textAlign: "right" },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "#52759C", backgroundColor: "#0F1B31", color: "#F7F9FC", fontSize: 15, paddingHorizontal: 13 },
  primary: { minHeight: 48, backgroundColor: "#F5B72C", borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryText: { color: "#0B1224", fontSize: 14, fontWeight: "900" },
  secondary: { minHeight: 46, backgroundColor: "#1D2D48", borderColor: "#52759C", borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryText: { color: "#D9E2EF", fontWeight: "800" },
  adminButton: { minHeight: 46, backgroundColor: "#5B2C83", borderColor: "#C86DDE", borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  adminButtonText: { color: "#F4D9FF", fontWeight: "900" },
  subscriptionButton: { minHeight: 48, backgroundColor: "#2A6F8F", borderColor: "#72C7E7", borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  subscriptionButtonText: { color: "#E6F8FF", fontWeight: "900" },
  success: { color: "#81D7B5", fontSize: 11, lineHeight: 17, textAlign: "right" },
  error: { color: "#FF879A", fontSize: 11, lineHeight: 17, textAlign: "right" },
  privacy: { color: "#7E8DA4", fontSize: 10, lineHeight: 16, textAlign: "right" },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});
