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
import { useWorkoutStore } from "../lib/workout-store";

export default function RegisterScreen() {
  const router = useRouter();
  const store = useWorkoutStore() as any;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleConnect = async () => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMsg("נא להזין שם משתמש וסיסמה");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const uniqueAccountKey = `${cleanUser}_${cleanPass}`;

      // הפעלת כל פונקציות הרישום והאימות של ה-Store
      if (typeof store.setAccountName === "function") {
        await store.setAccountName(uniqueAccountKey);
      }
      if (typeof store.setRegistered === "function") {
        await store.setRegistered(true);
      }
      if (typeof store.setIsRegistered === "function") {
        await store.setIsRegistered(true);
      }
      if (typeof store.syncAccount === "function") {
        await store.syncAccount(uniqueAccountKey);
      }

      // מעבר חלק למסך הראשי
      if (Platform.OS === "web") {
        window.location.replace("/(tabs)");
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      setErrorMsg("שגיאה בסנכרון הנתונים, נסה שוב");
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
        <Text style={styles.subtitle}>כניסה וסנכרון בין מכשירים</Text>

        <Text style={styles.label}>שם משתמש</Text>
        <TextInput
          style={styles.input}
          placeholder="הזן שם משתמש..."
          placeholderTextColor="#64748b"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>סיסמה / קוד אישי</Text>
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

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleConnect}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.primaryButtonText}>התחבר / פתח חשבון מסונכרן</Text>
          )}
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
});