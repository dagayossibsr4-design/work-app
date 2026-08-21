// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>["name"]>;
export type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "fitness.center": "fitness-center",
  "restaurant.fill": "restaurant",
  "settings.fill": "settings",
  "history.fill": "history",
  "calendar.fill": "calendar-today",
  "analytics.fill": "analytics",
  plus: "add",
  "dumbbell.fill": "fitness-center",
  "square.grid.2x2.fill": "view-module",
  "rectangle.split.3x1.fill": "view-list",
  "arrow.up.and.down": "swap-vert",
  "figure.run": "directions-run",
  bicycle: "directions-bike",
  rowing: "rowing",
  water: "water",
  "bolt.fill": "flash-on",
  "figure.elliptical": "track-changes",
  stairs: "stairs",
  "fork.knife": "restaurant",
  "leaf.fill": "grain",
  "drop.fill": "water-drop",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}
