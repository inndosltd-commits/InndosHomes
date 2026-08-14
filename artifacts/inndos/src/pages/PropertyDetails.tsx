import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BedDouble, Bath, Square, MapPin, Share2, Heart, CheckCircle, XCircle, Calendar, ShieldCheck, Mail, MessageSquare, PhoneCall, MessageCircle, Star, Loader2, Copy, Navigation, Compass, Lock, ChevronLeft, ChevronRight, X, Images, Download, Play, Minimize2 } from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback, useRef } from "react";
import { useCurrency } from "@/lib/currency";
import { useLanguage } from "@/lib/language";
import { useAuth } from "@/lib/auth";
import type { ApiProperty } from "@/components/property/PropertyCard";
import { resolveAmenityLabel } from "@/lib/amenities";
import { useGetPropertyAvailability, getGetPropertyAvailabilityQueryKey } from "@workspace/api-client-react";
import { GoogleMap, useJsApiLoader, DirectionsRenderer } from "@react-google-maps/api";
import { AdvancedMarker } from "@/components/ui/AdvancedMarker";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string;
import { GOOGLE_MAPS_LIBRARIES } from "@/lib/maps";

/* ── Haversine distance (km) ── */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MANEUVER_ICONS: Record<string, string> = {
  "turn-left": "↰", "turn-right": "↱",
  "turn-sharp-left": "↰", "turn-sharp-right": "↱",
  "turn-slight-left": "↖", "turn-slight-right": "↗",
  "straight": "↑", "merge": "↑",
  "ramp-left": "↖", "ramp-right": "↗",
  "fork-left": "↖", "fork-right": "↗",
  "ferry": "⛴", "ferry-train": "🚂",
  "roundabout-left": "↺", "roundabout-right": "↻",
  "uturn-left": "↩", "uturn-right": "↪",
};

/* ══════════════════════════════════════════════════
   In-app turn-by-turn navigation overlay
   ══════════════════════════════════════════════════ */
function NavigationOverlay({
  destLat,
  destLng,
  propertyTitle,
  onExit,
}: {
  destLat: number;
  destLng: number;
  propertyTitle: string;
  onExit: () => void;
}) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_API_KEY, libraries: GOOGLE_MAPS_LIBRARIES });
  const mapRef    = useRef<google.maps.Map | null>(null);
  const watchRef  = useRef<number | null>(null);

  const [userPos,      setUserPos]      = useState<google.maps.LatLngLiteral | null>(null);
  const [directions,   setDirections]   = useState<google.maps.DirectionsResult | null>(null);
  const [stepIndex,    setStepIndex]    = useState(0);
  const [arrived,      setArrived]      = useState(false);
  const [travelMode,   setTravelMode]   = useState<google.maps.TravelMode | null>(null);
  const [routeInfo,    setRouteInfo]    = useState<{ distance: string; duration: string; eta: string } | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);

  const fetchRoute = useCallback(
    (origin: google.maps.LatLngLiteral, mode: google.maps.TravelMode) => {
      setLoadingRoute(true);
      new window.google.maps.DirectionsService().route(
        { origin, destination: { lat: destLat, lng: destLng }, travelMode: mode },
        (result, status) => {
          setLoadingRoute(false);
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
            setStepIndex(0);
            const leg = result.routes[0].legs[0];
            const secs = leg.duration?.value ?? 0;
            const etaTime = new Date(Date.now() + secs * 1000);
            setRouteInfo({
              distance: leg.distance?.text ?? "",
              duration: leg.duration?.text ?? "",
              eta: etaTime.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
            });
            mapRef.current?.fitBounds(result.routes[0].bounds);
          }
        }
      );
    },
    [destLat, destLng]
  );

  /* First load: get position → fetch route */
  useEffect(() => {
    if (!isLoaded) return;
    const mode = window.google.maps.TravelMode.DRIVING;
    setTravelMode(mode);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(origin);
        fetchRoute(origin, mode);
      },
      () => fetchRoute({ lat: destLat, lng: destLng }, mode),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [isLoaded, fetchRoute, destLat, destLng]);

  /* Live position watcher */
  useEffect(() => {
    if (!isLoaded) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(p);
        mapRef.current?.panTo(p);
        if (haversineKm(p.lat, p.lng, destLat, destLng) < 0.05) {
          setArrived(true);
          return;
        }
        setStepIndex((prev) => {
          if (!directions) return prev;
          const steps = directions.routes[0].legs[0].steps;
          if (prev >= steps.length - 1) return prev;
          const end = steps[prev].end_location;
          return haversineKm(p.lat, p.lng, end.lat(), end.lng()) < 0.03
            ? prev + 1
            : prev;
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [isLoaded, directions, destLat, destLng]);

  const switchMode = (mode: google.maps.TravelMode) => {
    if (!userPos) return;
    setTravelMode(mode);
    fetchRoute(userPos, mode);
  };

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-white text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Loading navigation…</p>
        </div>
      </div>
    );
  }

  const steps       = directions?.routes[0].legs[0].steps ?? [];
  const curStep     = steps[stepIndex];
  const nextStep    = steps[stepIndex + 1];
  const icon        = MANEUVER_ICONS[curStep?.maneuver ?? "straight"] ?? "↑";
  const nextIcon    = MANEUVER_ICONS[nextStep?.maneuver ?? "straight"] ?? "↑";

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col">
      {/* ── Top instruction banner ── */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-[#1a73e8] text-white px-4 pt-[env(safe-area-inset-top,16px)] pb-4 shadow-xl flex flex-col gap-2">
        {arrived ? (
          <div className="py-3 text-center">
            <p className="text-2xl font-bold">🏁 You have arrived!</p>
            <p className="text-sm opacity-90 mt-1">{propertyTitle}</p>
          </div>
        ) : loadingRoute ? (
          <div className="flex items-center gap-3 py-2">
            <Loader2 className="h-5 w-5 animate-spin shrink-0" />
            <p className="font-semibold">Calculating route…</p>
          </div>
        ) : curStep ? (
          <>
            <div className="flex items-start gap-3">
              <span className="text-4xl font-black shrink-0 leading-none mt-1">{icon}</span>
              <div className="flex-1 min-w-0">
                <p
                  className="font-bold text-xl leading-snug"
                  dangerouslySetInnerHTML={{ __html: curStep.instructions }}
                />
                <p className="text-sm opacity-80 mt-1">{curStep.distance?.text}</p>
              </div>
            </div>
            {nextStep && (
              <div className="bg-[#1557b0] rounded-xl px-3 py-2 flex items-center gap-2 text-sm">
                <span className="text-lg shrink-0">{nextIcon}</span>
                <span className="opacity-80 shrink-0">Then</span>
                <span
                  className="truncate"
                  dangerouslySetInnerHTML={{ __html: nextStep.instructions }}
                />
              </div>
            )}
          </>
        ) : (
          <p className="font-semibold py-2">Heading to destination…</p>
        )}
      </div>

      {/* ── Map ── */}
      <GoogleMap
        mapContainerClassName="w-full h-full"
        center={userPos ?? { lat: destLat, lng: destLng }}
        zoom={17}
        onLoad={(m) => { mapRef.current = m; }}
        options={{
          mapId: "c7cd60c6a53a720a14502d1b",
          disableDefaultUI: true,
          zoomControl: false,
        }}
      >
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: false,
              polylineOptions: { strokeColor: "#4285F4", strokeWeight: 9, strokeOpacity: 0.9 },
            }}
          />
        )}
        {userPos && <AdvancedMarker position={userPos} title="You are here" />}
      </GoogleMap>

      {/* ── Bottom panel ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-white px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] rounded-t-3xl shadow-2xl">
        {!arrived && routeInfo && (
          <div className="flex items-end gap-3 mb-4">
            <div>
              <p className="font-black text-3xl text-gray-900 leading-none">{routeInfo.duration}</p>
              <p className="text-sm text-gray-500 mt-1">
                {routeInfo.distance} · {routeInfo.eta}
              </p>
            </div>
            {/* Travel mode switcher */}
            <div className="ml-auto flex gap-2">
              {(
                [
                  { mode: "DRIVING",   emoji: "🚗", label: "Drive"  },
                  { mode: "WALKING",   emoji: "🚶", label: "Walk"   },
                  { mode: "BICYCLING", emoji: "🚲", label: "Cycle"  },
                ] as const
              ).map(({ mode, emoji, label }) => {
                const gMode = window.google.maps.TravelMode[mode];
                const active = travelMode === gMode;
                return (
                  <button
                    key={mode}
                    title={label}
                    onClick={() => switchMode(gMode)}
                    className={`w-11 h-11 rounded-full text-xl flex items-center justify-center transition-all ${
                      active
                        ? "bg-blue-100 ring-2 ring-blue-500 scale-110 shadow-md"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {arrived && (
          <div className="text-center mb-4">
            <p className="text-xl font-bold text-green-600">You have arrived at your destination</p>
            <p className="text-sm text-gray-500 mt-1">{propertyTitle}</p>
          </div>
        )}
        <button
          onClick={onExit}
          className="w-full bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold py-3.5 rounded-2xl text-base transition-colors shadow-sm"
        >
          Exit Navigation
        </button>
      </div>
    </div>
  );
}

function PropertyLocationMap({ lat, lng }: { lat: number; lng: number }) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_API_KEY, libraries: GOOGLE_MAPS_LIBRARIES });
  if (!isLoaded) {
    return <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">Loading map…</div>;
  }
  return (
    <GoogleMap
      mapContainerClassName="w-full h-full"
      center={{ lat, lng }}
      zoom={15}
      options={{
        mapId: "c7cd60c6a53a720a14502d1b",
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
      }}
    >
      <AdvancedMarker position={{ lat, lng }} />
    </GoogleMap>
  );
}

interface PropertyWithOwner extends ApiProperty {
  ownerName?: string | null;
  ownerAvatar?: string | null;
  ownerBusinessName?: string | null;
  activeBookingsCount?: number;
}

// ── Ratings & Reviews panel shown on the property detail page ─────────────────
function PropertyReviews({ propertyId }: { propertyId: string }) {
  const [data, setData] = useState<{ reviews: any[]; averageRating: number | null; totalReviews: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reviews/property/${propertyId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [propertyId]);

  if (loading) return <div className="flex items-center gap-2 py-4 text-gray-400 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading reviews…</div>;
  if (!data || data.totalReviews === 0) return (
    <div className="py-4">
      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><Star className="h-5 w-5" /> Reviews</h3>
      <p className="text-sm text-gray-400">No reviews yet for this property.</p>
    </div>
  );

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Star className="h-5 w-5" /> Reviews</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`h-4 w-4 ${s <= Math.round(data.averageRating ?? 0) ? "fill-gray-900 text-gray-900" : "text-gray-300"}`} />
            ))}
          </div>
          <span className="text-sm font-semibold">{data.averageRating}</span>
          <span className="text-sm text-gray-500">· {data.totalReviews} review{data.totalReviews !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div className="space-y-4">
        {data.reviews.map((r: any) => (
          <div key={r.id} className="flex gap-3">
            <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-sm font-semibold text-gray-600 overflow-hidden">
              {r.reviewerAvatar
                ? <img src={r.reviewerAvatar} alt={r.reviewerName} className="h-9 w-9 object-cover" />
                : (r.reviewerName?.[0]?.toUpperCase() ?? "?")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{r.reviewerName}</p>
                <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-0.5 mt-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-gray-800 text-gray-800" : "text-gray-200"}`} />
                ))}
              </div>
              {r.comment && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{r.comment}</p>}
              {/* Owner reply */}
              {r.ownerReply && (
                <div className="mt-2 ml-2 pl-3 border-l-2 border-gray-200 bg-gray-50 rounded-r-lg py-2 pr-2">
                  <p className="text-xs font-semibold text-gray-700 mb-0.5">Owner's response</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{r.ownerReply.reply}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{new Date(r.ownerReply.createdAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PropertyDetails() {
  const [, params] = useRoute("/property/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { convert } = useCurrency();
  const { t } = useLanguage();
  const { user, token } = useAuth();

  const [property, setProperty] = useState<PropertyWithOwner | null>(null);
  const [isSoldProperty, setIsSoldProperty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isLinkedUp, setIsLinkedUp] = useState(false);
  const [isLinkingUp, setIsLinkingUp] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isCopyingPin, setIsCopyingPin] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [userRating, setUserRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewSummary, setReviewSummary] = useState<{ averageRating: number | null; totalReviews: number }>({ averageRating: null, totalReviews: 0 });
  const [linkedUpBookingId, setLinkedUpBookingId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewAlreadySubmitted, setReviewAlreadySubmitted] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [videoExpanded, setVideoExpanded] = useState(false);
  // Nightly types: calendar hidden until Link Up is first clicked
  const [showDatePicker, setShowDatePicker] = useState(false);
  // For all types: show "unavailable — contact owner" inline
  const [showUnavailableContact, setShowUnavailableContact] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(tomorrowStr);

  const isNightlyType = property?.type === "bnb" || property?.type === "hotel" || property?.type === "hostel";

  const { data: bookedRanges = [] } = useGetPropertyAvailability(
    params?.id ?? "",
    {
      query: {
        queryKey: getGetPropertyAvailabilityQueryKey(params?.id ?? ""),
        enabled: !!params?.id && isNightlyType,
      },
    }
  );

  const isDateRangeAvailable = (() => {
    if (!checkIn || !checkOut || checkIn >= checkOut) return null;
    for (const range of bookedRanges) {
      if (checkIn < range.endDate && checkOut > range.startDate) return false;
    }
    return true;
  })();

  useEffect(() => {
    if (!params?.id) return;
    setIsLoading(true);
    setIsSoldProperty(false);
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`/api/properties/${params.id}`, { headers })
      .then(async (r) => {
        if (r.status === 410) {
          const body = await r.json().catch(() => ({}));
          if (body?.sold) setIsSoldProperty(true);
          throw new Error("sold");
        }
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setProperty(data))
      .catch(() => setProperty(null))
      .finally(() => setIsLoading(false));
  }, [params?.id, token]);

  useEffect(() => {
    if (!property) return;
    const savedRating = localStorage.getItem(`rating_${property.id}`);
    if (savedRating) {
      setUserRating(Number(savedRating));
      setHasRated(true);
    }
  }, [property?.id]);

  // Check existing favourite status
  useEffect(() => {
    if (!token || !property?.id) return;
    fetch(`/api/favorites/check/${property.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setIsLiked(d.isFavorited); })
      .catch(() => {});
  }, [token, property?.id]);

  // Fetch review summary (real average + count) for this property
  useEffect(() => {
    if (!property?.id) return;
    fetch(`/api/reviews/property/${property.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setReviewSummary({ averageRating: d.averageRating, totalReviews: d.totalReviews }); })
      .catch(() => {});
  }, [property?.id]);

  // Persist isLinkedUp — check if user has a confirmed booking for this property & store bookingId
  useEffect(() => {
    if (!user || !token || !property?.id) return;
    fetch("/api/bookings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: { id: string; propertyId: string; status: string }[]) => {
        const confirmed = list.find(
          (b) => b.propertyId === property.id && b.status === "confirmed"
        );
        if (confirmed) { setIsLinkedUp(true); setLinkedUpBookingId(confirmed.id); }
        else {
          const any = list.find(b => b.propertyId === property.id && b.status !== "cancelled");
          if (any) setIsLinkedUp(true);
        }
      })
      .catch(() => {});
  }, [user?.id, token, property?.id]);

  // For nightly types: auto-dismiss the unavailability contact card when user picks available dates
  useEffect(() => {
    if (isNightlyType && isDateRangeAvailable !== false) {
      setShowUnavailableContact(false);
    }
  }, [isDateRangeAvailable, isNightlyType]);

  // Check if user already reviewed this property via their confirmed booking
  useEffect(() => {
    if (!linkedUpBookingId || !token) return;
    fetch(`/api/reviews/check/${linkedUpBookingId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.hasReviewed) setReviewAlreadySubmitted(true); })
      .catch(() => {});
  }, [user?.id, token, property?.id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link Copied", description: "Property link copied to clipboard." });
  };

  const handleLike = async () => {
    if (!user || !token) { navigate("/login"); return; }
    if (!property) return;
    const next = !isLiked;
    setIsLiked(next);
    try {
      const res = await fetch(
        next ? "/api/favorites" : `/api/favorites/${property.id}`,
        {
          method: next ? "POST" : "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            ...(next ? { "Content-Type": "application/json" } : {}),
          },
          ...(next ? { body: JSON.stringify({ propertyId: property.id }) } : {}),
        }
      );
      if (!res.ok) { setIsLiked(!next); return; }
      toast({
        title: next ? "Saved to Favourites" : "Removed from Favourites",
        description: next ? "Property saved to your favourites." : "Removed from your saved list.",
      });
    } catch {
      setIsLiked(!next);
    }
  };

  const handleCopyPin = async () => {
    setIsCopyingPin(true);
    const pLat = property?.lat != null ? parseFloat(property.lat as string) : -1.2921;
    const pLng = property?.lng != null ? parseFloat(property.lng as string) : 36.8219;
    const mapsUrl = `https://maps.google.com/?q=${pLat},${pLng}`;
    try {
      await navigator.clipboard.writeText(mapsUrl);
      toast({ title: "Location Copied", description: "Google Maps link copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Could not copy to clipboard.", variant: "destructive" });
    } finally {
      setTimeout(() => setIsCopyingPin(false), 1500);
    }
  };

  const handleGetDirections = () => {
    const pLat = property?.lat != null ? parseFloat(property.lat as string) : -1.2921;
    const pLng = property?.lng != null ? parseFloat(property.lng as string) : 36.8219;
    setIsGettingLocation(true);
    if (!navigator.geolocation) {
      window.open(`https://maps.google.com/maps/dir//${pLat},${pLng}`, "_blank");
      setIsGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        window.open(
          `https://maps.google.com/maps/dir/${latitude},${longitude}/${pLat},${pLng}`,
          "_blank"
        );
        setIsGettingLocation(false);
      },
      () => {
        window.open(`https://maps.google.com/maps/dir//${pLat},${pLng}`, "_blank");
        setIsGettingLocation(false);
      },
      { timeout: 8000 }
    );
  };

  /** Format a phone number to wa.me format (Kenyan numbers → 254XXXXXXXXX) */
  const toWhatsApp = (phone?: string | null) => {
    if (!phone) return "254";
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
    if (digits.startsWith("254")) return digits;
    return digits;
  };

  const handleLinkUp = async () => {
    if (!user || !token) {
      navigate("/login");
      return;
    }
    if (!property) return;
    if (property.ownerId === user.id) {
      toast({ title: "Cannot link up", description: "You cannot link up your own property.", variant: "destructive" });
      return;
    }

    // All types: if already booked by someone, show unavailability alert with contacts
    if (((property as PropertyWithOwner).activeBookingsCount ?? 0) > 0) {
      setShowUnavailableContact(true);
      return;
    }

    // Nightly: first click reveals the date picker; subsequent clicks submit
    if (isNightlyType && !showDatePicker) {
      setShowDatePicker(true);
      return;
    }

    // Nightly: if selected dates are unavailable, show contacts instead of failing the API call
    if (isNightlyType && isDateRangeAvailable === false) {
      setShowUnavailableContact(true);
      return;
    }

    setIsLinkingUp(true);

    // Dates: nightly types use the date picker; others use today → +30 days as an enquiry window
    const startDate = isNightlyType ? checkIn : todayStr;
    const endDateRaw = isNightlyType
      ? checkOut
      : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const nights = isNightlyType
      ? Math.max(1, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
      : 1;
    const totalPrice = Math.round(property.price * nights);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          propertyId: property.id,
          startDate,
          endDate: endDateRaw,
          totalPrice,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({
          title: "Could not link up",
          description: (err as { error?: string }).error || "Please try again.",
          variant: "destructive",
        });
        return;
      }

      setIsLinkedUp(true);
      toast({
        title: "Linked Up! 🔗",
        description: `Contact ${property.ownerName || "the owner"} to confirm availability.`,
      });
    } catch {
      toast({
        title: "Network error",
        description: "Could not reach the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLinkingUp(false);
    }
  };

  // Auto-advance carousel every 5 s (paused when lightbox is open)
  useEffect(() => {
    if (lightboxOpen) return;
    const allPhotosLen = ((property?.images && property.images.length > 0) ? property.images : [property?.image]).filter(Boolean).length;
    if (allPhotosLen <= 1) return;
    const timer = setInterval(() => setCarouselIdx(i => (i + 1) % allPhotosLen), 5000);
    return () => clearInterval(timer);
  }, [lightboxOpen, property]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  const lightboxPrev = useCallback((allPhotos: string[]) => {
    setLightboxIndex((i) => (i - 1 + allPhotos.length) % allPhotos.length);
  }, []);

  const lightboxNext = useCallback((allPhotos: string[]) => {
    setLightboxIndex((i) => (i + 1) % allPhotos.length);
  }, []);



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center px-4">
          {isSoldProperty ? (
            <>
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                <span className="text-3xl">🏷️</span>
              </div>
              <h2 className="text-2xl font-bold">This Property Has Been Sold</h2>
              <p className="text-muted-foreground max-w-md">This listing is no longer available — a sale has been confirmed. Browse other properties that may match what you're looking for.</p>
              <a href="/" className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors">Browse Properties</a>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold">Property Not Found</h2>
              <p className="text-muted-foreground">This property may have been removed or the link is incorrect.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const beds = property.beds ?? property.specs?.beds ?? 0;
  const baths = property.baths ?? property.specs?.baths ?? 0;
  const sqft = property.sqft ?? property.specs?.sqft ?? 0;
  const lat = property.lat != null ? parseFloat(property.lat) : -1.2921;
  const lng = property.lng != null ? parseFloat(property.lng) : 36.8219;

  const getTypeBadgeLabel = () => {
    switch (property.type) {
      case "rent": return t("prop.for_rent");
      case "sale": return t("prop.for_sale");
      case "hotel": return t("prop.hotel");
      case "hostel": return t("nav.hostels");
      default: return t("prop.bnb");
    }
  };

  const PRICE_UNIT_LABELS: Record<string, string> = {
    night: "/night",
    month: "/mo",
    week: "/wk",
    semester: "/semester",
    year: "/yr",
    sqft: "/sq ft",
    day: "/day",
    hour: "/hr",
  };

  const priceLabel = () => {
    const amount = convert(property.price);
    const unit = property.priceUnit;

    if (property.type === "bnb") {
      const hasHourly = property.hourlyRate != null && property.hourlyRate > 0;
      const hasDaily = property.price > 0;
      const dayLabel = unit ? (PRICE_UNIT_LABELS[unit] ?? "/day") : "/day";
      if (hasHourly && hasDaily) {
        return (
          <div className="flex flex-col items-end gap-1">
            <div className="text-3xl font-bold text-primary">{amount}<span className="text-lg text-gray-500 font-normal">{dayLabel}</span></div>
            <div className="text-xl font-semibold text-gray-600">{convert(property.hourlyRate!)}<span className="text-base text-gray-400 font-normal">/hr</span></div>
          </div>
        );
      }
      if (hasHourly) return <>{convert(property.hourlyRate!)}<span className="text-lg text-gray-500 font-normal">/hr</span></>;
      return <>{amount}<span className="text-lg text-gray-500 font-normal">{dayLabel}</span></>;
    }

    if (unit) {
      const suffix = PRICE_UNIT_LABELS[unit] ?? "";
      return <>{amount}<span className="text-lg text-gray-500 font-normal">{suffix}</span></>;
    }

    // Legacy fallback
    if (property.type === "rent") return <>{amount}<span className="text-lg text-gray-500 font-normal">{t("prop.mo")}</span></>;
    if (property.type === "hotel" || property.type === "hostel") return <>{amount}<span className="text-lg text-gray-500 font-normal">/night</span></>;
    return amount;
  };

  const getImageUrl = (path: string | null | undefined): string => {
    if (!path) return "";
    if (path.startsWith("/objects/")) return `/api/storage${path}`;
    return path;
  };

  const allPhotos = (property.images && property.images.length > 0)
    ? property.images
    : [property.image];

  const propertyVideos: string[] = (property as any).videos ?? [];
  const hasPropertyVideo = propertyVideos.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* ── Photo Gallery ── compact hero carousel + thumbnail strip */}
      <div className="h-[250px] sm:h-[320px] flex gap-[3px] bg-white overflow-hidden">
        {/* Hero / Carousel */}
        <div
          className="relative flex-1 overflow-hidden cursor-pointer group"
          onClick={() => openLightbox(carouselIdx)}
        >
          <img
            key={carouselIdx}
            src={getImageUrl(allPhotos[carouselIdx])}
            alt={property.title}
            className="w-full h-full object-cover transition-opacity duration-500 group-hover:brightness-95"
            onContextMenu={e => e.preventDefault()}
            draggable={false}
          />

          {/* Prev / Next arrows — appear on hover */}
          {allPhotos.length > 1 && (
            <>
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/55 hover:bg-black/80 text-white rounded-full p-1.5 z-10 transition-all opacity-0 group-hover:opacity-100 shadow"
                onClick={e => { e.stopPropagation(); setCarouselIdx(i => (i - 1 + allPhotos.length) % allPhotos.length); }}
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                className="absolute right-2 md:right-[calc(37%+10px)] top-1/2 -translate-y-1/2 bg-black/55 hover:bg-black/80 text-white rounded-full p-1.5 z-10 transition-all opacity-0 group-hover:opacity-100 shadow"
                onClick={e => { e.stopPropagation(); setCarouselIdx(i => (i + 1) % allPhotos.length); }}
                aria-label="Next photo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Dot indicators (≤8 photos) or counter */}
          {allPhotos.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10 pointer-events-none">
              {allPhotos.length <= 8
                ? allPhotos.map((_, i) => (
                    <span key={i}
                      className={`rounded-full transition-all ${i === carouselIdx ? "bg-white w-4 h-1.5" : "bg-white/50 w-1.5 h-1.5"}`}
                    />
                  ))
                : <span className="bg-black/50 text-white text-xs px-2.5 py-0.5 rounded-full font-medium">{carouselIdx + 1} / {allPhotos.length}</span>
              }
            </div>
          )}

          {/* Mobile video PiP thumbnail — bottom-right corner, desktop uses the grid slot */}
          {hasPropertyVideo && (() => {
            const vSrc = propertyVideos[0].startsWith("/objects/")
              ? `/api/storage${propertyVideos[0]}`
              : propertyVideos[0];
            return (
              <div
                className="md:hidden absolute bottom-2 right-2 z-10 w-28 h-[62px] rounded-lg overflow-hidden cursor-pointer bg-black shadow-lg ring-2 ring-white/40 group/pip"
                onClick={e => { e.stopPropagation(); setVideoExpanded(true); }}
              >
                <video
                  src={vSrc}
                  className="w-full h-full object-cover opacity-75"
                  muted
                  preload="metadata"
                  playsInline
                  onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 0.1; }}
                />
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-white/90 group-hover/pip:scale-110 flex items-center justify-center transition-transform shadow">
                    <Play className="h-3.5 w-3.5 text-gray-900 ml-0.5" fill="currentColor" />
                  </div>
                </div>
                {/* Badge */}
                <div className="absolute top-1 left-1 bg-black/65 text-white text-[8px] px-1 py-0.5 rounded font-bold tracking-widest uppercase">Video</div>
              </div>
            );
          })()}
        </div>

        {/* Thumbnail 2×2 strip — desktop only */}
        {(allPhotos.length > 1 || hasPropertyVideo) && (
          <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-[3px] w-[37%] shrink-0">
            {Array.from({ length: 4 }).map((_, gridIdx) => {
              // Slot 2 (bottom-left) is reserved for video when available
              if (hasPropertyVideo && gridIdx === 2) {
                const vSrc = propertyVideos[0].startsWith("/objects/")
                  ? `/api/storage${propertyVideos[0]}`
                  : propertyVideos[0];
                return (
                  <div key="video-slot"
                    className="relative overflow-hidden cursor-pointer group/video bg-black"
                    onClick={() => setVideoExpanded(true)}>
                    <video src={vSrc} className="w-full h-full object-cover opacity-70"
                      muted preload="metadata"
                      onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 0.1; }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/90 group-hover/video:scale-110 flex items-center justify-center shadow-lg transition-transform">
                        <Play className="h-5 w-5 text-gray-900 ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                    <div className="absolute top-1.5 left-1.5 bg-black/65 text-white text-[9px] px-1.5 py-0.5 rounded font-bold tracking-widest uppercase">Video</div>
                  </div>
                );
              }

              // Map grid indices to photo indices
              // With video:    slot 0→photo[1], slot 1→photo[2], slot 2→VIDEO, slot 3→photo[3]
              // Without video: slot 0→photo[1], slot 1→photo[2], slot 2→photo[3], slot 3→photo[4]
              const photoIdx = hasPropertyVideo
                ? (gridIdx <= 1 ? gridIdx + 1 : gridIdx)
                : gridIdx + 1;

              const photo = allPhotos[photoIdx];
              const isLastCell = gridIdx === 3;
              // Photos shown in entire hero: hero(1) + visible grid photo slots
              const photosShownTotal = hasPropertyVideo ? 4 : 5;
              const extraCount = allPhotos.length - photosShownTotal;

              if (!photo) return <div key={gridIdx} className="bg-gray-100" />;
              return (
                <div key={photo} className="relative overflow-hidden cursor-pointer group/thumb"
                  onClick={() => openLightbox(photoIdx)}>
                  <img src={getImageUrl(photo)} alt=""
                    className="w-full h-full object-cover transition-all group-hover/thumb:brightness-90"
                    onContextMenu={e => e.preventDefault()} draggable={false} />
                  {isLastCell && extraCount > 0 && (
                    <div className="absolute inset-0 bg-black/55 hover:bg-black/65 transition-colors flex flex-col items-center justify-center text-white gap-1">
                      <Images className="h-4 w-4" />
                      <span className="text-xs font-semibold">+{extraCount} more</span>
                    </div>
                  )}
                  {isLastCell && extraCount <= 0 && (
                    <div className="absolute bottom-1.5 right-1.5 pointer-events-none">
                      <span className="bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                        <Images className="h-2.5 w-2.5" /> All Photos
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center" onClick={closeLightbox}>
          <button
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 z-10 transition-colors"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </button>
          {/* Download with watermark */}
          <button
            className="absolute top-4 right-16 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 z-10 transition-colors"
            title="Download photo"
            onClick={async (e) => {
              e.stopPropagation();
              const rawPath = allPhotos[lightboxIndex];
              // Use server-side watermark for object-storage images
              if (rawPath?.startsWith("/objects/")) {
                const wildcardPath = rawPath.replace(/^\/objects\//, "");
                const a = document.createElement("a");
                a.href = `/api/storage/watermark/${wildcardPath}`;
                a.download = `inndos-photo-${lightboxIndex + 1}.jpg`;
                a.click();
                return;
              }
              // Fallback: client-side canvas watermark for external URLs
              const url = getImageUrl(rawPath);
              try {
                const res = await fetch(url, { mode: "cors" });
                const blob = await res.blob();
                const bmp = await createImageBitmap(blob);
                const canvas = document.createElement("canvas");
                canvas.width = bmp.width;
                canvas.height = bmp.height;
                const ctx = canvas.getContext("2d")!;
                ctx.drawImage(bmp, 0, 0);
                const repeat = Math.ceil(Math.max(bmp.width, bmp.height) / 220);
                ctx.save();
                ctx.font = `bold ${Math.max(18, Math.round(bmp.width / 28))}px sans-serif`;
                ctx.fillStyle = "rgba(255,255,255,0.30)";
                ctx.strokeStyle = "rgba(0,0,0,0.15)";
                ctx.lineWidth = 1;
                ctx.translate(bmp.width / 2, bmp.height / 2);
                ctx.rotate(-Math.PI / 6);
                const step = 200;
                for (let row = -repeat; row <= repeat; row++) {
                  for (let col = -repeat; col <= repeat; col++) {
                    const x = col * step;
                    const y = row * step;
                    ctx.strokeText("inndos.com", x, y);
                    ctx.fillText("inndos.com", x, y);
                  }
                }
                ctx.restore();
                canvas.toBlob((outBlob) => {
                  if (!outBlob) return;
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(outBlob);
                  a.download = `inndos-photo-${lightboxIndex + 1}.jpg`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }, "image/jpeg", 0.92);
              } catch {
                window.open(url, "_blank");
              }
            }}
          >
            <Download className="h-6 w-6" />
          </button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm font-medium bg-black/40 px-4 py-1.5 rounded-full">
            {lightboxIndex + 1} / {allPhotos.length}
          </div>
          {allPhotos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-3 z-10 transition-colors"
                onClick={(e) => { e.stopPropagation(); lightboxPrev(allPhotos); }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-3 z-10 transition-colors"
                onClick={(e) => { e.stopPropagation(); lightboxNext(allPhotos); }}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <img
            src={getImageUrl(allPhotos[lightboxIndex])}
            alt={`Photo ${lightboxIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {/* Thumbnail strip */}
          {allPhotos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] px-4 pb-1">
              {allPhotos.map((photo, idx) => (
                <button
                  key={photo}
                  className={`shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${idx === lightboxIndex ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-90"}`}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                >
                  <img src={getImageUrl(photo)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expanded video player overlay */}
      {videoExpanded && hasPropertyVideo && (
        <div className="fixed inset-0 z-[998] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setVideoExpanded(false)}>
          <div className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-white text-sm font-semibold truncate mr-4">{property.title}</span>
              <button
                className="shrink-0 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                onClick={() => setVideoExpanded(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <video
                src={propertyVideos[0].startsWith("/objects/") ? `/api/storage${propertyVideos[0]}` : propertyVideos[0]}
                className="w-full aspect-video"
                controls
                autoPlay
                playsInline
              />
            </div>
            <button
              className="mt-3 flex items-center gap-1.5 text-white/60 hover:text-white text-xs transition-colors mx-auto"
              onClick={() => setVideoExpanded(false)}>
              <Minimize2 className="h-3.5 w-3.5" /> Minimize
            </button>
          </div>
        </div>
      )}

      {/* Sold banner */}
      {property.propertyStatus === 'sold' && (
        <div className="bg-gray-900 text-white text-center py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
          This property has been sold and is no longer available.
        </div>
      )}

      <div className="flex-1 container mx-auto px-4 py-5">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1">
            <div className="flex flex-col lg:flex-row justify-between items-start mb-3 gap-2 mt-2 sm:mt-1">
              <div className="w-full lg:w-auto">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge className="bg-primary">{getTypeBadgeLabel()}</Badge>
                  {property.propertyStatus === 'sold' && (
                    <Badge className="bg-gray-700 text-white">Sold</Badge>
                  )}
                  {property.isVerified && property.propertyStatus !== 'sold' && (
                    <Badge variant="outline" className="border-gray-300 bg-gray-100 text-gray-700 flex items-center gap-1 px-3 py-1 shadow-sm">
                      <ShieldCheck className="h-4 w-4" /> Verified by inndos
                    </Badge>
                  )}
                  {reviewSummary.totalReviews > 0 && (
                    <div className="flex items-center text-gray-700 ml-1 text-sm font-medium">
                      <Star className="h-4 w-4 fill-current mr-1" />
                      {reviewSummary.averageRating} ({reviewSummary.totalReviews} {t("prop.reviews")})
                    </div>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-heading text-gray-900 mb-2 leading-tight line-clamp-3">{property.title}</h1>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.address}
                </div>
              </div>
              <div className="w-full lg:w-auto lg:text-right">
                <div className="text-3xl font-bold text-primary">{priceLabel()}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 sm:py-4 border-y border-gray-200 mb-4 gap-3 sm:gap-0">
              <div className="flex items-center justify-between w-full sm:w-auto sm:gap-8">
                <div className="text-center flex-1 sm:flex-none">
                  <div className="font-bold text-lg sm:text-xl flex items-center justify-center gap-1 sm:gap-2"><BedDouble className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" /> {beds}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t("prop.bedrooms")}</div>
                </div>
                <div className="w-px h-8 sm:h-10 bg-gray-200 block"></div>
                <div className="text-center flex-1 sm:flex-none">
                  <div className="font-bold text-lg sm:text-xl flex items-center justify-center gap-1 sm:gap-2"><Bath className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" /> {baths}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t("prop.bathrooms")}</div>
                </div>
                <div className="w-px h-8 sm:h-10 bg-gray-200 block"></div>
                <div className="flex items-center justify-center gap-2 sm:gap-4 flex-1 sm:flex-none">
                  <div className="text-center flex flex-col items-center justify-center">
                    <div className="font-bold text-lg sm:text-xl flex items-center justify-center gap-1 sm:gap-2">
                      <Square className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" /> {sqft}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t("prop.sqft")}</div>
                  </div>
                  <div className="flex sm:hidden gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-gray-300 bg-white" onClick={handleShare}>
                      <Share2 className="h-4 w-4 text-gray-700" />
                    </Button>
                    <Button
                      variant={isLiked ? "default" : "outline"}
                      size="icon"
                      className={`h-8 w-8 rounded-lg ${isLiked ? "bg-gray-900 border-gray-900 text-white" : "border-gray-300 bg-white text-gray-700"}`}
                      onClick={handleLike}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex gap-2 justify-end w-full sm:w-auto">
                <Button variant="outline" size="icon" onClick={handleShare}><Share2 className="h-4 w-4" /></Button>
                <Button variant={isLiked ? "default" : "outline"} size="icon" onClick={handleLike} className={isLiked ? "bg-gray-900 hover:bg-gray-800 border-gray-900" : ""}>
                  <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                </Button>
              </div>
            </div>

            <div className="space-y-5">
              {property.description && (
                <section>
                  <h2 className="text-lg font-bold mb-2">{t("prop.description")}</h2>
                  <p className="text-gray-600 leading-relaxed text-sm">{property.description}</p>
                </section>
              )}

              <section>
                <h2 className="text-lg font-bold mb-3">{t("prop.amenities")}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                  {(property.tags || []).concat(["Air Conditioning", "Heating", "Dishwasher", "Balcony", "Storage"]).map((tag) => (
                    <div key={tag} className="flex items-center gap-1.5 text-gray-600 text-sm">
                      <CheckCircle className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                      {resolveAmenityLabel(tag)}
                    </div>
                  ))}
                </div>
              </section>

              {/* Review Section — wired to real API */}
              <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h2 className="text-lg font-bold mb-1">{t("prop.rate_stay")}</h2>
                {reviewAlreadySubmitted ? (
                  <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-2">
                    <CheckCircle className="h-4 w-4 text-gray-500" /> You've already reviewed this property. Thank you!
                  </p>
                ) : linkedUpBookingId ? (
                  <div className="space-y-3 mt-3">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" className="p-0.5 transition-transform hover:scale-110 focus:outline-none" onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setUserRating(star)}>
                          <Star className={`h-8 w-8 transition-colors ${(hoverRating || userRating) >= star ? "fill-gray-900 text-gray-900" : "text-gray-300"}`} />
                        </button>
                      ))}
                      {userRating > 0 && <span className="text-sm text-gray-500 ml-1">{["","Poor","Fair","Good","Great","Excellent"][userRating]}</span>}
                    </div>
                    <textarea
                      className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-900 min-h-[70px] bg-white"
                      placeholder="Share what you loved or what could be improved… (optional)"
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      maxLength={500}
                    />
                    <button
                      disabled={userRating < 1 || isSubmittingReview}
                      onClick={async () => {
                        if (!linkedUpBookingId || userRating < 1) return;
                        setIsSubmittingReview(true);
                        try {
                          const r = await fetch("/api/reviews", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ bookingId: linkedUpBookingId, rating: userRating, comment: reviewComment.trim() || undefined }),
                          });
                          if (r.ok) {
                            setReviewAlreadySubmitted(true);
                            setReviewSummary(prev => ({
                              totalReviews: prev.totalReviews + 1,
                              averageRating: prev.totalReviews === 0 ? userRating : parseFloat(((prev.averageRating! * prev.totalReviews + userRating) / (prev.totalReviews + 1)).toFixed(1)),
                            }));
                            toast({ title: "Review submitted", description: "Thank you for rating your stay!" });
                          } else {
                            const err = await r.json().catch(() => ({}));
                            toast({ title: "Could not submit", description: err.error ?? "Please try again.", variant: "destructive" });
                          }
                        } catch { toast({ title: "Network error", variant: "destructive" }); }
                        finally { setIsSubmittingReview(false); }
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmittingReview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                      Submit Review
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">{user ? "Complete a confirmed link-up at this property first to leave a review." : "Sign in and complete a stay to leave a review."}</p>
                )}
              </section>

              <section>
                <h2 className="text-lg font-bold mb-2">{t("prop.location")}</h2>
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <div className="relative h-52">
                    <PropertyLocationMap lat={lat} lng={lng} />
                  </div>
                  <div className="bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{property.address}</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={handleCopyPin}
                        disabled={isCopyingPin}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {isCopyingPin ? "Copied!" : "Copy Pin"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={handleGetDirections}
                        disabled={isGettingLocation}
                        title="Open in Google Maps"
                      >
                        {isGettingLocation
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Navigation className="h-3.5 w-3.5" />}
                        Directions
                      </Button>
                      <Button
                        size="sm"
                        className="gap-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold shadow-md"
                        onClick={() => setIsNavigating(true)}
                      >
                        <Compass className="h-3.5 w-3.5" />
                        Navigate
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Sidebar / Contact Card */}
          <div className="lg:w-[350px] shrink-0">
            <Card className="sticky top-24 shadow-lg border-t-4 border-t-primary">
              <CardContent className="p-6">
                {!user ? (
                  /* Not logged in — auth gate */
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Lock className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="font-bold text-lg mb-1">Sign in to Link Up</h3>
                      <p className="text-sm text-muted-foreground">Create a free account or sign in to view contact information and link up with the owner/host.</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-3">
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <Avatar className="h-10 w-10 opacity-30">
                          <AvatarFallback>?</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="h-3 w-24 bg-gray-300 rounded animate-pulse" />
                          <div className="h-2 w-16 bg-gray-200 rounded animate-pulse mt-1" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-300">
                        <PhoneCall className="h-4 w-4" />
                        <span className="tracking-widest">+254 ••• ••• •••</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-300">
                        <Mail className="h-4 w-4" />
                        <span>••••@•••••.com</span>
                      </div>
                    </div>
                    <Button className="w-full bg-primary hover:bg-primary/90 h-12 text-base font-bold" onClick={() => navigate("/login")}>
                      🔗 Sign in to Link Up
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Don't have an account?{" "}
                      <button className="underline hover:text-primary" onClick={() => navigate("/login")}>Sign up free</button>
                    </p>
                  </div>
                ) : (
                  /* Logged in — show contact + link-up flow */
                  <>
                    {/* Owner info (blurred until linked up) */}
                    <div className={`transition-all duration-500 ${!isLinkedUp ? "blur-[4px] opacity-60 select-none pointer-events-none" : ""}`}>
                      <div className="flex items-center gap-4 mb-5">
                        <Avatar className="h-12 w-12">
                          {(property as PropertyWithOwner).ownerAvatar ? (
                            <AvatarImage
                              src={(property as PropertyWithOwner).ownerAvatar!.startsWith("/objects/")
                                ? `/api/storage${(property as PropertyWithOwner).ownerAvatar}`
                                : (property as PropertyWithOwner).ownerAvatar!}
                              alt={property.ownerName || "Owner"}
                            />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {(property.ownerName || "O").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold">
                            {(property as PropertyWithOwner).ownerBusinessName || property.ownerName || "Property Owner"}
                          </h3>
                          {(property as PropertyWithOwner).ownerBusinessName && property.ownerName && (
                            <p className="text-xs text-muted-foreground">{property.ownerName}</p>
                          )}
                          <p className="text-sm text-muted-foreground capitalize">Owner / Host</p>
                        </div>
                      </div>
                      <div className="space-y-2 mb-5">
                        <a
                          href={isLinkedUp && property.ownerPhone ? `tel:${property.ownerPhone}` : undefined}
                          className="flex items-center gap-3 text-sm text-gray-700 hover:text-primary transition-colors p-2 hover:bg-gray-50 rounded-md"
                        >
                          <PhoneCall className="h-4 w-4 shrink-0" />
                          <span>{isLinkedUp ? (property.ownerPhone || "No phone listed") : "••• ••• •••"}</span>
                        </a>
                        <div className="flex items-center gap-3 text-sm text-gray-700 p-2">
                          <Mail className="h-4 w-4 shrink-0" />
                          <span>{isLinkedUp ? (property.ownerEmail || "No email listed") : "••••@•••••.com"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 relative z-10 mt-[-110px] pt-[120px]">
                      {!isLinkedUp && (
                        <p className="absolute top-0 left-0 w-full text-center pb-3 text-sm font-medium text-gray-700">
                          {t("prop.book_to_reveal")}
                        </p>
                      )}

                      {/* Date picker — revealed after first Link Up click for nightly types */}
                      {isNightlyType && (showDatePicker || isLinkedUp) && (
                        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm relative z-20">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Select Dates</label>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Check-in
                              </label>
                              <input
                                type="date"
                                value={checkIn}
                                min={todayStr}
                                onChange={(e) => {
                                  setCheckIn(e.target.value);
                                  if (e.target.value >= checkOut) {
                                    const next = new Date(e.target.value);
                                    next.setDate(next.getDate() + 1);
                                    setCheckOut(next.toISOString().slice(0, 10));
                                  }
                                }}
                                className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Check-out</label>
                              <input
                                type="date"
                                value={checkOut}
                                min={checkIn > todayStr ? checkIn : tomorrowStr}
                                onChange={(e) => setCheckOut(e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>
                          </div>
                          {isDateRangeAvailable === true && (
                            <Badge className="w-full justify-center gap-1.5 bg-green-100 text-green-700 hover:bg-green-100 border-green-200 border">
                              <CheckCircle className="h-3.5 w-3.5" /> Available
                            </Badge>
                          )}
                          {isDateRangeAvailable === false && (
                            <Badge className="w-full justify-center gap-1.5 bg-red-100 text-red-700 hover:bg-red-100 border-red-200 border">
                              <XCircle className="h-3.5 w-3.5" /> Unavailable — contact owner to confirm
                            </Badge>
                          )}
                          {isDateRangeAvailable === null && (
                            <Badge variant="outline" className="w-full justify-center gap-1.5 text-gray-500">
                              <Calendar className="h-3.5 w-3.5" /> Select valid dates
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Primary CTA */}
                      {!isLinkedUp && !showUnavailableContact ? (
                        <Button
                          className="w-full bg-primary hover:bg-primary/90 h-12 text-lg font-bold tracking-wide gap-2"
                          onClick={handleLinkUp}
                          disabled={isLinkingUp}
                        >
                          {isLinkingUp ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>🔗 {t("prop.book_now")}</>
                          )}
                        </Button>
                      ) : showUnavailableContact && !isLinkedUp ? (
                        /* Non-nightly: property already linked up — show unavailability alert */
                        <div className="rounded-xl border border-red-200 overflow-hidden shadow-sm">
                          <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-red-700">Currently Unavailable</p>
                              <p className="text-xs text-red-600 mt-0.5 leading-relaxed">This property is already linked up. Contact the owner to check if it's still available or discuss terms.</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 p-3 bg-white">
                            {property.ownerPhone && (
                              <a
                                href={`tel:${property.ownerPhone}`}
                                className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 hover:bg-primary/5 hover:border-primary/40 transition-colors"
                              >
                                <PhoneCall className="h-4 w-4 text-primary shrink-0" />
                                <div>
                                  <div className="text-xs text-gray-500 leading-none mb-0.5">Call</div>
                                  <div>{property.ownerPhone}</div>
                                </div>
                              </a>
                            )}
                            {property.ownerPhone && (
                              <a
                                href={`https://wa.me/${toWhatsApp(property.ownerPhone)}?text=${encodeURIComponent(`Hi, I found your property "${property.title}" on inndos. Is it still available?`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-3 bg-[#25D366] rounded-lg text-sm font-medium text-white hover:bg-[#128C7E] transition-colors"
                              >
                                <MessageCircle className="h-4 w-4 shrink-0" />
                                <div>
                                  <div className="text-xs text-white/70 leading-none mb-0.5">WhatsApp</div>
                                  <div>{property.ownerPhone}</div>
                                </div>
                              </a>
                            )}
                            {property.ownerEmail && (
                              <a
                                href={`mailto:${property.ownerEmail}?subject=${encodeURIComponent(`Availability Inquiry: ${property.title}`)}&body=${encodeURIComponent(`Hi,\n\nI found your property "${property.title}" on inndos and would like to check if it is still available.\n\nThank you.`)}`}
                                className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 hover:bg-primary/5 hover:border-primary/40 transition-colors"
                              >
                                <Mail className="h-4 w-4 text-primary shrink-0" />
                                <div>
                                  <div className="text-xs text-gray-500 leading-none mb-0.5">Email</div>
                                  <div>{property.ownerEmail}</div>
                                </div>
                              </a>
                            )}
                            {!property.ownerPhone && !property.ownerEmail && (
                              <p className="text-xs text-gray-500 italic px-2">No direct contact listed — try messaging below.</p>
                            )}
                          </div>
                          <button
                            className="w-full text-xs text-gray-400 hover:text-gray-600 py-2 border-t border-gray-100 bg-white transition-colors"
                            onClick={() => setShowUnavailableContact(false)}
                          >
                            ← Back
                          </button>
                        </div>
                      ) : (
                        /* After linking up — show contact options only, no "booked" status */
                        <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                          <div className="bg-zinc-900 px-4 py-3">
                            <p className="text-sm font-bold text-white">Contact to confirm availability</p>
                            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                              Reach the owner/host directly to confirm the property is available for your dates.
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 p-3 bg-white">
                            {property.ownerPhone && (
                              <a
                                href={`tel:${property.ownerPhone}`}
                                className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 hover:bg-primary/5 hover:border-primary/40 transition-colors"
                              >
                                <PhoneCall className="h-4 w-4 text-primary shrink-0" />
                                <div>
                                  <div className="text-xs text-gray-500 leading-none mb-0.5">Call</div>
                                  <div>{property.ownerPhone}</div>
                                </div>
                              </a>
                            )}
                            {property.ownerPhone && (
                              <a
                                href={`https://wa.me/${toWhatsApp(property.ownerPhone)}?text=${encodeURIComponent(`Hi, I found your property "${property.title}" on inndos and would like to confirm availability. Is it still available?`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-3 bg-[#25D366] rounded-lg text-sm font-medium text-white hover:bg-[#128C7E] transition-colors"
                              >
                                <MessageCircle className="h-4 w-4 shrink-0" />
                                <div>
                                  <div className="text-xs text-white/70 leading-none mb-0.5">WhatsApp</div>
                                  <div>{property.ownerPhone}</div>
                                </div>
                              </a>
                            )}
                            {property.ownerEmail && (
                              <a
                                href={`mailto:${property.ownerEmail}?subject=${encodeURIComponent(`Availability Inquiry: ${property.title}`)}&body=${encodeURIComponent(`Hi,\n\nI found your property "${property.title}" on inndos and would like to confirm availability.\n\nPlease get back to me.\n\nThank you.`)}`}
                                className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 hover:bg-primary/5 hover:border-primary/40 transition-colors"
                              >
                                <Mail className="h-4 w-4 text-primary shrink-0" />
                                <div>
                                  <div className="text-xs text-gray-500 leading-none mb-0.5">Email</div>
                                  <div>{property.ownerEmail}</div>
                                </div>
                              </a>
                            )}
                            {!property.ownerPhone && !property.ownerEmail && (
                              <p className="text-xs text-gray-500 italic px-2">No direct contact listed — try messaging below.</p>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </>
                )}

                <Separator className="my-6" />

                {/* ── Ratings & Reviews ─────────────────────────────── */}
                <PropertyReviews propertyId={property.id} />

                <Separator className="my-6" />
                <div className="text-center">
                  <p className="text-xs text-gray-400">{t("prop.ref_id")} {property.id}</p>
                  <p className="text-xs text-gray-400 mt-1">{property.isVerified ? t("prop.listed_verified") : t("prop.listed_unverified")}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />

      {/* ── In-app Navigation Overlay ── */}
      {isNavigating && property && (
        <NavigationOverlay
          destLat={parseFloat(String(property.lat ?? -1.2921))}
          destLng={parseFloat(String(property.lng ?? 36.8219))}
          propertyTitle={property.title}
          onExit={() => setIsNavigating(false)}
        />
      )}
    </div>
  );
}
