import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";

export function EntryAnimation({ onFinished }: { onFinished?: () => void }) {
  const [visible, setVisible] = useState(true);
  const left = useRef(new Animated.Value(-72)).current;
  const right = useRef(new Animated.Value(72)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const markOpacity = useRef(new Animated.Value(0)).current;
  const captionOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const barScale = useRef(new Animated.Value(0.25)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const finished = useRef(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    let active = true;
    const finish = () => {
      if (!active || finished.current) return;
      finished.current = true;
      setVisible(false);
      onFinishedRef.current?.();
    };

    const entrance = Animated.parallel([
      Animated.timing(left, { toValue: 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(right, { toValue: 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 560, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
    ]);
    entrance.start(() => {
      if (!active) return;
      Animated.parallel([
        Animated.timing(barScale, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.85, duration: 140, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.2, duration: 420, useNativeDriver: true }),
        ]),
        Animated.timing(markOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(captionOpacity, { toValue: 1, duration: 420, delay: 160, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.035, duration: 180, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    });
    const timer = setTimeout(() => {
      if (!active) return;
      Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }).start(finish);
    }, 3600);

    return () => {
      active = false;
      clearTimeout(timer);
      entrance.stop();
      barScale.stopAnimation();
      glowOpacity.stopAnimation();
      markOpacity.stopAnimation();
      captionOpacity.stopAnimation();
      pulse.stopAnimation();
    };
  }, [barScale, captionOpacity, glowOpacity, left, markOpacity, opacity, pulse, right, scale]);

  const skip = () => {
    if (finished.current) return;
    finished.current = true;
    setVisible(false);
    onFinishedRef.current?.();
  };

  return (
    <Modal visible={visible} animationType="none" statusBarTranslucent onRequestClose={skip}>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Animated.View style={[styles.brand, { transform: [{ scale }, { scale: pulse }] }]}>
          <View style={styles.dumbbell}>
            <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
            <Animated.View style={[styles.plate, { transform: [{ translateX: left }, { rotate: left.interpolate({ inputRange: [-72, 0], outputRange: ["-18deg", "0deg"] }) }] }]} />
            <Animated.View style={[styles.bar, { transform: [{ scaleX: barScale }] }]} />
            <Animated.View style={[styles.plate, { transform: [{ translateX: right }, { rotate: right.interpolate({ inputRange: [0, 72], outputRange: ["0deg", "18deg"] }) }] }]} />
          </View>
          <Animated.Text style={[styles.mark, { opacity: markOpacity }]}>W</Animated.Text>
          <Animated.Text style={[styles.caption, { opacity: captionOpacity }]}>created by Yossi Daga</Animated.Text>
          <Pressable accessibilityRole="button" accessibilityLabel="דלג על אנימציית הפתיחה" onPress={skip} style={styles.skip}>
            <Text style={styles.skipText}>דלג</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#0B1224", alignItems: "center", justifyContent: "center" },
  brand: { alignItems: "center", justifyContent: "center" },
  dumbbell: { width: 190, height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", position: "relative" },
  glow: { position: "absolute", width: 118, height: 118, borderRadius: 60, backgroundColor: "#F5B72C", shadowColor: "#F5B72C", shadowOpacity: 0.8, shadowRadius: 24, elevation: 10 },
  bar: { width: 96, height: 10, borderRadius: 6, backgroundColor: "#F5B72C" },
  plate: { width: 28, height: 48, borderRadius: 8, backgroundColor: "#F5B72C", borderWidth: 2, borderColor: "#FFE2A0", marginHorizontal: 3 },
  mark: { color: "#F7F9FC", fontSize: 38, fontWeight: "900", marginTop: 18 },
  caption: { color: "#AAB7C8", fontSize: 11, letterSpacing: 1.1, marginTop: 8 },
  skip: { marginTop: 28, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#52759C" },
  skipText: { color: "#D9E2EF", fontSize: 11, fontWeight: "800" },
});
