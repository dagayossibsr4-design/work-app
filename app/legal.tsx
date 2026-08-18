import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

const ACK_KEY = "legal-notice-ack-v1";

export default function LegalScreen() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ACK_KEY).then((value) => setAcknowledged(value === "1")).catch(() => undefined);
  }, []);

  const acknowledge = async () => {
    try {
      await AsyncStorage.setItem(ACK_KEY, "1");
      setAcknowledged(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 2600);
    } catch {
      Alert.alert("לא ניתן לשמור", "נסה שוב מאוחר יותר.");
    }
  };

  return (
    <ScreenContainer className="px-5 pt-5">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="חזרה" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>‹ חזרה</Text></Pressable>
          <Text style={styles.eyebrow}>מידע חשוב</Text>
          <Text style={styles.title}>פרטיות ומידע משפטי</Text>
          <Text style={styles.subtitle}>נוסח כללי בתוך האפליקציה. יש להתאים אותו למדינה, לעסק ולדרך השימוש בפועל לפני פרסום מסחרי.</Text>
        </View>
        <View style={styles.warning}><Text style={styles.warningTitle}>הבהרה</Text><Text style={styles.warningText}>אני כלי תוכנה ולא רופא, תזונאי או עורך דין. המידע באפליקציה הוא כלי עזר לתיעוד ולתכנון בלבד ואינו מחליף אבחון, טיפול, ייעוץ תזונתי או ייעוץ משפטי מקצועי.</Text></View>
        <LegalSection title="שימוש באפליקציה" text="האפליקציה מיועדת לתיעוד אימונים, תזונה, שינה והתאוששות. המשתמש אחראי לבדוק את הנתונים שהוזנו ולבחון אם המלצה או עומס מתאימים לו. אין לבצע שינוי קיצוני באימון, בתזונה או בתוספים ללא גורם מקצועי מתאים." />
        <LegalSection title="נתוני בריאות וכושר" text="נתוני משקל, שינה, התאוששות, דופק, אימונים ותזונה עשויים להיות רגישים. יש להזין רק מידע שמותר לך לשמור ולעבד. במקרה של כאב, מחלה, סימפטומים חריגים או מצב רפואי, יש לפנות לאיש מקצוע ולא להסתמך על ציון או התראה באפליקציה." />
        <LegalSection title="שמירה ושיתוף מידע" text="הנתונים המקומיים נשמרים במכשיר לפי התנהגות המערכת. ייצוא, שיתוף, שליחה ל־WhatsApp, דוא״ל או חיבור לשירות חיצוני מתבצעים בעקבות פעולה יזומה של המשתמש. לפני שיתוף יש לבדוק שהקובץ אינו כולל מידע שאינך רוצה לחשוף." />
        <LegalSection title="Garmin ושירותים חיצוניים" text="חיבור Garmin ידרוש הרשאה נפרדת ויכול להעביר נתוני פעילות ובריאות בהתאם להיקף ההרשאה שאושר. אין להפעיל חיבור שאינו מוכר לך. ניתן לנתק חיבור או למחוק נתונים בהתאם ליכולות הגרסה והשירות." />
        <LegalSection title="דיוק והגבלת אחריות" text="ערכי מזון, מקדמי בישול, חישובי המרה, המלצות עומס ונתוני שעון עשויים להיות אומדנים או להיות תלויים במקור ובמכשיר. אין לראות בתוצאה התחייבות לדיוק, לתוצאה גופנית או לזמינות רציפה של שירות חיצוני." />
        <LegalSection title="פרטיות ופניות" text="לפני הפצה לציבור יש לפרסם מדיניות פרטיות מלאה, להגדיר בעלים ומפעיל, מטרות עיבוד, תקופות שמירה, מחיקה, אבטחה, ספקים חיצוניים ודרך ליצירת קשר. הנוסח במסך זה הוא שכבת הסבר כללית ואינו תחליף למדיניות מותאמת." />
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acknowledged }} onPress={acknowledge} style={({ pressed }) => [styles.ack, acknowledged && styles.ackActive, pressed && styles.pressed]}><View style={[styles.box, acknowledged && styles.boxActive]}>{acknowledged ? <Text style={styles.check}>✓</Text> : null}</View><Text style={styles.ackText}>קראתי את ההבהרות ואני מבין שהאפליקציה אינה תחליף לייעוץ מקצועי.</Text></Pressable>
        {saved ? <Text style={styles.saved}>ההסכמה נשמרה במכשיר.</Text> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

function LegalSection({ title, text }: { title: string; text: string }) {
  return <View style={styles.card}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  content: { gap: 13, paddingBottom: 36 },
  header: { alignItems: "flex-end", gap: 6 },
  back: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 4 },
  backText: { color: "#F5B72C", fontWeight: "900", fontSize: 14 },
  eyebrow: { color: "#F5B72C", fontWeight: "900", fontSize: 12 },
  title: { color: "#F7F9FC", fontSize: 29, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", textAlign: "right", lineHeight: 18, fontSize: 12 },
  warning: { backgroundColor: "#43263A", borderColor: "#D86582", borderWidth: 1, borderRadius: 15, padding: 14, gap: 5 },
  warningTitle: { color: "#FF93AB", fontWeight: "900", textAlign: "right" },
  warningText: { color: "#F7DCE3", textAlign: "right", lineHeight: 19, fontSize: 12 },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 15, padding: 14, gap: 6 },
  sectionTitle: { color: "#F5B72C", fontSize: 15, fontWeight: "900", textAlign: "right" },
  sectionText: { color: "#D9E2EF", textAlign: "right", lineHeight: 19, fontSize: 12 },
  ack: { flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: "#16233A", borderColor: "#52759C", borderWidth: 1, borderRadius: 13, padding: 13 },
  ackActive: { borderColor: "#42D392", backgroundColor: "#173A3A" },
  box: { width: 24, height: 24, borderRadius: 6, borderColor: "#AAB7C8", borderWidth: 2, alignItems: "center", justifyContent: "center" },
  boxActive: { borderColor: "#42D392", backgroundColor: "#42D392" },
  check: { color: "#0B1224", fontSize: 16, fontWeight: "900" },
  ackText: { flex: 1, color: "#F7F9FC", textAlign: "right", lineHeight: 18, fontSize: 12 },
  saved: { color: "#42D392", fontWeight: "900", textAlign: "right", fontSize: 11 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
