const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withRtl(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    if (application) {
      application.$ = application.$ || {};
      application.$["android:supportsRtl"] = "true";
    }
    return modConfig;
  });
};
