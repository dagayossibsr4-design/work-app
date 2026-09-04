import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { BrandMark } from "@/components/ui/brand-mark";
import { supabase } from "@/lib/supabase";
import { getCurrentAppRole } from "@/lib/admin-role";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const incomingUrl = Linking.useURL();
  const goHome = () => router.replace("/(tabs)" as never);

  const signOut = async () => {
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: signOutError } = await supabase.auth.signOut();
    setBusy(false);
    if (signOutError) {
      setError("לא ניתן להתנתק כרגע. נסה שוב.");
      return;
    }
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setMessage("התנתקת בהצלחה.");
  };

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
        setError("לא ניתן להשלים את הכניסה מהקישור.");
        return;
      }
      setMessage("החשבון התחבר בהצלחה.");
      void client.auth.getSession().then(({ data }) => {
        setIsSignedIn(Boolean(data.session));
        if (data.session) goHome();
      });
    });
  }, [incomingUrl]);

  const handleAuthAction = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("נא להזין כתובת אימייל תקינה.");
      return;
    }
    if (password.length < 6) {
      setError("הסיסמה חייבת להכיל לפחות 6 תווים.");
      return;
    }
    if (!supabase) {
      setError("מערכת ההתחברות אינה מוגדרת כרגע.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    if (isRegisterMode) {
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            subscription_status: "trialing",
            trial_ends_at: trialEndsAt,
          },
        },
      });

      setBusy(false);
      if (signUpError) {
        setError(signUpError.message || "אירעה שגיאה בעת ההרשמה.");
        return;
      }

      if (data.session) {
        setMessage("נרשמת בהצלחה! תקופת הניסיון ל-14 ימים החלה.");
        goHome();
      } else {
        setMessage("ההרשמה נקלטה! אם מופעל אימות מייל, בדוק את תיבת הדואר והתחבר.");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      setBusy(false);
      if (signInError) {
        setError("פרטי ההתחברות אינם תקינים. נסה שוב.");
        return;
      }

      setMessage("ההתחברות הצליחה.");
      goHome();
    }
  };

  return (
    <ScreenContainer className="px-5 pt-5">
      <View style={styles.content}>
        <BrandMark />
        <Text style={styles.eyebrow}>חשבון אישי</Text>
        <Text style={styles.title}>
          {isSignedIn ? "החשבון מחובר" : isRegisterMode ? "הרשמה ל-14 ימי ניסיון" : "כניסת משתמש"}
        </Text>
        <Text style={styles.subtitle}>
          {isRegisterMode
            ? "הירשם עכשיו וקבל 14 ימי ניסיון מלאים ללא תשלום."
            : "משתמש קיים? הזן את פרטי ההתחברות כדי להיכנס לחשבונך."}
        </Text>

        {isSignedIn ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>הסנכרון פעיל</Text>
            <Text style={styles.note}>נתוני החשבון נטענים ונשמרים באופן פרטי תחת המשתמש המחובר.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="חזרה למסך הבית" onPress={goHome} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>חזרה למסך הבית</Text>
            </Pressable>
            {isAdmin ? (
              <Pressable accessibilityRole="button" accessibilityLabel="פתיחת לוח אדמין" onPress={() => router.push("/admin" as never)} style={({ pressed }) => [styles.adminButton, pressed && styles.pressed]}>
                <Text style={styles.adminButtonText}>פתיחת לוח אדמין</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel="התנתקות מהחשבון" onPress={() => void signOut()} disabled={busy} style={({ pressed }) => [styles.secondary, pressed && styles.pressed, busy && styles.disabled]}>
              <Text style={styles.secondaryText}>התנתקות</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.tabContainer}>
              <Pressable onPress={() => { setIsRegisterMode(true); setError(""); }} style={[styles.tab, isRegisterMode && styles.tabActive]}>
                <Text style={[styles.tabText, isRegisterMode && styles.tabTextActive]}>הרשמה חדשה (ניסיון חינם)</Text>
              </Pressable>
              <Pressable onPress={() => { setIsRegisterMode(false); setError(""); }} style={[styles.tab, !isRegisterMode && styles.tabActive]}>
                <Text style={[styles.tabText, !isRegisterMode && styles.tabTextActive]}>התחברות</Text>
              </Pressable>
            </View>

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

            <View style={styles.passwordRow}>
              <TextInput
                accessibilityLabel="סיסמה"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setPassword}
                placeholder="סיסמה (לפחות 6 תווים)"
                placeholderTextColor="#7E8DA4"
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                textAlign="right"
                value={password}
              />
              <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "הסתרת סיסמה" : "הצגת סיסמה"} onPress={() => setShowPassword((visible) => !visible)} style={({ pressed }) => [styles.passwordToggle, pressed && styles.pressed]}>
                <Text style={styles.passwordToggleText}>{showPassword ? "הסתר" : "הצג"}</Text>
              </Pressable>
            </View>

            <Pressable accessibilityRole="button" accessibilityLabel={isRegisterMode ? "הרשמה" : "התחברות"} onPress={() => void handleAuthAction()} disabled={busy} style={({ pressed }) => [styles.primary, pressed && styles.pressed, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color="#0B1224" /> : <Text style={styles.primaryText}>{isRegisterMode ? "התחל 14 ימי ניסיון חינם" : "התחבר לחשבון"}</Text>}
            </Pressable>

            {message ? <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text> : null}
            {error ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
          </View>
        )}

        <Pressable accessibilityRole="button" accessibilityLabel="מסלולי מנוי" onPress={() => router.push("/subscription" as never)} style={({ pressed }) => [styles.subscriptionButton, pressed && styles.pressed]}>
          <Text style={styles.subscriptionButtonText}>צפייה במסלולי מנוי וסליקה</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 35 },
  eyebrow: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" },
  title: { color: "#F7F9FC", fontSize: 30, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", fontSize: 14, lineHeight: 21, textAlign: "right" },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  cardTitle: { color: "#F7F9FC", fontSize: 18, fontWeight: "900", textAlign: "right" },
  note: { color: "#AAB7C8", fontSize: 12, lineHeight: 19, textAlign: "right" },
  tabContainer: { flexDirection: "row-reverse", backgroundColor: "#0F1B31", borderRadius: 10, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: "#2C3B55" },
  tabText: { color: "#7E8DA4", fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: "#F7F9FC" },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "#52759C", backgroundColor: "#0F1B31", color: "#F7F9FC", fontSize: 15, paddingHorizontal: 13 },
  passwordRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  passwordInput: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "#52759C", backgroundColor: "#0F1B31", color: "#F7F9FC", fontSize: 15, paddingHorizontal: 13 },
  passwordToggle: { minHeight: 44, minWidth: 58, borderRadius: 10, borderWidth: 1, borderColor: "#52759C", backgroundColor: "#1D2D48", alignItems: "center", justifyContent: "center" },
  passwordToggleText: { color: "#D9E2EF", fontSize: 12, fontWeight: "800" },
  primary: { minHeight: 48, backgroundColor: "#F5B72C", borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryText: { color: "#0B1224", fontSize: 14, fontWeight: "900" },
  secondary: { minHeight: 46, backgroundColor: "#1D2D48", borderColor: "#52759C", borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryText: { color: "#D9E2EF", fontWeight: "800" },
  adminButton: { minHeight: 46, backgroundColor: "#5B2C83", borderColor: "#C86DDE", borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  adminButtonText: { color: "#F4D9FF", fontWeight: "900" },
  subscriptionButton: { minHeight: 48, backgroundColor: "#2A6F8F", borderColor: "#72C7E7", borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  subscriptionButtonText: { color: "#E6F8FF", fontWeight: "900" },
  success: { color: "#81D7B5", fontSize: 12, lineHeight: 18, textAlign: "right" },
  error: { color: "#FF879A", fontSize: 12, lineHeight: 18, textAlign: "right" },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});