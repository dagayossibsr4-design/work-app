import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * In-app Hebrew confirmation dialog, styled consistently with the rest of the
 * app. Use this instead of `window.confirm`/`Alert.alert` for destructive
 * actions that need a real, on-brand confirmation UI on every platform.
 */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "אישור",
  cancelLabel = "ביטול",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              onPress={onCancel}
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              onPress={onConfirm}
              style={({ pressed }) => [styles.confirm, destructive && styles.confirmDestructive, pressed && styles.pressed]}
            >
              <Text style={[styles.confirmText, destructive && styles.confirmDestructiveText]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(3,9,22,0.72)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 360, backgroundColor: "#16233A", borderColor: "#2C3B55", borderWidth: 1, borderRadius: 18, padding: 20, gap: 12 },
  title: { color: "#F7F9FC", fontSize: 18, fontWeight: "900", textAlign: "right" },
  message: { color: "#D9E2EF", fontSize: 13, lineHeight: 19, textAlign: "right" },
  actions: { flexDirection: "row-reverse", gap: 10, marginTop: 6 },
  cancel: { flex: 1, minHeight: 46, borderColor: "#52759C", borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cancelText: { color: "#D9E2EF", fontWeight: "800" },
  confirm: { flex: 1, minHeight: 46, backgroundColor: "#F5B72C", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  confirmText: { color: "#0B1224", fontWeight: "900" },
  confirmDestructive: { backgroundColor: "#D8657E" },
  confirmDestructiveText: { color: "#FFFFFF" },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});
