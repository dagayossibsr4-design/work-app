import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { BrandMark } from "@/components/ui/brand-mark";
import { AuthGuardFallback } from "@/components/auth-guard-fallback";
import { useAuthGuard } from "@/lib/use-auth-guard";
import { useSupabaseSession } from "@/lib/use-supabase-session";
import { supabase } from "@/lib/supabase";
import { confirmSignOut } from "@/lib/confirm-sign-out";
import { ADMIN_ACCESS_CODE_STORAGE_KEY } from "@/lib/admin-access";

const linkGroups = [
  {
    title: "אימונים ותוכניות",
    links: [
      ["לוח אימונים שבועי", "/(tabs)/schedule"],
      ["תבניות ותרגילים", "/(tabs)/editor"],
      ["עריכת תרגילים", "/exercise-library"],
      ["היסטוריית אימונים", "/(tabs)/history"],
      ["יעדים שבועיים לפרופיל", "/weekly-goals"],
    ],
  },
  {
    title: "תזונה",
    links: [
      ["חמש ארוחות", "/(tabs)/meal-plan"],
      ["חילוץ תווית מזון באמצעות AI", "/food-label"],
    ],
  },
  {
    title: "בריאות והתאוששות",
    links: [
      ["ניתוח והתקדמות", "/(tabs)/analysis"],
      ["אירובי", "/(tabs)/cardio"],
      ["התאוששות ושינה", "/(tabs)/recovery"],
    ],
  },
] as const;
const informationLinks = [
  ["איך משתמשים באפליקציה", "/guide"],
  ["TRT וסטרואידים — מידע בטוח", "/hormone-health"],
  ["יומן מעקב אישי ותוספים", "/hormone-tracking"],
  ["פרטיות ומידע משפטי", "/legal"],
] as const;
const backupKeys = [
  "workout-tracker-sessions-v1",
  "workout-tracker-templates-v1",
  "workout-tracker-recovery-v1",
  "workout-tracker-cardio-v1",
  "workout-tracker-nutrition-v1",
  "meal-plan-state",
  "meal-plan-eaten-history",
  "meal-plan-favorite",
  "meal-plan-profiles",
  "meal-plan-versions",
  "meal-plan-saved-meals",
  "meal-plan-defaults-v100",
  "nutrition-daily-history",
  "hormone-tracking-v1",
  "workout-tracker-food-favorites-v1",
];

type BackupPayload = {
  version?: number;
  exportedAt?: string;
  data?: Record<string, string>;
};

async function createLocalBackup() {
  const entries = await AsyncStorage.multiGet(backupKeys);
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: Object.fromEntries(entries.filter(([, value]) => value !== null)),
  };
  await Share.share({
    title: "גיבוי יומן האימונים",
    message: JSON.stringify(payload),
  });
}

function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as BackupPayload;
  return Boolean(
    candidate.data &&
    typeof candidate.data === "object" &&
    !Array.isArray(candidate.data),
  );
}

async function restoreFromAsset(asset: DocumentPicker.DocumentPickerAsset) {
  const raw = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const parsed: unknown = JSON.parse(raw);
  if (!isBackupPayload(parsed)) throw new Error("מבנה הגיבוי אינו תקין");
  const entries = Object.entries(parsed.data ?? {}).filter(
    ([key, value]) => backupKeys.includes(key) && typeof value === "string",
  ) as [string, string][];
  if (!entries.length) throw new Error("לא נמצאו נתוני אפליקציה מוכרים בקובץ");
  await AsyncStorage.multiSet(entries);
}

export default function SettingsScreen() {
  const authState = useAuthGuard();
  const session = useSupabaseSession();
  const accountEmail = session?.user.email ?? null;
  const [restoreStatus, setRestoreStatus] = useState("");
  const [authStatus, setAuthStatus] = useState("");

  const signOut = async () => {
    if (!supabase) {
      setAuthStatus("מערכת ההתחברות אינה מוגדרת כרגע.");
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthStatus("לא ניתן להתנתק כרגע. נסה שוב.");
      return;
    }
    setAuthStatus("התנתקת בהצלחה.");
    router.replace("/register" as never);
  };
  const requestSignOut = () => confirmSignOut(() => void signOut());
  const openAdminPanel = async () => {
    const savedCode = await AsyncStorage.getItem(ADMIN_ACCESS_CODE_STORAGE_KEY);
    router.push((savedCode ? "/admin-subscribers" : "/admin-login") as never);
  };
  const restoreBackup = async () => {
    setRestoreStatus("בוחר קובץ…");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        setRestoreStatus("");
        return;
      }
      const confirmRestore = () => {
        void restoreFromAsset(result.assets[0])
          .then(() => {
            setRestoreStatus(
              "השחזור הושלם. פתח מחדש מסכים כדי לראות את הנתונים.",
            );
          })
          .catch((error: unknown) => {
            setRestoreStatus(
              error instanceof Error ? error.message : "השחזור נכשל",
            );
          });
      };
      if (
        typeof window !== "undefined" &&
        typeof window.confirm === "function"
      ) {
        if (
          window.confirm(
            "השחזור יחליף את הנתונים המקומיים הכלולים בקובץ. להמשיך?",
          )
        )
          confirmRestore();
        else setRestoreStatus("");
        return;
      }
      Alert.alert(
        "שחזור נתונים",
        "הנתונים המקומיים הכלולים בקובץ יוחלפו. להמשיך?",
        [
          {
            text: "ביטול",
            style: "cancel",
            onPress: () => setRestoreStatus(""),
          },
          { text: "שחזר", onPress: confirmRestore },
        ],
      );
    } catch (error) {
      setRestoreStatus(
        error instanceof Error ? error.message : "לא ניתן לקרוא את קובץ הגיבוי",
      );
    }
  };
  const clearLocalData = () => {
    const action = async () => {
      await AsyncStorage.multiRemove(backupKeys);
      router.replace("/" as never);
    };
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (window.confirm("למחוק את כל הנתונים המקומיים? פעולה זו אינה הפיכה."))
        void action();
      return;
    }
    Alert.alert(
      "מחיקת נתונים",
      "כל האימונים, התפריטים והמעקבים המקומיים יימחקו. הפעולה אינה הפיכה.",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "מחק הכול",
          style: "destructive",
          onPress: () => void action(),
        },
      ],
    );
  };
  if (authState !== "authorized") return <AuthGuardFallback />;

  return (
    <ScreenContainer className="px-5 pt-5">
      <ScrollView contentContainerStyle={styles.content}>
        <BrandMark variant="original" />
        <Text style={styles.eyebrow}>ניהול אישי</Text>
        <Text style={styles.title}>הגדרות</Text>
        <Text style={styles.subtitle}>כל הכלים המתקדמים במקום אחד</Text>

        <View style={[styles.card, styles.accountCard]}>
          <View style={styles.accountHeader}>
            <View style={[styles.accountDot, accountEmail && styles.accountDotActive]} />
            <Text style={styles.section}>חשבון אישי</Text>
          </View>
          {accountEmail ? (
            <Text style={styles.accountEmail}>מחובר כ-{accountEmail}</Text>
          ) : (
            <Text style={styles.note}>
              רישום מאפשר לחבר את האפליקציה לחשבון אישי ולהמשיך בין מכשירים.
            </Text>
          )}
          {accountEmail ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="התנתקות מהחשבון"
              onPress={requestSignOut}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>התנתקות</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="פתח הרשמה או התחברות"
              onPress={() => router.push("/register" as never)}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>הרשמה / התחברות</Text>
            </Pressable>
          )}
          {authStatus ? (
            <Text accessibilityLiveRegion="polite" style={styles.status}>
              {authStatus}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>מסכים וכלים</Text>
          {linkGroups.map((group) => (
            <View key={group.title} style={styles.linkGroup}>
              <Text style={styles.linkGroupTitle}>{group.title}</Text>
              {group.links.map(([label, href]) => (
                <Pressable
                  key={href}
                  accessibilityRole="button"
                  accessibilityLabel={`פתח ${label}`}
                  onPress={() => router.push(href as never)}
                  style={({ pressed }) => [styles.link, pressed && styles.pressed]}
                >
                  <Text style={styles.arrow}>‹</Text>
                  <Text style={styles.linkText}>{label}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
        <View style={styles.card}>
          <Text style={styles.section}>הסבר ומידע חשוב</Text>
          {informationLinks.map(([label, href]) => (
            <Pressable
              key={href}
              accessibilityRole="button"
              accessibilityLabel={`פתח ${label}`}
              onPress={() => router.push(href as never)}
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            >
              <Text style={styles.arrow}>‹</Text>
              <Text style={styles.linkText}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.card}>
          <Text style={styles.section}>נתונים וגיבוי</Text>
          <Text style={styles.note}>
            הגיבוי כולל את נתוני האימונים, התבניות, התזונה, ההתאוששות והמעקב
            האישי בפורמט JSON לשמירה פרטית. עריכת העדפות תזונה ומאקרו זמינה
            במסך התזונה.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="עריכת העדפות תזונה"
            onPress={() => router.push("/(tabs)/nutrition" as never)}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Text style={styles.arrow}>‹</Text>
            <Text style={styles.linkText}>עריכת העדפות תזונה</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="שתף גיבוי נתונים"
            onPress={() => void createLocalBackup()}
            style={({ pressed }) => [
              styles.secondary,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryText}>צור ושתף גיבוי JSON</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="שחזר נתונים מקובץ JSON"
            onPress={() => void restoreBackup()}
            style={({ pressed }) => [styles.restore, pressed && styles.pressed]}
          >
            <Text style={styles.restoreText}>שחזר נתונים מקובץ JSON</Text>
          </Pressable>
          {restoreStatus ? (
            <Text accessibilityLiveRegion="polite" style={styles.status}>
              {restoreStatus}
            </Text>
          ) : null}
        </View>

        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.dangerSection}>⚠ אזור מסוכן</Text>
          <Text style={styles.note}>
            מחיקת הנתונים המקומיים היא פעולה סופית ואינה הפיכה - כל האימונים,
            התפריטים וההיסטוריה במכשיר זה יימחקו. מומלץ ליצור גיבוי JSON למעלה
            לפני שממשיכים.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="מחק את כל הנתונים המקומיים"
            onPress={clearLocalData}
            style={({ pressed }) => [styles.danger, pressed && styles.pressed]}
          >
            <Text style={styles.dangerText}>מחק את כל הנתונים המקומיים</Text>
          </Pressable>
        </View>

        <View style={[styles.card, styles.adminCard]}>
          <Text style={styles.section}>גישת בעלים</Text>
          <Text style={styles.note}>כניסה למורשים בלבד ללוח הבקרה של המנויים והמשתמשים.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="כניסה למורשים"
            onPress={() => void openAdminPanel()}
            style={({ pressed }) => [styles.adminButton, pressed && styles.pressed]}
          >
            <Text style={styles.adminButtonText}>כניסה למורשים</Text>
          </Pressable>
        </View>
        <Text style={styles.footer}>ProLifto · מידע אישי נשמר במכשיר</Text>
        <Text style={styles.creator}>Created by Yossi Daga</Text>
        <Text testID="installed-build-version" style={styles.buildVersion}>
          גרסת התקנה: {Constants.expoConfig?.version ?? "לא ידוע"} · build{" "}
          {Constants.expoConfig?.android?.versionCode ?? "לא ידוע"}
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 35 },
  eyebrow: {
    color: "#F5B72C",
    fontWeight: "900",
    fontSize: 13,
    textAlign: "right",
  },
  title: {
    color: "#F7F9FC",
    fontSize: 32,
    fontWeight: "900",
    textAlign: "right",
  },
  subtitle: { color: "#AAB7C8", textAlign: "right" },
  card: {
    backgroundColor: "#16233A",
    borderColor: "#2C3B55",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  section: {
    color: "#F7F9FC",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 3,
  },
  accountCard: { borderColor: "#3F76A7" },
  accountHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  accountDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#7E8DA4" },
  accountDotActive: { backgroundColor: "#42D392" },
  accountEmail: { color: "#D9E2EF", fontSize: 12, textAlign: "right" },
  linkGroup: { gap: 8, borderTopColor: "#2C3B55", borderTopWidth: 1, paddingTop: 10, marginTop: 2 },
  linkGroupTitle: { color: "#65BDF6", fontSize: 11, fontWeight: "900", textAlign: "right" },
  dangerCard: { borderColor: "#5A2A38" },
  adminCard: { borderColor: "#3F76A7" },
  adminButton: { backgroundColor: "#1D2D48", borderColor: "#65BDF6", borderWidth: 1, padding: 12, borderRadius: 10, alignItems: "center" },
  adminButtonText: { color: "#65BDF6", fontWeight: "900" },
  dangerSection: { color: "#FFB0BC", fontSize: 16, fontWeight: "900", textAlign: "right", marginBottom: 3 },
  link: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1D2D48",
    borderRadius: 11,
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  pressed: { opacity: 0.7 },
  linkText: { color: "#E8EEF7", fontWeight: "800", textAlign: "right" },
  arrow: { color: "#F5B72C", fontSize: 24 },
  note: { color: "#AAB7C8", textAlign: "right", lineHeight: 18, fontSize: 11 },
  primary: {
    backgroundColor: "#F5B72C",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryText: { color: "#0B1224", fontWeight: "900" },
  secondary: {
    backgroundColor: "#1D2D48",
    borderColor: "#42D392",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryText: { color: "#42D392", fontWeight: "900" },
  restore: {
    backgroundColor: "#1D2D48",
    borderColor: "#65BDF6",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  restoreText: { color: "#65BDF6", fontWeight: "900" },
  status: {
    color: "#D9EEFF",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "right",
  },
  danger: {
    backgroundColor: "#3A202A",
    borderColor: "#FB7185",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  dangerText: { color: "#FB7185", fontWeight: "900" },
  footer: { color: "#7E8DA4", fontSize: 10, textAlign: "center" },
  creator: { color: "#F5B72C", fontSize: 11, fontWeight: "800", textAlign: "center", marginTop: -8 },
  buildVersion: {
    color: "#F5B72C",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    marginTop: -6,
  },
});
