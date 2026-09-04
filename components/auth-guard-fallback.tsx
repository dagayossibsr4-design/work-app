import { ActivityIndicator, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

/** Shown while `useAuthGuard` is checking the session or about to redirect. */
export function AuthGuardFallback() {
  return (
    <ScreenContainer style={styles.center}>
      <ActivityIndicator color="#F5B72C" />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
