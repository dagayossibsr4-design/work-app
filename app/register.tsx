import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { useWorkoutStore } from "../lib/workout-store";

export default function RegisterScreen() {
  const router = useRouter();
  const { setAccountName, syncAccount } = useWorkoutStore();
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleAuth = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg("נא להזין דוא\"ל וסיסמה");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (isLoginMode) {
        // התחברות לחשבון קיים
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (error) throw error;

        if (data?.user) {
          if (setAccountName) await setAccountName(data.user.id);
          if (syncAccount) await syncAccount(data.user.id);

          if (Platform.OS === "web") {
            window.location.href = "/";
          } else {
            router.replace("/(tabs)");
          }
        }
      } else {
        // הרשמת חשבון חדש
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
        });

        if (error) throw error;

        if (data?.user) {
          if (setAccountName) await setAccountName(data.user.id);
          if (syncAccount) await syncAccount(data.user.id);

          if (data.session) {
            if (Platform.OS === "web") {
              window.location.href = "/";
            } else {
              router.replace("/(tabs)");
            }
          } else {
            setSuccessMsg("נשלח אימייל אימות. נא לאשר את החשבון ולהתחבר.");
            setIsLoginMode(true);
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "שגיאה בביצוע הפעולה, נסה שוב");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>W</Text>
        </View>
        <Text style={styles.title}>יומן האימונים</Text>
        <Text style={styles.subtitle}>
          {isLoginMode ? "התחברות לחשבון אישי" : "פתיחת חשבון חדש"}
        </Text>

        <Text style={styles.label}>כתובת דוא"ל</Text>
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />

        <Text style={styles.label}>סיסמה</Text>
        <TextInput
          style={styles.input}
          placeholder="הזן סיסמה..."
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isLoginMode ? "התחבר" : "הירשם ופתח חשבון"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => {
            setIsLoginMode(!isLoginMode);
            setErrorMsg("");
            setSuccessMsg("");
          }}
        >
          <Text style={styles.switchButtonText}>
            {isLoginMode
              ? "אין לך חשבון עדיין? הירשם כאן"
              : "כבר יש לך חשבון? התחבר כאן"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070b14",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0f172a",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 24,
    textAlign: "center",
  },
  label: {
    alignSelf: "flex-start",
    fontSize: 13,
    color: "#cbd5e1",
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    width: "100%",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#f8fafc",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 16,
    textAlign: "right",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    marginBottom: 14,
    textAlign: "center",
  },
  successText: {
    color: "#10b981",
    fontSize: 13,
    marginBottom: 14,
    textAlign: "center",
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#f59e0b",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  primaryButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
  },
  switchButton: {
    marginTop: 18,
    padding: 8,
  },
  switchButtonText: {
    color: "#f59e0b",
    fontSize: 14,
    fontWeight: "600",
  },
});