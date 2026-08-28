let _baseUrl: string | null = null;

export function setImageBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

export function getImageUrl(imagePath: string | null | undefined): string {
  const cleanPath = imagePath?.trim();
  if (!cleanPath || /[\u0000-\u001F\u007F]/.test(cleanPath)) return "";
  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    return cleanPath;
  }
  // Never pass arbitrary native URI schemes into Image or AVPlayer.
  if (/^[a-z][a-z0-9+.-]*:/i.test(cleanPath)) return "";
  const resolved = cleanPath.startsWith("/objects/")
    ? `/api/storage${cleanPath}`
    : cleanPath.startsWith("/")
      ? cleanPath
      : `/${cleanPath}`;
  if (_baseUrl && resolved.startsWith("/")) {
    return `${_baseUrl}${resolved}`;
  }
  return resolved;
}
