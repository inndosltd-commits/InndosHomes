export const PROPERTY_TYPES = ["rent", "sale", "bnb", "hotel", "hostel"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const COMMERCIAL_RENT_SUBTYPES = ["business", "godown", "stall", "shop"] as const;
export type CommercialRentSubtype = (typeof COMMERCIAL_RENT_SUBTYPES)[number];

const TYPE_ALIASES: Record<string, PropertyType> = {
  rent: "rent",
  rental: "rent",
  sale: "sale",
  sell: "sale",
  bnb: "bnb",
  "bed-and-breakfast": "bnb",
  hotel: "hotel",
  hostel: "hostel",
};

const SUBTYPE_ALIASES: Record<string, string> = {
  apartment: "apartment",
  apartments: "apartment",
  flat: "apartment",
  flats: "apartment",
  home: "home",
  house: "home",
  houses: "home",
  land: "land",
  plot: "land",
  plots: "land",
  business: "business",
  commercial: "business",
  godown: "godown",
  warehouse: "godown",
  stall: "stall",
  stalls: "stall",
  shop: "shop",
  shops: "shop",
  student: "student",
  students: "student",
  bedsitter: "bedsitter",
  "bed-sitter": "bedsitter",
  studio: "studio",
  room: "room",
  rooms: "room",
};

function clean(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

export function normalizePropertyType(value: unknown): PropertyType | null {
  if (typeof value !== "string") return null;
  return TYPE_ALIASES[clean(value)] ?? null;
}

export function normalizePropertySubtype(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const cleaned = clean(value);
  const normalized = cleaned.match(/^(?:rent|rental|sale|sell)-(.+)$/)?.[1] ?? cleaned;
  return SUBTYPE_ALIASES[normalized] ?? normalized;
}

export type NormalizedPropertyCategory = {
  type: PropertyType;
  subtype: string | null;
};

export function normalizePropertyCategory(
  typeValue: unknown,
  subtypeValue?: unknown,
): NormalizedPropertyCategory | null {
  if (typeof typeValue !== "string") return null;
  const rawType = clean(typeValue);
  const composite = rawType.match(/^(rent|rental|sale|sell)-(.+)$/);
  const type = normalizePropertyType(composite?.[1] ?? rawType);
  if (!type) return null;
  const subtype = normalizePropertySubtype(composite?.[2] ?? subtypeValue);
  return { type, subtype };
}

export function propertyTypeLabel(type: unknown): string {
  switch (normalizePropertyType(type)) {
    case "rent": return "For Rent";
    case "sale": return "For Sale";
    case "bnb": return "B&B";
    case "hotel": return "Hotel";
    case "hostel": return "Hostel";
    default: return typeof type === "string" && type.trim() ? type : "Property";
  }
}

export function propertySubtypeLabel(subtype: unknown): string | null {
  const normalized = normalizePropertySubtype(subtype);
  if (!normalized) return null;
  return normalized.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function propertySubtypeLabelForType(type: unknown, subtype: unknown): string | null {
  const normalizedType = normalizePropertyType(type);
  const normalizedSubtype = normalizePropertySubtype(subtype);
  if (!normalizedSubtype || normalizedSubtype === normalizedType) return null;
  return propertySubtypeLabel(normalizedSubtype);
}

export function propertyCategoryLabel(type: unknown, subtype?: unknown): string {
  const main = propertyTypeLabel(type);
  const sub = propertySubtypeLabelForType(type, subtype);
  return sub ? `${main} · ${sub}` : main;
}

export function propertyCategorySearchValues(type: unknown, subtype?: unknown): string[] {
  const category = normalizePropertyCategory(type, subtype);
  if (!category) return [];
  return [
    category.type,
    propertyTypeLabel(category.type),
    ...(category.subtype ? [category.subtype, propertySubtypeLabel(category.subtype) ?? ""] : []),
  ].filter(Boolean);
}