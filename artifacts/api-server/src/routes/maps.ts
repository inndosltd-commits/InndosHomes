import { Router } from "express";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

function parseCoordinate(value: unknown, min: number, max: number): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= min && numberValue <= max
    ? numberValue
    : null;
}

router.get("/directions", async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [originLat, originLng] = String(req.query.origin ?? "").split(",").map(Number);
  const [destinationLat, destinationLng] = String(req.query.destination ?? "").split(",").map(Number);
  const originIsValid = parseCoordinate(originLat, -90, 90) !== null && parseCoordinate(originLng, -180, 180) !== null;
  const destinationIsValid = parseCoordinate(destinationLat, -90, 90) !== null && parseCoordinate(destinationLng, -180, 180) !== null;

  if (!originIsValid || !destinationIsValid) {
    res.status(400).json({ error: "Valid origin and destination coordinates are required" });
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
    url.searchParams.set("mode", "driving");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url);
    const payload = await response.json() as {
      status?: string;
      error_message?: string;
      routes?: Array<{
        overview_polyline?: { points?: string };
        legs?: Array<{
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
      res.status(502).json({ error: payload.error_message ?? "No driving route is available for this destination" });
      return;
    }

    res.json({
      polyline: route.overview_polyline.points,
      distance: leg.distance?.text ?? "",
      duration: leg.duration?.text ?? "",
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
    res.status(502).json({ error: "Could not retrieve driving directions" });
  }
});

export default router;