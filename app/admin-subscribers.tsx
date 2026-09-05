import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AuthGuardFallback } from "@/components/auth-guard-fallback";
import { trpc } from "@/lib/trpc";
import { ADMIN_ACCESS_CODE_STORAGE_KEY } from "@/lib/admin-access";

const STATUS_LABELS: Record<string, string> = {
  trialing: "בניסיון",
  active: "מנוי פעיל",
  expired: "פג תוקף",
  canceled: "בוטל",
};

const STATUS_COLORS: Record<string, string> = {
  trialing: "#F5B72C",
  active: "#81D7B5",
  expired: "#FF879A",
  canceled: "#7E8DA4",
};
const UNKNOWN_STATUS_COLOR = "#7E8DA4";

const SUSPEND_CONFIRM_MESSAGE =
  "החשבון לא יוכל להתחבר או לחדש התחברות מרגע זה. חשוב לדעת: אם המשתמש מחובר כרגע במכשיר, ההתחברות הפעילה שלו עלולה להישאר בתוקף עד כשעה נוספת (כך פועל אימות הטוקן של Supabase) - זו לא נעילה מיידית לגמרי, אלא חסימת כניסה/חידוש מרגע זה והלאה.";

function formatDate(value: string | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function relativeFromNow(value: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  if (Math.abs(diffMinutes) < 60) return diffMinutes >= 0 ? `בעוד ${diffMinutes} דק׳` : `לפני ${Math.abs(diffMinutes)} דק׳`;
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return diffHours >= 0 ? `בעוד ${diffHours} שעות` : `לפני ${Math.abs(diffHours)} שעות`;
  const diffDays = Math.round(diffHours / 24);
  return diffDays >= 0 ? `בעוד ${diffDays} ימים` : `לפני ${Math.abs(diffDays)} ימים`;
}

function confirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.confirm === "function") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "ביטול", style: "cancel" },
    { text: "אישור", style: "destructive", onPress: onConfirm },
  ]);
}

export default function AdminSubscribersScreen() {
  // `undefined` = still checking storage, `null` = no code saved yet.
  const [adminToken, setAdminToken] = useState<string | null | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [passwordEditUserId, setPasswordEditUserId] = useState<string | null>(null);
  const [passwordDraft, setPasswordDraft] = useState("");

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(ADMIN_ACCESS_CODE_STORAGE_KEY).then((value) => {
      if (!active) return;
      if (!value) router.replace("/admin-login" as never);
      else setAdminToken(value);
    });
    return () => {
      active = false;
    };
  }, []);

  const usersQuery = trpc.admin.listUsers.useQuery(
    { adminToken: adminToken ?? "" },
    {
      enabled: Boolean(adminToken),
      // Approximates a "live" view: there is no login/logout event log, so
      // this re-polls the current account list instead of streaming events.
      refetchInterval: 15_000,
      retry: false,
    },
  );
  const suspendMutation = trpc.admin.setUserSuspended.useMutation();
  const passwordMutation = trpc.admin.setUserPassword.useMutation();

  useEffect(() => {
    const isRejected = (usersQuery.error as { data?: { code?: string } } | null)?.data?.code === "UNAUTHORIZED";
    if (isRejected) {
      void AsyncStorage.removeItem(ADMIN_ACCESS_CODE_STORAGE_KEY).then(() => router.replace("/admin-login" as never));
    }
  }, [usersQuery.error]);

  if (adminToken === undefined || (usersQuery.error as { data?: { code?: string } } | null)?.data?.code === "UNAUTHORIZED") {
    return <AuthGuardFallback />;
  }

  const list = usersQuery.data ?? [];
  const counts = list.reduce<Record<string, number>>((acc, user) => {
    const key = user.subscriptionStatus ?? "ללא_חשבון_מנוי";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const toggleSuspend = (userId: string, nextSuspended: boolean) => {
    if (!adminToken) return;
    setPendingUserId(userId);
    setStatusMessage("");
    setStatusIsError(false);
    suspendMutation.mutate(
      { adminToken, userId, suspend: nextSuspended },
      {
        onSuccess: () => {
          setStatusMessage(nextSuspended ? "הגישה של המשתמש הושהתה." : "הגישה של המשתמש שוחזרה.");
          setStatusIsError(false);
          setPendingUserId(null);
          void usersQuery.refetch();
        },
        onError: (mutationError) => {
          setStatusMessage(`הפעולה נכשלה: ${mutationError.message || "שגיאה לא ידועה"}`);
          setStatusIsError(true);
          setPendingUserId(null);
        },
      },
    );
  };

  const requestToggleSuspend = (userId: string, email: string | null, nextSuspended: boolean) => {
    if (!nextSuspended) {
      toggleSuspend(userId, false);
      return;
    }
    confirm(
      "נתק משתמש?",
      `${email ?? userId}\n\n${SUSPEND_CONFIRM_MESSAGE}`,
      () => toggleSuspend(userId, true),
    );
  };

  const submitPasswordChange = (userId: string) => {
    if (!adminToken) return;
    if (passwordDraft.length < 6) {
      setStatusMessage("הסיסמה החדשה חייבת להכיל לפחות 6 תווים.");
      setStatusIsError(true);
      return;
    }
    setStatusMessage("");
    setStatusIsError(false);
    passwordMutation.mutate(
      { adminToken, userId, newPassword: passwordDraft },
      {
        onSuccess: () => {
          setStatusMessage("הסיסמה עודכנה בהצלחה.");
          setStatusIsError(false);
          setPasswordEditUserId(null);
          setPasswordDraft("");
        },
        onError: (mutationError) => {
          setStatusMessage(`עדכון הסיסמה נכשל: ${mutationError.message || "שגיאה לא ידועה"}`);
          setStatusIsError(true);
        },
      },
    );
  };

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="חזרה" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backText}>‹ חזרה</Text>
        </Pressable>
        <Text style={styles.eyebrow}>לוח בעלים</Text>
        <Text style={styles.title}>מנויים ומשתמשים</Text>
        <Text style={styles.subtitle}>הרשימה נטענת ישירות מ-Supabase (כל מי שנרשם, גם אם עדיין לא ביצע פעולה מחוברת) ומתעדכנת אוטומטית כל 15 שניות.</Text>

        <View style={styles.statsRow}>
          <Stat label="סה״כ משתמשים" value={list.length} />
          <Stat label="בניסיון" value={counts.trialing ?? 0} color={STATUS_COLORS.trialing} />
          <Stat label="מנוי פעיל" value={counts.active ?? 0} color={STATUS_COLORS.active} />
          <Stat label="פג/בוטל" value={(counts.expired ?? 0) + (counts.canceled ?? 0)} color={STATUS_COLORS.expired} />
        </View>

        {usersQuery.isLoading ? <Text style={styles.note}>טוען נתונים…</Text> : null}
        {usersQuery.isError && !usersQuery.isLoading ? (
          <View style={styles.card}>
            <Text style={styles.noteTitle}>לא ניתן לטעון את רשימת המשתמשים</Text>
            <Text style={styles.note}>{usersQuery.error?.message || "שגיאה לא ידועה."}</Text>
            <Text style={styles.note}>ברוב המקרים זה אומר ש-SUPABASE_SERVICE_ROLE_KEY עדיין לא הוגדר (או שגוי) במשתני הסביבה ב-Render.</Text>
          </View>
        ) : null}
        {list.length === 0 && !usersQuery.isLoading && !usersQuery.isError ? (
          <View style={styles.card}><Text style={styles.note}>אין עדיין משתמשים רשומים.</Text></View>
        ) : null}
        {statusMessage ? <Text accessibilityLiveRegion="polite" style={statusIsError ? styles.statusMessageError : styles.statusMessage}>{statusMessage}</Text> : null}

        {list.map((user) => {
          const status = user.subscriptionStatus;
          const statusColor = (status && STATUS_COLORS[status]) ?? UNKNOWN_STATUS_COLOR;
          const isBusy = pendingUserId === user.id && suspendMutation.isPending;
          return (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <Text style={styles.userEmail}>{user.email ?? "ללא אימייל"}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22`, borderColor: statusColor }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                    {user.isSuspended ? "מושהה" : status ? (STATUS_LABELS[status] ?? status) : "ללא חשבון מנוי"}
                  </Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>נכנס לאחרונה (התחברות בפועל)</Text>
                <Text style={styles.metaValue}>{formatDate(user.lastSignInAt)}</Text>
              </View>
              {user.lastActiveAt ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>פעיל לאחרונה באפליקציה</Text>
                  <Text style={styles.metaValue}>{formatDate(user.lastActiveAt)}</Text>
                </View>
              ) : null}
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>נרשם בתאריך</Text>
                <Text style={styles.metaValue}>{formatDate(user.createdAt)}</Text>
              </View>
              {user.trialEndsAt ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{status === "active" ? "המנוי בתוקף עד" : "הניסיון בתוקף עד"}</Text>
                  <Text style={styles.metaValue}>{formatDate(user.trialEndsAt)} · {relativeFromNow(user.trialEndsAt)}</Text>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={user.isSuspended ? `שחזור גישה ל-${user.email ?? user.id}` : `ניתוק ${user.email ?? user.id}`}
                disabled={isBusy}
                onPress={() => requestToggleSuspend(user.id, user.email, !user.isSuspended)}
                style={({ pressed }) => [
                  user.isSuspended ? styles.restoreButton : styles.suspendButton,
                  pressed && styles.pressed,
                  isBusy && styles.disabled,
                ]}
              >
                {isBusy ? (
                  <ActivityIndicator color={user.isSuspended ? "#0B1224" : "#FFB0BC"} />
                ) : (
                  <Text style={user.isSuspended ? styles.restoreButtonText : styles.suspendButtonText}>
                    {user.isSuspended ? "שחזור גישה" : "נתק משתמש"}
                  </Text>
                )}
              </Pressable>
              {passwordEditUserId === user.id ? (
                <View style={styles.passwordEditRow}>
                  <TextInput
                    accessibilityLabel={`סיסמה חדשה עבור ${user.email ?? user.id}`}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setPasswordDraft}
                    placeholder="סיסמה חדשה (לפחות 6 תווים)"
                    placeholderTextColor="#7E8DA4"
                    secureTextEntry
                    style={styles.passwordInput}
                    textAlign="right"
                    value={passwordDraft}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="עדכון הסיסמה"
                    disabled={passwordMutation.isPending}
                    onPress={() => submitPasswordChange(user.id)}
                    style={({ pressed }) => [styles.passwordConfirmButton, pressed && styles.pressed, passwordMutation.isPending && styles.disabled]}
                  >
                    {passwordMutation.isPending ? <ActivityIndicator color="#0B1224" /> : <Text style={styles.passwordConfirmButtonText}>עדכון</Text>}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="ביטול שינוי סיסמה"
                    onPress={() => { setPasswordEditUserId(null); setPasswordDraft(""); }}
                    style={({ pressed }) => [styles.passwordCancelButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.passwordCancelButtonText}>ביטול</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`שינוי סיסמה עבור ${user.email ?? user.id}`}
                  onPress={() => { setPasswordEditUserId(user.id); setPasswordDraft(""); }}
                  style={({ pressed }) => [styles.changePasswordButton, pressed && styles.pressed]}
                >
                  <Text style={styles.changePasswordButtonText}>שינוי סיסמה</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 40 },
  back: { alignSelf: "flex-end", minHeight: 40, justifyContent: "center", paddingHorizontal: 12 },
  backText: { color: "#9BC9FF", fontWeight: "800", textAlign: "right" },
  eyebrow: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" },
  title: { color: "#F7F9FC", fontSize: 30, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", fontSize: 12, lineHeight: 18, textAlign: "right" },
  note: { color: "#AAB7C8", fontSize: 12, lineHeight: 18, textAlign: "right" },
  noteTitle: { color: "#FFB0BC", fontSize: 14, fontWeight: "900", textAlign: "right", marginBottom: 4 },
  statusMessage: { color: "#42D392", fontSize: 12, fontWeight: "800", textAlign: "right" },
  statusMessageError: { color: "#FF879A", fontSize: 12, fontWeight: "800", textAlign: "right" },
  statsRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  stat: { flexGrow: 1, minWidth: 78, backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 16, padding: 12, gap: 4, alignItems: "flex-end" },
  statValue: { color: "#F7F9FC", fontSize: 20, fontWeight: "900" },
  statLabel: { color: "#AAB7C8", fontSize: 10, textAlign: "right" },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 16 },
  userCard: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  userHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 8 },
  userEmail: { color: "#F7F9FC", fontSize: 14, fontWeight: "900", textAlign: "right", flex: 1 },
  statusBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: "900" },
  metaRow: { flexDirection: "row-reverse", justifyContent: "space-between" },
  metaLabel: { color: "#7E8DA4", fontSize: 11 },
  metaValue: { color: "#D9E2EF", fontSize: 11, fontWeight: "700" },
  suspendButton: { marginTop: 6, minHeight: 42, borderColor: "#FB7185", borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  suspendButtonText: { color: "#FFB0BC", fontWeight: "900", fontSize: 12 },
  restoreButton: { marginTop: 6, minHeight: 42, backgroundColor: "#42D392", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  restoreButtonText: { color: "#0B1224", fontWeight: "900", fontSize: 12 },
  changePasswordButton: { marginTop: 6, minHeight: 42, borderColor: "#65BDF6", borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  changePasswordButtonText: { color: "#9BC9FF", fontWeight: "900", fontSize: 12 },
  passwordEditRow: { marginTop: 6, flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  passwordInput: { flex: 1, minWidth: 0, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#52759C", backgroundColor: "#0F1B31", color: "#F7F9FC", fontSize: 12, paddingHorizontal: 10 },
  passwordConfirmButton: { minHeight: 42, backgroundColor: "#65BDF6", borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  passwordConfirmButtonText: { color: "#0B1224", fontWeight: "900", fontSize: 12 },
  passwordCancelButton: { minHeight: 42, borderColor: "#52759C", borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  passwordCancelButtonText: { color: "#D9E2EF", fontWeight: "800", fontSize: 12 },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});
