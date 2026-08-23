import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { BrandMark } from "@/components/ui/brand-mark";
import { startOAuthLogin } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";

export default function RegisterScreen() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const continueWithAccount = async () => {
    setBusy(true);
    setError("");
    try {
      await startOAuthLogin();
    } catch {
      setError("לא ניתן לפתוח כרגע את מסך הרישום. נסה שוב בעוד רגע.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer className="px-5 pt-5">
      <View style={styles.content}>
        <BrandMark />
        <Text style={styles.eyebrow}>חשבון אישי</Text>
        <Text style={styles.title}>{user ? `שלום, ${user.name ?? "משתמש"}` : "יצירת חשבון"}</Text>
        <Text style={styles.subtitle}>
          התחבר או הירשם כדי לשמור את הנתונים שלך תחת חשבון אישי ולהמשיך בין מכשירים.
        </Text>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color="#F5B72C" /><Text style={styles.note}>בודק את מצב החשבון…</Text></View>
        ) : user ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>אתה מחובר</Text>
            <Text style={styles.note}>{user.email ?? "החשבון שלך פעיל"}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="חזרה למסך הבית" onPress={() => router.replace("/" as never)} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>חזרה למסך הבית</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>איך זה עובד?</Text>
            <Text style={styles.note}>לחיצה על הכפתור תפתח אימות מאובטח. לאחר ההרשמה תחזור אוטומטית לאפליקציה, והאימונים, התבניות, ההתאוששות, האירובי ויעדי התזונה יישמרו תחת המשתמש שלך.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="הירשם או התחבר" onPress={() => void continueWithAccount()} disabled={busy} style={({ pressed }) => [styles.primary, pressed && styles.pressed, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color="#0B1224" /> : <Text style={styles.primaryText}>הירשם / התחבר</Text>}
            </Pressable>
            {error ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
          </View>
        )}

        <Pressable accessibilityRole="button" accessibilityLabel="המשך בלי חשבון" onPress={() => router.replace("/" as never)} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <Text style={styles.secondaryText}>המשך בלי חשבון</Text>
        </Pressable>
        <Text style={styles.privacy}>בלי חשבון: הנתונים נשמרים במכשיר בלבד. עם חשבון: נתוני הליבה מסונכרנים לפי המשתמש ונגישים ממכשירים נוספים. נתוני התזונה המקומיים יעברו בהדרגה לסנכרון מלא.</Text>
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
  loading: { alignItems: "center", gap: 9, paddingVertical: 28 },
  primary: { minHeight: 48, backgroundColor: "#F5B72C", borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryText: { color: "#0B1224", fontSize: 14, fontWeight: "900" },
  secondary: { minHeight: 46, backgroundColor: "#1D2D48", borderColor: "#52759C", borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryText: { color: "#D9E2EF", fontWeight: "800" },
  error: { color: "#FF879A", fontSize: 11, lineHeight: 17, textAlign: "right" },
  privacy: { color: "#7E8DA4", fontSize: 10, lineHeight: 16, textAlign: "right" },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});
