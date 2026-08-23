import { ScreenContainer } from "@/components/screen-container";
import { StyleSheet, Text, View } from "react-native";

export default function GarminScreen() {
  return (
    <ScreenContainer className="px-5 pt-5" containerClassName="bg-background">
      <View style={styles.container}>
        <Text style={styles.title}>נתוני Garmin</Text>
        <Text style={styles.subtitle}>סנכרון ומעקב מדדים</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#F7F9FC",
  },
  subtitle: {
    fontSize: 14,
    color: "#AAB7C8",
  },
});