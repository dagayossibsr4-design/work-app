import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useSupabaseSession } from "@/lib/use-supabase-session";

// Pages that must stay reachable even for a locked-out account: the payment
// page itself, sign-in/sign-up (to pay with a different account or sign
// out), and the legal notice.
const EXEMPT_PATHS = ["/subscription", "/register", "/legal", "/reset-password"];

function isExemptPath(pathname: string): boolean {
  return EXEMPT_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Site-wide paywall: once a signed-in account's trial (or paid period) has
 * ended, this blocks every screen except the exempt ones above and sends the
 * user to /subscription - the same way a Netflix account gets cut off and
 * redirected to billing once its subscription lapses. Rendered once from the
 * root layout, so no per-screen wiring is needed.
 */
export function SubscriptionGate() {
  const pathname = usePathname();
  const exempt = isExemptPath(pathname);
  const session = useSupabaseSession();

  const statusQuery = trpc.subscription.status.useQuery(undefined, {
    enabled: Boolean(session),
    // Re-checked periodically so a session left open across the exact
    // trial-expiry moment still gets locked out without needing a reload.
    refetchInterval: 60_000,
    retry: false,
  });

  const isLocked = Boolean(statusQuery.data?.isLocked);
  const shouldBlock = isLocked && !exempt;

  useEffect(() => {
    if (shouldBlock) router.replace("/subscription" as never);
  }, [shouldBlock]);

  if (!shouldBlock) return null;

  return (
    <View style={styles.overlay}>
      <Text style={styles.title}>תקופת הניסיון הסתיימה</Text>
      <Text style={styles.text}>
        14 ימי הניסיון החינמיים שלך ב-ProLifto הסתיימו. כדי להמשיך להשתמש באפליקציה יש לבחור מסלול מנוי ולהשלים תשלום.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="מעבר למסלולי מנוי"
        onPress={() => router.replace("/subscription" as never)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>מעבר למסלולי מנוי</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0B1224",
    zIndex: 2000,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 16,
  },
  title: { color: "#F7F9FC", fontSize: 22, fontWeight: "900", textAlign: "center" },
  text: { color: "#AAB7C8", fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 340 },
  button: { backgroundColor: "#F5B72C", borderRadius: 13, paddingVertical: 15, paddingHorizontal: 26, marginTop: 6 },
  buttonText: { color: "#0B1224", fontWeight: "900", fontSize: 14 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});
