const SPECIAL_WORDS: Record<string, string> = {
  ac: "Air Conditioning",
  cctv: "CCTV",
  dsq: "DSQ",
  wifi: "Wi-Fi",
  tv: "TV",
  ensuite: "En-suite",
  "247": "24/7",
};

const EXACT_LABELS: Record<string, string> = {
  security: "24/7 Security",
  security_247: "24/7 Security",
  apt_prem_security_247: "24/7 Security",
  home_security_247: "24/7 Security",
  home_prem_security_247: "24/7 Security",
  godown_security_247: "24/7 Security",
};

/**
 * Converts stored listing feature IDs into a label suitable for native UI.
 * Listing IDs are intentionally kept canonical in storage; presentation should
 * never expose those implementation identifiers to a guest.
 */
export function resolveAmenityLabel(id: string): string {
  const cleanId = id.trim();
  if (!cleanId) return "";
  if (EXACT_LABELS[cleanId.toLowerCase()]) return EXACT_LABELS[cleanId.toLowerCase()];

  const words = cleanId
    .split(/[_-]+/)
    .filter((word) => !["apt", "home", "com", "land", "prem", "surr", "biz", "godown"].includes(word))
    .map((word) => {
      const special = SPECIAL_WORDS[word.toLowerCase()];
      if (special) return special;
      return word.charAt(0).toUpperCase() + word.slice(1);
    });

  return words.length > 0 ? words.join(" ") : cleanId;
}