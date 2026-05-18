import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BedDouble, Bath, Square, MapPin, Share2, Heart, CheckCircle, Calendar, ShieldCheck, Mail, MessageSquare, PhoneCall, MessageCircle, Star, Loader2 } from "lucide-react";
import { useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useCurrency } from "@/lib/currency";
import { useLanguage } from "@/lib/language";
import { useAuth } from "@/lib/auth";
import type { ApiProperty } from "@/components/property/PropertyCard";

interface PropertyWithOwner extends ApiProperty {
  ownerName?: string | null;
}

export default function PropertyDetails() {
  const [, params] = useRoute("/property/:id");
  const { toast } = useToast();
  const { convert } = useCurrency();
  const { t } = useLanguage();
  const { user, token } = useAuth();

  const [property, setProperty] = useState<PropertyWithOwner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  const [showDirections, setShowDirections] = useState(false);

  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [ratingStats] = useState({ average: 4.8, total: 24 });

  useEffect(() => {
    if (!params?.id) return;
    setIsLoading(true);
    fetch(`/api/properties/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setProperty(data))
      .catch(() => setProperty(null))
      .finally(() => setIsLoading(false));
  }, [params?.id]);

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

  const handleBook = async () => {
    if (!property) return;
    if (!user || !token) {
      toast({ title: "Sign in required", description: "Please sign in to book this property.", variant: "destructive" });
      return;
    }

    if (property.type === "bnb" || property.type === "hotel" || property.type === "hostel") {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            propertyId: property.id,
            startDate: today,
            endDate: tomorrow,
            totalPrice: property.price,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast({
            title: "Booking failed",
            description: (data as { error?: string }).error || "Could not complete booking. Please try again.",
            variant: "destructive",
          });
          return;
        }
      } catch {
        toast({ title: "Booking failed", description: "Network error. Please try again.", variant: "destructive" });
        return;
      }
    }

    setIsBooked(true);
    toast({
      title: property.type === "rent" || property.type === "sale" ? "Tour Requested" : "Booking Confirmed",
      description:
        property.type === "rent" || property.type === "sale"
          ? `Request sent to ${property.ownerName || "the owner"}. They will contact you shortly.`
          : `Your stay at ${property.title} has been booked!`,
    });
  };

  const handleRate = (rating: number) => {
    if (!isBooked && !hasRated) {
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

  const priceLabel = () => {
    const amount = convert(property.price);
    if (property.type === "rent") return <>{amount}<span className="text-lg text-gray-500 font-normal">{t("prop.mo")}</span></>;
    if (property.type === "bnb") {
      const hasHourly = property.hourlyRate != null && property.hourlyRate > 0;
      const hasDaily = property.price > 0;
      if (hasHourly && hasDaily) {
        return (
          <div className="flex flex-col items-end gap-1">
            <div className="text-3xl font-bold text-primary">{amount}<span className="text-lg text-gray-500 font-normal">/day</span></div>
            <div className="text-xl font-semibold text-gray-600">{convert(property.hourlyRate!)}<span className="text-base text-gray-400 font-normal">/hr</span></div>
          </div>
        );
      }
      if (hasHourly) return <>{convert(property.hourlyRate!)}<span className="text-lg text-gray-500 font-normal">/hr</span></>;
      return <>{amount}<span className="text-lg text-gray-500 font-normal">/day</span></>;
    }
    if (property.type === "hotel" || property.type === "hostel") return <>{amount}<span className="text-lg text-gray-500 font-normal">/night</span></>;
    return amount;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Image Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 h-[250px] sm:h-[400px] md:h-[500px] gap-1">
        <div className="h-full bg-gray-200 relative">
          <img src={property.image} className="w-full h-full object-cover hover:brightness-110 transition-all cursor-pointer" alt={property.title} />
        </div>
        <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-1 h-full">
          <div className="bg-gray-200"><img src="/images/cozy_modern_bedroom_interior.png" className="w-full h-full object-cover hover:brightness-110 transition-all cursor-pointer" alt="" /></div>
          <div className="bg-gray-200"><img src="/images/modern_apartment_exterior.png" className="w-full h-full object-cover hover:brightness-110 transition-all cursor-pointer" alt="" /></div>
          <div className="bg-gray-200"><img src="/images/modern_happy_family_moving_into_new_home.png" className="w-full h-full object-cover hover:brightness-110 transition-all cursor-pointer" alt="" /></div>
          <div className="bg-gray-200 relative">
            <img src={property.image} className="w-full h-full object-cover hover:brightness-110 transition-all cursor-pointer" alt="" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold cursor-pointer hover:bg-black/50 transition-colors">
              {t("prop.view_all_photos")}
            </div>
          </div>
        </div>
      </div>

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
              <section>
                <h2 className="text-xl font-bold mb-4">{t("prop.description")}</h2>
                <p className="text-gray-600 leading-relaxed">{t("prop.dummy_desc")}</p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-4">{t("prop.amenities")}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(property.tags || []).concat(["Air Conditioning", "Heating", "Dishwasher", "Balcony", "Storage"]).map((tag) => (
                    <div key={tag} className="flex items-center gap-2 text-gray-600">
                      <CheckCircle className="h-4 w-4 text-primary/60" />
                      {tag}
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
                <div className="bg-gray-200 rounded-xl h-64 flex items-center justify-center text-gray-500 relative overflow-hidden group">
                  <img src="/images/modern_apartment_exterior.png" className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm transition-transform duration-500 group-hover:scale-105" alt="" />
                  {!showDirections ? (
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg flex items-center mb-4 shadow-sm">
                        <MapPin className="h-8 w-8 mr-2 text-primary" />
                        <span className="font-medium">{property.address}</span>
                      </div>
                      {isBooked ? (
                        <Button onClick={() => setShowDirections(true)} className="bg-primary shadow-lg hover:bg-primary/90">
                          <MapPin className="h-4 w-4 mr-2" /> {t("prop.get_directions")}
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="bg-white/80">{t("prop.book_to_see")}</Badge>
                      )}
                    </div>
                  ) : (
                    <div className="relative z-10 bg-white p-6 rounded-xl shadow-xl max-w-sm w-full mx-4 text-center">
                      <MapPin className="h-10 w-10 text-primary mx-auto mb-3" />
                      <h3 className="font-bold mb-2 text-lg">{t("prop.exact_unlocked")}</h3>
                      <p className="text-sm text-gray-600 mb-4">{t("prop.exact_desc")}</p>
                      <a href={`https://maps.google.com/?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="block w-full">
                        <Button className="w-full bg-[#4285F4] hover:bg-[#3367D6] text-white">{t("prop.open_maps")}</Button>
                      </a>
                      <button onClick={() => setShowDirections(false)} className="text-xs text-gray-500 underline mt-4 hover:text-gray-800">
                        {t("prop.hide_directions")}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Sidebar / Contact Card */}
          <div className="lg:w-[350px] shrink-0">
            <Card className="sticky top-24 shadow-lg border-t-4 border-t-primary">
              <CardContent className="p-6">
                <div className={`transition-all duration-500 ${!isBooked ? "blur-[4px] opacity-70 select-none" : ""}`}>
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${property.ownerName || "owner"}`} />
                      <AvatarFallback>{(property.ownerName || "O").charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold">{property.ownerName || "Property Owner"}</h3>
                      <p className="text-sm text-muted-foreground capitalize">Owner / Host</p>
                    </div>
                  </div>
                  <div className="space-y-4 mb-6">
                    <a href="tel:+254713361799" className="flex items-center gap-3 text-sm text-gray-600 hover:text-primary transition-colors p-2 hover:bg-gray-50 rounded-md" onClick={(e) => !isBooked && e.preventDefault()}>
                      <PhoneCall className="h-4 w-4" />
                      <span>+254 713 361 799</span>
                    </a>
                    <div className="flex items-center gap-3 text-sm text-gray-600 p-2">
                      <Mail className="h-4 w-4" />
                      <span>{isBooked ? `${property.ownerName?.toLowerCase().replace(" ", ".")}@inndos.com` : "••••@•••••.com"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 relative z-10 mt-[-120px] pt-[130px]">
                  {!isBooked && (
                    <div className="absolute top-0 left-0 w-full text-center pb-4 text-sm font-medium text-gray-800">
                      {t("prop.book_to_reveal")}
                    </div>
                  )}

                  {(property.type === "bnb" || property.type === "hotel" || property.type === "hostel") && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 shadow-sm relative z-20" onClick={(e) => !isBooked && e.preventDefault()}>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Select Dates</label>
                      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-100">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">Check-in</span>
                        </div>
                        <div className="h-4 w-px bg-gray-300"></div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Check-out</span>
                        </div>
                      </div>
                      <p className="text-xs text-center text-primary mt-2 flex items-center justify-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Dates Available
                      </p>
                    </div>
                  )}

                  {!isBooked ? (
                    <Button className="w-full bg-primary hover:bg-primary/90 h-12 text-lg font-bold" onClick={handleBook}>
                      {property.type === "rent" || property.type === "sale" ? t("prop.request_tour") : t("prop.book_now")}
                    </Button>
                  ) : (
                    <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-center mb-4 flex items-center justify-center gap-2 font-medium">
                      <CheckCircle className="h-5 w-5" />
                      {property.type === "rent" || property.type === "sale" ? t("prop.tour_requested") : t("prop.booking_confirmed")}
                    </div>
                  )}

                  <Button variant="outline" className="w-full gap-2" onClick={() => toast({ title: "Message sent!" })} disabled={!isBooked}>
                    <MessageSquare className="h-4 w-4" /> {t("prop.send_message")}
                  </Button>
                  <a
                    href="https://wa.me/254713361799"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center w-full h-10 px-4 py-2 text-white rounded-md transition-colors font-medium gap-2 ${isBooked ? "bg-[#25D366] hover:bg-[#128C7E]" : "bg-gray-300 cursor-not-allowed"}`}
                    onClick={(e) => !isBooked && e.preventDefault()}
                  >
                    <MessageCircle className="h-4 w-4" /> {t("prop.chat_whatsapp")}
                  </a>
                </div>

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
    </div>
  );
}
