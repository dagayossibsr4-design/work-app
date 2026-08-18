const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Keep the CSS virtual in production so Metro does not hash a transient
  // react-native-css-interop cache file that may be removed during bundling.
  forceWriteFileSystem: false,
});
