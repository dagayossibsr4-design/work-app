import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { supabase } from "@/lib/supabase";
import { getCurrentAppRole, type AppRole } from "@/lib/admin-role";
import { REGISTRATION_STATUS_LABELS, type RegistrationRequest } from "@/lib/registration-requests";

const SUPABASE_DASHBOARD_URL = "https://supabase.com/dashboard";

type RequestStatus = RegistrationRequest["status"];

export default function AdminScreen() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [roleCount, setRoleCount] = useState<number | null>(null);
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);

  const loadAdminState = useCallback(async () => {
    setLoading(true);
    setRoleError("");
    setRequestError("");
    const result = await getCurrentAppRole(supabase);
    setRole(result.role);
    setUserId(result.userId);
    setRoleError(result.error ?? "");
    setSignedOut(!result.userId);
    if (result.role === "admin" && supabase) {
      const [{ count, error: roleQueryError }, { data, error: requestQueryError }] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }),
        supabase.from("registration_requests").select("id,email,plan_id,amount_ils,status,created_at").order("created_at", { ascending: false }).limit(50),
      ]);
      if (!roleQueryError) setRoleCount(count ?? 0);
      if (requestQueryError) setRequestError("טבלת בקשות ההרשמה עדיין לא הוגדרה ב־Supabase. הרץ את supabase/registration-requests.sql.");
      else setRequests((data ?? []) as RegistrationRequest[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAdminState();
    if (!supabase) return;
    const { data: listener } = supabase.auth.onAuthStateChange(() => { void loadAdminState(); });
    return () => listener.subscription.unsubscribe();
  }, [loadAdminState]);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    router.replace("/register" as never);
  };

  const openSupabase = async () => {
    const supported = await Linking.canOpenURL(SUPABASE_DASHBOARD_URL);
    if (supported) await Linking.openURL(SUPABASE_DASHBOARD_URL);
    else Alert.alert("לא ניתן לפתוח קישור", "פתח את Supabase בדפדפן במחשב.");
  };

  const updateRequestStatus = async (request: RegistrationRequest, status: RequestStatus) => {
    if (!supabase || !userId) return;
    setUpdatingRequestId(request.id);
    const { error } = await supabase
      .from("registration_requests")
      .update({
        status,
        reviewed_at: status === "approved" || status === "rejected" ? new Date().toISOString() : null,
        reviewed_by: status === "approved" || status === "rejected" ? userId : null,
      })
      .eq("id", request.id);
    if (error) {
      Alert.alert("העדכון נכשל", "בדוק שהרצת את SQL ושיש לך הרשאת admin.");
    } else {
      setRequests((current) => current.map((item) => item.id === request.id ? { ...item, status } : item));
    }
    setUpdatingRequestId(null);
  };

  const confirmStatus = (request: RegistrationRequest, status: RequestStatus) => {
    const title = status === "approved" ? "לאשר ליצירת חשבון?" : status === "rejected" ? "לדחות את הבקשה?" : "לסמן שהתשלום בבדיקה?";
    Alert.alert(title, `${request.email}\n${request.amount_ils} ₪`, [
      { text: "ביטול", style: "cancel" },
      { text: "אישור", onPress: () => void updateRequestStatus(request, status) },
    ]);
  };

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>חזרה</Text></Pressable>
        <Text style={styles.eyebrow}>ניהול מערכת</Text>
        <Text style={styles.title}>לוח הבקרה</Text>
        <Text style={styles.subtitle}>מעקב אחר בקשות הרשמה, בדיקת תשלום ואישור משתמשים דרך Supabase.</Text>

        {loading ? <View style={styles.card}><ActivityIndicator color="#F5B72C" /><Text style={styles.note}>בודק הרשאות…</Text></View> : null}
        {!loading && (signedOut || !userId) ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>נדרשת התחברות</Text>
            <Text style={styles.note}>התחבר עם קישור הכניסה לפני פתיחת לוח הבקרה.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace("/register" as never)} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>מעבר להתחברות</Text></Pressable>
          </View>
        ) : null}
        {!loading && userId && role !== "admin" ? (
          <View style={styles.denied}>
            <Text style={styles.deniedTitle}>אין הרשאת מנהל</Text>
            <Text style={styles.note}>המשתמש מחובר, אך אינו מוגדר כ־admin. שינוי הרשאות מתבצע רק ב־Supabase.</Text>
            <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>התנתקות</Text></Pressable>
          </View>
        ) : null}
        {!loading && role === "admin" ? (
          <>
            <View style={styles.successCard}>
              <View style={styles.statusRow}><View style={styles.liveDot} /><Text style={styles.successTitle}>גישה מאושרת</Text></View>
              <Text style={styles.note}>הפעולות מוגנות לפי role. משתמש חדש לא נוצר עד שתבדוק את התשלום ותאשר אותו.</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}><Text style={styles.statValue}>{requests.length}</Text><Text style={styles.statLabel}>בקשות הרשמה</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{requests.filter((item) => item.status === "awaiting_payment").length}</Text><Text style={styles.statLabel}>ממתינות לתשלום</Text></View>
              <View style={styles.stat}><Text style={styles.statValue}>{roleCount ?? "—"}</Text><Text style={styles.statLabel}>רשומות תפקיד</Text></View>
            </View>

            <View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>בקשות הרשמה</Text><Text style={styles.sectionHint}>עד 50 אחרונות</Text></View>
            {requestError ? <View style={styles.warningCard}><Text style={styles.warningTitle}>נדרשת הגדרת טבלה</Text><Text style={styles.note}>{requestError}</Text></View> : null}
            {!requestError && requests.length === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>אין בקשות כרגע</Text><Text style={styles.note}>כאשר משתמש ישלח הרשמה מהאפליקציה, הבקשה תופיע כאן.</Text></View> : null}
            {requests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}><Text style={styles.requestEmail}>{request.email}</Text><Text style={styles.requestAmount}>{request.amount_ils} ₪</Text></View>
                <View style={styles.requestMeta}><Text style={styles.requestStatus}>{REGISTRATION_STATUS_LABELS[request.status]}</Text><Text style={styles.requestPlan}>{request.plan_id === "annual" ? "שנתי" : "חודשי"}</Text></View>
                <Text style={styles.requestId}>מזהה: {request.id}</Text>
                <View style={styles.actionRow}>
                  {request.status === "awaiting_payment" ? <Pressable disabled={updatingRequestId === request.id} onPress={() => confirmStatus(request, "payment_review")} style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}><Text style={styles.smallButtonText}>תשלום נבדק</Text></Pressable> : null}
                  {request.status === "payment_review" ? <Pressable disabled={updatingRequestId === request.id} onPress={() => confirmStatus(request, "approved")} style={({ pressed }) => [styles.smallButton, styles.approveButton, pressed && styles.pressed]}><Text style={styles.smallButtonText}>אשר ליצירת חשבון</Text></Pressable> : null}
                  {request.status !== "rejected" && request.status !== "approved" ? <Pressable disabled={updatingRequestId === request.id} onPress={() => confirmStatus(request, "rejected")} style={({ pressed }) => [styles.smallButton, styles.rejectButton, pressed && styles.pressed]}><Text style={styles.rejectText}>דחה</Text></Pressable> : null}
                </View>
              </View>
            ))}

            <Pressable accessibilityRole="button" onPress={() => void openSupabase()} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>פתיחת Supabase</Text></Pressable>
            <View style={styles.guideCard}>
              <Text style={styles.guideTitle}>סדר העבודה שלך</Text>
              <Text style={styles.guideStep}><Text style={styles.stepNumber}>01</Text>  בדוק את העסקה והסכום באזור העסקאות של Hyp.</Text>
              <Text style={styles.guideStep}><Text style={styles.stepNumber}>02</Text>  העבר את הבקשה ל“תשלום בבדיקה”.</Text>
              <Text style={styles.guideStep}><Text style={styles.stepNumber}>03</Text>  אשר ליצירת חשבון רק לאחר שהכסף התקבל.</Text>
              <Text style={styles.guideStep}><Text style={styles.stepNumber}>04</Text>  ב־Supabase בחר Authentication → Users → Add user.</Text>
              <Text style={styles.guideStep}><Text style={styles.stepNumber}>05</Text>  אל תעניק למשתמש role של admin; הוא יתחבר עם OTP.</Text>
            </View>
            <View style={styles.infoCard}><Text style={styles.infoTitle}>השלב האוטומטי</Text><Text style={styles.note}>לאחר קבלת פרטי Hyp API ו־Notify, נחליף את בדיקת התשלום הידנית באימות אוטומטי.</Text></View>
            <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>התנתקות</Text></Pressable>
          </>
        ) : null}
        {roleError ? <Text accessibilityLiveRegion="assertive" style={styles.error}>שגיאת חיבור: {roleError}</Text> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 40 },
  back: { alignSelf: "flex-end", minHeight: 40, justifyContent: "center", paddingHorizontal: 12 },
  backText: { color: "#9BC9FF", fontWeight: "800", textAlign: "right" },
  eyebrow: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" },
  title: { color: "#F7F9FC", fontSize: 32, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", fontSize: 14, lineHeight: 21, textAlign: "right" },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  cardTitle: { color: "#F7F9FC", fontSize: 18, fontWeight: "900", textAlign: "right" },
  note: { color: "#AAB7C8", fontSize: 12, lineHeight: 19, textAlign: "right" },
  primary: { minHeight: 48, backgroundColor: "#F5B72C", borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryText: { color: "#0B1224", fontWeight: "900", textAlign: "center" },
  secondary: { minHeight: 46, borderColor: "#52759C", borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryText: { color: "#D9E2EF", fontWeight: "800", textAlign: "center" },
  denied: { backgroundColor: "#3A1D2A", borderColor: "#FF879A", borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  deniedTitle: { color: "#FFB0BC", fontSize: 19, fontWeight: "900", textAlign: "right" },
  successCard: { backgroundColor: "#123F36", borderColor: "#4FE0B2", borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  statusRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#81D7B5" },
  successTitle: { color: "#81D7B5", fontSize: 20, fontWeight: "900", textAlign: "right" },
  statsRow: { flexDirection: "row-reverse", gap: 8 },
  stat: { flex: 1, backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 16, padding: 12, gap: 4 },
  statValue: { color: "#F5B72C", fontSize: 18, fontWeight: "900", textAlign: "right" },
  statLabel: { color: "#AAB7C8", fontSize: 10, lineHeight: 15, textAlign: "right" },
  sectionTitleRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "baseline" },
  sectionTitle: { color: "#F7F9FC", fontSize: 18, fontWeight: "900", textAlign: "right" },
  sectionHint: { color: "#7E8DA4", fontSize: 10, textAlign: "right" },
  warningCard: { backgroundColor: "#3C2D13", borderColor: "#F5B72C", borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  warningTitle: { color: "#F5B72C", fontSize: 16, fontWeight: "900", textAlign: "right" },
  requestCard: { backgroundColor: "#1A2944", borderColor: "#52759C", borderWidth: 1, borderRadius: 18, padding: 15, gap: 8 },
  requestHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 10 },
  requestEmail: { color: "#F7F9FC", fontSize: 14, fontWeight: "900", textAlign: "right", flex: 1 },
  requestAmount: { color: "#F5B72C", fontSize: 15, fontWeight: "900" },
  requestMeta: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 8 },
  requestStatus: { color: "#81D7B5", fontSize: 11, fontWeight: "900" },
  requestPlan: { color: "#AAB7C8", fontSize: 11, textAlign: "right" },
  requestId: { color: "#7E8DA4", fontSize: 9, textAlign: "right" },
  actionRow: { flexDirection: "row-reverse", gap: 8, justifyContent: "flex-start" },
  smallButton: { minHeight: 38, backgroundColor: "#F5B72C", borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  smallButtonText: { color: "#0B1224", fontSize: 11, fontWeight: "900", textAlign: "center" },
  approveButton: { backgroundColor: "#81D7B5" },
  rejectButton: { backgroundColor: "transparent", borderColor: "#FF879A", borderWidth: 1 },
  rejectText: { color: "#FFB0BC", fontSize: 11, fontWeight: "900" },
  guideCard: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  guideTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right" },
  guideStep: { color: "#AAB7C8", fontSize: 12, lineHeight: 19, textAlign: "right" },
  stepNumber: { color: "#F5B72C", fontWeight: "900" },
  infoCard: { backgroundColor: "#102C2A", borderColor: "#3D8C78", borderWidth: 1, borderRadius: 16, padding: 15, gap: 6 },
  infoTitle: { color: "#81D7B5", fontSize: 15, fontWeight: "900", textAlign: "right" },
  error: { color: "#FF879A", fontSize: 12, lineHeight: 18, textAlign: "right" },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});
