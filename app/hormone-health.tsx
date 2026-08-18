import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

const sources = [
  ["Endocrine Society — Testosterone Therapy Guideline", "https://www.endocrine.org/clinical-practice-guidelines/testosterone-therapy"],
  ["NIDA — Anabolic Steroids and APEDs", "https://nida.nih.gov/research-topics/anabolic-steroids"],
  ["NIH ODS — Exercise and Athletic Performance Supplements", "https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/"],
] as const;

export default function HormoneHealthScreen() {
  return (
    <ScreenContainer className="px-5 pt-5">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="חזרה" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Text style={styles.backText}>‹ חזרה</Text></Pressable>
          <Text style={styles.eyebrow}>בריאות הורמונלית</Text>
          <Text style={styles.title}>TRT וסטרואידים</Text>
          <Text style={styles.subtitle}>אזור מידע והפחתת נזק. אין כאן סייקלים, שילובים, מינונים או הוראות שימוש עצמאי.</Text>
        </View>
        <View style={styles.alert}><Text style={styles.alertTitle}>חשוב לפני הכול</Text><Text style={styles.alertText}>אני AI ולא רופא. מידע זה אינו אבחון או המלצה אישית. TRT וסטרואידים אנאבוליים דורשים הערכה ומעקב של רופא מוסמך; אין להתחיל, לשנות או להפסיק טיפול על סמך המסך הזה.</Text></View>
        <InfoCard title="מהו TRT?" text="טיפול חלופי בטסטוסטרון מיועד למצבים רפואיים של חסר בטסטוסטרון לאחר בירור מתאים. לפי הנחיות מקצועיות, אבחנה נשענת על תסמינים וסימנים מתאימים ועל רמות טסטוסטרון נמוכות ועקביות, עם אישור מדידה חוזרת של בדיקת בוקר בצום והמשך בירור של הסיבה. TRT אינו תוסף לשיפור ביצועים ואינו מתאים לכל אדם." />
        <InfoCard title="פוריות והתוויות נגד" text="יש לדון מראש בפוריות, בתכנון ילדים, בדום נשימה בשינה, במחלות לב וכלי דם, בממצאים אורולוגיים ובתרופות נוספות. טיפול בטסטוסטרון עלול להיות לא מתאים כאשר מתכננים פוריות בקרוב או במצבים רפואיים מסוימים. ההחלטה נעשית עם רופא שמכיר את ההיסטוריה ואת הבדיקות." />
        <View style={styles.card}><Text style={styles.cardTitle}>שימוש אנאבולי לשיפור ביצועים</Text><Text style={styles.cardText}>שימוש לא רפואי בסטרואידים אנאבוליים עלול לגרום לנזק לבבי וכלי דם, פגיעה בכבד או בכליות, שינויים הורמונליים, הפרעות במצב הרוח ותלות. גם הפסקה עלולה להיות מלווה בדיכאון ותסמינים אחרים. «סייקל בטוח», שילוב בטוח או תוסף שמנטרל את הסיכון אינם הבטחות רפואיות אמינות.</Text><View style={styles.noList}><Text style={styles.noListTitle}>לא יופיעו כאן:</Text><Text style={styles.noListText}>פרוטוקולי סייקל · ערימות ושילובים · מינונים · לוחות זריקות · הוראות PCT · מקורות רכישה</Text></View></View>
        <View style={styles.card}><Text style={styles.cardTitle}>מה להביא לשיחה עם רופא?</Text><Text style={styles.cardText}>רשום תסמינים, תרופות ותוספים, מטרות פוריות, היסטוריה של לחץ דם או מחלות לב, איכות שינה, שימוש בחומרים ותוצאות בדיקות קודמות. הרופא יחליט אילו בדיקות מתאימות; אפשר לדון לפי הצורך בטסטוסטרון, ספירת דם/המטוקריט, שומנים, תפקודי כבד וכליה, גלוקוז ומדדים הורמונליים נוספים.</Text></View>
        <View style={styles.card}><Text style={styles.cardTitle}>סימני אזהרה</Text><Text style={styles.cardText}>כאבים בחזה, קוצר נשימה משמעותי, חולשה פתאומית, כאב ראש חריג, צהבת, נפיחות חד־צדדית ברגל, בלבול, שינוי קיצוני במצב הרוח או מחשבות לפגיעה עצמית מצריכים הפסקת הסתמכות על האפליקציה ופנייה מיידית לשירותי חירום או לרופא.</Text></View>
        <View style={styles.card}><Text style={styles.cardTitle}>תוספים רלוונטיים — בזהירות</Text><Text style={styles.cardText}>חלבון, קריאטין, ויטמין D, אומגה 3 ומגנזיום עשויים להיות רלוונטיים לפי תזונה, חסר, מטרה ומצב רפואי. הם אינם טיפול ב־TRT, אינם מגינים מנזקי סטרואידים ואינם «מכסים» תופעות לוואי. בדוק איכות מוצר, אינטראקציות, בדיקות מעבדה והתאמה אישית עם איש מקצוע. תוספים אינם חובה כאשר התזונה והצרכים אינם מצדיקים אותם.</Text></View>
        <View style={styles.sourceCard}><Text style={styles.sourceTitle}>מקורות לקריאה</Text>{sources.map(([label, url]) => <Text key={url} style={styles.sourceText}>{label}: {url}</Text>)}</View>
        <Pressable accessibilityRole="button" accessibilityLabel="פתיחת יומן מעקב אישי" onPress={() => router.push("/hormone-tracking" as never)} style={({ pressed }) => [styles.tracking, pressed && styles.pressed]}><Text style={styles.trackingText}>פתח יומן מעקב אישי ותוספים</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="פתיחת מידע משפטי ופרטיות" onPress={() => router.push("/legal" as never)} style={({ pressed }) => [styles.legal, pressed && styles.pressed]}><Text style={styles.legalText}>מידע משפטי, פרטיות והסכמות</Text></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  content: { gap: 13, paddingBottom: 38 },
  header: { alignItems: "flex-end", gap: 6 },
  back: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 4 },
  backText: { color: "#F5B72C", fontWeight: "900", fontSize: 14 },
  eyebrow: { color: "#F5B72C", fontWeight: "900", fontSize: 12 },
  title: { color: "#F7F9FC", fontSize: 29, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", textAlign: "right", lineHeight: 18, fontSize: 12 },
  alert: { backgroundColor: "#43263A", borderColor: "#D86582", borderWidth: 1, borderRadius: 15, padding: 14, gap: 5 },
  alertTitle: { color: "#FF93AB", fontWeight: "900", textAlign: "right" },
  alertText: { color: "#F7DCE3", textAlign: "right", lineHeight: 19, fontSize: 12 },
  card: { backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 15, padding: 14, gap: 7 },
  cardTitle: { color: "#F5B72C", fontSize: 16, fontWeight: "900", textAlign: "right" },
  cardText: { color: "#D9E2EF", textAlign: "right", lineHeight: 19, fontSize: 12 },
  noList: { backgroundColor: "#0B1224", borderRadius: 10, padding: 10, gap: 4 },
  noListTitle: { color: "#FF93AB", fontWeight: "900", textAlign: "right", fontSize: 11 },
  noListText: { color: "#F7DCE3", textAlign: "right", lineHeight: 18, fontSize: 11 },
  sourceCard: { backgroundColor: "#12233D", borderColor: "#3D587C", borderWidth: 1, borderRadius: 13, padding: 13, gap: 7 },
  sourceTitle: { color: "#65D5FF", fontWeight: "900", textAlign: "right" },
  sourceText: { color: "#AAB7C8", fontSize: 9, lineHeight: 14, textAlign: "right" },
  tracking: { backgroundColor: "#F5B72C", borderRadius: 11, alignItems: "center", padding: 13 }, trackingText: { color: "#0B1224", fontWeight: "900", fontSize: 12 },
  legal: { alignItems: "center", padding: 11 },
  legalText: { color: "#AAB7C8", textDecorationLine: "underline", fontSize: 11 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
