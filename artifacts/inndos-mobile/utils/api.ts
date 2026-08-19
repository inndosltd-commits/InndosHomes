import Constants from "expo-constants";

/**
 * The mobile app runs outside the web reverse proxy, so requests must always
 * use an absolute origin. The domain can be supplied with or without https.
 */
export function getApiBaseUrl(): string {
  const raw =
    (process.env.EXPO_PUBLIC_DOMAIN as string | undefined) ||
    (Constants.expoConfig?.extra?.apiDomain as string | undefined) ||
    "";

  if (!raw) return "";
  return raw.startsWith("http://") || raw.startsWith("https://")
    ? raw.replace(/\/+$/, "")
    : `https://${raw.replace(/\/+$/, "")}`;
}