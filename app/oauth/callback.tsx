import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    sessionToken?: string;
    user?: string;
  }>();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      console.log("[OAuth] Callback handler triggered");
      console.log("[OAuth] Params received:", {
        code: params.code,
        state: params.state,
        error: params.error,
        sessionToken: params.sessionToken ? "present" : "missing",
        user: params.user ? "present" : "missing",
      });
      try {
        // Check for sessionToken in params first (web OAuth callback from server redirect)
        if (params.sessionToken) {
          console.log("[OAuth] Session token found in params (web callback)");
          await Auth.setSessionToken(params.sessionToken);

          // Decode and store user info if available
          if (params.user) {
            try {
              // Use atob for base64 decoding (works in both web and React Native)
              const userJson =
                typeof atob !== "undefined"
                  ? atob(params.user)
                  : Buffer.from(params.user, "base64").toString("utf-8");
              const userData = JSON.parse(userJson);
              const userInfo: Auth.User = {
                id: userData.id,
                openId: userData.openId,
                name: userData.name,
                email: userData.email,
                loginMethod: userData.loginMethod,
                lastSignedIn: new Date(userData.lastSignedIn || Date.now()),
              };
              await Auth.setUserInfo(userInfo);
              console.log("[OAuth] User info stored:", userInfo);
            } catch (err) {
              console.error("[OAuth] Failed to parse user data:", err);
            }
          }

          setStatus("success");
          console.log("[OAuth] Web authentication successful, redirecting to home...");
          setTimeout(() => {
            router.replace("/(tabs)");
          }, 1000);
          return;
        }

        // Get URL from params or Linking
        let url: string | null = null;

        // Try to get from local search params first (works with expo-router)
        if (params.code || params.state || params.error) {
          console.log("[OAuth] Found params in route params");
          // Extract from params
          const urlParams = new URLSearchParams();
          if (params.code) urlParams.set("code", params.code);
          if (params.state) urlParams.set("state", params.state);
          if (params.error) urlParams.set("error", params.error);
          url = `?${urlParams.toString()}`;
          console.log("[OAuth] Constructed URL from params:", url);
        } else {
          console.log("[OAuth] No params found, checking Linking.getInitialURL()...");
          // Fallback: try to get from Linking
          const initialUrl = await Linking.getInitialURL();
          console.log("[OAuth] Linking.getInitialURL():", initialUrl);
          if (initialUrl) {
            url = initialUrl;
          }
        }

        // Check for error
        const error =
          params.error || (url ? new URL(url, "http://dummy").searchParams.get("error") : null);
        if (error) {
          console.error("[OAuth] Error parameter found:", error);
          setStatus("error");
          setErrorMessage(localizeOAuthError(error));
          return;
        }

        // Check for code and state
        let code: string | null = null;
        let state: string | null = null;
        let sessionToken: string | null = null;

        // Try to get from params first
        if (params.code && params.state) {
          console.log("[OAuth] Using code and state from route params");
          code = params.code;
          state = params.state;
        } else if (url) {
          console.log("[OAuth] Parsing code and state from URL:", url);
          // Parse from URL
          try {
            const urlObj = new URL(url);
            code = urlObj.searchParams.get("code");
            state = urlObj.searchParams.get("state");
            sessionToken = urlObj.searchParams.get("sessionToken");
            console.log("[OAuth] Extracted from URL:", {
              code: code?.substring(0, 20) + "...",
              state: state?.substring(0, 20) + "...",
              sessionToken: sessionToken ? "present" : "missing",
            });
          } catch (e) {
            console.log("[OAuth] Failed to parse as full URL, trying regex:", e);
            // Try parsing as relative URL with query params
            const match = url.match(/[?&](code|state|sessionToken)=([^&]+)/g);
            if (match) {
              match.forEach((param) => {
                const [key, value] = param.substring(1).split("=");
                if (key === "code") code = decodeURIComponent(value);
                if (key === "state") state = decodeURIComponent(value);
                if (key === "sessionToken") sessionToken = decodeURIComponent(value);
              });
              console.log("[OAuth] Extracted from regex:", {
                code: code?.substring(0, 20) + "...",
                state: state?.substring(0, 20) + "...",
                sessionToken: sessionToken ? "present" : "missing",
              });
            }
          }
        }

        console.log("[OAuth] Final extracted values:", {
          hasCode: !!code,
          hasState: !!state,
          hasSessionToken: !!sessionToken,
        });

        // If we have sessionToken directly from URL, use it
        if (sessionToken) {
          console.log("[OAuth] Session token found in URL, storing...");
          await Auth.setSessionToken(sessionToken);
          console.log("[OAuth] Session token stored successfully");
          // User info is already in the OAuth callback response
          // No need to fetch from API
          setStatus("success");
          console.log("[OAuth] Redirecting to home...");
          setTimeout(() => {
            router.replace("/(tabs)");
          }, 1000);
          return;
        }

        // Otherwise, exchange code for session token
        if (!code || !state) {
          console.error("[OAuth] Missing code or state parameter", {
            hasCode: !!code,
            hasState: !!state,
          });
          setStatus("error");
          setErrorMessage("חסרים פרטי האימות. חזור למסך ההרשמה ונסה שוב.");
          return;
        }

        // Exchange code for session token
        console.log("[OAuth] Exchanging code for session token...", {
          code: code.substring(0, 20) + "...",
          state: state.substring(0, 20) + "...",
        });
        const result = await Api.exchangeOAuthCode(code, state);
        console.log("[OAuth] Exchange result:", {
          hasSessionToken: !!result.sessionToken,
          hasUser: !!result.user,
        });

        if (result.sessionToken) {
          console.log("[OAuth] Session token received, storing...");
          // Store session token
          await Auth.setSessionToken(result.sessionToken);
          console.log("[OAuth] Session token stored successfully");

          // Store user info if available
          if (result.user) {
            console.log("[OAuth] User data received:", result.user);
            const userInfo: Auth.User = {
              id: result.user.id,
              openId: result.user.openId,
              name: result.user.name,
              email: result.user.email,
              loginMethod: result.user.loginMethod,
              lastSignedIn: new Date(result.user.lastSignedIn || Date.now()),
            };
            await Auth.setUserInfo(userInfo);
            console.log("[OAuth] User info stored:", userInfo);
          } else {
            console.log("[OAuth] No user data in result");
          }

          setStatus("success");
          console.log("[OAuth] Authentication successful, redirecting to home...");

          // Redirect to home after a short delay
          setTimeout(() => {
            console.log("[OAuth] Executing redirect...");
            router.replace("/(tabs)");
          }, 1000);
        } else {
          console.error("[OAuth] No session token in result:", result);
          setStatus("error");
          setErrorMessage("לא התקבל אישור התחברות מהשרת. חזור למסך ההרשמה ונסה שוב.");
        }
      } catch (error) {
        console.error("[OAuth] Callback error:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? localizeOAuthError(error.message) : "לא ניתן להשלים את החיבור כרגע.",
        );
      }
    };

    handleCallback();
  }, [params.code, params.state, params.error, params.sessionToken, params.user, router]);

  return (
    <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>חשבון אישי</Text>
        {status === "processing" && (
          <>
            <ActivityIndicator size="large" color="#F5B72C" />
            <Text style={styles.title}>מאמת את החשבון…</Text>
            <Text style={styles.note}>אנחנו משלימים את החיבור ומחזירים אותך לאפליקציה.</Text>
          </>
        )}
        {status === "success" && (
          <>
            <Text style={styles.successTitle}>החיבור הצליח</Text>
            <Text style={styles.note}>החשבון נשמר. מעבירים אותך למסך הראשי…</Text>
          </>
        )}
        {status === "error" && (
          <>
            <Text style={styles.errorTitle}>לא הצלחנו להשלים את החיבור</Text>
            <Text style={styles.note}>{errorMessage || "אירעה שגיאה זמנית. נסה שוב ממסך ההרשמה."}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="חזרה למסך הרשמה" onPress={() => router.replace("/register")} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
              <Text style={styles.buttonText}>חזרה להרשמה</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function localizeOAuthError(message: string | null | undefined) {
  const normalized = String(message ?? "").toLowerCase();
  if (normalized.includes("access_denied") || normalized.includes("denied")) return "ההרשאה בוטלה. אפשר לנסות שוב בכל עת.";
  if (normalized.includes("expired") || normalized.includes("invalid")) return "קישור האימות פג או אינו תקין. חזור למסך ההרשמה ונסה שוב.";
  if (normalized.includes("network") || normalized.includes("fetch")) return "אין חיבור תקין לשרת. בדוק את האינטרנט ונסה שוב.";
  return "לא ניתן להשלים את החיבור כרגע. חזור למסך ההרשמה ונסה שוב.";
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B1224" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  eyebrow: { color: "#F5B72C", fontSize: 13, fontWeight: "900", textAlign: "center" },
  title: { color: "#F7F9FC", fontSize: 22, fontWeight: "900", textAlign: "center" },
  successTitle: { color: "#65BDF6", fontSize: 24, fontWeight: "900", textAlign: "center" },
  errorTitle: { color: "#FF879A", fontSize: 22, fontWeight: "900", textAlign: "center" },
  note: { color: "#AAB7C8", fontSize: 13, lineHeight: 20, textAlign: "center", maxWidth: 340 },
  button: { minHeight: 46, minWidth: 190, paddingHorizontal: 18, borderRadius: 12, backgroundColor: "#F5B72C", alignItems: "center", justifyContent: "center", marginTop: 8 },
  buttonText: { color: "#0B1224", fontWeight: "900" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
