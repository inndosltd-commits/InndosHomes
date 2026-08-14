import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BedDouble, Bath, Square, Heart, MapPin } from "lucide-react";
import { Link } from "wouter";
import { useCurrency } from "@/lib/currency";
import { resolveAmenityLabel } from "@/lib/amenities";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";

export interface ApiProperty {
  id: string;
  ownerId: string;
  title: string;
  type: "rent" | "sale" | "bnb" | "hotel" | "hostel";
  price: number;
  address: string;
  beds: number;
  baths: number;
  sqft: number;
  guests?: number | null;
  image: string;
  isVerified: boolean;
  tags: string[];
  subtype?: string | null;
  hourlyRate?: number | null;
  priceUnit?: string | null;
  images?: string[];
  lat?: string | null;
  lng?: string | null;
  description?: string | null;
  createdAt?: string;
  ownerName?: string | null;
  ownerBusinessName?: string | null;
  // Legacy mockData compat (specs object)
  specs?: { beds: number; baths: number; sqft: number; guests?: number };
}

interface PropertyCardProps {
  property: ApiProperty;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const { convert } = useCurrency();
  const { user, token } = useAuth();
  const [isFaved, setIsFaved] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Check existing favourite status on mount
  useEffect(() => {
    if (!token || !property.id) return;
    fetch(`/api/favorites/check/${property.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setIsFaved(d.isFavorited); })
      .catch(() => {});
  }, [token, property.id]);

  const toggleFav = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || !token) {
      window.location.hash = "/login";
      return;
    }
    const next = !isFaved;
    setIsFaved(next);
    setFavLoading(true);
    try {
      const res = await fetch(`/api/favorites/${property.id}`, {
        method: next ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) setIsFaved(!next);
    } catch {
      setIsFaved(!next);
    } finally {
      setFavLoading(false);
    }
  };

  const beds = property.beds ?? property.specs?.beds ?? 0;
  const baths = property.baths ?? property.specs?.baths ?? 0;
  const sqft = property.sqft ?? property.specs?.sqft ?? 0;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "rent": return "For Rent";
      case "sale": return "For Sale";
      case "bnb": return "B&B";
      case "hotel": return "Hotel";
      case "hostel": return "Hostel";
      default: return type;
    }
  };

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

  const priceLabel = () => {
    const amount = convert(property.price);
    const unit = property.priceUnit;
    if (unit && PRICE_UNIT_LABELS[unit]) return `${amount}${PRICE_UNIT_LABELS[unit]}`;
    // Legacy fallbacks when priceUnit was not saved
    if (property.type === "rent") return `${amount}/mo`;
    if (property.type === "bnb" || property.type === "hotel" || property.type === "hostel") return `${amount}/night`;
    return amount;
  };

  return (
    <div className="relative group h-full">
      <Link href={`/property/${property.id}`} className="block h-full">
        <Card className="overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col">
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={property.image?.startsWith("/objects/") ? `/api/storage${property.image}` : property.image}
              alt={property.title}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
              onContextMenu={e => e.preventDefault()}
              draggable={false}
            />
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge className="bg-primary text-white hover:bg-opacity-90">
                {getTypeLabel(property.type)}
              </Badge>
              {property.isVerified && (
                <Badge variant="secondary" className="bg-white/90 text-primary backdrop-blur-sm">
                  Verified
                </Badge>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <p className="text-white font-bold text-xl">{priceLabel()}</p>
            </div>
          </div>

          <CardContent className="p-4 flex-1">
            <h3 className="font-heading font-semibold text-lg text-gray-900 line-clamp-1 mb-1 group-hover:text-primary transition-colors">
              {property.title}
            </h3>
            <div className={`flex items-center text-muted-foreground text-sm ${property.description ? "mb-2" : "mb-4"}`}>
              <MapPin className="h-3 w-3 mr-1" />
              <span className="line-clamp-1">{property.address}</span>
            </div>

            {property.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {property.description}
              </p>
            )}

            <div className="flex justify-between items-center py-3 border-t border-gray-100">
              {beds > 0 && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <BedDouble className="h-4 w-4 text-primary/70" />
                  <span>{beds} <span className="hidden sm:inline">Beds</span></span>
                </div>
              )}
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Bath className="h-4 w-4 text-primary/70" />
                <span>{baths} <span className="hidden sm:inline">Baths</span></span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Square className="h-4 w-4 text-primary/70" />
                <span>{sqft} <span className="hidden sm:inline">sqft</span></span>
              </div>
            </div>

            {property.tags && property.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {property.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {resolveAmenityLabel(tag)}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* Heart button sits OUTSIDE the Link so it never triggers navigation */}
      {(!user || user.id !== property.ownerId) && (
        <button
          className={`absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white transition-colors z-20 ${favLoading ? "opacity-50 cursor-wait" : ""}`}
          onClick={toggleFav}
          aria-label={isFaved ? "Remove from favourites" : "Save to favourites"}
        >
          <Heart className={`h-4 w-4 transition-colors ${isFaved ? "fill-gray-900 text-gray-900" : "text-gray-400 hover:text-gray-900"}`} />
        </button>
      )}
    </div>
  );
}
