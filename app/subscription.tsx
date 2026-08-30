import { useMemo, useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { BrandMark } from "@/components/ui/brand-mark";
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_START_DATE, type SubscriptionPlanId } from "@/lib/subscription-plans";
import { HYP_PAYMENT_URL } from "@/lib/payment-config";
import { createRegistrationRequest } from "@/lib/registration-requests";
import { supabase } from "@/lib/supabase";

const HYP_PAYMENT_QR_ASSET = require("../assets/images/hyp-payment-qr.png");

export default function SubscriptionScreen() {
  const [email, setEmail] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>("monthly");
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentAttempted, setPaymentAttempted] = useState(false);
  const [registrationRequestId, setRegistrationRequestId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState("");
  const selectedPlan = useMemo(
    () => SUBSCRIPTION_PLANS.find((plan) => plan.id === selectedPlanId) ?? SUBSCRIPTION_PLANS[0],
    [selectedPlanId],
  );

  const continueToPayment = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      Alert.alert("נדרש אימייל", "הזן כתובת אימייל תקינה לפני מעבר לתשלום.");
      return;
    }
    setRequestError("");
    const result = await createRegistrationRequest(supabase, {
      email: normalizedEmail,
      planId: selectedPlan.id,
      amountIls: selectedPlan.priceIls,
    });
    if (result.error || !result.request) {
      setRequestError(result.error ?? "לא ניתן לשמור את בקשת ההרשמה.");
      return;
    }
    setEmail(normalizedEmail);
    setRegistrationRequestId(result.request.id);
    setPaymentReady(true);
    setPaymentAttempted(false);
  };

  const openHypPayment = async () => {
    await Linking.openURL(HYP_PAYMENT_URL);
  };

  const shareHypPayment = async () => {
    try {
      await Share.share({
        title: "תשלום ליומן אימונים",
        message: `קישור לתשלום מאובטח ב־Hyp עבור ${selectedPlan.title}: ${HYP_PAYMENT_URL}`,
        url: HYP_PAYMENT_URL,
      });
    } catch {
      Alert.alert("לא ניתן לשתף", "אפשר לפתוח את דף התשלום ולסרוק את ה־QR במקום.");
    }
  };

  const finishPaymentStep = () => {
    setPaymentAttempted(true);
    Alert.alert(
      "הבקשה התקבלה לבדיקה",
      "בשלב זה התשלום עדיין אינו מאומת אוטומטית. לאחר שתבדוק את העסקה ותיצור את המשתמש ב־Supabase, המשתמש יוכל להתחבר עם אימייל וסיסמה.",
    );
  };

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrandMark />
        <Text style={styles.eyebrow}>הרשמה ומנוי</Text>
        <View style={styles.steps} accessibilityLabel="שלבי ההרשמה">
          <View style={[styles.step, !paymentReady && styles.stepActive]}><Text style={[styles.stepNumber, !paymentReady && styles.stepNumberActive]}>1</Text><Text style={[styles.stepLabel, !paymentReady && styles.stepLabelActive]}>פרטים</Text></View>
          <View style={styles.stepLine} />
          <View style={[styles.step, paymentReady && styles.stepActive]}><Text style={[styles.stepNumber, paymentReady && styles.stepNumberActive]}>2</Text><Text style={[styles.stepLabel, paymentReady && styles.stepLabelActive]}>תשלום</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.step}><Text style={styles.stepNumber}>3</Text><Text style={styles.stepLabel}>אישור</Text></View>
        </View>
        <Text style={styles.title}>{paymentReady ? "תשלום מאובטח" : "בחר את המסלול שלך"}</Text>
        <Text style={styles.subtitle}>
          {paymentReady
            ? "סרוק את הקוד ממכשיר אחר או פתח את דף התשלום ישירות. לאחר אישור התשלום, מנהל ייצור את החשבון ויאפשר התחברות."
            : "הזן אימייל, בחר מסלול ושלח בקשת הרשמה לפני יצירת החשבון."}
        </Text>

        {!paymentReady ? (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>כתובת אימייל לרישום</Text>
              <TextInput
                accessibilityLabel="כתובת אימייל להרשמה"
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
              <Text style={styles.helper}>האימייל ישמש את המנהל ליצירת חשבון לאחר אישור התשלום.</Text>
            </View>

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
                מחירון ההשקה מתחיל ב־{SUBSCRIPTION_START_DATE === "2026-08-31" ? "31.08.2026" : SUBSCRIPTION_START_DATE}. אחרי התשלום תתבצע בדיקת מנהל לפני יצירת החשבון.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="המשך לתשלום"
              onPress={continueToPayment}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>המשך לתשלום ולסריקת QR</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <View style={styles.paymentCopy}>
                  <Text style={styles.paymentLabel}>פרטי הרשמה</Text>
                  <Text style={styles.paymentTitle}>{selectedPlan.title}</Text>
                  <Text style={styles.paymentEmail}>{email}</Text>
                </View>
                <Text style={styles.paymentPrice}>{selectedPlan.priceLabel}</Text>
              </View>
              <Text style={styles.paymentInstruction}>סריקה ממכשיר אחר</Text>
              <Text style={styles.requestId}>מזהה בקשה: {registrationRequestId ?? "—"}</Text>
              <Text style={styles.amountInstruction}>הזן בדף Hyp את הסכום: {selectedPlan.priceLabel}</Text>
              <View style={styles.qrFrame}>
                <Image accessibilityLabel="קוד QR לתשלום Hyp" source={HYP_PAYMENT_QR_ASSET} style={styles.qrImage} />
              </View>
              <Text style={styles.qrCaption}>סרוק את הקוד כדי לפתוח את דף התשלום של Hyp</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="פתיחת דף התשלום של Hyp"
              onPress={() => void openHypPayment()}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>פתיחת דף תשלום Hyp</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="שיתוף קישור התשלום"
              onPress={() => void shareHypPayment()}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>שיתוף קישור התשלום</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="סימון סיום שלב התשלום"
              onPress={finishPaymentStep}
              style={({ pressed }) => [styles.confirmButton, paymentAttempted && styles.confirmButtonDone, pressed && styles.pressed]}
            >
              <Text style={styles.confirmText}>{paymentAttempted ? "הבקשה ממתינה לאישור מנהל" : "סיימתי את שלב התשלום"}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="חזרה לעריכת פרטי ההרשמה"
              onPress={() => setPaymentReady(false)}
              style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
            >
              <Text style={styles.textButtonText}>חזרה לבחירת מסלול</Text>
            </Pressable>
          </>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="מעבר למסך התחברות"
          onPress={() => router.replace("/register")}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>יש לי חשבון מאושר · להתחברות</Text>
        </Pressable>

        {requestError ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{requestError}</Text> : null}
        <Text style={styles.disclaimer}>
          אין להזין פרטי כרטיס או סיסמה בתוך דף התשלום. התשלום מתבצע רק בדף המאובטח של Hyp. לאחר אישור התשלום, המנהל יוצר את המשתמש ומאפשר התחברות באימייל ובסיסמה.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 40 },
  steps: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 2 },
  step: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  stepActive: { opacity: 1 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: "#52759C", color: "#AAB7C8", fontSize: 11, fontWeight: "900", textAlign: "center", paddingTop: 4 },
  stepNumberActive: { backgroundColor: "#F5B72C", borderColor: "#F5B72C", color: "#0B1224" },
  stepLabel: { color: "#7E8DA4", fontSize: 10, fontWeight: "800" },
  stepLabelActive: { color: "#F5B72C" },
  stepLine: { width: 24, height: 1, backgroundColor: "#334C6C" },
  eyebrow: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" },
  title: { color: "#F7F9FC", fontSize: 30, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", fontSize: 14, lineHeight: 21, textAlign: "right" },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  label: { color: "#D9E2EF", fontSize: 13, fontWeight: "900", textAlign: "right" },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "#52759C", backgroundColor: "#0F1B31", color: "#F7F9FC", fontSize: 15, paddingHorizontal: 13 },
  helper: { color: "#7E8DA4", fontSize: 10, lineHeight: 15, textAlign: "right" },
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
  paymentCard: { backgroundColor: "#16233A", borderColor: "#F5B72C", borderWidth: 1, borderRadius: 18, padding: 16, gap: 10, alignItems: "stretch" },
  paymentHeader: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  paymentCopy: { flex: 1, gap: 3 },
  paymentLabel: { color: "#F5B72C", fontSize: 11, fontWeight: "900", textAlign: "right" },
  paymentTitle: { color: "#F7F9FC", fontSize: 18, fontWeight: "900", textAlign: "right" },
  paymentEmail: { color: "#AAB7C8", fontSize: 11, textAlign: "right" },
  paymentPrice: { color: "#F5B72C", fontSize: 14, fontWeight: "900", textAlign: "right" },
  paymentInstruction: { color: "#D9E2EF", fontSize: 13, fontWeight: "900", textAlign: "center" },
  requestId: { color: "#7E8DA4", fontSize: 10, textAlign: "center" },
  amountInstruction: { color: "#F5B72C", fontSize: 14, fontWeight: "900", textAlign: "center" },
  qrFrame: { alignSelf: "center", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 10 },
  qrImage: { width: 205, height: 205 },
  qrCaption: { color: "#AAB7C8", fontSize: 11, lineHeight: 17, textAlign: "center" },
  primary: { minHeight: 50, backgroundColor: "#F5B72C", borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryText: { color: "#0B1224", fontSize: 14, fontWeight: "900" },
  secondary: { minHeight: 46, backgroundColor: "#1D2D48", borderColor: "#52759C", borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryText: { color: "#D9E2EF", fontWeight: "800", textAlign: "center" },
  confirmButton: { minHeight: 48, backgroundColor: "#102C2A", borderColor: "#3D8C78", borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  confirmButtonDone: { backgroundColor: "#173E36", borderColor: "#81D7B5" },
  confirmText: { color: "#B8E9D7", fontWeight: "900", textAlign: "center" },
  textButton: { minHeight: 34, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  textButtonText: { color: "#7FCDF0", fontSize: 12, fontWeight: "800" },
  error: { color: "#FF879A", fontSize: 12, lineHeight: 18, textAlign: "right" },
  disclaimer: { color: "#7E8DA4", fontSize: 10, lineHeight: 16, textAlign: "right" },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});
