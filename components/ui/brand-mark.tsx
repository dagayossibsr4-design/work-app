import { Image, Pressable, StyleSheet, Text, View } from "react-native";

const prolifitoLogo = require("../../assets/images/icon.png");
const prolifitoOriginalLogo = require("../../assets/images/prolifto-user-blue-logo.png");

type BrandMarkProps = {
  compact?: boolean;
  onPress?: () => void;
  variant?: "icon" | "original";
};

// "original" (the real ProLifto logo artwork) is the default - "icon" is an
// old placeholder mark (a generic dumbbell/arrow, not the current brand)
// that was still showing up anywhere a call site did not explicitly ask
// for "original".
export function BrandMark({ compact = false, onPress, variant = "original" }: BrandMarkProps) {
  const content =
    variant === "original" ? (
      <View style={[styles.originalRow, compact && styles.compactOriginalRow]}>
        <Image
          source={prolifitoOriginalLogo}
          resizeMode="contain"
          style={[styles.originalLogo, compact && styles.compactOriginalLogo]}
        />
      </View>
    ) : (
      <View style={[styles.row, compact && styles.compactRow]}>
        <View style={[styles.mark, compact && styles.compactMark]}>
          <Image
            source={prolifitoLogo}
            resizeMode="contain"
            style={[styles.logoImage, compact && styles.compactLogoImage]}
          />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.name, compact && styles.compactName]}>ProLifto</Text>
          {!compact ? <Text style={styles.caption}>מדדים. עקביות. התקדמות.</Text> : null}
        </View>
      </View>
    );

  if (!onPress) return <View accessibilityLabel="ProLifto">{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="התנתקות באמצעות לחיצה על שם החשבון"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  compactRow: {
    gap: 7,
  },
  originalRow: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  compactOriginalRow: {
    alignSelf: "center",
  },
  // The source asset is 780x630 (~1.24:1) - these keep that real ratio so
  // resizeMode="contain" renders it at full size instead of shrinking it
  // down to fit a box shaped for a much wider image.
  originalLogo: {
    width: 220,
    height: 178,
  },
  compactOriginalLogo: {
    width: 150,
    height: 121,
  },
  mark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F5B72C",
    alignItems: "center",
    justifyContent: "center",
  },
  compactMark: {
    width: 30,
    height: 30,
    borderRadius: 9,
  },
  logoImage: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  compactLogoImage: {
    width: 30,
    height: 30,
    borderRadius: 9,
  },
  copy: {
    alignItems: "flex-end",
  },
  name: {
    color: "#F7F9FC",
    fontSize: 15,
    fontWeight: "900",
  },
  compactName: {
    fontSize: 12,
  },
  caption: {
    color: "#7E8DA4",
    fontSize: 9,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});
