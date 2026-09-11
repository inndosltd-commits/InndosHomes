const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Android 16 ignores orientation restrictions on large screens. Remove any
 * manifest-level restrictions so the app and bundled helper activities can
 * resize on tablets and foldables.
 */
module.exports = function withFlexibleAndroidOrientation(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const application = configWithManifest.modResults.manifest.application?.[0];
    const activities = application?.activity ?? [];

    for (const activity of activities) {
      if (activity.$?.["android:screenOrientation"]) {
        delete activity.$["android:screenOrientation"];
      }
    }

    return configWithManifest;
  });
};