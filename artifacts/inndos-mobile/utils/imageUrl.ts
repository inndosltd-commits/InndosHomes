let _baseUrl: string | null = null;

export function setImageBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

export function getImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return "";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  if (_baseUrl && imagePath.startsWith("/")) {
    return `${_baseUrl}${imagePath}`;
  }
  return imagePath;
}
