import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { BrandMark } from "@/components/ui/brand-mark";
import { trpc } from "@/lib/trpc";
import { ADMIN_ACCESS_CODE_STORAGE_KEY } from "@/lib/admin-access";

export default function AdminLoginScreen() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const verifyMutation = trpc.admin.verifyAccessCode.useMutation();

  const submit = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("יש להזין קוד גישה.");
      return;
    }
    try {
      await verifyMutation.mutateAsync({ code: trimmed });
      await AsyncStorage.setItem(ADMIN_ACCESS_CODE_STORAGE_KEY, trimmed);
      router.replace("/admin-subscribers" as never);
    } catch {
      setError("קוד גישה שגוי.");
    }
  };

  return (
    <ScreenContainer className="px-5 pt-5">
      <View style={styles.content}>
        <BrandMark />
        <Text style={styles.eyebrow}>גישת בעלים</Text>
        <Text style={styles.title}>כניסת מנהל</Text>
        <Text style={styles.subtitle}>הזן את קוד הגישה הקבוע כדי לפתוח את לוח הבקרה. הקוד יישמר במכשיר הזה ולא תצטרך להזין אותו שוב.</Text>

        <TextInput
          accessibilityLabel="קוד גישה"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          value={code}
          onChangeText={(value) => {
            setCode(value);
            if (error) setError("");
          }}
          placeholder="קוד גישה"
          placeholderTextColor="#7E8DA4"
          style={styles.input}
          textAlign="right"
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="כניסה"
          disabled={verifyMutation.isPending}
          onPress={() => void submit()}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed, verifyMutation.isPending && styles.disabled]}
        >
          {verifyMutation.isPending ? <ActivityIndicator color="#0B1224" /> : <Text style={styles.primaryText}>כניסה</Text>}
        </Pressable>

        {error ? <Text accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 35 },
  eyebrow: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "right" },
  title: { color: "#F7F9FC", fontSize: 30, fontWeight: "900", textAlign: "right" },
  subtitle: { color: "#AAB7C8", fontSize: 14, lineHeight: 21, textAlign: "right" },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "#52759C", backgroundColor: "#0F1B31", color: "#F7F9FC", fontSize: 15, paddingHorizontal: 13 },
  primary: { minHeight: 48, backgroundColor: "#F5B72C", borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryText: { color: "#0B1224", fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.65 },
  error: { color: "#FF879A", fontSize: 12, lineHeight: 18, textAlign: "right" },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});
