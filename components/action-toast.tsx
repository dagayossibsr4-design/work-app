import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

type ActionToastProps = {
  message: string | null;
};

export function ActionToast({ message }: ActionToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (!message) return;
    opacity.stopAnimation();
    translateY.stopAnimation();
    opacity.setValue(0);
    translateY.setValue(10);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 10, duration: 220, useNativeDriver: true }),
      ]).start();
    }, 1900);
    return () => clearTimeout(timer);
  }, [message, opacity, translateY]);

  if (!message) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.icon}><Text style={styles.iconText}>✓</Text></View>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 28,
    zIndex: 20,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#42D392",
    backgroundColor: "#173A36",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 13,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  icon: { width: 23, height: 23, borderRadius: 12, backgroundColor: "#42D392", alignItems: "center", justifyContent: "center" },
  iconText: { color: "#07111F", fontWeight: "900", fontSize: 14 },
  text: { flex: 1, color: "#D1FAE5", fontSize: 12, fontWeight: "900", textAlign: "right", writingDirection: "rtl" },
});
