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
  { label: "All Rentals",      type: "rent",          filter: null },
  { label: "Studio / Bedsitter", type: "rent",        filter: "studio" },
  { label: "By Bedrooms",      type: "rent",          filter: "bedrooms" },
  { label: "Penthouse",        type: "rent",          filter: "penthouse" },
  { label: "Own Compound",     type: "rent",          filter: "own-compound" },
  { label: "Condominiums",     type: "rent",          filter: "condominium" },
  { label: "Business Spaces",  type: "rent-business", filter: null },
  { label: "Godowns",          type: "rent-godown",   filter: null },
  { label: "Stalls",           type: "rent-stall",    filter: null },
  { label: "Shops",            type: "rent-shop",     filter: null },
];

const formatKES = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

function getHashQueryParam(param: string): string | null {
  const hashParts = window.location.hash.split("?");
  if (hashParts.length > 1) return new URLSearchParams(hashParts[1]).get(param);
  return null;
}

export default function Search() {
  // Track the full hash so query-param changes trigger re-renders even when
  // the wouter path ("/search") stays the same.
  const [hashQuery, setHashQuery] = useState(window.location.hash);
  useEffect(() => {
    const handler = () => setHashQuery(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const queryType   = getHashQueryParam("type")   || "rent";
  const queryFilter = getHashQueryParam("filter") || null;
  const { t } = useLanguage();

  const isRentPage = queryType.startsWith("rent");

  const maxPrice = queryType === "rent" ? 500000 : 200000000;
  const priceStep = queryType === "rent" ? 5000 : 1000000;

  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [allProperties, setAllProperties]       = useState<ApiProperty[]>([]);
  const [isLoadingProps, setIsLoadingProps]     = useState(true);
  const [searchQuery, setSearchQuery]           = useState("");
  const [priceRange, setPriceRange]             = useState([0, maxPrice]);
  const [minDraft, setMinDraft] = useState<string>("0");
  const [maxDraft, setMaxDraft] = useState<string>(String(maxPrice));
  const prevMaxPrice = useRef(maxPrice);
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [isGeofencingActive, setIsGeofencingActive] = useState(false);
  const [sortBy, setSortBy]                     = useState("featured");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    setIsLoadingProps(true);
    setPriceRange([0, queryType === "rent" ? 500000 : 200000000]);
    const params = new URLSearchParams();
    if (queryType && queryType !== "all") params.set("type", queryType);

    fetch(`/api/properties?${params}`)
      .then((r) => r.json())
      .then((data) => setAllProperties(Array.isArray(data) ? data : []))
      .catch(() => setAllProperties([]))
      .finally(() => setIsLoadingProps(false));
  }, [queryType]);

  const handleGeofenceClick = () => {
    if (isGeofencingActive) {
      setSearchQuery("");
      setIsGeofencingActive(false);
    } else {
      setSearchQuery("Nairobi");
      setIsGeofencingActive(true);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  useEffect(() => {
    if (prevMaxPrice.current !== maxPrice) {
      prevMaxPrice.current = maxPrice;
      setPriceRange([0, maxPrice]);
      setMinDraft("0");
      setMaxDraft(String(maxPrice));
    }
  }, [maxPrice]);

  const commitMin = (raw: string) => {
    const v = Math.max(0, Math.min(Number(raw) || 0, priceRange[1]));
    setMinDraft(String(v));
    setPriceRange([v, priceRange[1]]);
  };

  const commitMax = (raw: string) => {
    const v = Math.max(priceRange[0], Math.min(Number(raw) || 0, maxPrice));
    setMaxDraft(String(v));
    setPriceRange([priceRange[0], v]);
  };

  const resetAllFilters = () => {
    setSearchQuery("");
    setSelectedBedrooms(null);
    setSelectedAmenities([]);
    setIsGeofencingActive(false);
    setPriceRange([0, maxPrice]);
    setMinDraft("0");
    setMaxDraft(String(maxPrice));
  };

  const matchesRentFilter = (p: ApiProperty, filter: string | null): boolean => {
    if (!filter) return true;
    const tags = p.tags.map((t) => t.toLowerCase());
    const title = p.title.toLowerCase();
    switch (filter) {
      case "studio":
        return tags.some((t) => t.includes("studio") || t.includes("bedsit")) ||
               title.includes("studio") || title.includes("bedsit");
      case "bedrooms":
        return true;
      case "penthouse":
        return tags.some((t) => t.includes("penthouse")) || title.includes("penthouse");
      case "own-compound":
        return tags.some((t) => t.includes("compound")) || title.includes("compound");
      case "condominium":
        return tags.some((t) => t.includes("condo")) || title.includes("condo");
      default:
        return true;
    }
  };

  const isPriceFiltered = priceRange[0] > 0 || priceRange[1] < maxPrice;

  const filteredProperties = useMemo(() => {
    let result = allProperties.filter((p) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!p.title.toLowerCase().includes(query) && !p.address.toLowerCase().includes(query)) return false;
      }
      if (selectedBedrooms !== null) {
        const beds = p.beds ?? 0;
        if (selectedBedrooms === 5 ? beds < 5 : beds !== selectedBedrooms) return false;
      }
      if (selectedAmenities.length > 0) {
        const hasAll = selectedAmenities.every((a) =>
          p.tags.some((tag) => tag.toLowerCase().includes(a.toLowerCase()))
        );
        if (!hasAll) return false;
      }
      if (p.price < priceRange[0]) return false;
      if (priceRange[1] < maxPrice && p.price > priceRange[1]) return false;
      if (isRentPage && !matchesRentFilter(p, queryFilter)) return false;
      return true;
    });

    if (sortBy === "price-asc") result.sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") result.sort((a, b) => b.price - a.price);
    else if (sortBy === "newest") result.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return result;
  }, [allProperties, searchQuery, selectedBedrooms, selectedAmenities, priceRange, sortBy, queryType, queryFilter, isRentPage, maxPrice]);

  const activeCatIndex = useMemo(() => {
    if (!isRentPage) return -1;
    return RENT_CATEGORIES.findIndex(
      (c) => c.type === queryType && (c.filter ?? null) === (queryFilter ?? null)
    );
  }, [isRentPage, queryType, queryFilter]);

  const navigateToRentCat = (cat: typeof RENT_CATEGORIES[0]) => {
    const url = cat.filter
      ? `/#/search?type=${cat.type}&filter=${cat.filter}`
      : `/#/search?type=${cat.type}`;
    window.location.href = url;
  };

  const pageTitle = () => {
    if (queryType === "rent") {
      if (!queryFilter) return "All Rentals";
      const cat = RENT_CATEGORIES.find((c) => c.filter === queryFilter);
      return cat ? cat.label : "Rentals";
    }
    if (queryType === "rent-business") return "Business Spaces";
    if (queryType === "rent-godown")   return "Godowns";
    if (queryType === "rent-stall")    return "Stalls";
    if (queryType === "rent-shop")     return "Shops";
    if (queryType === "sale")          return "For Sale";
    if (queryType === "hotel")         return "Hotels";
    if (queryType === "hostel")        return "Hostels";
    return "Properties";
  };

  const FilterPanel = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold mb-3">Price Range</h3>
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
            <label className="text-xs text-muted-foreground mb-1 block">Min</label>
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
            <label className="text-xs text-muted-foreground mb-1 block">Max</label>
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
            Reset price
          </button>
        )}
      </div>

      <div>
        <h3 className="font-bold mb-3">Bedrooms</h3>
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

      <div>
        <h3 className="font-bold mb-3">Amenities</h3>
        <div className="space-y-2">
          {["Parking", "Pool", "Gym", "Pet Friendly", "WiFi", "Balcony", "Garden", "Security"].map((a) => (
            <div key={a} className="flex items-center space-x-2">
              <Checkbox
                id={`filter-${a}`}
                checked={selectedAmenities.includes(a)}
                onCheckedChange={() => toggleAmenity(a)}
              />
              <label htmlFor={`filter-${a}`} className="text-sm font-medium leading-none cursor-pointer">
                {a}
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
                placeholder={t("search.placeholder") || "Search location or property name..."}
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
                {isGeofencingActive ? "Near Me" : "Use Location"}
              </Button>
              {/* Mobile-only filter toggle */}
              <Button
                variant={showMobileFilters || isPriceFiltered || selectedBedrooms !== null || selectedAmenities.length > 0 ? "default" : "outline"}
                className="gap-2 md:hidden"
                onClick={() => setShowMobileFilters((v) => !v)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {(isPriceFiltered || selectedBedrooms !== null || selectedAmenities.length > 0) && (
                  <span className="ml-1 bg-white text-primary rounded-full text-xs w-4 h-4 flex items-center justify-center font-bold">
                    {[isPriceFiltered, selectedBedrooms !== null, selectedAmenities.length > 0].filter(Boolean).length}
                  </span>
                )}
              </Button>
              <Button className="flex-1 md:flex-none bg-primary">Search</Button>
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
                    key={cat.label}
                    onClick={() => navigateToRentCat(cat)}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      i === activeCatIndex
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-200 hover:border-black hover:text-black"
                    }`}
                  >
                    {cat.label}
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
                <h3 className="font-bold">Filters</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={resetAllFilters}
                    className="text-xs text-primary hover:underline"
                  >
                    Reset All
                  </button>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <FilterPanel />
              <Button
                className="w-full mt-6 bg-primary"
                onClick={() => setShowMobileFilters(false)}
              >
                Show {filteredProperties.length} properties
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
              <h3 className="font-bold">Filters</h3>
              <button
                onClick={resetAllFilters}
                className="text-xs text-primary hover:underline"
              >
                Reset All
              </button>
            </div>
          </div>
          <FilterPanel />
        </div>

        {/* Results Grid / Map */}
        <div className="flex-1">
          <div className="mb-6 flex justify-between items-center gap-4">
            <div className="min-w-0">
              <h1 className="font-bold text-xl">
                {isLoadingProps ? "Loading..." : `${filteredProperties.length} properties found`}
              </h1>
              <p className="text-sm text-muted-foreground">
                Showing <strong>{pageTitle()}</strong>
                {searchQuery && <span> matching &ldquo;<strong>{searchQuery}</strong>&rdquo;</span>}
                {isPriceFiltered && (
                  <span> &middot; price {formatKES(priceRange[0])} – {formatKES(priceRange[1])}{priceRange[1] >= maxPrice ? "+" : ""}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex border rounded overflow-hidden text-sm">
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${viewMode === "list" ? "bg-primary text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  <LayoutList className="h-4 w-4" /> List
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`px-3 py-1.5 flex items-center gap-1.5 border-l transition-colors ${viewMode === "map" ? "bg-primary text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
                >
                  <Map className="h-4 w-4" /> Map
                </button>
              </div>
              <select
                className="text-sm border rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest</option>
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
              <h3 className="text-lg font-medium text-gray-900">No properties found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
              <Button
                variant="link"
                onClick={resetAllFilters}
                className="mt-2"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
