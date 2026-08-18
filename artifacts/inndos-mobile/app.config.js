// Dynamic config so EAS secrets (process.env.*) are resolved at build time.
// The static app.json is kept as the base; this file extends/overrides it.

/** @type {import('expo/config').ExpoConfig} */
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
    buildNumber: "4",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "INNDOS uses your location to show properties near you.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "INNDOS uses your location to show properties near you.",
    },
    config: {
      googleMapsApiKey: process.env.GOOGLE_API_KEY,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#0a0a0a",
    },
    icon: "./assets/images/icon.png",
    package: "com.inndos.app",
    versionCode: 3,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_API_KEY,
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
    [
      "react-native-maps",
      {
        googleMapsApiKey: process.env.GOOGLE_API_KEY,
        enableGoogleMaps: true,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "47e82898-c077-46dd-8e45-8f227ba8537c",
    },
  },
};

module.exports = { expo: config };
