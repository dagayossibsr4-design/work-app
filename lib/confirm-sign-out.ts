import { Alert, Platform } from "react-native";

const CONFIRM_TITLE = "התנתקות";
const CONFIRM_MESSAGE = "האם אתה בטוח שברצונך להתנתק מהחשבון?";

/**
 * Shows a platform-appropriate confirmation before signing out.
 * The callback is called only after the user explicitly confirms.
 */
export function confirmSignOut(onConfirm: () => void) {
  if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.confirm === "function") {
    if (window.confirm(`${CONFIRM_TITLE}\n\n${CONFIRM_MESSAGE}`)) onConfirm();
    return;
  }

  Alert.alert(CONFIRM_TITLE, CONFIRM_MESSAGE, [
    { text: "ביטול", style: "cancel" },
    { text: "התנתק", style: "destructive", onPress: onConfirm },
  ]);
}
