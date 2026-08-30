import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";

const COOKIE_CONSENT_KEY = "workout-tracker-cookie-consent-v1";
const COOKIE_CONSENT_NAME = "workout_tracker_cookie_consent";
const ACCESSIBILITY_KEY = "workout-tracker-accessibility-v1";

type CookieConsent = "accepted" | "rejected";
type AccessibilityPreferences = {
  largeText: boolean;
  highContrast: boolean;
  underlineLinks: boolean;
};

const DEFAULT_ACCESSIBILITY: AccessibilityPreferences = {
  largeText: false,
  highContrast: false,
  underlineLinks: false,
};

function readStorage<T>(key: string, fallback: T): T {
  if (Platform.OS !== "web" || typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Privacy controls should remain usable even when storage is unavailable.
  }
}

function readCookieConsent(): CookieConsent | null {
  if (Platform.OS !== "web" || typeof document === "undefined") return null;
  const cookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_CONSENT_NAME}=`));
  const value = cookie?.split("=")[1];
  return value === "accepted" || value === "rejected" ? value : null;
}

function saveCookieConsent(value: CookieConsent) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  document.cookie = `${COOKIE_CONSENT_NAME}=${value}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

export function WebComplianceOverlay() {
  const isWeb = Platform.OS === "web";
  const [cookieConsent, setCookieConsent] = useState<CookieConsent | null>(() => readCookieConsent() ?? readStorage<CookieConsent | null>(COOKIE_CONSENT_KEY, null));
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [accessibility, setAccessibility] = useState<AccessibilityPreferences>(() => readStorage(ACCESSIBILITY_KEY, DEFAULT_ACCESSIBILITY));

  const hasOptionalCookies = cookieConsent === "accepted";
  const accessibilityLabel = useMemo(() => accessibilityOpen ? "סגירת תפריט נגישות" : "פתיחת תפריט נגישות", [accessibilityOpen]);

  useEffect(() => {
    if (!isWeb || typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("a11y-large-text", accessibility.largeText);
    root.classList.toggle("a11y-high-contrast", accessibility.highContrast);
    root.classList.toggle("a11y-underline-links", accessibility.underlineLinks);
    saveStorage(ACCESSIBILITY_KEY, accessibility);
  }, [accessibility, isWeb]);

  useEffect(() => {
    if (!isWeb || typeof window === "undefined") return;
    const openCookieSettings = () => {
      setAccessibilityOpen(true);
      setCookieSettingsOpen(true);
    };
    window.addEventListener("workout-open-cookie-settings", openCookieSettings);
    return () => window.removeEventListener("workout-open-cookie-settings", openCookieSettings);
  }, [isWeb]);

  if (!isWeb) return null;

  const setConsent = (value: CookieConsent) => {
    setCookieConsent(value);
    saveStorage(COOKIE_CONSENT_KEY, value);
    saveCookieConsent(value);
    setCookieSettingsOpen(false);
  };

  const updateAccessibility = (key: keyof AccessibilityPreferences, value: boolean) => {
    setAccessibility((current) => ({ ...current, [key]: value }));
  };

  return (
    <>
      <View pointerEvents="box-none" style={styles.layer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={() => setAccessibilityOpen((open) => !open)}
          style={({ pressed }) => [styles.accessibilityButton, pressed && styles.pressed]}
        >
          <Text style={styles.accessibilityIcon}>♿</Text>
          <Text style={styles.accessibilityButtonText}>נגישות</Text>
        </Pressable>

        {accessibilityOpen ? (
          <View accessibilityViewIsModal style={styles.accessibilityPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>אפשרויות נגישות</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="סגור אפשרויות נגישות" onPress={() => setAccessibilityOpen(false)} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <Text style={styles.panelDescription}>התאם את התצוגה לנוחות הקריאה שלך. ההעדפות נשמרות בדפדפן הזה.</Text>
            <PreferenceRow label="טקסט גדול יותר" value={accessibility.largeText} onValueChange={(value) => updateAccessibility("largeText", value)} />
            <PreferenceRow label="ניגודיות גבוהה" value={accessibility.highContrast} onValueChange={(value) => updateAccessibility("highContrast", value)} />
            <PreferenceRow label="הדגשת קישורים" value={accessibility.underlineLinks} onValueChange={(value) => updateAccessibility("underlineLinks", value)} />
            <Pressable accessibilityRole="button" accessibilityLabel="שינוי הגדרות קוקיז" onPress={() => setCookieSettingsOpen(true)} style={styles.panelLink}>
              <Text style={styles.panelLinkText}>שינוי הגדרות קוקיז</Text>
            </Pressable>
            <Pressable accessibilityRole="link" accessibilityLabel="פתיחת מדיניות פרטיות" onPress={() => router.push("/legal" as never)} style={styles.panelLink}>
              <Text style={styles.panelLinkText}>מדיניות פרטיות</Text>
            </Pressable>
          </View>
        ) : null}

        {cookieConsent === null || cookieSettingsOpen ? (
          <View accessibilityViewIsModal style={styles.cookieBanner}>
            <Text style={styles.cookieTitle}>פרטיות וקוקיז</Text>
            <Text style={styles.cookieText}>
              האתר משתמש בקוקיז הכרחיים להפעלה תקינה. קוקיז נוספים ישמשו רק לשיפור השירות ובכפוף לבחירתך. אפשר לאשר, לדחות או לפתוח את ההגדרות.
            </Text>
            <View style={styles.cookieActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="דחיית קוקיז נוספים" onPress={() => setConsent("rejected")} style={({ pressed }) => [styles.cookieSecondary, pressed && styles.pressed]}>
                <Text style={styles.cookieSecondaryText}>דחייה</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="פתיחת הגדרות קוקיז" onPress={() => setCookieSettingsOpen(true)} style={({ pressed }) => [styles.cookieSettings, pressed && styles.pressed]}>
                <Text style={styles.cookieSettingsText}>הגדרות</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="אישור קוקיז נוספים" onPress={() => setConsent("accepted")} style={({ pressed }) => [styles.cookiePrimary, pressed && styles.pressed]}>
                <Text style={styles.cookiePrimaryText}>אישור</Text>
              </Pressable>
            </View>
            {cookieSettingsOpen ? (
              <View style={styles.cookieDetails}>
                <Text style={styles.cookieDetailsTitle}>בחירת קוקיז</Text>
                <Text style={styles.cookieDetailsText}>קוקיז הכרחיים פעילים תמיד. כרגע אין באתר כלי פרסום או מעקב חיצוניים.</Text>
                <View style={styles.essentialRow}><Text style={styles.essentialText}>קוקיז הכרחיים</Text><Text style={styles.alwaysOn}>פעילים תמיד</Text></View>
                <View style={styles.essentialRow}><Text style={styles.essentialText}>קוקיז לשיפור השירות</Text><Text style={styles.optionalState}>{hasOptionalCookies ? "מאושרים" : "נדחים"}</Text></View>
                <Pressable accessibilityRole="button" accessibilityLabel="סגירת הגדרות קוקיז" onPress={() => setCookieSettingsOpen(false)} style={styles.cookieSave}>
                  <Text style={styles.cookieSaveText}>סיום</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </>
  );
}

function PreferenceRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={styles.preferenceRow}>
      <Text style={styles.preferenceLabel}>{label}</Text>
      <Switch accessibilityLabel={label} value={value} onValueChange={onValueChange} trackColor={{ false: "#42506A", true: "#F5B72C" }} thumbColor={value ? "#0B1224" : "#D9E2EF"} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  accessibilityButton: { position: "absolute", left: 14, top: 14, minHeight: 42, backgroundColor: "#F5B72C", borderRadius: 22, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  accessibilityIcon: { color: "#0B1224", fontSize: 18 },
  accessibilityButtonText: { color: "#0B1224", fontWeight: "900", fontSize: 12 },
  accessibilityPanel: { position: "absolute", left: 14, top: 66, width: 286, backgroundColor: "#16233A", borderColor: "#F5B72C", borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  panelHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  panelTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right" },
  closeButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#293B5A", alignItems: "center", justifyContent: "center" },
  closeText: { color: "#F7F9FC", fontSize: 23, lineHeight: 25 },
  panelDescription: { color: "#C6D2E2", fontSize: 11, lineHeight: 17, textAlign: "right" },
  preferenceRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", minHeight: 42, borderTopColor: "#2C3B55", borderTopWidth: 1 },
  preferenceLabel: { color: "#F7F9FC", fontSize: 12, fontWeight: "800", textAlign: "right" },
  panelLink: { borderTopColor: "#2C3B55", borderTopWidth: 1, paddingTop: 10 },
  panelLinkText: { color: "#65BDF6", fontWeight: "800", fontSize: 12, textAlign: "right", textDecorationLine: "underline" },
  cookieBanner: { position: "absolute", left: 14, right: 14, bottom: 14, backgroundColor: "#16233A", borderColor: "#65BDF6", borderWidth: 1, borderRadius: 16, padding: 14, gap: 8, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  cookieTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right" },
  cookieText: { color: "#D9E2EF", fontSize: 11, lineHeight: 18, textAlign: "right" },
  cookieActions: { flexDirection: "row-reverse", gap: 8, justifyContent: "flex-start" },
  cookiePrimary: { backgroundColor: "#F5B72C", borderRadius: 9, paddingVertical: 10, paddingHorizontal: 17, minWidth: 72, alignItems: "center" },
  cookiePrimaryText: { color: "#0B1224", fontWeight: "900", fontSize: 12 },
  cookieSecondary: { backgroundColor: "#3A202A", borderColor: "#FB7185", borderWidth: 1, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 14, minWidth: 72, alignItems: "center" },
  cookieSecondaryText: { color: "#FB7185", fontWeight: "900", fontSize: 12 },
  cookieSettings: { backgroundColor: "#1D2D48", borderColor: "#65BDF6", borderWidth: 1, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 14, minWidth: 72, alignItems: "center" },
  cookieSettingsText: { color: "#65BDF6", fontWeight: "900", fontSize: 12 },
  cookieDetails: { borderTopColor: "#2C3B55", borderTopWidth: 1, paddingTop: 10, gap: 7 },
  cookieDetailsTitle: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" },
  cookieDetailsText: { color: "#C6D2E2", fontSize: 10, lineHeight: 16, textAlign: "right" },
  essentialRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 },
  essentialText: { color: "#F7F9FC", fontSize: 11, fontWeight: "700" },
  alwaysOn: { color: "#42D392", fontSize: 10, fontWeight: "800" },
  optionalState: { color: "#F5B72C", fontSize: 10, fontWeight: "800" },
  cookieSave: { backgroundColor: "#1D2D48", borderColor: "#42D392", borderWidth: 1, borderRadius: 9, padding: 9, alignItems: "center" },
  cookieSaveText: { color: "#42D392", fontWeight: "900" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
