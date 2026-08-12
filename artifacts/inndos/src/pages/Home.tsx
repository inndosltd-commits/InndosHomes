import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard, ApiProperty } from "@/components/property/PropertyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search, ClipboardList, Link2, Home as HomeIcon, Bed, MapPin, Navigation } from "lucide-react";
import { Link } from "wouter";
import PropertyMap from "@/components/ui/PropertyMap";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/lib/language";
import { useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string;
import { GOOGLE_MAPS_LIBRARIES as MAPS_LIBRARIES } from "@/lib/maps";

interface PlacePrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export default function Home() {
  const [allProperties, setAllProperties] = useState<ApiProperty[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<ApiProperty[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [placePredictions, setPlacePredictions] = useState<PlacePrediction[]>([]);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [locating, setLocating] = useState(false);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const predictionsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useLanguage();

  const { isLoaded: mapsLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_API_KEY,
    libraries: MAPS_LIBRARIES,
  });

  useEffect(() => {
    const handler = (e: Event) => setIsNavMenuOpen((e as CustomEvent<boolean>).detail);
    window.addEventListener("nav-menu-change", handler);
    return () => window.removeEventListener("nav-menu-change", handler);
  }, []);

  useEffect(() => {
    fetch("/api/properties", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const props = Array.isArray(data) ? data : [];
        setAllProperties(props);
        setFilteredProperties(props);
      })
      .catch(() => {});
  }, []);

  // Auto-request geolocation once Maps is ready
  useEffect(() => {
    if (!mapsLoaded || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        mapInstanceRef.current?.panTo(loc);
        mapInstanceRef.current?.setZoom(13);
      },
      () => { /* permission denied — stay on Nairobi default */ }
    );
  }, [mapsLoaded]);

  // nothing to initialise — we use the new AutocompleteSuggestion API lazily per keypress

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    const query = value.toLowerCase();

    // Filter properties from API
    if (query) {
      setFilteredProperties(
        allProperties.filter(
          (p) =>
            p.title.toLowerCase().includes(query) ||
            p.address.toLowerCase().includes(query) ||
            p.type.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredProperties(allProperties);
      setPlacePredictions([]);
      return;
    }

    // Get Google Places predictions using the new AutocompleteSuggestion API
    if (mapsLoaded && query.length >= 2) {
      if (predictionsDebounceRef.current) clearTimeout(predictionsDebounceRef.current);
      predictionsDebounceRef.current = setTimeout(async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { AutocompleteSuggestion } = (google.maps.places as any);
          if (!AutocompleteSuggestion) { setPlacePredictions([]); return; }
          const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: value,
            includedRegionCodes: ["ke"],
          });
          setPlacePredictions(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (suggestions as any[]).slice(0, 3).map((s: any) => {
              const p = s.placePrediction;
              return {
                placeId: p.placeId,
                mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? value,
                secondaryText: p.structuredFormat?.secondaryText?.text ?? "",
              };
            })
          );
        } catch {
          setPlacePredictions([]);
        }
      }, 250);
    } else {
      setPlacePredictions([]);
    }
  }, [allProperties]);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        mapInstanceRef.current?.panTo(loc);
        mapInstanceRef.current?.setZoom(14);
        setLocating(false);
      },
      () => setLocating(false)
    );
  }, []);

  const handlePropertyClick = useCallback((property: ApiProperty) => {
    setSearchQuery(property.address);
    setFilteredProperties([property]);
    setIsSearchFocused(false);
    setPlacePredictions([]);

    const lat = property.lat ? parseFloat(String(property.lat)) : null;
    const lng = property.lng ? parseFloat(String(property.lng)) : null;
    if (lat && lng && mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat, lng });
      mapInstanceRef.current.setZoom(15);
    }
  }, []);

  const handlePlaceClick = useCallback((prediction: PlacePrediction) => {
    setSearchQuery(prediction.mainText);
    setIsSearchFocused(false);
    setPlacePredictions([]);

    if (!mapsLoaded || !mapInstanceRef.current) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ placeId: prediction.placeId }, (results, status) => {
      if (status === "OK" && results?.[0]?.geometry?.location) {
        const loc = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        };
        mapInstanceRef.current?.panTo(loc);
        mapInstanceRef.current?.setZoom(14);

        // Also filter properties near this location
        const q = prediction.mainText.toLowerCase();
        const nearby = allProperties.filter(
          (p) => p.address.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)
        );
        setFilteredProperties(nearby.length > 0 ? nearby : allProperties);
      }
    });
  }, [mapsLoaded, allProperties]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapInstanceRef.current = map;
  }, []);

  const matchedProperties = searchQuery
    ? allProperties.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const rentalProperties = allProperties.filter((p) => p.type === "rent");
  const saleProperties = allProperties.filter((p) => p.type === "sale");
  const bnbProperties = allProperties.filter((p) => p.type === "bnb");

  const showDropdown = isSearchFocused && searchQuery.length > 0 && (matchedProperties.length > 0 || placePredictions.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Map Section */}
      <section className="relative h-[70vh] w-full bg-gray-100 border-t">
        {/* Floating Search Bar */}
        <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-[400] w-[90%] max-w-xl pointer-events-none transition-opacity duration-150 ${isNavMenuOpen ? "opacity-0 pointer-events-none" : ""}`}>
          <div className="relative w-full pointer-events-auto">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-black rounded-full shadow-[0_0_0_2px_white,0_0_0_4px_black]" />
            <Input
              placeholder="Where to?"
              className="w-full pl-12 pr-6 h-14 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.1)] rounded-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg font-medium text-gray-900 placeholder:text-gray-500"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />

            {/* Autocomplete Dropdown */}
            {showDropdown && (
              <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden z-[500] border border-gray-100">
                <div className="max-h-[360px] overflow-y-auto py-2">

                  {/* Property results */}
                  {matchedProperties.slice(0, 4).map((property, index) => (
                    <div
                      key={property.id}
                      className="px-4 hover:bg-gray-50 cursor-pointer flex items-start gap-4 transition-colors group"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handlePropertyClick(property)}
                    >
                      <div className="mt-4 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-gray-400 group-hover:text-black transition-colors" />
                      </div>
                      <div className={`flex-1 min-w-0 py-4 ${index < matchedProperties.slice(0, 4).length - 1 || placePredictions.length > 0 ? "border-b border-gray-100" : ""}`}>
                        <div className="font-medium text-gray-900 text-base truncate">{property.title}</div>
                        <div className="text-sm text-gray-500 truncate mt-0.5">{property.address}</div>
                      </div>
                    </div>
                  ))}

                  {/* Google Places predictions */}
                  {placePredictions.map((pred, index) => (
                    <div
                      key={pred.placeId}
                      className="px-4 hover:bg-gray-50 cursor-pointer flex items-start gap-4 transition-colors group"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handlePlaceClick(pred)}
                    >
                      <div className="mt-4 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-blue-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <div className={`flex-1 min-w-0 py-4 ${index < placePredictions.length - 1 ? "border-b border-gray-100" : ""}`}>
                        <div className="font-medium text-gray-900 text-base truncate">{pred.mainText}</div>
                        <div className="text-sm text-gray-500 truncate mt-0.5">{pred.secondaryText}</div>
                      </div>
                    </div>
                  ))}

                  {matchedProperties.length === 0 && placePredictions.length === 0 && (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No locations found matching &ldquo;{searchQuery}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Locate Me button */}
        <button
          onClick={handleLocateMe}
          title="Show my location"
          className="absolute bottom-6 right-4 z-[400] bg-white border border-gray-200 rounded-full p-3 shadow-lg hover:shadow-xl transition-all hover:bg-gray-50"
        >
          <Navigation className={`h-5 w-5 ${locating ? "text-blue-500 animate-pulse" : "text-gray-700"}`} />
        </button>

        <div className="absolute inset-0 z-0">
          <PropertyMap
            properties={filteredProperties}
            userLocation={userLocation}
            onMapLoad={onMapLoad}
          />
        </div>
      </section>

      {/* Our Process Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-14">
            <p className="text-zinc-900 font-bold tracking-widest text-sm mb-3">How inndos Works</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-5 leading-tight">
              Everything starts with the right place.
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
              From discovering a property to{" "}
              <span className="text-zinc-900 font-semibold">linking up</span>{" "}
              with the right person,<br className="hidden md:block" />
              inndos makes finding your next place simpler.
            </p>
          </div>

          {/* Process Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                num: "01",
                icon: <Search className="h-5 w-5 text-zinc-900" />,
                title: "Discover",
                desc: "Explore homes, rentals and stays in places you actually want to live.",
                img: "/images/process-explore.jpeg",
                alt: "Modern apartment building exterior at dusk",
              },
              {
                num: "02",
                icon: <ClipboardList className="h-5 w-5 text-zinc-900" />,
                title: "Compare",
                desc: "Compare features, prices and locations to choose the best fit.",
                img: "/images/process-evaluate.jpeg",
                alt: "Bright modern living room interior",
              },
              {
                num: "03",
                icon: <Link2 className="h-5 w-5 text-zinc-900" />,
                title: "Link Up",
                desc: "Talk directly with property owners and managers.",
                img: "/images/process-connect.jpeg",
                alt: "Couple shaking hands with property agent",
              },
              {
                num: "04",
                icon: <HomeIcon className="h-5 w-5 text-zinc-900" />,
                title: "Move In",
                desc: "Complete the process and step into your new space with confidence.",
                img: "/images/process-settle.jpeg",
                alt: "Hand holding house keys",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="flex flex-row bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Text + icon — always on left */}
                <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-9 w-9 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
                      {step.icon}
                    </div>
                    <p className="text-zinc-900 font-bold text-xs">{step.num}</p>
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 mb-1 leading-snug">{step.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
                </div>
                {/* Photo — always on right, fixed width */}
                <div className="w-28 sm:w-32 shrink-0">
                  <img
                    src={step.img}
                    alt={step.alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* B&B & Hotels Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Bed className="h-6 w-6 text-primary" />
                <h2 className="text-3xl font-bold text-gray-900">{t("home.bnb_hotels")}</h2>
              </div>
              <p className="text-muted-foreground">{t("home.bnb_hotels_desc")}</p>
            </div>
            <div className="flex gap-4">
              <Link href="/search?type=bnb">
                <Button variant="ghost" className="text-primary">{t("home.view_bnbs")} <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
              <Link href="/search?type=hotel">
                <Button variant="ghost" className="text-primary">{t("home.view_hotels")} <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...bnbProperties, ...allProperties.filter((p) => p.type === "hotel")].slice(0, 12).map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
          <div className="mt-8 text-center flex justify-center gap-4">
            <Link href="/search?type=bnb">
              <Button size="lg" className="font-semibold">{t("home.explore_bnbs")}</Button>
            </Link>
            <Link href="/search?type=hotel">
              <Button size="lg" variant="outline" className="font-semibold border-primary text-primary hover:bg-primary/5">{t("home.explore_hotels")}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Rentals */}
      <section className="py-16 container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t("home.latest_rentals")}</h2>
            <p className="text-muted-foreground">{t("home.latest_rentals_desc")}</p>
          </div>
          <Link href="/search?type=rent">
            <Button variant="ghost" className="text-primary">{t("home.view_all")} <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {rentalProperties.slice(0, 4).map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </section>

      {/* Featured Sales */}
      <section className="py-16 bg-white border-t">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t("home.properties_for_sale")}</h2>
              <p className="text-muted-foreground">{t("home.properties_for_sale_desc")}</p>
            </div>
            <Link href="/search?type=sale">
              <Button variant="ghost" className="text-secondary">{t("home.view_all")} <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {saleProperties.slice(0, 4).map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
