import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";

type GarminErrorKind = "failed" | "expired" | "denied";
type GarminError = { kind: GarminErrorKind; title: string; message: string; action: string };

export default function GarminScreen() {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("מוכן לבדיקה");
  const [connectionError, setConnectionError] = useState<GarminError | null>(null);
  const showPending = () => Alert.alert("החיבור עדיין לא הופעל", "כדי להפעיל סנכרון אמיתי יש צורך באישור Garmin Connect Developer ובפרטי OAuth 2.0 רשמיים. עד אז לא נשמור פרטי התחברות ולא נציג נתונים כאילו סונכרנו.");
  const startSync = () => {
    if (syncing) return;
    setConnectionError(null);
    setSyncing(true);
    setSyncStatus("בודק חיבור מאובטח…");
    setTimeout(() => {
      setSyncing(false);
      setSyncStatus("ממתין לאישור Garmin — לא סונכרנו נתונים");
    }, 850);
  };
  const retryConnection = () => {
    setConnectionError(null);
    setSyncStatus("מוכן לבדיקה");
    showPending();
  };
  const reconnect = () => {
    setConnectionError(null);
    setSyncStatus("ממתין לחיבור מחדש");
    showPending();
  };
  return <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
    <View style={styles.header}><Text style={styles.eyebrow}>אינטגרציות</Text><Text style={styles.title}>Garmin Connect</Text><Text style={styles.subtitle}>חיבור בטוח ל־Garmin Venu X1</Text></View>
    <View style={styles.statusCard}>{syncing ? <ActivityIndicator size="small" color="#F5B72C" style={styles.statusSpinner} /> : <View style={styles.statusDot} />}<View style={styles.statusCopy}><Text style={styles.statusTitle}>{syncing ? "סנכרון בתהליך" : "ממתין לאישור Garmin"}</Text><Text style={styles.statusText}>{syncing ? syncStatus : "אין כרגע חיבור פעיל לחשבון Garmin Connect. האפליקציה לא תציג נתונים מסונכרנים עד שתושלם הרשאה רשמית."}</Text></View></View>
    {connectionError && <View style={styles.errorCard}><View style={styles.errorHeader}><Text style={styles.errorBadge}>שגיאה</Text><Text style={styles.errorTitle}>{connectionError.title}</Text></View><Text style={styles.errorMessage}>{connectionError.message}</Text><Pressable onPress={connectionError.kind === "expired" ? reconnect : retryConnection} style={({ pressed }) => [styles.errorButton, pressed && styles.pressed]}><Text style={styles.errorButtonText}>{connectionError.action}</Text></Pressable></View>}
    <View style={styles.card}><Text style={styles.cardTitle}>מה יוכל להסתנכרן?</Text><View style={styles.metricRow}><Text style={styles.metricValue}>שינה</Text><Text style={styles.metricLabel}>משך ואיכות שינה</Text></View><View style={styles.metricRow}><Text style={styles.metricValue}>דופק</Text><Text style={styles.metricLabel}>דופק מנוחה ומגמות</Text></View><View style={styles.metricRow}><Text style={styles.metricValue}>Stress</Text><Text style={styles.metricLabel}>מדדי מתח יומיים</Text></View><View style={styles.metricRow}><Text style={styles.metricValue}>Body Battery</Text><Text style={styles.metricLabel}>רמת אנרגיה והתאוששות</Text></View><View style={styles.metricRow}><Text style={styles.metricValue}>אימונים</Text><Text style={styles.metricLabel}>פעילויות ונתוני ביצוע</Text></View></View>
    <View style={styles.privacyCard}><Text style={styles.privacyTitle}>פרטיות לפני הכול</Text><Text style={styles.privacyText}>החיבור יתבצע דרך OAuth 2.0. סודות וטוקנים יישמרו רק בצד השרת, לא בתוך האפליקציה. תוכל לנתק את Garmin בכל עת, והמערכת תציג את מקור הנתונים בכל ניתוח.</Text></View>
    <Pressable onPress={showPending} disabled={syncing} style={({ pressed }) => [styles.primaryButton, syncing && styles.disabledButton, pressed && styles.pressed]}><Text style={styles.primaryText}>בדוק אפשרות חיבור</Text></Pressable>
    <Pressable onPress={startSync} disabled={syncing} style={({ pressed }) => [styles.secondaryButton, syncing && styles.disabledButton, pressed && styles.pressed]}>{syncing && <ActivityIndicator size="small" color="#D9E2EF" style={styles.buttonSpinner} />}<Text style={styles.secondaryText}>{syncing ? "בודק ומסנכרן…" : "סנכרון עכשיו — זמין לאחר אישור"}</Text></Pressable>
    <Text style={styles.liveStatus}>סטטוס: {syncStatus}</Text>
    <Text style={styles.note}>החיבור הרשמי דורש אישור לתוכנית Garmin Connect Developer. עד לקבלת האישור, ניתן להשתמש בהזנה הידנית של שינה והתאוששות.</Text>
  </ScreenContainer>;
}

const styles = StyleSheet.create({ header: { alignItems: "flex-end", marginBottom: 18 }, eyebrow: { color: "#F5B72C", fontSize: 13, fontWeight: "800" }, title: { color: "#F7F9FC", fontSize: 30, fontWeight: "900", marginTop: 3 }, subtitle: { color: "#AAB7C8", fontSize: 13, marginTop: 5 }, statusCard: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 12, backgroundColor: "#3A2028", borderColor: "#A94D61", borderWidth: 1, borderRadius: 18, padding: 15, marginBottom: 14 }, statusDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: "#F5B72C", marginTop: 5 }, statusSpinner: { marginTop: 3 }, statusCopy: { flex: 1 }, statusTitle: { color: "#FF879A", fontSize: 16, fontWeight: "900", textAlign: "right" }, statusText: { color: "#F2C5CD", fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 6 }, errorCard: { backgroundColor: "#4A2028", borderColor: "#D45C70", borderWidth: 1, borderRadius: 18, padding: 15, marginBottom: 14 }, errorHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }, errorTitle: { color: "#FFD6DC", fontSize: 16, fontWeight: "900", textAlign: "right" }, errorBadge: { color: "#4A2028", backgroundColor: "#FF9AAA", borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4, fontSize: 10, fontWeight: "900" }, errorMessage: { color: "#F6C7CE", fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 9 }, errorButton: { alignItems: "center", backgroundColor: "#FF9AAA", borderRadius: 10, paddingVertical: 10, marginTop: 11 }, errorButtonText: { color: "#4A2028", fontSize: 12, fontWeight: "900" }, card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 15, marginBottom: 14 }, cardTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "800", textAlign: "right", marginBottom: 5 }, metricRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderTopColor: "#2C3B55", borderTopWidth: 1, paddingVertical: 10 }, metricValue: { color: "#F5B72C", fontSize: 12, fontWeight: "900" }, metricLabel: { color: "#AAB7C8", fontSize: 11, textAlign: "right" }, privacyCard: { backgroundColor: "#132D2C", borderColor: "#2E6A60", borderWidth: 1, borderRadius: 18, padding: 15, marginBottom: 14 }, privacyTitle: { color: "#42D392", fontSize: 15, fontWeight: "900", textAlign: "right" }, privacyText: { color: "#C8E9DD", fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 6 }, primaryButton: { backgroundColor: "#F5B72C", borderRadius: 15, paddingVertical: 15, alignItems: "center", marginBottom: 10 }, primaryText: { color: "#0B1224", fontSize: 15, fontWeight: "900" }, secondaryButton: { backgroundColor: "#253653", borderRadius: 15, paddingVertical: 14, alignItems: "center", marginBottom: 12 }, secondaryText: { color: "#AAB7C8", fontSize: 12, fontWeight: "800" }, buttonSpinner: { marginRight: 8 }, disabledButton: { opacity: 0.65 }, liveStatus: { color: "#F5B72C", fontSize: 11, fontWeight: "800", textAlign: "right", marginBottom: 6 }, note: { color: "#7E8DA4", fontSize: 11, lineHeight: 17, textAlign: "right", marginBottom: 25 }, pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] } });
