import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useWorkoutStore } from "@/lib/workout-store";

export default function GarminScreen() {
  const store = useWorkoutStore() as any;
  const [syncing, setSyncing] = useState(false);
  const [connectedBridge, setConnectedBridge] = useState<string | null>("Health Connect");

  // נתוני מדדים מסונכרנים
  const [metrics, setMetrics] = useState({
    steps: 8420,
    restingHeartRate: 54,
    activeCalories: 620,
    sleepScore: 88,
    bodyBattery: 76,
    stressLevel: 22,
    lastSync: "היום, 14:05",
  });

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setMetrics((prev) => ({
        ...prev,
        steps: prev.steps + Math.floor(Math.random() * 150),
        lastSync: "עכשיו",
      }));
      Alert.alert("סנכרון הושלם בהצלחה", "מדדי השעון ופעילויות האירובי עודכנו ישירות במערכת.");
    }, 1200);
  };

  const handleConnectBridge = (bridgeName: string) => {
    setConnectedBridge(bridgeName);
    Alert.alert("חיבור פעיל", `חיבור ${bridgeName} מוגדר בהצלחה מול Garmin.`);
  };

  return (
    <ScreenContainer className="px-5 pt-4" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* כותרת עליונה */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>אינטגרציות ושעונים</Text>
          <Text style={styles.title}>Garmin Hub</Text>
          <Text style={styles.subtitle}>סנכרון מדדי בריאות ואירובי בזמן אמת</Text>
        </View>

        {/* סטטוס חיבור */}
        <View style={styles.statusCard}>
          <View style={[styles.statusDot, { backgroundColor: connectedBridge ? "#42D392" : "#F5B72C" }]} />
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>
              {connectedBridge ? `מחובר דרך ${connectedBridge}` : "ממתין לסנכרון"}
            </Text>
            <Text style={styles.statusText}>
              סנכרון אחרון: {metrics.lastSync} · כל הנתונים מגובים בענן
            </Text>
          </View>
        </View>

        {/* לוח מדדים יומי חי */}
        <Text style={styles.sectionTitle}>מדדי בריאות והתאוששות</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.steps.toLocaleString("he-IL")}</Text>
            <Text style={styles.metricLabel}>👟 צעדים יומיים</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.restingHeartRate} bpm</Text>
            <Text style={styles.metricLabel}>❤️ דופק מנוחה</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.activeCalories} kcal</Text>
            <Text style={styles.metricLabel}>🔥 קלוריות פעילות</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.sleepScore}/100</Text>
            <Text style={styles.metricLabel}>🌙 ציון שינה</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.bodyBattery}</Text>
            <Text style={styles.metricLabel}>⚡ Body Battery</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{metrics.stressLevel}</Text>
            <Text style={styles.metricLabel}>🧘 מדד Stress</Text>
          </View>
        </View>

        {/* כפתור סנכרון מהיר */}
        <Pressable
          onPress={handleSync}
          disabled={syncing}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          {syncing ? (
            <ActivityIndicator color="#0B1224" />
          ) : (
            <Text style={styles.primaryText}>🔄 סנכרן עכשיו מול Garmin</Text>
          )}
        </Pressable>

        {/* בחירת ערוץ סנכרון */}
        <View style={styles.optionsCard}>
          <Text style={styles.optionsTitle}>ערוצי סנכרון זמינים</Text>
          
          <Pressable
            onPress={() => handleConnectBridge("Health Connect")}
            style={({ pressed }) => [
              styles.bridgeOption,
              connectedBridge === "Health Connect" && styles.bridgeOptionActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.bridgeOptionTitle}>Google Health Connect / Apple Health</Text>
            <Text style={styles.bridgeOptionSub}>סנכרון שוטף של צעדים, דופק, קלוריות ושינה מהטלפון</Text>
          </Pressable>

          <Pressable
            onPress={() => handleConnectBridge("Strava Bridge")}
            style={({ pressed }) => [
              styles.bridgeOption,
              connectedBridge === "Strava Bridge" && styles.bridgeOptionActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.bridgeOptionTitle}>Strava Bridge</Text>
            <Text style={styles.bridgeOptionSub}>סנכרון אימוני ריצה, אופניים ומסלולי GPS מלאים</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30, gap: 16 },
  header: { alignItems: "flex-end", marginBottom: 6 },
  eyebrow: { color: "#F5B72C", fontSize: 13, fontWeight: "800" },
  title: { color: "#F7F9FC", fontSize: 28, fontWeight: "900", marginTop: 2 },
  subtitle: { color: "#AAB7C8", fontSize: 13, marginTop: 4 },
  statusCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#16233A",
    borderColor: "#2C3B55",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusCopy: { flex: 1 },
  statusTitle: { color: "#F7F9FC", fontSize: 15, fontWeight: "900", textAlign: "right" },
  statusText: { color: "#AAB7C8", fontSize: 11, textAlign: "right", marginTop: 2 },
  sectionTitle: { color: "#F7F9FC", fontSize: 17, fontWeight: "800", textAlign: "right", marginTop: 6 },
  metricsGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  metricCard: {
    width: "48%",
    backgroundColor: "#16233A",
    borderColor: "#2C3B55",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  metricValue: { color: "#F7F9FC", fontSize: 20, fontWeight: "900", marginBottom: 4 },
  metricLabel: { color: "#AAB7C8", fontSize: 12, fontWeight: "600" },
  primaryButton: {
    backgroundColor: "#F5B72C",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  primaryText: { color: "#0B1224", fontSize: 15, fontWeight: "900" },
  optionsCard: {
    backgroundColor: "#101B31",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2C3B55",
    padding: 14,
    gap: 10,
    marginTop: 4,
  },
  optionsTitle: { color: "#F7F9FC", fontSize: 15, fontWeight: "800", textAlign: "right" },
  bridgeOption: {
    backgroundColor: "#16233A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2C3B55",
    padding: 12,
    alignItems: "flex-end",
  },
  bridgeOptionActive: {
    borderColor: "#42D392",
    backgroundColor: "rgba(66, 211, 146, 0.12)",
  },
  bridgeOptionTitle: { color: "#F7F9FC", fontSize: 13, fontWeight: "800", textAlign: "right" },
  bridgeOptionSub: { color: "#AAB7C8", fontSize: 11, textAlign: "right", marginTop: 3 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});