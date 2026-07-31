import { Navbar } from "@/components/layout/Navbar";
import { PropertyCard, ApiProperty } from "@/components/property/PropertyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Search as SearchIcon, LocateFixed, Loader2, SlidersHorizontal, X, Map, LayoutList } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
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

const AMENITY_KEYS: Record<string, string> = {
  "Parking":     "amenity.parking",
  "Pool":        "amenity.pool",
  "Gym":         "amenity.gym",
  "Pet Friendly":"amenity.pet_friendly",
  "WiFi":        "amenity.wifi",
  "Balcony":     "amenity.balcony",
  "Garden":      "amenity.garden",
  "Security":    "amenity.security",
};

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

  const queryType        = getHashQueryParam("type")   || "rent";
  const queryFilter      = getHashQueryParam("filter") || null;
  const querySearchParam = getHashQueryParam("search") || "";
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
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data) => setProperties(Array.isArray(data) ? data : []))
      .catch(() => setProperties([]))
      .finally(() => setIsLoadingProps(false));
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
    const sub = (p.subCategory || "").toLowerCase();
    const beds = p.bedrooms || 0;
    if (filter === "studio")       return sub.includes("studio") || sub.includes("bedsitter") || beds <= 1;
    if (filter === "bedrooms")     return beds >= 1;
    if (filter === "penthouse")    return sub.includes("penthouse");
    if (filter === "own-compound") return sub.includes("compound") || sub.includes("bungalow") || sub.includes("villa") || sub.includes("maisonette");
    if (filter === "condominium")  return sub.includes("condo") || sub.includes("apartment") || sub.includes("flat");
    return true;
  };

  const filteredProperties = useMemo(() => {
    let list = properties.filter((p) => {
      const typeMap: Record<string, string[]> = {
        rent: ["rent"],
        "rent-business": ["commercial"],
        "rent-godown": ["godown"],
        "rent-stall": ["stall"],
        "rent-shop": ["shop"],
        sale: ["sale"],
        hotel: ["hotel"],
        hostel: ["hostel"],
      };
      const allowed = typeMap[queryType] || ["rent"];
      if (!allowed.includes((p.listingType || "").toLowerCase())) return false;
      if (!matchesRentFilter(p, queryFilter)) return false;
      const price = p.price || 0;
      if (isPriceFiltered && (price < priceRange[0] || price > priceRange[1])) return false;
      if (selectedBedrooms !== null) {
        if (selectedBedrooms === 5) { if ((p.bedrooms || 0) < 5) return false; }
        else if (p.bedrooms !== selectedBedrooms) return false;
      }
      if (selectedAmenities.length > 0) {
        const pAmenities = (p.amenities || []).map((a: string) => a.toLowerCase());
        if (!selectedAmenities.every((a) => pAmenities.includes(a.toLowerCase()))) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (p.title || "").toLowerCase().includes(q) ||
          (p.address || "").toLowerCase().includes(q) ||
          (p.city || "").toLowerCase().includes(q)
        );
      }
      if (isGeofencingActive && userLocation) {
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad((p.lat || 0) - userLocation.lat);
        const dLng = toRad((p.lng || 0) - userLocation.lng);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(userLocation.lat)) * Math.cos(toRad((p.lat || 0))) * Math.sin(dLng / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (dist > 10) return false;
      }
      return true;
    });

    if (sortBy === "price-asc")  list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sortBy === "price-desc") list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sortBy === "newest")     list = [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  }, [properties, queryType, queryFilter, priceRange, selectedBedrooms, selectedAmenities, sortBy, searchQuery, isGeofencingActive, userLocation, isPriceFiltered]);

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

      {!["rent-business", "rent-godown", "rent-stall", "rent-shop", "commercial"].includes(queryType) && (
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
          {Object.keys(AMENITY_KEYS).map((a) => (
            <div key={a} className="flex items-center space-x-2">
              <Checkbox
                id={`filter-${a}`}
                checked={selectedAmenities.includes(a)}
                onCheckedChange={() => toggleAmenity(a)}
              />
              <label htmlFor={`filter-${a}`} className="text-sm font-medium leading-none cursor-pointer">
                {t(AMENITY_KEYS[a])}
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
                {t("search.showing")} <strong>{pageTitle()}</strong>
                {searchQuery && <span> {t("search.matching")} &ldquo;<strong>{searchQuery}</strong>&rdquo;</span>}
                {isPriceFiltered && (
                  <span> &middot; {t("search.price_lbl")} {formatKES(priceRange[0])} – {formatKES(priceRange[1])}{priceRange[1] >= maxPrice ? "+" : ""}</span>
                )}
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
