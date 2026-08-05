import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BedDouble, Bath, Square, MapPin, Share2, Heart, CheckCircle, XCircle, Calendar, ShieldCheck, Mail, MessageSquare, PhoneCall, MessageCircle, Star, Loader2, Copy, Navigation, Compass, Lock, ChevronLeft, ChevronRight, X, Images } from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
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
}

export default function PropertyDetails() {
  const [, params] = useRoute("/property/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { convert } = useCurrency();
  const { t } = useLanguage();
  const { user, token } = useAuth();

  const [property, setProperty] = useState<PropertyWithOwner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isLinkedUp, setIsLinkedUp] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isCopyingPin, setIsCopyingPin] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [ratingStats] = useState({ average: 4.8, total: 24 });

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`/api/properties/${params.id}`, { headers })
      .then((r) => {
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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link Copied", description: "Property link copied to clipboard." });
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    toast({
      title: isLiked ? "Removed from Favorites" : "Added to Favorites",
      description: isLiked ? "Property removed from your saved list." : "Property saved to your favorites.",
    });
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

  const handleLinkUp = () => {
    if (!user || !token) {
      navigate("/login");
      return;
    }
    setIsLinkedUp(true);
    toast({
      title: "Linked Up!",
      description: `Contact ${property?.ownerName || "the owner"} to confirm availability.`,
    });
  };

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

  const handleRate = (rating: number) => {
    if (!isLinkedUp && !hasRated) {
      toast({ title: "Action Required", description: "You need to book or stay at this property first.", variant: "destructive" });
      return;
    }
    setUserRating(rating);
    setHasRated(true);
    if (property) localStorage.setItem(`rating_${property.id}`, String(rating));
    toast({ title: "Rating Submitted", description: `Thank you for rating ${rating} stars!` });
  };

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
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <h2 className="text-2xl font-bold">Property Not Found</h2>
          <p className="text-muted-foreground">This property may have been removed or the link is incorrect.</p>
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Image Gallery */}
      {allPhotos.length === 1 ? (
        <div className="h-[250px] sm:h-[400px] md:h-[500px] bg-gray-200 relative cursor-pointer" onClick={() => openLightbox(0)}>
          <img src={getImageUrl(allPhotos[0])} className="w-full h-full object-cover hover:brightness-110 transition-all" alt={property.title} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 h-[250px] sm:h-[400px] md:h-[500px] gap-1">
          {/* Main/hero image */}
          <div className="h-full bg-gray-200 relative cursor-pointer" onClick={() => openLightbox(0)}>
            <img src={getImageUrl(allPhotos[0])} className="w-full h-full object-cover hover:brightness-110 transition-all" alt={property.title} />
          </div>
          {/* Thumbnail grid — show up to 4 secondary images */}
          <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-1 h-full">
            {allPhotos.slice(1, 5).map((photo, idx) => {
              const isLast = idx === 3 && allPhotos.length > 5;
              return (
                <div key={photo} className="bg-gray-200 relative cursor-pointer" onClick={() => openLightbox(idx + 1)}>
                  <img src={getImageUrl(photo)} className="w-full h-full object-cover hover:brightness-110 transition-all" alt="" />
                  {isLast && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white font-bold gap-1 hover:bg-black/60 transition-colors">
                      <Images className="h-5 w-5" />
                      <span className="text-sm">+{allPhotos.length - 5} more</span>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Fill empty cells if fewer than 4 secondary photos */}
            {allPhotos.length < 3 && (
              <div className="bg-gray-100" />
            )}
            {allPhotos.length < 4 && (
              <div className="bg-gray-100" />
            )}
            {allPhotos.length < 5 && allPhotos.length >= 4 && (
              <div className="bg-gray-100 relative cursor-pointer" onClick={() => openLightbox(0)}>
                <img src={getImageUrl(allPhotos[0])} className="w-full h-full object-cover opacity-60 hover:opacity-80 transition-all" alt="" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-sm bg-black/40 px-3 py-1 rounded-full">{t("prop.view_all_photos")}</span>
                </div>
              </div>
            )}
          </div>
          {/* Mobile: show photo count badge on hero */}
          <button
            className="md:hidden absolute bottom-3 right-3 bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 z-10"
            style={{ position: "absolute", bottom: 12, right: 12 }}
            onClick={() => openLightbox(0)}
          >
            <Images className="h-3.5 w-3.5" />
            {allPhotos.length} photos
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center" onClick={closeLightbox}>
          <button
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 z-10 transition-colors"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
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

      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <div className="flex flex-col lg:flex-row justify-between items-start mb-6 gap-4 mt-2 sm:mt-0">
              <div className="w-full lg:w-auto">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge className="bg-primary">{getTypeBadgeLabel()}</Badge>
                  {property.isVerified && (
                    <Badge variant="outline" className="border-green-600 bg-green-50 text-green-700 flex items-center gap-1 px-3 py-1 shadow-sm">
                      <ShieldCheck className="h-4 w-4" /> Verified by Inndos
                    </Badge>
                  )}
                  <div className="flex items-center text-yellow-500 ml-2 text-sm font-medium">
                    <Star className="h-4 w-4 fill-current mr-1" />
                    {ratingStats.average} ({ratingStats.total} {t("prop.reviews")})
                  </div>
                </div>
                <h1 className="text-3xl font-bold font-heading text-gray-900 mb-2">{property.title}</h1>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.address}
                </div>
              </div>
              <div className="w-full lg:w-auto lg:text-right">
                <div className="text-3xl font-bold text-primary">{priceLabel()}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 sm:py-6 border-y border-gray-200 mb-8 gap-4 sm:gap-0">
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
                      className={`h-8 w-8 rounded-lg ${isLiked ? "bg-red-500 border-red-500 text-white" : "border-gray-300 bg-white text-gray-700"}`}
                      onClick={handleLike}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex gap-2 justify-end w-full sm:w-auto">
                <Button variant="outline" size="icon" onClick={handleShare}><Share2 className="h-4 w-4" /></Button>
                <Button variant={isLiked ? "default" : "outline"} size="icon" onClick={handleLike} className={isLiked ? "bg-red-500 hover:bg-red-600 border-red-500" : ""}>
                  <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                </Button>
              </div>
            </div>

            <div className="space-y-8">
              {property.description && (
                <section>
                  <h2 className="text-xl font-bold mb-4">{t("prop.description")}</h2>
                  <p className="text-gray-600 leading-relaxed">{property.description}</p>
                </section>
              )}

              <section>
                <h2 className="text-xl font-bold mb-4">{t("prop.amenities")}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(property.tags || []).concat(["Air Conditioning", "Heating", "Dishwasher", "Balcony", "Storage"]).map((tag) => (
                    <div key={tag} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="h-4 w-4 text-primary/60" />
                      {resolveAmenityLabel(tag)}
                    </div>
                  ))}
                </div>
              </section>

              {/* Rating Section */}
              <section className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                <h2 className="text-xl font-bold mb-2">{t("prop.rate_stay")}</h2>
                <p className="text-sm text-gray-500 mb-4">{t("prop.rate_desc")}</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" className="p-1 transition-transform hover:scale-110 focus:outline-none" onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => handleRate(star)}>
                      <Star className={`h-8 w-8 transition-colors ${(hoverRating || userRating) >= star ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}`} />
                    </button>
                  ))}
                </div>
                {hasRated && (
                  <p className="text-sm text-green-600 mt-2 font-medium flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> {t("prop.you_rated")} {userRating} {t("prop.stars")}
                  </p>
                )}
              </section>

              <section>
                <h2 className="text-xl font-bold mb-4">{t("prop.location")}</h2>
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <div className="relative h-72">
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
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${property.ownerName || "owner"}`} />
                          <AvatarFallback>{(property.ownerName || "O").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold">{property.ownerName || "Property Owner"}</h3>
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

                      {/* Date picker for nightly types */}
                      {isNightlyType && (
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
                      {!isLinkedUp ? (
                        <Button className="w-full bg-primary hover:bg-primary/90 h-12 text-lg font-bold tracking-wide" onClick={handleLinkUp}>
                          🔗 {t("prop.book_now")}
                        </Button>
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
