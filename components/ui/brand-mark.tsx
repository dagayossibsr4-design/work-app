import { Image, Pressable, StyleSheet, Text, View } from "react-native";

const prolifitoLogo = require("../../assets/images/icon.png");

export function BrandMark({ compact = false, onPress }: { compact?: boolean; onPress?: () => void }) {
  const content = <View style={[styles.row, compact && styles.compactRow]}><View style={[styles.mark, compact && styles.compactMark]}><Image source={prolifitoLogo} resizeMode="contain" style={[styles.logoImage, compact && styles.compactLogoImage]} /></View><View style={styles.copy}><Text style={[styles.name, compact && styles.compactName]}>ProLifto</Text>{!compact ? <Text style={styles.caption}>מדדים. עקביות. התקדמות.</Text> : null}</View></View>;
  if (!onPress) return <View accessibilityLabel="ProLifto">{content}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel="התנתקות באמצעות לחיצה על שם החשבון" onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>{content}</Pressable>;
}

const styles = StyleSheet.create({ row: { flexDirection: "row-reverse", alignItems: "center", gap: 10 }, compactRow: { gap: 7 }, mark: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#F5B72C", alignItems: "center", justifyContent: "center" }, compactMark: { width: 30, height: 30, borderRadius: 9 }, logoImage: { width: 42, height: 42, borderRadius: 12 }, compactLogoImage: { width: 30, height: 30, borderRadius: 9 }, copy: { alignItems: "flex-end" }, name: { color: "#F7F9FC", fontSize: 15, fontWeight: "900" }, compactName: { fontSize: 12 }, caption: { color: "#7E8DA4", fontSize: 9, marginTop: 2 }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] } });
