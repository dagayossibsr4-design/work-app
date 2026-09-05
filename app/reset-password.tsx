import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { BrandMark } from "@/components/ui/brand-mark";
import { supabase } from "@/lib/supabase";

// Reached only via the "reset password" link Supabase emails. The client is
// configured with detectSessionInUrl (see lib/supabase.ts), so simply
// loading this page with the emailed link's ?code= already exchanges it for
// a real session automatically - this screen just waits for that session to
// appear before letting the user set a new password.
export default function ResetPasswordScreen() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setReady(Boolean(session)));
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSetPassword = async () => {
    if (password.length < 6) {
      setError("הסיסמה חייבת להכיל לפחות 6 תווים.");
      return;
    }
    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות.");
      return;
    }
    if (!supabase) {
      setError("מערכת ההתחברות אינה מוגדרת כרגע.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message || "לא ניתן לעדכן את הסיסמה כרגע.");
      return;
    }
    setMessage("הסיסמה עודכנה בהצלחה. מעביר אותך לאפליקציה…");
    setTimeout(() => router.replace("/(tabs)" as never), 1200);
  };

  return (
    <ScreenContainer className="px-5 pt-5">
      <View style={styles.content}>
        <BrandMark variant="original" />
        <Text style={styles.title}>איפוס סיסמה</Text>
        {!ready ? (
          <Text style={styles.subtitle}>מאמת את הקישור מהמייל…</Text>
        ) : (
          <View style={styles.card}>
            <Text style={styles.subtitle}>הזן סיסמה חדשה לחשבון שלך.</Text>
            <TextInput
              accessibilityLabel="סיסמה חדשה"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(value) => { setPassword(value); if (error) setError(""); }}
              placeholder="סיסמה חדשה (לפחות 6 תווים)"
              placeholderTextColor="#7E8DA4"
              secureTextEntry
              style={styles.input}
              textAlign="right"
              value={password}
              returnKeyType="next"
            />
            <TextInput
              accessibilityLabel="אימות סיסמה חדשה"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(value) => { setConfirmPassword(value); if (error) setError(""); }}
              placeholder="אימות סיסמה"
              placeholderTextColor="#7E8DA4"
              secureTextEntry
              style={styles.input}
              textAlign="right"
              value={confirmPassword}
              returnKeyType="done"
              onSubmitEditing={() => void handleSetPassword()}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="עדכון סיסמה" onPress={() => void handleSetPassword()} disabled={busy} style={({ pressed }) => [styles.primary, pressed && styles.pressed, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color="#0B1224" /> : <Text style={styles.primaryText}>עדכון סיסמה</Text>}
            </Pressable>
            {message ? <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text> : null}
            {error ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 35 },
  title: { color: "#F7F9FC", fontSize: 26, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", fontSize: 14, lineHeight: 21, textAlign: "right" },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "#52759C", backgroundColor: "#0F1B31", color: "#F7F9FC", fontSize: 15, paddingHorizontal: 13 },
  primary: { minHeight: 48, backgroundColor: "#F5B72C", borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryText: { color: "#0B1224", fontSize: 14, fontWeight: "900" },
  success: { color: "#81D7B5", fontSize: 12, lineHeight: 18, textAlign: "right" },
  error: { color: "#FF879A", fontSize: 12, lineHeight: 18, textAlign: "right" },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});
