import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";

const prolifitoLogo = require("../assets/images/prolifto-user-blue-logo.png");

export function EntryAnimation({ onFinished }: { onFinished?: () => void }) {
  const [visible, setVisible] = useState(true);
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.94)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.92)).current;
  const captionOpacity = useRef(new Animated.Value(0)).current;
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

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 520,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 680,
        delay: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoRotation, {
        toValue: 1,
        duration: 680,
        delay: 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(140),
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.34,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 1,
            duration: 620,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(glowOpacity, {
          toValue: 0.2,
          duration: 700,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(captionOpacity, {
        toValue: 1,
        duration: 380,
        delay: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      if (!active) return;
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 450,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(finish);
    }, 3200);

    return () => {
      active = false;
      clearTimeout(timer);
      overlayOpacity.stopAnimation();
      logoOpacity.stopAnimation();
      logoScale.stopAnimation();
      logoRotation.stopAnimation();
      glowOpacity.stopAnimation();
      glowScale.stopAnimation();
      captionOpacity.stopAnimation();
    };
  }, [captionOpacity, glowOpacity, glowScale, logoOpacity, logoRotation, logoScale, overlayOpacity]);

  const skip = () => {
    if (finished.current) return;
    finished.current = true;
    setVisible(false);
    onFinishedRef.current?.();
  };

  return (
    <Modal visible={visible} animationType="none" statusBarTranslucent onRequestClose={skip}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <View style={styles.brand}>
          <View style={styles.logoFrame}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.logoGlow,
                {
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                },
              ]}
            />
            <Animated.Image
              source={prolifitoLogo}
              resizeMode="contain"
              style={[
                styles.logo,
                {
                  opacity: logoOpacity,
                  transform: [
                    { scale: logoScale },
                    {
                      rotate: logoRotation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["-8deg", "0deg"],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
          <Animated.Text style={[styles.caption, { opacity: captionOpacity }]}>Created by Yossi Daga</Animated.Text>
          <Pressable accessibilityRole="button" accessibilityLabel="דלג על אנימציית הפתיחה" onPress={skip} style={styles.skip}>
            <Text style={styles.skipText}>דלג</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0C1325",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  logoFrame: {
    width: 350,
    height: 285,
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlow: {
    position: "absolute",
    width: 260,
    height: 230,
    borderRadius: 120,
    backgroundColor: "#E8A827",
    shadowColor: "#F5B72C",
    shadowOpacity: 0.65,
    shadowRadius: 34,
    elevation: 12,
  },
  logo: {
    width: 350,
    height: 285,
  },
  caption: {
    color: "#F7F9FC",
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 18,
  },
  skip: {
    marginTop: 28,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#52759C",
  },
  skipText: {
    color: "#D9E2EF",
    fontSize: 11,
    fontWeight: "800",
  },
});
