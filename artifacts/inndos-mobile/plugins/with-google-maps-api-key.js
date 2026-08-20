const { AndroidConfig, IOSConfig } = require("expo/config-plugins");

/**
 * Keeps the Expo config static while securely applying the Maps key during
 * native prebuild. The key comes from the build environment and is never
 * written into app.json or shipped through Expo's public config.
 */
module.exports = function withGoogleMapsApiKey(config) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const isEasBuild = process.env.EAS_BUILD === "true" || process.env.EAS_BUILD === "1";

  if (!apiKey) {
    if (isEasBuild) {
      throw new Error(
        "GOOGLE_API_KEY is required for native INNDOS builds. Add it to the selected EAS environment before building.",
      );
    }
    config.extra = {
      ...config.extra,
      googleMapsConfigured: false,
    };
    return config;
  }

  config.extra = {
    ...config.extra,
    googleMapsConfigured: true,
  };
  config.ios = {
    ...config.ios,
    config: {
      ...config.ios?.config,
      googleMapsApiKey: apiKey,
    },
  };
  config.android = {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        ...config.android?.config?.googleMaps,
        apiKey,
      },
    },
  };

  config = AndroidConfig.GoogleMapsApiKey.withGoogleMapsApiKey(config);
  return IOSConfig.Maps.withMaps(config);
};