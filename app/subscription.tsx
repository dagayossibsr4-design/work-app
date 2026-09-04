import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { BrandMark } from "@/components/ui/brand-mark";
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_START_DATE, type SubscriptionPlanId } from "@/lib/subscription-plans";
import { trpc } from "@/lib/trpc";
import { useSupabaseSession } from "@/lib/use-supabase-session";

const SIGN_IN_REQUIRED_MESSAGE = "כדי לעבור לתשלום יש קודם להירשם או להתחבר לחשבון. 14 הימים הראשונים חינם, ללא צורך בכרטיס אשראי.";

export default function SubscriptionScreen() {
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const session = useSupabaseSession();
  const isSignedIn = session === undefined ? null : Boolean(session);

  const createCheckoutLinkMutation = trpc.subscription.createCheckoutLink.useMutation();

  const selectedPlan = useMemo(
    () => SUBSCRIPTION_PLANS.find((plan) => plan.id === selectedPlanId) ?? SUBSCRIPTION_PLANS[0],
    [selectedPlanId],
  );

  const goToRegister = () => router.push("/register" as never);

  const handleProceedToPayment = async () => {
    if (!isSignedIn) {
      setRequestError(SIGN_IN_REQUIRED_MESSAGE);
      Alert.alert("נדרשת הרשמה או התחברות", SIGN_IN_REQUIRED_MESSAGE, [
        { text: "ביטול", style: "cancel" },
        { text: "מעבר להרשמה", onPress: goToRegister },
      ]);
      return;
    }

    try {
      setIsLoading(true);
      setRequestError("");

      const result = await createCheckoutLinkMutation.mutateAsync({ planType: selectedPlan.id });

      if (result?.url) {
        await Linking.openURL(result.url);
      } else {
        throw new Error("לא התקבל קישור תשלום תקין ממערכת הסליקה.");
      }
    } catch (err: any) {
      // Defense in depth: never surface a raw auth error code (e.g. "(10001)")
      // to the user, even if the session bridge above ever fails unexpectedly.
      const isAuthError = err?.data?.code === "UNAUTHORIZED" || /\(1000[12]\)/.test(String(err?.message ?? ""));
      const errorMsg = isAuthError
        ? SIGN_IN_REQUIRED_MESSAGE
        : err?.message || "אירעה שגיאה ביצירת דף התשלום. נסה שוב מאוחר יותר.";
      setRequestError(errorMsg);
      if (isAuthError) {
        Alert.alert("נדרשת הרשמה או התחברות", errorMsg, [
          { text: "ביטול", style: "cancel" },
          { text: "מעבר להרשמה", onPress: goToRegister },
        ]);
      } else {
        Alert.alert("שגיאת סליקה", errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrandMark />
        <Text style={styles.eyebrow}>מנוי ProLifto</Text>
        
        <Text style={styles.title}>בחר את המסלול שלך</Text>
        <Text style={styles.subtitle}>
          כל משתמש חדש זכאי ל-14 ימי ניסיון בחינם, ללא צורך בכרטיס אשראי. המסלולים כאן מיועדים למי שכבר יש לו חשבון ורוצה להמשיך אחרי תום הניסיון, או לשדרג מוקדם יותר.
        </Text>

        {isSignedIn === false ? (
          <View style={styles.signInNotice}>
            <Text style={styles.signInNoticeTitle}>עדיין אין לך חשבון?</Text>
            <Text style={styles.signInNoticeText}>הירשם קודם ל-14 ימי ניסיון חינם. התשלום למטה זמין רק למשתמש מחובר.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="הרשמה עכשיו" onPress={goToRegister} style={({ pressed }) => [styles.signInNoticeButton, pressed && styles.pressed]}>
              <Text style={styles.signInNoticeButtonText}>הרשמה ל-14 ימי ניסיון חינם</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>מסלולים זמינים</Text>
          <Text style={styles.sectionHint}>מחירון השקה בתוקף מ־31.08.2026</Text>
        </View>

        {SUBSCRIPTION_PLANS.map((plan) => {
          const selected = plan.id === selectedPlanId;
          return (
            <Pressable
              key={plan.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`בחירת ${plan.title}`}
              onPress={() => setSelectedPlanId(plan.id)}
              style={({ pressed }) => [styles.planCard, selected && styles.planCardSelected, pressed && styles.pressed]}
            >
              <View style={styles.planTopRow}>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.planCopy}>
                  <View style={styles.planTitleRow}>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    {plan.featured ? <Text style={styles.badge}>מומלץ</Text> : null}
                  </View>
                  <Text style={styles.planPeriod}>{plan.periodLabel}</Text>
                </View>
                <Text style={styles.price}>{plan.priceLabel}</Text>
              </View>
              <Text style={styles.planDescription}>{plan.description}</Text>
              <View style={styles.highlights}>
                {plan.highlights.map((highlight) => (
                  <Text key={highlight} style={styles.highlight}>✓ {highlight}</Text>
                ))}
              </View>
            </Pressable>
          );
        })}

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>המסלול שנבחר</Text>
          <Text style={styles.summaryTitle}>{selectedPlan.title} · {selectedPlan.priceLabel}</Text>
          <Text style={styles.summaryNote}>
            הסליקה מתבצעת באופן מאובטח. החשבונית והמנוי מופקים ומאושרים אוטומטית מיד בסיום התשלום.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="מעבר לתשלום מאובטח"
          disabled={isLoading}
          onPress={handleProceedToPayment}
          style={({ pressed }) => [styles.primary, (pressed || isLoading) && styles.pressed]}
        >
          {isLoading ? (
            <ActivityIndicator color="#0B1224" />
          ) : (
            <Text style={styles.primaryText}>מעבר לתשלום מאובטח באשראי</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="מעבר להרשמה או התחברות"
          onPress={() => router.replace("/register")}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>משתמש חדש? לחץ כאן להרשמה (14 ימי ניסיון חינם)</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="חזרה למסך הראשי"
          onPress={() => router.replace("/")}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>חזרה לאפליקציה</Text>
        </Pressable>

        {requestError ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{requestError}</Text> : null}

        <Text style={styles.disclaimer}>
          התשלום מבוצע באמצעות דף תשלום מאובטח בתקן PCI של מורנינג (חשבונית ירוקה). פרטי האשראי אינם נשמרים בשרתי האפליקציה.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 40 },
  eyebrow: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" },
  title: { color: "#F7F9FC", fontSize: 30, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", fontSize: 14, lineHeight: 21, textAlign: "right" },
  signInNotice: { backgroundColor: "#1C3152", borderColor: "#3F76A7", borderWidth: 1, borderRadius: 16, padding: 15, gap: 8 },
  signInNoticeTitle: { color: "#F5B72C", fontSize: 15, fontWeight: "900", textAlign: "right" },
  signInNoticeText: { color: "#D9E2EF", fontSize: 12, lineHeight: 18, textAlign: "right" },
  signInNoticeButton: { minHeight: 44, backgroundColor: "#F5B72C", borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  signInNoticeButtonText: { color: "#0B1224", fontWeight: "900", fontSize: 13 },
  sectionHeader: { gap: 3, marginTop: 4 },
  sectionTitle: { color: "#F7F9FC", fontSize: 19, fontWeight: "900", textAlign: "right" },
  sectionHint: { color: "#7E8DA4", fontSize: 11, textAlign: "right" },
  planCard: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 16, gap: 9 },
  planCardSelected: { borderColor: "#F5B72C", backgroundColor: "#1D2D48" },
  planTopRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#52759C", alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: "#F5B72C" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#F5B72C" },
  planCopy: { flex: 1, gap: 2 },
  planTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  planTitle: { color: "#F7F9FC", fontSize: 16, fontWeight: "900", textAlign: "right" },
  badge: { color: "#0B1224", backgroundColor: "#F5B72C", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, fontSize: 10, fontWeight: "900" },
  planPeriod: { color: "#AAB7C8", fontSize: 11, textAlign: "right" },
  price: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" },
  planDescription: { color: "#D9E2EF", fontSize: 12, lineHeight: 18, textAlign: "right" },
  highlights: { gap: 3 },
  highlight: { color: "#AAB7C8", fontSize: 11, lineHeight: 17, textAlign: "right" },
  summary: { backgroundColor: "#102C2A", borderColor: "#3D8C78", borderWidth: 1, borderRadius: 16, padding: 15, gap: 5 },
  summaryLabel: { color: "#81D7B5", fontSize: 11, fontWeight: "800", textAlign: "right" },
  summaryTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right" },
  summaryNote: { color: "#B8E9D7", fontSize: 11, lineHeight: 17, textAlign: "right" },
  primary: { minHeight: 50, backgroundColor: "#F5B72C", borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryText: { color: "#0B1224", fontSize: 14, fontWeight: "900" },
  secondary: { minHeight: 46, backgroundColor: "#1D2D48", borderColor: "#52759C", borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryText: { color: "#D9E2EF", fontWeight: "800", textAlign: "center" },
  error: { color: "#FF879A", fontSize: 12, lineHeight: 18, textAlign: "right" },
  disclaimer: { color: "#7E8DA4", fontSize: 10, lineHeight: 16, textAlign: "right" },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});