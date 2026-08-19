// Dynamic config so EAS secrets (process.env.*) are resolved at build time.
const googleMapsApiKey = process.env.GOOGLE_API_KEY;

const config = {
  name: "inndos",
  slug: "inndos-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "inndos-mobile",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/icon.png",
    resizeMode: "contain",
    backgroundColor: "#0a0a0a",
  },
  ios: {
    supportsTablet: false,
    icon: "./assets/images/icon.png",
    bundleIdentifier: "com.inndos.app",
    buildNumber: "6",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "INNDOS uses your location to show properties near you.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "INNDOS uses your location to show properties near you.",
    },
    config: {
      googleMapsApiKey,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#0a0a0a",
    },
    icon: "./assets/images/icon.png",
    package: "com.inndos.app",
    versionCode: 6,
    config: {
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
  },
  web: {
    favicon: "./assets/images/icon.png",
  },
  plugins: [
    [
      "expo-router",
      {
        origin: "https://replit.com/",
      },
    ],
    "expo-font",
    "expo-web-browser",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow INNDOS to access your photos to upload property images.",
        cameraPermission:
          "Allow INNDOS to use your camera to take property photos.",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Allow INNDOS to use your location to show nearby properties.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Hardcoded so the app always reaches the API regardless of EAS secret availability.
    // EXPO_PUBLIC_DOMAIN env var (non-secret) takes precedence at runtime if set.
    apiDomain: "https://inndos.com",
    // Lets the native UI explain a missing build-time key instead of showing
    // an empty map surface. The key itself is never exposed to JavaScript.
    googleMapsConfigured: Boolean(googleMapsApiKey),
    eas: {
      projectId: "47e82898-c077-46dd-8e45-8f227ba8537c",
    },
  },
};

module.exports = { expo: config };
