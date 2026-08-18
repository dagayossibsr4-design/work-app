import { StyleSheet, Text, View } from "react-native";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <View style={[styles.row, compact && styles.compactRow]} accessibilityLabel="יומן האימונים"><View style={[styles.mark, compact && styles.compactMark]}><Text style={[styles.markText, compact && styles.compactMarkText]}>W</Text></View><View style={styles.copy}><Text style={[styles.name, compact && styles.compactName]}>יומן האימונים</Text>{!compact ? <Text style={styles.caption}>מדדים. עקביות. התקדמות.</Text> : null}</View></View>;
}

const styles = StyleSheet.create({ row: { flexDirection: "row-reverse", alignItems: "center", gap: 10 }, compactRow: { gap: 7 }, mark: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#F5B72C", alignItems: "center", justifyContent: "center" }, compactMark: { width: 30, height: 30, borderRadius: 9 }, markText: { color: "#0B1224", fontSize: 25, fontWeight: "900" }, compactMarkText: { fontSize: 18 }, copy: { alignItems: "flex-end" }, name: { color: "#F7F9FC", fontSize: 15, fontWeight: "900" }, compactName: { fontSize: 12 }, caption: { color: "#7E8DA4", fontSize: 9, marginTop: 2 } });
