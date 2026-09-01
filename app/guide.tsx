import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

const sections = [
  {
    number: "1",
    title: "מתחילים במסך הבית",
    text: "פתחו את לשונית היום ואת הרובריקה הפרופיל האישי שלי. כאן נמצאים הקיצורים למעקב אחרי הארוחות, התוכנית שלי, בניית תוכנית מותאמת אישית, ניתוח פרופיל והתקדמות ומדדי שינה.",
    action: "פתח את מסך הבית",
    path: "/",
  },
  {
    number: "2",
    title: "בוחרים תוכנית אימונים",
    text: "פתחו בניית תוכנית מותאמת אישית או תבניות ותרגילים. בחרו בין PPL, AB, ABC, ABCD, Full Body ואירובי. פתחו את הרובריקה כדי לבדוק את התרגילים, הסטים וטווחי החזרות.",
    action: "פתח תבניות ותרגילים",
    path: "/(tabs)/editor",
  },
  {
    number: "3",
    title: "מוסיפים לתוכנית שלי",
    text: "ליד קבוצת אימון לחצו על הוסף לתוכנית שלי כדי לשמור את התוכנית השלמה. ניתן לבחור עד חמש תוכניות. שמירת תוכנית שלמה מאפשרת אחר כך לבחור את האימון המתאים ביומן, ולא רק תרגיל בודד.",
    action: "פתח את התוכניות",
    path: "/(tabs)/editor",
  },
  {
    number: "4",
    title: "בונים תוכנית מותאמת אישית",
    text: "פתחו את הקטגוריות, חפשו תרגילים וסננו לפי קבוצת שריר. סמנו את התרגילים הרצויים והגדירו לכל אחד מספר סטים, טווח חזרות, משקל התחלתי, מנוחה והערות. שמרו בשם ברור והגדירו אותה לשימוש ביומן.",
    action: "פתח בניית תוכנית",
    path: "/(tabs)/editor",
  },
  {
    number: "5",
    title: "משבצים את השבוע",
    text: "פתחו את לוח האימונים. לחצו על היום הרצוי, בחרו אימון מתוך התוכנית שלי או מתוך התוכנית המותאמת, ואשרו. לאחר השמירה שם התוכנית יופיע בכרטיס של אותו יום. אירובי נשאר זמין גם ללא תוכנית כוח.",
    action: "פתח לוח אימונים",
    path: "/(tabs)/schedule",
  },
  {
    number: "6",
    title: "מתעדים אימון בזמן אמת",
    text: "פתחו את האימון מתוך היום ביומן. בכל סט הזינו משקל, חזרות, זמן מנוחה והערה, ולאחר הביצוע סמנו סט הושלם. אפשר להפעיל טיימר מנוחה ולעבור לסט הבא. בסיום עברו על הנתונים ולחצו סיום ושמור.",
    action: "פתח אימון פעיל",
    path: "/(tabs)/active-workout",
  },
  {
    number: "7",
    title: "מנהלים חמש ארוחות",
    text: "פתחו מעקב אחרי הארוחות שלי. המערכת מציגה את חמש הארוחות, השעות והסיכום היומי. לאחר שאכלתם סמנו נאכל והזינו את הכמות בפועל בגרמים. אם נאכלה רק חלק מהמנה, עדכנו את הכמות במקום לסמן מנה מלאה.",
    action: "פתח תפריט 5 ארוחות",
    path: "/(tabs)/meal-plan",
  },
  {
    number: "8",
    title: "ממירים מזון בלי לאבד את היעד",
    text: "בתוך הארוחה פתחו המרת ארוחה מדויקת. בחרו קבוצת חלבון, פחמימה או שומן, בחרו חלופה ובדקו את ההשוואה בין המקור לחלופה: קלוריות, חלבון, פחמימות ושומן. אשרו רק לאחר בדיקת הכמות.",
    action: "פתח מערכת תזונה",
    path: "/(tabs)/meal-plan",
  },
  {
    number: "9",
    title: "מחשבים יעדי קלוריות ומאקרו",
    text: "הגדירו יעד קלורי ואת יעדי החלבון, הפחמימות והשומן. המחשבון מציג גרמים ואחוזים. כאשר עורכים רכיב אחד, המערכת משלימה את הרכיב הנדרש לפי היעד. אם מופיעה אזהרה על ערך שלילי, בדקו את השדות לפני השמירה.",
    action: "פתח מחשבון מאקרו",
    path: "/macro-calculator",
  },
  {
    number: "10",
    title: "מפעילים ניתוח חריגה",
    text: "לאחר שסימנתם את הארוחות שנאכלו ועדכנתם כמויות, עברו לסיכום היום ולחצו נתח חריגה והמלץ לפעם הבאה. המערכת מזהה אם החריגה היא בחלבון, בפחמימות או בשומן ומציעה ממה להפחית ובאיזו כמות בתפריטים הבאים.",
    action: "פתח ניתוח תזונה",
    path: "/(tabs)/meal-plan",
  },
  {
    number: "11",
    title: "בודקים התקדמות והיסטוריה",
    text: "במסך מעקב וניתוח בדקו נפח, סטים שהושלמו, משקלי שיא והשוואה לאימונים קודמים. במסך ההיסטוריה ניתן לעבור על אימונים שמורים ולייצא PDF או CSV כאשר קיימים נתונים.",
    action: "פתח ניתוח",
    path: "/(tabs)/analysis",
  },
  {
    number: "12",
    title: "שינה, התאוששות ואירובי",
    text: "הזינו שעות שינה, איכות שינה, עייפות, כאבי שרירים ודופק מנוחה. באירובי רשמו סוג פעילות, משך, מרחק ועצימות. נתונים אלה עוזרים להבין אם שינוי בביצוע הוא חד־פעמי או מגמה מתמשכת.",
    action: "פתח התאוששות",
    path: "/(tabs)/recovery",
  },
];

export default function GuideScreen() {
  return (
    <ScreenContainer className="px-5 pt-5">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="חזרה" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹ חזרה</Text>
          </Pressable>
          <Text style={styles.eyebrow}>הסבר ומידע חשוב</Text>
          <Text style={styles.title}>איך משתמשים באפליקציה?</Text>
          <Text style={styles.subtitle}>מדריך מלא, שלב אחר שלב, מתוך תיבת המידע של FitFlow.</Text>
        </View>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>סדר העבודה המומלץ</Text>
          <Text style={styles.noticeText}>בוחרים תוכנית → משבצים ביומן → מתעדים אימון → מעדכנים ארוחות → מנתחים חריגות והתקדמות.</Text>
        </View>
        {sections.map((section) => (
          <View key={section.number} style={styles.card}>
            <View style={styles.number}><Text style={styles.numberText}>{section.number}</Text></View>
            <Text style={styles.cardTitle}>{section.title}</Text>
            <Text style={styles.cardText}>{section.text}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={section.action} onPress={() => router.push(section.path as never)} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <Text style={styles.actionText}>{section.action}</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.tip}>
          <Text style={styles.tipTitle}>אם משהו לא מופיע</Text>
          <Text style={styles.tipText}>בדקו שהתוכנית נשמרה בתוכנית שלי, שהארוחה סומנה כנאכלת ושהכמות בפועל הוזנה. ללא נתונים שמורים, מסכי היומן והניתוח לא יוכלו להציג השוואה מלאה.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="פתיחת מידע משפטי ופרטיות" onPress={() => router.push("/legal" as never)} style={({ pressed }) => [styles.legalLink, pressed && styles.pressed]}>
          <Text style={styles.legalText}>מידע משפטי, פרטיות והסכמות</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 13, paddingBottom: 40 },
  header: { alignItems: "flex-end", gap: 6 },
  back: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 4 },
  backText: { color: "#F5B72C", fontWeight: "900", fontSize: 14 },
  eyebrow: { color: "#F5B72C", fontWeight: "900", fontSize: 12 },
  title: { color: "#F7F9FC", fontSize: 28, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", textAlign: "right", lineHeight: 19, fontSize: 13 },
  notice: { backgroundColor: "#173755", borderColor: "#4C91BE", borderWidth: 1, borderRadius: 15, padding: 14, gap: 5 },
  noticeTitle: { color: "#65D5FF", fontWeight: "900", textAlign: "right" },
  noticeText: { color: "#D9E2EF", textAlign: "right", lineHeight: 19, fontSize: 12 },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  number: { alignSelf: "flex-end", width: 30, height: 30, borderRadius: 15, backgroundColor: "#F5B72C", alignItems: "center", justifyContent: "center" },
  numberText: { color: "#0B1224", fontWeight: "900" },
  cardTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "900", textAlign: "right" },
  cardText: { color: "#C5D0DF", textAlign: "right", lineHeight: 20, fontSize: 12 },
  action: { backgroundColor: "#253F64", borderColor: "#4B77A5", borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  actionText: { color: "#F5B72C", fontWeight: "900", fontSize: 12 },
  tip: { backgroundColor: "#163B35", borderColor: "#42D392", borderWidth: 1, borderRadius: 15, padding: 14, gap: 5 },
  tipTitle: { color: "#42D392", fontWeight: "900", textAlign: "right" },
  tipText: { color: "#D9F6E9", textAlign: "right", lineHeight: 19, fontSize: 12 },
  legalLink: { alignItems: "center", padding: 12 },
  legalText: { color: "#AAB7C8", textDecorationLine: "underline", fontSize: 11 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
