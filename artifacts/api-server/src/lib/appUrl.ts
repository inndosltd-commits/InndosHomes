/**
 * Public links shared in customer-facing messages.
 *
 * Do not derive this from request headers or REPLIT_DOMAINS: those values point
 * at development previews and can leak preview domains into email or SMS.
 */
export const INNDOS_ORIGIN = "https://inndos.com";

export function getWebsiteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${INNDOS_ORIGIN}${normalizedPath}`;
}

export function getDashboardUrl(tab?: string): string {
  const query = tab ? `?tab=${encodeURIComponent(tab)}` : "";
  return getWebsiteUrl(`/#/dashboard${query}`);
}

export function getContactUrl(): string {
  return getWebsiteUrl("/#/contact");
}

/**
 * Rewrites previously saved Replit preview URLs while preserving their route,
 * query string, and hash route. This lets old editable templates and bell
 * notifications safely point customers back to the canonical website.
 */
export function rewritePreviewUrls(text: string): string {
  return text.replace(/https?:\/\/[^\s<>"']+/gi, (candidate) => {
    try {
      const url = new URL(candidate);
      if (url.hostname.endsWith(".replit.app") || url.hostname.endsWith(".replit.dev")) {
        return `${INNDOS_ORIGIN}${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      // Leave non-URL text unchanged.
    }
    return candidate;
  });
}