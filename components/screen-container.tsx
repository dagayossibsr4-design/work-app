import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { StyleSheet, View, type ViewProps } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

export interface ScreenContainerProps extends ViewProps {
  /** Safe area edges applied to the content layer. */
  edges?: Edge[];
  /** Tailwind className for the content area. */
  className?: string;
  /** Additional className for the outer background layer. */
  containerClassName?: string;
  /** Additional className for the SafeAreaView layer. */
  safeAreaClassName?: string;
}

/**
 * Native-first screen shell. Structural layout and colors are explicit styles;
 * NativeWind classes remain optional enhancements and cannot collapse the APK
 * layout when the CSS interop layer is unavailable.
 */
export function ScreenContainer({
  children,
  edges = ["top", "left", "right"],
  className,
  containerClassName,
  safeAreaClassName,
  style,
  ...props
}: ScreenContainerProps) {
  const colors = useColors();
  const backgroundStyle = { backgroundColor: colors.background };

  return (
    <View
      className={cn("flex-1", "bg-background", containerClassName)}
      style={[styles.flex, backgroundStyle, style]}
      {...props}
    >
      <SafeAreaView
        edges={edges}
        className={cn("flex-1", safeAreaClassName)}
        style={[styles.flex, backgroundStyle]}
      >
        <View style={[styles.flex, backgroundStyle]} className={cn("flex-1", className)}>
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
