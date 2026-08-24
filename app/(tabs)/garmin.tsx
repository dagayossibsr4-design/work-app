import { useState } from "react";
import { ScrollView, StyleSheet, Text, Pressable, View, Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import * as Haptics from "expo-haptics";

export default function GarminSyncScreen() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("היום, 08:30");

  // נתוני דמה ראשוניים עד לחיבור המלא למכשיר
  const [metrics, setMetrics] = useState({
    sleepScore: 84,
    sleepHours: "7 שעות ו-42 דקות",
    hrv: "68 ms",
    restingHeartRate: "52 bpm",
    steps: "9,420",
  });

  const handleSync = () => {
    if (syncing) return;
    setSyncing(true);
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    }

    setTimeout(() => {
      setSyncing(false);
      setLastSync(new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }));
    }, 1500);
  };

  return (
    <ScreenContainer className="px-5 pt-5" containerClassName="bg-[#07111E]">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>מדדי התאוששות וכושר</Text>
          <Text style={styles.title}>נתוני שעון ומדדים</Text>
          <Text style={styles.subtitle}>סנכרון אחרון: {lastSync}</Text>
        </View>

        <Pressable
          onPress={handleSync}
          disabled={syncing}
          style={({ pressed }) => [styles.syncButton, pressed && styles.syncButtonPressed]}
        >
          <Text style={styles.syncButtonText}>
            {syncing ? "⏳ מסנכרן נתונים מהשעון..." : "🔄 סנכרן נתונים עכשיו"}
          </Text>
        </Pressable>

        <View style={styles.grid}>
          <MetricCard
            title="איכות שינה"
            value={String(metrics.sleepScore)}
            unit="/ 100"
            subtext={metrics.sleepHours}
            color="#38BDF8"
            icon="🌙"
          />
          <MetricCard
            title="שונות דופק (HRV)"
            value={metrics.hrv}
            unit=""
            subtext="מצב התאוששות מעולה"
            color="#10B981"
            icon="⚡"
          />
          <MetricCard
            title="דופק מנוחה"
            value={metrics.restingHeartRate}
            unit=""
            subtext="ממוצע 7 ימים אחרונים"
            color="#F43F5E"
            icon="❤️"
          />
          <MetricCard
            title="צעדים יומיים"
            value={metrics.steps}
            unit=""
            subtext="יעד יומי: 10,000"
            color="#FBBF24"
            icon="👟"
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>חיבור למקורות מידע</Text>
          <Text style={styles.infoText}>
            הנתונים מתעדכנים אוטומטית ברקע דרך Samsung Health וחיבורי ה-API המוגדרים במכשיר.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function MetricCard({ title, value, unit, subtext, color, icon }: { title: string; value: string; unit: string; subtext: string; color: string; icon: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardValue, { color }]}>
          {value} <Text style={styles.cardUnit}>{unit}</Text>
        </Text>
        <Text style={styles.cardSubtext}>{subtext}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 16, paddingBottom: 100, writingDirection: "rtl" },
  header: { alignItems: "flex-end", gap: 3 },
  eyebrow: { color: "#60A5FA", fontSize: 13, fontWeight: "800" },
  title: { color: "#FFFFFF", fontSize: 26, fontWeight: "900" },
  subtitle: { color: "#94A3B8", fontSize: 12 },
  syncButton: { backgroundColor: "#3B82F6", borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center" },
  syncButtonPressed: { opacity: 0.8 },
  syncButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900", writingDirection: "rtl" },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  card: { width: "48%”, backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  cardHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  cardIcon: { fontSize: 16 },
  cardTitle: { color: "#CBD5E1", fontSize: 12, fontWeight: "800", textAlign: "right" },
  cardBody: { gap: 4, alignItems: "flex-end" },
  cardValue: { fontSize: 22, fontWeight: "900", textAlign: "right", writingDirection: "ltr" },
  cardUnit: { fontSize: 12, color: "#94A3B8" },
  cardSubtext: { color: "#94A3B8", fontSize: 10, textAlign: "right" },
  infoBox: { backgroundColor: "#132137", borderColor: "#334E68", borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  infoTitle: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", textAlign: "right" },
  infoText: { color: "#94A3B8", fontSize: 11, lineHeight: 16, textAlign: "right" },
});