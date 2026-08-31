const PRICE_UNIT_LABELS: Record<string, string> = {
  night: "/night",
  month: "/mo",
  week: "/wk",
  semester: "/sem",
  year: "/yr",
  sqft: "/sq ft",
  day: "/day",
  hour: "/hr",
};

export function formatPropertyPrice(
  type: string,
  price: number,
  priceUnit?: string | null,
): string {
  const formatted = `KES ${price.toLocaleString()}`;
  const normalizedUnit = priceUnit?.trim().toLowerCase();

  if (normalizedUnit && PRICE_UNIT_LABELS[normalizedUnit]) {
    return `${formatted}${PRICE_UNIT_LABELS[normalizedUnit]}`;
  }

  // Legacy fallbacks for listings created before priceUnit was saved.
  if (type === "rent") return `${formatted}/mo`;
  if (type === "bnb" || type === "hotel" || type === "hostel") {
    return `${formatted}/night`;
  }
  return formatted;
}