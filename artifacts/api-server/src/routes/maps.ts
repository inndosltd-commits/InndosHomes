import { Router, type Response } from "express";
import { requireAuth } from "../lib/requireAuth";

const router = Router();
const PLACE_LOOKUP_LIMIT = 40;
const PLACE_LOOKUP_WINDOW_MS = 60_000;
const placeLookupBuckets = new Map<string, { count: number; resetAt: number }>();
const DIRECTIONS_LIMIT = 30;
const DIRECTIONS_WINDOW_MS = 60_000;
const directionsBuckets = new Map<string, { count: number; resetAt: number }>();

function enforcePlaceLookupLimit(userId: string, res: Response): boolean {
  const now = Date.now();
  const existing = placeLookupBuckets.get(userId);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + PLACE_LOOKUP_WINDOW_MS }
    : existing;

  if (bucket.count >= PLACE_LOOKUP_LIMIT) {
    res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
    res.status(429).json({ error: "Too many place searches. Please wait a moment and try again." });
    return false;
  }

  bucket.count += 1;
  placeLookupBuckets.set(userId, bucket);
  return true;
}

function enforceDirectionsLimit(userId: string, res: Response): boolean {
  const now = Date.now();
  const existing = directionsBuckets.get(userId);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + DIRECTIONS_WINDOW_MS }
    : existing;

  if (bucket.count >= DIRECTIONS_LIMIT) {
    res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
    res.status(429).json({ error: "Too many directions requests. Please wait a moment and try again." });
    return false;
  }

  bucket.count += 1;
  directionsBuckets.set(userId, bucket);
  return true;
}

function parseCoordinate(value: unknown, min: number, max: number): number | null {
  if (typeof value === "string" && value.trim() === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= min && numberValue <= max
    ? numberValue
    : null;
}

/**
 * GET /api/maps/places?query=<text>&sessiontoken=<optional>
 * Forward place/address search via Google Places Autocomplete.
 * This endpoint returns predictions only. Coordinates are resolved once, after
 * the user selects a result, by GET /api/maps/places/:placeId.
 * Requires auth. API key is kept server-side.
 */
router.get("/places", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  if (!enforcePlaceLookupLimit(userId, res)) return;

  const query = String(req.query.query ?? "").trim();
  if (query.length < 2 || query.length > 120) {
    res.status(400).json({ error: "query must be between 2 and 120 characters" });
    return;
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Place search is not configured for this environment" });
    return;
  }

  try {
    // Step 1: autocomplete to get place predictions
    const acUrl = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
    acUrl.searchParams.set("input", query);
    acUrl.searchParams.set("key", apiKey);
    // Listings are located in Kenya. Nairobi provides a useful starting bias
    // while the country restriction keeps all suggestions in-country.
    acUrl.searchParams.set("components", "country:ke");
    acUrl.searchParams.set("location", "-1.2921,36.8219");
    acUrl.searchParams.set("radius", "500000");
    const sessiontoken = String(req.query.sessiontoken ?? "").slice(0, 100);
    if (sessiontoken) acUrl.searchParams.set("sessiontoken", sessiontoken);

    const acResponse = await fetch(acUrl);
    const acPayload = await acResponse.json() as {
      status?: string;
      error_message?: string;
      predictions?: Array<{
        place_id?: string;
        description?: string;
        structured_formatting?: { main_text?: string; secondary_text?: string };
      }>;
    };

    if (!acResponse.ok || (acPayload.status !== "OK" && acPayload.status !== "ZERO_RESULTS")) {
      res.status(502).json({ error: acPayload.error_message ?? "Place search unavailable" });
      return;
    }

    const results = (acPayload.predictions ?? [])
      .slice(0, 5)
      .filter((prediction) => !!prediction.place_id)
      .map((prediction) => ({
        placeId: prediction.place_id,
        description: prediction.structured_formatting?.main_text
          ?? prediction.description
          ?? "",
        secondaryText: prediction.structured_formatting?.secondary_text ?? "",
      }));

    res.json({ results });
  } catch {
    res.status(502).json({ error: "Could not perform place search" });
  }
});

router.get("/places/:placeId", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  if (!enforcePlaceLookupLimit(userId, res)) return;

  const placeId = String(req.params.placeId ?? "").trim();
  if (!placeId || placeId.length > 256) {
    res.status(400).json({ error: "A valid place ID is required" });
    return;
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Place search is not configured for this environment" });
    return;
  }

  try {
    const detailUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    detailUrl.searchParams.set("place_id", placeId);
    detailUrl.searchParams.set("fields", "geometry,formatted_address,name,address_component");
    detailUrl.searchParams.set("key", apiKey);
    const sessiontoken = String(req.query.sessiontoken ?? "").slice(0, 100);
    if (sessiontoken) detailUrl.searchParams.set("sessiontoken", sessiontoken);

    const detailResponse = await fetch(detailUrl);
    const detailPayload = await detailResponse.json() as {
      status?: string;
      error_message?: string;
      result?: {
        name?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
        formatted_address?: string;
        address_components?: Array<{ types?: string[]; short_name?: string }>;
      };
    };
    const location = detailPayload.result?.geometry?.location;
    if (!detailResponse.ok || detailPayload.status !== "OK" || location?.lat == null || location.lng == null) {
      res.status(502).json({ error: detailPayload.error_message ?? "Could not resolve this place" });
      return;
    }
    const isKenyanPlace = detailPayload.result?.address_components?.some(
      (component) => component.types?.includes("country") && component.short_name === "KE"
    );
    if (!isKenyanPlace) {
      res.status(422).json({ error: "Please choose a location in Kenya." });
      return;
    }

    res.json({
      place: {
        placeId,
        description: detailPayload.result?.name ?? detailPayload.result?.formatted_address ?? "",
        address: detailPayload.result?.formatted_address ?? detailPayload.result?.name ?? "",
        latitude: location.lat,
        longitude: location.lng,
      },
    });
  } catch {
    res.status(502).json({ error: "Could not resolve this place" });
  }
});

router.get("/directions", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  if (!enforceDirectionsLimit(userId, res)) return;

  const originParts = String(req.query.origin ?? "").split(",");
  const destinationParts = String(req.query.destination ?? "").split(",");
  const [originLat, originLng] = originParts.map(Number);
  const [destinationLat, destinationLng] = destinationParts.map(Number);
  const originIsValid = parseCoordinate(originParts[0], -90, 90) !== null && parseCoordinate(originParts[1], -180, 180) !== null;
  const destinationIsValid = parseCoordinate(destinationParts[0], -90, 90) !== null && parseCoordinate(destinationParts[1], -180, 180) !== null;
  const mode = String(req.query.mode ?? "driving").toLowerCase();

  if (originParts.length !== 2 || destinationParts.length !== 2 || !originIsValid || !destinationIsValid) {
    res.status(400).json({ error: "Valid origin and destination coordinates are required" });
    return;
  }
  if (mode !== "driving" && mode !== "walking") {
    res.status(400).json({ error: "mode must be either driving or walking" });
    return;
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Directions are not configured for this environment" });
    return;
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", `${originLat},${originLng}`);
    url.searchParams.set("destination", `${destinationLat},${destinationLng}`);
    url.searchParams.set("mode", mode);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url);
    const payload = await response.json() as {
      status?: string;
      error_message?: string;
      routes?: Array<{
        overview_polyline?: { points?: string };
        legs?: Array<{
          start_address?: string;
          end_address?: string;
          distance?: { text?: string; value?: number };
          duration?: { text?: string; value?: number };
          steps?: Array<{
            html_instructions?: string;
            distance?: { text?: string; value?: number };
            duration?: { text?: string; value?: number };
            end_location?: { lat?: number; lng?: number };
          }>;
        }>;
      }>;
    };
    const route = payload.routes?.[0];
    const leg = route?.legs?.[0];
    if (!response.ok || payload.status !== "OK" || !route?.overview_polyline?.points || !leg) {
      res.status(502).json({ error: payload.error_message ?? `No ${mode} route is available for this destination` });
      return;
    }

    res.json({
      polyline: route.overview_polyline.points,
      distance: leg.distance?.text ?? "",
      duration: leg.duration?.text ?? "",
      startAddress: leg.start_address ?? "",
      endAddress: leg.end_address ?? "",
      steps: (leg.steps ?? []).map((step) => ({
        instruction: (step.html_instructions ?? "").replace(/<[^>]*>/g, "").trim(),
        distance: step.distance?.text ?? "",
        duration: step.duration?.text ?? "",
        end: step.end_location?.lat != null && step.end_location.lng != null
          ? { latitude: step.end_location.lat, longitude: step.end_location.lng }
          : null,
      })),
    });
  } catch {
    res.status(502).json({ error: `Could not retrieve ${mode} directions` });
  }
});

export default router;