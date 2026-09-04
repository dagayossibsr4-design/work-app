import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { AuthGuardFallback } from "@/components/auth-guard-fallback";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { trpc } from "@/lib/trpc";

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

export default function AdminSubscribersScreen() {
  const authState = useAuthGuard();

  const usersQuery = trpc.admin.listUsers.useQuery(undefined, {
    // Approximates a "live" view: this page has no real login/logout event
    // log (only a last-signed-in timestamp per account), so it re-polls
    // instead of streaming individual events.
    refetchInterval: 15_000,
    retry: false,
  });

  if (authState !== "authorized") return <AuthGuardFallback />;

  const isForbidden = (usersQuery.error as { data?: { code?: string } } | null)?.data?.code === "FORBIDDEN";
  const list = usersQuery.data ?? [];
  const counts = list.reduce<Record<string, number>>((acc, user) => {
    acc[user.subscriptionStatus] = (acc[user.subscriptionStatus] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <ScreenContainer className="px-5 pt-5" edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="חזרה" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backText}>‹ חזרה</Text>
        </Pressable>
        <Text style={styles.eyebrow}>לוח בעלים</Text>
        <Text style={styles.title}>מנויים ומשתמשים</Text>
        <Text style={styles.subtitle}>מתעדכן אוטומטית כל 15 שניות. הנתון המוצג הוא הכניסה האחרונה הידועה של כל חשבון, לא פס אירועים חי.</Text>

        {isForbidden ? (
          <View style={styles.denied}>
            <Text style={styles.deniedTitle}>אין הרשאת בעלים לחשבון זה</Text>
            <Text style={styles.note}>המסך הזה מוגן וזמין רק לחשבון שהוגדר כ-admin במערכת.</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <Stat label="סה״כ משתמשים" value={list.length} />
              <Stat label="בניסיון" value={counts.trialing ?? 0} color={STATUS_COLORS.trialing} />
              <Stat label="מנוי פעיל" value={counts.active ?? 0} color={STATUS_COLORS.active} />
              <Stat label="פג/בוטל" value={(counts.expired ?? 0) + (counts.canceled ?? 0)} color={STATUS_COLORS.expired} />
            </View>

            {usersQuery.isLoading ? <Text style={styles.note}>טוען נתונים…</Text> : null}
            {list.length === 0 && !usersQuery.isLoading ? (
              <View style={styles.card}><Text style={styles.note}>אין עדיין משתמשים רשומים.</Text></View>
            ) : null}

            {list.map((user) => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <Text style={styles.userEmail}>{user.email ?? "ללא אימייל"}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[user.subscriptionStatus] ?? "#7E8DA4"}22`, borderColor: STATUS_COLORS[user.subscriptionStatus] ?? "#7E8DA4" }]}>
                    <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[user.subscriptionStatus] ?? "#7E8DA4" }]}>
                      {STATUS_LABELS[user.subscriptionStatus] ?? user.subscriptionStatus}
                    </Text>
                  </View>
                </View>
                {user.name ? <Text style={styles.userName}>{user.name}</Text> : null}
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>נכנס לאחרונה</Text>
                  <Text style={styles.metaValue}>{formatDate(user.lastSignedIn)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>נרשם בתאריך</Text>
                  <Text style={styles.metaValue}>{formatDate(user.createdAt)}</Text>
                </View>
                {user.trialEndsAt ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>{user.subscriptionStatus === "active" ? "המנוי בתוקף עד" : "הניסיון בתוקף עד"}</Text>
                    <Text style={styles.metaValue}>{formatDate(user.trialEndsAt)} · {relativeFromNow(user.trialEndsAt)}</Text>
                  </View>
                ) : null}
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>דרך הרשמה</Text>
                  <Text style={styles.metaValue}>{user.loginMethod ?? "—"}</Text>
                </View>
              </View>
            ))}
          </>
        )}
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
  denied: { backgroundColor: "#3A1D2A", borderColor: "#FF879A", borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  deniedTitle: { color: "#FFB0BC", fontSize: 17, fontWeight: "900", textAlign: "right" },
  statsRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  stat: { flexGrow: 1, minWidth: 78, backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 16, padding: 12, gap: 4, alignItems: "flex-end" },
  statValue: { color: "#F7F9FC", fontSize: 20, fontWeight: "900" },
  statLabel: { color: "#AAB7C8", fontSize: 10, textAlign: "right" },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 16 },
  userCard: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  userHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 8 },
  userEmail: { color: "#F7F9FC", fontSize: 14, fontWeight: "900", textAlign: "right", flex: 1 },
  userName: { color: "#AAB7C8", fontSize: 12, textAlign: "right" },
  statusBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: "900" },
  metaRow: { flexDirection: "row-reverse", justifyContent: "space-between" },
  metaLabel: { color: "#7E8DA4", fontSize: 11 },
  metaValue: { color: "#D9E2EF", fontSize: 11, fontWeight: "700" },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});
