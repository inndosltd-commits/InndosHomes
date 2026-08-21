const { AndroidConfig, IOSConfig } = require("expo/config-plugins");

// Google Maps API keys always start with AIza followed by 35 alphanumeric characters.
// OAuth client IDs look like <numbers>-<hash>.apps.googleusercontent.com and must not
// be used here — they are for Sign-in flows, not Maps SDK authorisation.
const GOOGLE_API_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{30,}$/;

/**
 * Returns the first environment variable that looks like a valid Maps API key.
 * Silently skips values that are present but have the wrong shape (e.g. OAuth
 * client IDs), so a bad EXPO_PUBLIC_GOOGLE_MAPS_API_KEY will not block the
 * fallback GOOGLE_API_KEY from being used.
 */
function findValidApiKey() {
  const candidates = [
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    process.env.GOOGLE_API_KEY,
  ];
  return candidates.find((k) => k && GOOGLE_API_KEY_PATTERN.test(k)) ?? null;
}

/**
 * Keeps the Expo config static while securely applying the Maps key during
 * native prebuild. The key is never written into app.json or shipped through
 * Expo's public config.
 *
 * Key resolution order:
 *   1. EXPO_PUBLIC_GOOGLE_MAPS_API_KEY  (if it is a valid AIza… key)
 *   2. GOOGLE_API_KEY                   (if it is a valid AIza… key)
 *   3. No key → Maps disabled in dev, hard error in EAS / Expo Launch builds
 */
module.exports = function withGoogleMapsApiKey(config) {
  const isEasBuild =
    process.env.EAS_BUILD === "true" || process.env.EAS_BUILD === "1";
  const apiKey = findValidApiKey();

  if (!apiKey) {
    if (isEasBuild) {
      throw new Error(
        "A valid Google Maps API key (starting with AIza…) is required for " +
          "native INNDOS builds. Set GOOGLE_API_KEY or " +
          "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in Replit Secrets to a Maps API " +
          "key. OAuth client IDs (ending in .googleusercontent.com) are not " +
          "accepted here.",
      );
    }
    // Development / web — disable the map gracefully instead of crashing.
    config.extra = { ...config.extra, googleMapsConfigured: false };
    return config;
  }

  config.extra = { ...config.extra, googleMapsConfigured: true };
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
