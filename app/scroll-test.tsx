import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, Redirect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";

const meals = ["ארוחת בוקר 1", "ארוחת בוקר 2", "ארוחת צהריים", "ארוחת ביניים", "ארוחת ערב", "סיכום יומי"];

export default function ScrollTestScreen() {
  // Internal scroll-behavior diagnostic screen only - never shipped to real users.
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <FlatList
        data={meals}
        keyExtractor={(item) => item}
        style={styles.list}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator
        scrollEnabled
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <Text style={styles.index}>{index + 1}</Text>
            <Text style={styles.title}>{item}</Text>
            <Text style={styles.body}>כרטיס בדיקת גלילה ללא שכבות מגע. גרור את המסך למעלה ולמטה.</Text>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>בדיקת גלילה</Text>
            <Text style={styles.stamp}>BUILD 1.0.5 · SCROLL-TEST</Text>
            <Text style={styles.note}>אם המסך הזה נגלל, התקלה נמצאת במבנה מסך התזונה ולא במכשיר.</Text>
            <Pressable onPress={() => router.back()} style={styles.back}>
              <Text style={styles.backText}>חזרה לתפריט 5 ארוחות</Text>
            </Pressable>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { padding: 20, gap: 14, paddingBottom: 80, writingDirection: "rtl" },
  header: { gap: 10, alignItems: "flex-end", marginBottom: 8 },
  heading: { color: "#F7F9FC", fontSize: 28, fontWeight: "900", textAlign: "right" },
  stamp: { color: "#F5B72C", fontSize: 12, fontWeight: "900", textAlign: "right" },
  note: { color: "#AAB7C8", fontSize: 14, lineHeight: 22, textAlign: "right" },
  back: { alignSelf: "stretch", minHeight: 50, borderRadius: 14, backgroundColor: "#F5B72C", alignItems: "center", justifyContent: "center" },
  backText: { color: "#101827", fontSize: 16, fontWeight: "900" },
  card: { minHeight: 170, borderRadius: 18, padding: 20, backgroundColor: "#172943", borderColor: "#5B9FE3", borderWidth: 1, gap: 12, alignItems: "flex-end" },
  index: { color: "#F5B72C", fontSize: 14, fontWeight: "900" },
  title: { color: "#F7F9FC", fontSize: 22, fontWeight: "900", textAlign: "right" },
  body: { color: "#D9E2EF", fontSize: 15, lineHeight: 24, textAlign: "right" },
});
