import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

const sections = [
  {
    title: "מתחילים כאן",
    text: "בחר אימון במסך האימונים, פתח תצוגה מקדימה, ובחר «התחל חדש» או «העתק אימון קודם». בזמן האימון אפשר לעדכן משקל, חזרות, סטים ותרגילים. בסיום לחץ «סיום ושמור».",
    action: "פתח את מסך האימונים",
    path: "/(tabs)/workouts",
  },
  {
    title: "מעקב והיסטוריה",
    text: "כל אימון שהושלם נשמר בהיסטוריה המקומית. פתח אימון כדי לראות את הסטים, להשוות לניסיון הקודם ולייצא PDF או CSV. אם משהו לא נכון, ערוך את הסט או מחק את האימון מתוך ההיסטוריה.",
    action: "פתח היסטוריה",
    path: "/(tabs)/history",
  },
  {
    title: "תזונה לפי 100 גרם",
    text: "מאגר המזון, החיפוש, ההמרות, תפריט חמש הארוחות והסיכומים משתמשים בבסיס אחיד של 100 גרם. הכמות בפועל ניתנת לעריכה, אך ערכי הייחוס וההשוואה נשארים לפי 100 גרם.",
    action: "פתח את תפריט 5 הארוחות",
    path: "/(tabs)/meal-plan",
  },
  {
    title: "התאוששות וניתוח",
    text: "הזן שינה, עייפות, כאבי שרירים ודופק מנוחה במסך ההתאוששות. מסך הניתוח משלב את הנתונים עם נפח האימונים כדי לעזור לזהות מגמה, עומס וירידה בביצועים.",
    action: "פתח התאוששות",
    path: "/(tabs)/recovery",
  },
  {
    title: "שמירה וסנכרון",
    text: "הנתונים המקומיים נשמרים אוטומטית במכשיר. חיבור Garmin יופעל רק לאחר השלמת אישור המפתחים ופרטי OAuth; עד אז מסך Garmin מציג את מצב החיבור ואינו מציג נתוני שעון מומצאים.",
    action: "פתח Garmin Connect",
    path: "/(tabs)/garmin",
  },
];

export default function GuideScreen() {
  return (
    <ScreenContainer className="px-5 pt-5">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="חזרה" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹ חזרה</Text>
          </Pressable>
          <Text style={styles.eyebrow}>מדריך שימוש</Text>
          <Text style={styles.title}>איך משתמשים ביומן?</Text>
          <Text style={styles.subtitle}>הסבר קצר לכל פעולה מרכזית, בלי עומס ובלי קיצורי דרך מוסתרים.</Text>
        </View>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>כלל פשוט</Text>
          <Text style={styles.noticeText}>התחל במסך «היום», המשך לאימון או לתזונה, ובדוק את התוצאה בהיסטוריה ובניתוח.</Text>
        </View>
        {sections.map((section, index) => (
          <View key={section.title} style={styles.card}>
            <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
            <Text style={styles.cardTitle}>{section.title}</Text>
            <Text style={styles.cardText}>{section.text}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={section.action} onPress={() => router.push(section.path as never)} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <Text style={styles.actionText}>{section.action}</Text>
            </Pressable>
          </View>
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel="פתיחת מידע משפטי ופרטיות" onPress={() => router.push("/legal" as never)} style={({ pressed }) => [styles.legalLink, pressed && styles.pressed]}>
          <Text style={styles.legalText}>מידע משפטי, פרטיות והסכמות</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 13, paddingBottom: 36 },
  header: { alignItems: "flex-end", gap: 6 },
  back: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 4 },
  backText: { color: "#F5B72C", fontWeight: "900", fontSize: 14 },
  eyebrow: { color: "#F5B72C", fontWeight: "900", fontSize: 12 },
  title: { color: "#F7F9FC", fontSize: 29, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", textAlign: "right", lineHeight: 19, fontSize: 13 },
  notice: { backgroundColor: "#173755", borderColor: "#4C91BE", borderWidth: 1, borderRadius: 15, padding: 14, gap: 5 },
  noticeTitle: { color: "#65D5FF", fontWeight: "900", textAlign: "right" },
  noticeText: { color: "#D9E2EF", textAlign: "right", lineHeight: 18, fontSize: 12 },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  number: { alignSelf: "flex-end", width: 28, height: 28, borderRadius: 14, backgroundColor: "#F5B72C", alignItems: "center", justifyContent: "center" },
  numberText: { color: "#0B1224", fontWeight: "900" },
  cardTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right" },
  cardText: { color: "#C5D0DF", textAlign: "right", lineHeight: 19, fontSize: 12 },
  action: { backgroundColor: "#253F64", borderColor: "#4B77A5", borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  actionText: { color: "#F5B72C", fontWeight: "900", fontSize: 12 },
  legalLink: { alignItems: "center", padding: 12 },
  legalText: { color: "#AAB7C8", textDecorationLine: "underline", fontSize: 11 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
