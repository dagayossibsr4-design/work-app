import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  async function handleAuth() {
    if (!email || !password) {
      setMessage({ text: "נא למלא אימייל וסיסמה", isError: true });
      return;
    }

    setLoading(true);
    setMessage(null);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setMessage({ text: "שגיאת התחברות: " + error.message, isError: true });
      } else {
        router.replace("/(tabs)");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setMessage({ text: "שגיאת הרשמה: " + error.message, isError: true });
      } else {
        setMessage({ text: "נרשמת בהצלחה! מועבר לאפליקציה...", isError: false });
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 1000);
      }
    }
    setLoading(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>W</Text>
          </View>
          <Text style={styles.appTitle}>יומן האימונים</Text>
          <Text style={styles.appSubtitle}>מדדים. עקביות. התקדמות.</Text>
        </View>

        <Text style={styles.title}>{isLogin ? "התחברות לחשבון" : "יצירת חשבון חדש"}</Text>

        {message && (
          <View style={[styles.msgBox, message.isError ? styles.errorBox : styles.successBox]}>
            <Text style={[styles.msgText, message.isError ? styles.errorText : styles.successText]}>
              {message.text}
            </Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>כתובת אימייל</Text>
          <TextInput
            placeholder="your@email.com"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>סיסמה</Text>
          <TextInput
            placeholder="לפחות 6 תווים"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.buttonText}>{isLogin ? "התחבר למערכת" : "צור חשבון חדש"}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => { setIsLogin(!isLogin); setMessage(null); }} 
          style={styles.switchButton}
        >
          <Text style={styles.switchText}>
            {isLogin ? "אין לך חשבון? לחץ כאן להרשמה" : "יש לך כבר חשבון? לחץ כאן להתחברות"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={styles.skipButton}>
          <Text style={styles.skipText}>המשך ללא חשבון (מצב מקומי)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0b132b", padding: 20 },
  card: { width: "100%", maxWidth: 420, backgroundColor: "#1c2541", borderRadius: 16, padding: 24, borderWidth: 1, borderColor: "#334155" },
  header: { alignItems: "center", marginBottom: 24 },
  logoBadge: { width: 56, height: 56, borderRadius: 14, backgroundColor: "#f59e0b", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  logoText: { fontSize: 30, fontWeight: "bold", color: "#0b132b" },
  appTitle: { fontSize: 22, fontWeight: "bold", color: "#ffffff" },
  appSubtitle: { fontSize: 13, color: "#94a3b8", marginTop: 4 },
  title: { fontSize: 20, fontWeight: "bold", color: "#ffffff", textAlign: "center", marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { color: "#cbd5e1", fontSize: 13, marginBottom: 6, textAlign: "right" },
  input: { backgroundColor: "#0f172a", color: "#ffffff", padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "#334155", textAlign: "right", fontSize: 15 },
  button: { backgroundColor: "#f59e0b", padding: 15, borderRadius: 10, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#0b132b", fontWeight: "bold", fontSize: 16 },
  switchButton: { marginTop: 18, alignItems: "center" },
  switchText: { color: "#38bdf8", fontSize: 14 },
  skipButton: { marginTop: 22, alignItems: "center" },
  skipText: { color: "#64748b", fontSize: 13, textDecorationLine: "underline" },
  msgBox: { padding: 12, borderRadius: 8, marginBottom: 16 },
  errorBox: { backgroundColor: "rgba(239, 68, 68, 0.15)", borderWidth: 1, borderColor: "#ef4444" },
  successBox: { backgroundColor: "rgba(34, 197, 94, 0.15)", borderWidth: 1, borderColor: "#22c55e" },
  msgText: { textAlign: "center", fontSize: 14 },
  errorText: { color: "#f87171" },
  successText: { color: "#4ade80" },
});