import Constants from "expo-constants";

/**
 * The mobile app runs outside the web reverse proxy, so requests must always
 * use an absolute origin. The domain can be supplied with or without https.
 */
export function getApiBaseUrl(): string {
  const environmentDomain = process.env.EXPO_PUBLIC_DOMAIN as string | undefined;
  const configuredDomain = Constants.expoConfig?.extra?.apiDomain as string | undefined;
  // Development needs the Replit host so Expo Go can reach the workspace.
  // Release builds must use the production domain baked into app.json, even
  // if a stale build-time environment value is still present.
  const raw = __DEV__
    ? environmentDomain || configuredDomain || ""
    : configuredDomain || environmentDomain || "";

  if (!raw) return "";
  return raw.startsWith("http://") || raw.startsWith("https://")
    ? raw.replace(/\/+$/, "")
    : `https://${raw.replace(/\/+$/, "")}`;
}