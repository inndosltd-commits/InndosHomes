import { Navbar } from "@/components/layout/Navbar";
import { PropertyCard, ApiProperty } from "@/components/property/PropertyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Search as SearchIcon, LocateFixed, Loader2, SlidersHorizontal, X, Map, LayoutList, User } from "lucide-react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";

interface Lister {
  id: string;
  name: string;
  avatar: string | null;
  plan: string;
  propertyCount: number;
}
import { useLanguage } from "@/lib/language";
import PropertyMap from "@/components/ui/PropertyMap";

const RENT_CATEGORIES = [
  { tKey: "cat.all_rentals",    type: "rent",          filter: null },
  { tKey: "cat.studio",         type: "rent",          filter: "studio" },
  { tKey: "cat.by_bedrooms",    type: "rent",          filter: "bedrooms" },
  { tKey: "cat.penthouse",      type: "rent",          filter: "penthouse" },
  { tKey: "cat.own_compound",   type: "rent",          filter: "own-compound" },
  { tKey: "cat.condominiums",   type: "rent",          filter: "condominium" },
  { tKey: "cat.business_spaces",type: "rent-business", filter: null },
  { tKey: "cat.godowns",        type: "rent-godown",   filter: null },
  { tKey: "cat.stalls",         type: "rent-stall",    filter: null },
  { tKey: "cat.shops",          type: "rent-shop",     filter: null },
];

// Type-aware amenity filter sets — IDs must match listing form tag IDs
const AMENITY_FILTER_SETS: Record<string, { id: string; label: string }[]> = {
  rent: [
    { id: "apt_prem_secure_parking",  label: "Secure Parking" },
    { id: "apt_prem_security_247",    label: "24-Hour Security" },
    { id: "apt_prem_cctv",            label: "CCTV Surveillance" },
    { id: "apt_prem_elevator",        label: "Elevator / Lift" },
    { id: "apt_prem_pool",            label: "Swimming Pool" },
    { id: "apt_prem_gym",             label: "Gym" },
    { id: "apt_prem_generator",       label: "Backup Generator" },
    { id: "apt_prem_borehole",        label: "Borehole Water" },
    { id: "apt_prem_playground",      label: "Children's Playground" },
    { id: "apt_prem_rooftop",         label: "Rooftop Terrace" },
    { id: "apt_balcony",              label: "Private Balcony" },
    { id: "apt_ensuite_beds",         label: "En-suite Bedrooms" },
    { id: "apt_ac_fans",              label: "Air Conditioning" },
    { id: "apt_wifi",                 label: "High-Speed Wi-Fi" },
    { id: "apt_fitted_kitchen",       label: "Fitted Kitchen" },
  ],
  sale: [
    { id: "home_garden",             label: "Garden / Landscaped Yard" },
    { id: "home_pool",               label: "Swimming Pool" },
    { id: "home_gym",                label: "Gym / Fitness Room" },
    { id: "home_parking",            label: "Parking Space" },
    { id: "home_security_247",       label: "24-Hour Security" },
    { id: "home_cctv",               label: "CCTV Surveillance" },
    { id: "home_perimeter_wall",     label: "Perimeter Wall & Gate" },
    { id: "home_electricity_backup", label: "Electricity Backup" },
    { id: "home_solar_water",        label: "Solar Water Heating" },
    { id: "home_prem_borehole",      label: "Borehole Water" },
    { id: "home_kids_play",          label: "Children's Play Area" },
    { id: "home_wifi",               label: "High-Speed Wi-Fi" },
    { id: "home_ac_fans",            label: "Air Conditioning" },
    { id: "home_ensuite_bath",       label: "En-suite Bathrooms" },
    { id: "home_prem_pet_friendly",  label: "Pet-Friendly Compound" },
  ],
  hotel: [
    { id: "hotel_breakfast",     label: "Complimentary Breakfast" },
    { id: "hotel_pool",          label: "Swimming Pool" },
    { id: "hotel_gym",           label: "Gym" },
    { id: "hotel_room_service",  label: "Room Service" },
    { id: "hotel_restaurant_bar",label: "Restaurant & Bar" },
    { id: "hotel_conference_hall",label: "Conference Hall" },
    { id: "hotel_valet",         label: "Valet" },
    { id: "hotel_reception_24hr",label: "24hrs Reception" },
    { id: "hotel_ballroom",      label: "Ballroom" },
    { id: "hotel_tennis",        label: "Tennis Court" },
  ],
  default: [
    { id: "parking",      label: "Parking" },
    { id: "pool",         label: "Swimming Pool" },
    { id: "gym",          label: "Gym" },
    { id: "wifi",         label: "WiFi" },
    { id: "security",     label: "24/7 Security" },
    { id: "cctv",         label: "CCTV" },
    { id: "generator",    label: "Backup Generator" },
    { id: "borewater",    label: "Borehole Water" },
  ],
};

function getAmenityFilters(queryType: string) {
  if (queryType === "rent") return AMENITY_FILTER_SETS.rent;
  if (queryType === "sale") return AMENITY_FILTER_SETS.sale;
  if (queryType === "hotel") return AMENITY_FILTER_SETS.hotel;
  return AMENITY_FILTER_SETS.default;
}

/**
 * Maps new typed amenity IDs to the old generic IDs used by properties
 * listed before the per-type amenity system was introduced. This lets
 * the filter work for legacy inventory without requiring re-listing.
 */
const AMENITY_LEGACY_ALIASES: Record<string, string[]> = {
  // Apartment / rent
  apt_prem_secure_parking:  ["parking"],
  apt_prem_security_247:    ["security"],
  apt_prem_cctv:            ["cctv"],
  apt_prem_elevator:        ["elevator"],
  apt_prem_pool:            ["pool"],
  apt_prem_gym:             ["gym"],
  apt_prem_generator:       ["generator"],
  apt_prem_borehole:        ["borewater"],
  apt_balcony:              ["balcony"],
  apt_ac_fans:              ["ac"],
  apt_wifi:                 ["wifi"],
  // Home / sale
  home_garden:              ["garden"],
  home_pool:                ["pool"],
  home_gym:                 ["gym"],
  home_parking:             ["parking"],
  home_security_247:        ["security"],
  home_cctv:                ["cctv"],
  home_perimeter_wall:      ["electric_fence"],
  home_electricity_backup:  ["generator"],
  home_prem_borehole:       ["borewater"],
  home_wifi:                ["wifi"],
  home_ac_fans:             ["ac"],
  home_solar_water:         ["solar"],
  home_prem_pet_friendly:   ["pet_friendly"],
  // Hotel
  hotel_pool:               ["pool"],
  hotel_gym:                ["gym"],
};

/** Returns true if the property's tags satisfy the selected amenity,
 *  accepting either the new typed ID or any of its legacy aliases. */
function propertyMatchesAmenity(pTags: string[], amenityId: string): boolean {
  const id = amenityId.toLowerCase();
  if (pTags.includes(id)) return true;
  const aliases = AMENITY_LEGACY_ALIASES[id] ?? [];
  return aliases.some((alias) => pTags.includes(alias.toLowerCase()));
}

const formatKES = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

function getHashQueryParam(param: string): string | null {
  const hashParts = window.location.hash.split("?");
  if (hashParts.length > 1) return new URLSearchParams(hashParts[1]).get(param);
  return null;
}

export default function Search() {
  const [hashQuery, setHashQuery] = useState(window.location.hash);
  useEffect(() => {
    const handler = () => setHashQuery(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const queryType        = getHashQueryParam("type")     || "rent";
  const queryFilter      = getHashQueryParam("filter")   || null;
  const queryCategory    = getHashQueryParam("category") || null;
  const querySearchParam = getHashQueryParam("search")   || "";
  const { t } = useLanguage();

  const isRentPage = queryType.startsWith("rent");

  const maxPrice = queryType === "rent" ? 500000 : 200000000;
  const priceStep = queryType === "rent" ? 1000 : 100000;

  const [properties, setProperties]           = useState<ApiProperty[]>([]);
  const [isLoadingProps, setIsLoadingProps]   = useState(true);
  const [searchQuery, setSearchQuery]         = useState(querySearchParam);
  const [priceRange, setPriceRange]           = useState([0, maxPrice]);
  const [minDraft, setMinDraft]               = useState("0");
  const [maxDraft, setMaxDraft]               = useState(String(maxPrice));
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy]                   = useState("featured");
  const [viewMode, setViewMode]               = useState<"list" | "map">("list");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isGeofencingActive, setIsGeofencingActive] = useState(false);
  const [userLocation, setUserLocation]       = useState<{ lat: number; lng: number } | null>(null);
  const prevType = useRef(queryType);

  // ── Lister search state ──────────────────────────────────────────────────────
  const [listerSearchMode,  setListerSearchMode]  = useState(false);
  const [listerQuery,       setListerQuery]        = useState("");
  const [listerSuggestions, setListerSuggestions] = useState<Lister[]>([]);
  const [selectedLister,    setSelectedLister]     = useState<Lister | null>(null);
  const [listerDropdownOpen,setListerDropdownOpen] = useState(false);
  const [isLoadingListers,  setIsLoadingListers]   = useState(false);
  const listerDropRef = useRef<HTMLDivElement>(null);

  const clearListerMode = useCallback(() => {
    setListerSearchMode(false);
    setSelectedLister(null);
    setListerQuery("");
    setListerSuggestions([]);
    setListerDropdownOpen(false);
  }, []);

  useEffect(() => {
    if (prevType.current !== queryType) {
      setPriceRange([0, maxPrice]);
      setMinDraft("0");
      setMaxDraft(String(maxPrice));
      prevType.current = queryType;
    }
  }, [queryType, maxPrice]);

  useEffect(() => {
    setIsLoadingProps(true);
    fetch("/api/properties", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setProperties(Array.isArray(data) ? data : []))
      .catch(() => setProperties([]))
      .finally(() => setIsLoadingProps(false));
  }, []);

  // ── Debounced lister autocomplete ────────────────────────────────────────────
  useEffect(() => {
    if (!listerSearchMode || !listerQuery.trim()) {
      setListerSuggestions([]);
      setListerDropdownOpen(false);
      return;
    }
    setIsLoadingListers(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/listers?q=${encodeURIComponent(listerQuery.trim())}`);
        const data = await r.json();
        setListerSuggestions(Array.isArray(data) ? data : []);
        setListerDropdownOpen(true);
      } catch {
        setListerSuggestions([]);
      } finally {
        setIsLoadingListers(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [listerQuery, listerSearchMode]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (listerDropRef.current && !listerDropRef.current.contains(e.target as Node)) {
        setListerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const commitMin = (v: string) => {
    const n = parseInt(v) || 0;
    const clamped = Math.min(n, priceRange[1]);
    setPriceRange([clamped, priceRange[1]]);
    setMinDraft(String(clamped));
  };

  const commitMax = (v: string) => {
    const n = parseInt(v) || maxPrice;
    const clamped = Math.max(n, priceRange[0]);
    setPriceRange([priceRange[0], clamped]);
    setMaxDraft(String(clamped));
  };

  const toggleAmenity = (a: string) =>
    setSelectedAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );

  const resetAllFilters = () => {
    setPriceRange([0, maxPrice]);
    setMinDraft("0");
    setMaxDraft(String(maxPrice));
    setSelectedBedrooms(null);
    setSelectedAmenities([]);
  };

  const isPriceFiltered = priceRange[0] > 0 || priceRange[1] < maxPrice;

  const matchesRentFilter = (p: ApiProperty, filter: string | null): boolean => {
    if (!filter) return true;
    const sub = (p.subtype || "").toLowerCase().replace(/[_\s]+/g, "-");
    const beds  = p.beds || 0;
    if (filter === "studio")       return sub === "studio" || sub === "bedsitter";
    if (filter === "bedrooms")     return beds >= 1;
    if (filter === "penthouse")    return sub === "penthouse";
    if (filter === "own-compound") return ["own-compound", "bungalow", "villa", "maisonette"].includes(sub);
    if (filter === "condominium")  return ["condominium", "condo"].includes(sub);
    return true;
  };

  const matchesSaleCategory = (p: ApiProperty, category: string | null): boolean => {
    if (!category) return true;
    const sub = (p.subtype || "").toLowerCase().replace(/[_\s]+/g, "-");
    if (category === "apartments") return ["apartment", "flat", "condominium", "condo"].includes(sub);
    if (category === "homes")      return ["home", "house", "bungalow", "villa", "maisonette", "townhouse"].includes(sub);
    if (category === "lands")      return ["land", "plot"].includes(sub);
    return true;
  };

  // Commercial rent listings are stored with type="rent" and subtype="godown"/"business"/"stall"/"shop"
  const matchesCommercialSubtype = (p: ApiProperty, commercialKey: string): boolean => {
    if (p.type !== "rent") return false;
    const sub = (p.subtype || "").toLowerCase().replace(/[_\s]+/g, "-");
    return sub === commercialKey;
  };

  const filteredProperties = useMemo(() => {
    // Lister mode: bypass all type/price filters — show the full portfolio
    if (selectedLister) {
      return [...properties.filter(p => p.ownerId === selectedLister.id)]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    let list = properties.filter((p) => {
      const pType = (p.type || "").toLowerCase();
      // Commercial subcategories: all stored as type="rent", differentiated by subtype
      if (queryType === "rent-godown")   { if (!matchesCommercialSubtype(p, "godown"))   return false; }
      else if (queryType === "rent-business") { if (!matchesCommercialSubtype(p, "business")) return false; }
      else if (queryType === "rent-stall")    { if (!matchesCommercialSubtype(p, "stall"))    return false; }
      else if (queryType === "rent-shop")     { if (!matchesCommercialSubtype(p, "shop"))     return false; }
      else {
        // Non-commercial type matching
        const typeMap: Record<string, string> = {
          rent: "rent", sale: "sale", hotel: "hotel", hostel: "hostel",
        };
        const expected = typeMap[queryType] || "rent";
        if (pType !== expected) return false;
        // For the plain "rent" tab, exclude commercial subtypes so they don't bleed into general results
        if (queryType === "rent") {
          const sub = (p.subtype || "").toLowerCase();
          if (["godown", "business", "stall", "shop"].some(c => sub.includes(c))) return false;
        }
      }
      if (queryType.startsWith("rent") && !matchesRentFilter(p, queryFilter)) return false;
      if (queryType === "sale" && !matchesSaleCategory(p, queryCategory)) return false;
      const price = p.price || 0;
      if (isPriceFiltered && (price < priceRange[0] || price > priceRange[1])) return false;
      if (selectedBedrooms !== null) {
        if (selectedBedrooms === 5) { if ((p.beds || 0) < 5) return false; }
        else if (p.beds !== selectedBedrooms) return false;
      }
      if (selectedAmenities.length > 0) {
        const pTags = (p.tags || []).map((a: string) => a.toLowerCase());
        if (!selectedAmenities.every((a) => propertyMatchesAmenity(pTags, a))) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (p.title || "").toLowerCase().includes(q) ||
          (p.address || "").toLowerCase().includes(q)
        );
      }
      if (isGeofencingActive && userLocation) {
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const R = 6371;
        const propertyLat = Number(p.lat);
        const propertyLng = Number(p.lng);
        if (!Number.isFinite(propertyLat) || !Number.isFinite(propertyLng)) return false;
        const dLat = toRad(propertyLat - userLocation.lat);
        const dLng = toRad(propertyLng - userLocation.lng);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(userLocation.lat)) * Math.cos(toRad(propertyLat)) * Math.sin(dLng / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (dist > 10) return false;
      }
      return true;
    });

    if (sortBy === "price-asc")  list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sortBy === "price-desc") list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sortBy === "newest")     list = [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  }, [properties, selectedLister, queryType, queryFilter, queryCategory, priceRange, selectedBedrooms, selectedAmenities, sortBy, searchQuery, isGeofencingActive, userLocation, isPriceFiltered]);

  const activeCatIndex = RENT_CATEGORIES.findIndex(
    (c) => c.type === queryType && c.filter === queryFilter
  );

  const navigateToRentCat = (cat: typeof RENT_CATEGORIES[0]) => {
    const url = cat.filter
      ? `/#/search?type=${cat.type}&filter=${cat.filter}`
      : `/#/search?type=${cat.type}`;
    window.location.href = url;
  };

  const pageTitle = () => {
    if (queryType === "rent") {
      if (!queryFilter) return t("cat.all_rentals");
      const cat = RENT_CATEGORIES.find((c) => c.filter === queryFilter);
      return cat ? t(cat.tKey) : t("cat.rentals");
    }
    if (queryType === "rent-business") return t("cat.business_spaces");
    if (queryType === "rent-godown")   return t("cat.godowns");
    if (queryType === "rent-stall")    return t("cat.stalls");
    if (queryType === "rent-shop")     return t("cat.shops");
    if (queryType === "sale")          return t("cat.for_sale");
    if (queryType === "hotel")         return t("cat.hotels");
    if (queryType === "hostel")        return t("cat.hostels");
    return t("cat.properties");
  };

  const handleGeofenceClick = () => {
    if (isGeofencingActive) {
      setIsGeofencingActive(false);
      setUserLocation(null);
      return;
    }
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsGeofencingActive(true);
        setSearchQuery("");
      },
      () => setIsGeofencingActive(false)
    );
  };

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold mb-3">{t("search.price_range")}</h3>
        <Slider
          value={priceRange}
          onValueChange={(v) => {
            setPriceRange(v);
            setMinDraft(String(v[0]));
            setMaxDraft(String(v[1]));
          }}
          max={maxPrice}
          step={priceStep}
          className="mb-4 touch-none"
        />
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">{t("search.min")}</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={minDraft}
              onChange={e => { if (/^\d*$/.test(e.target.value)) setMinDraft(e.target.value); }}
              onFocus={e => e.target.select()}
              onBlur={e => commitMin(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); } }}
              className="w-full border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <span className="text-muted-foreground mt-5">–</span>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">{t("search.max")}</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={maxDraft}
              onChange={e => { if (/^\d*$/.test(e.target.value)) setMaxDraft(e.target.value); }}
              onFocus={e => e.target.select()}
              onBlur={e => commitMax(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); } }}
              className="w-full border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        {isPriceFiltered && (
          <button
            onClick={() => { setPriceRange([0, maxPrice]); setMinDraft("0"); setMaxDraft(String(maxPrice)); }}
            className="mt-2 text-xs text-primary hover:underline"
          >
            {t("search.reset_price")}
          </button>
        )}
      </div>

      {!["rent-business", "rent-godown", "rent-stall", "rent-shop"].includes(queryType) && (
      <div>
        <h3 className="font-bold mb-3">{t("search.bedrooms")}</h3>
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setSelectedBedrooms(selectedBedrooms === n ? null : n)}
              className={`h-8 w-8 rounded border flex items-center justify-center text-sm transition-colors ${
                selectedBedrooms === n
                  ? "bg-primary text-white border-primary"
                  : "hover:border-primary hover:text-primary bg-white"
              }`}
            >
              {n}{n === 5 ? "+" : ""}
            </button>
          ))}
        </div>
      </div>
      )}

      <div>
        <h3 className="font-bold mb-3">{t("search.amenities")}</h3>
        <div className="space-y-2">
          {getAmenityFilters(queryType).map(({ id, label }) => (
            <div key={id} className="flex items-center space-x-2">
              <Checkbox
                id={`filter-${id}`}
                checked={selectedAmenities.includes(id)}
                onCheckedChange={() => toggleAmenity(id)}
              />
              <label htmlFor={`filter-${id}`} className="text-sm font-medium leading-none cursor-pointer">
                {label}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Search bar */}
      <div className="bg-white border-b sticky top-20 z-30 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t("search.placeholder")}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value) setIsGeofencingActive(false);
                }}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant={listerSearchMode ? "default" : "outline"}
                className="gap-2 transition-all shrink-0"
                onClick={() => listerSearchMode ? clearListerMode() : setListerSearchMode(true)}
                title="Search by owner or agency name"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{listerSearchMode ? "Cancel" : "By Owner"}</span>
              </Button>
              <Button
                variant={isGeofencingActive ? "default" : "outline"}
                className="gap-2 transition-all"
                onClick={handleGeofenceClick}
              >
                <LocateFixed className="h-4 w-4" />
                {isGeofencingActive ? t("search.near_me_btn") : t("search.use_location")}
              </Button>
              {/* Mobile-only filter toggle */}
              <Button
                variant={showMobileFilters || isPriceFiltered || selectedBedrooms !== null || selectedAmenities.length > 0 ? "default" : "outline"}
                className="gap-2 md:hidden"
                onClick={() => setShowMobileFilters((v) => !v)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t("search.filters")}
                {(isPriceFiltered || selectedBedrooms !== null || selectedAmenities.length > 0) && (
                  <span className="ml-1 bg-white text-primary rounded-full text-xs w-4 h-4 flex items-center justify-center font-bold">
                    {[isPriceFiltered, selectedBedrooms !== null, selectedAmenities.length > 0].filter(Boolean).length}
                  </span>
                )}
              </Button>
              <Button className="flex-1 md:flex-none bg-primary">{t("search.search_btn")}</Button>
            </div>
          </div>

          {/* Owner / Agency search row */}
          {listerSearchMode && (
            <div className="mt-3 relative" ref={listerDropRef}>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 z-10 pointer-events-none" />
                <Input
                  autoFocus
                  placeholder="Type owner or agency name…"
                  className="pl-10 pr-8 bg-amber-50 border-amber-200 focus-visible:ring-amber-400"
                  value={listerQuery}
                  onChange={e => { setListerQuery(e.target.value); setSelectedLister(null); }}
                  onFocus={() => listerSuggestions.length > 0 && setListerDropdownOpen(true)}
                />
                {isLoadingListers && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-amber-500" />
                )}
                {!isLoadingListers && listerQuery && (
                  <button
                    onClick={() => { setListerQuery(""); setSelectedLister(null); setListerSuggestions([]); setListerDropdownOpen(false); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete dropdown */}
              {listerDropdownOpen && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 mt-1 overflow-hidden divide-y divide-gray-50">
                  {listerSuggestions.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      No subscribed owners/agencies found for &ldquo;{listerQuery}&rdquo;
                    </div>
                  ) : (
                    listerSuggestions.map(l => (
                      <button
                        key={l.id}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => { setSelectedLister(l); setListerQuery(l.name); setListerDropdownOpen(false); }}
                      >
                        {l.avatar
                          ? <img
                              src={l.avatar.startsWith("/objects/") ? `/api/storage${l.avatar}` : l.avatar}
                              className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-100"
                              alt={l.name}
                            />
                          : <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-primary font-bold text-sm">{l.name.charAt(0).toUpperCase()}</span>
                            </div>
                        }
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{l.name}</div>
                          <div className="text-xs text-gray-500">
                            {l.propertyCount} propert{l.propertyCount === 1 ? "y" : "ies"} &middot; {l.plan} plan
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              <p className="mt-1.5 text-xs text-amber-700/70">
                Only owners and agencies with an active subscription appear in this search.
              </p>
            </div>
          )}
        </div>

        {/* Horizontal category bar — Rent only */}
        {isRentPage && (
          <div className="border-t border-gray-100">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide">
                {RENT_CATEGORIES.map((cat, i) => (
                  <button
                    key={cat.tKey}
                    onClick={() => navigateToRentCat(cat)}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      i === activeCatIndex
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-200 hover:border-black hover:text-black"
                    }`}
                  >
                    {t(cat.tKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile filter panel */}
        {showMobileFilters && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">{t("search.filters")}</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={resetAllFilters}
                    className="text-xs text-primary hover:underline"
                  >
                    {t("search.reset_all")}
                  </button>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {filterPanel}
              <Button
                className="w-full mt-6 bg-primary"
                onClick={() => setShowMobileFilters(false)}
              >
                {t("search.show_props").replace("{n}", String(filteredProperties.length))}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Desktop Sidebar Filters */}
        <div className="hidden md:block w-64 shrink-0 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{t("search.filters")}</h3>
              <button
                onClick={resetAllFilters}
                className="text-xs text-primary hover:underline"
              >
                {t("search.reset_all")}
              </button>
            </div>
          </div>
          {filterPanel}
        </div>

        {/* Results Grid / Map */}
        <div className="flex-1">
          <div className="mb-6 flex justify-between items-center gap-4">
            <div className="min-w-0">
              <h1 className="font-bold text-xl">
                {isLoadingProps
                  ? t("search.loading")
                  : `${filteredProperties.length} ${t("search.properties_found")}`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {selectedLister
                  ? <>All properties by <strong>{selectedLister.name}</strong></>
                  : <>
                      {t("search.showing")} <strong>{pageTitle()}</strong>
                      {searchQuery && <span> {t("search.matching")} &ldquo;<strong>{searchQuery}</strong>&rdquo;</span>}
                      {isPriceFiltered && (
                        <span> &middot; {t("search.price_lbl")} {formatKES(priceRange[0])} – {formatKES(priceRange[1])}{priceRange[1] >= maxPrice ? "+" : ""}</span>
                      )}
                    </>
                }
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex border rounded overflow-hidden text-sm">
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${viewMode === "list" ? "bg-primary text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  <LayoutList className="h-4 w-4" /> {t("search.list")}
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`px-3 py-1.5 flex items-center gap-1.5 border-l transition-colors ${viewMode === "map" ? "bg-primary text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  <Map className="h-4 w-4" /> {t("search.map")}
                </button>
              </div>
              <select
                className="text-sm border rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="featured">{t("search.sort_featured")}</option>
                <option value="price-asc">{t("search.sort_price_asc")}</option>
                <option value="price-desc">{t("search.sort_price_desc")}</option>
                <option value="newest">{t("search.sort_newest")}</option>
              </select>
            </div>
          </div>

          {/* Lister profile banner */}
          {selectedLister && (
            <div className="mb-6 flex items-center gap-4 bg-white rounded-2xl border border-amber-100 shadow-sm p-4">
              {selectedLister.avatar
                ? <img
                    src={selectedLister.avatar.startsWith("/objects/") ? `/api/storage${selectedLister.avatar}` : selectedLister.avatar}
                    className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-200 shadow-sm"
                    alt={selectedLister.name}
                  />
                : <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-lg">{selectedLister.name.charAt(0).toUpperCase()}</span>
                  </div>
              }
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg leading-tight truncate">{selectedLister.name}</h2>
                <p className="text-sm text-gray-500">
                  {selectedLister.propertyCount} propert{selectedLister.propertyCount === 1 ? "y" : "ies"} listed &middot;{" "}
                  <span className="capitalize">{selectedLister.plan}</span> member
                </p>
              </div>
              <button
                onClick={() => { setSelectedLister(null); setListerQuery(""); }}
                className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
                title="Clear lister filter"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {viewMode === "map" ? (
            <div className="h-[70vh] rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <PropertyMap properties={filteredProperties} />
            </div>
          ) : isLoadingProps ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-lg border border-dashed">
              <SearchIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">{t("search.no_properties")}</h3>
              <p className="text-muted-foreground">{t("search.try_adjusting")}</p>
              <Button
                variant="link"
                onClick={resetAllFilters}
                className="mt-2"
              >
                {t("search.clear_filters")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
