import { withAndroidManifest, type ConfigPlugin } from "@expo/config-plugins";

/** Enables Android's native RTL layout support in every generated binary. */
const withRtl: ConfigPlugin = (config) =>
  withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    if (application) {
      application.$ = application.$ ?? {};
      application.$["android:supportsRtl"] = "true";
    }
    return modConfig;
  });

export default withRtl;
