import { Navbar } from "@/components/layout/Navbar";
import { PropertyCard, ApiProperty } from "@/components/property/PropertyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Search as SearchIcon, LocateFixed, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/language";

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

export default function Search() {
  const [location] = useLocation();

  const getQueryParam = (param: string) => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has(param)) return searchParams.get(param);
    const hashParts = window.location.hash.split("?");
    if (hashParts.length > 1) {
      const hashParams = new URLSearchParams(hashParts[1]);
      return hashParams.get(param);
    }
    return null;
  };

  const queryType   = getQueryParam("type")   || "rent";
  const queryFilter = getQueryParam("filter") || null;
  const { t } = useLanguage();

  const isRentPage = queryType.startsWith("rent");

  const [allProperties, setAllProperties]     = useState<ApiProperty[]>([]);
  const [isLoadingProps, setIsLoadingProps]   = useState(true);
  const [searchQuery, setSearchQuery]         = useState("");
  const [priceRange, setPriceRange]           = useState([0, 200000000]);
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [isGeofencingActive, setIsGeofencingActive] = useState(false);
  const [sortBy, setSortBy]                   = useState("featured");

  useEffect(() => {
    setIsLoadingProps(true);
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
      const maxSlider = queryType === "rent" ? 500000 : 200000000;
      if (priceRange[1] < maxSlider && p.price > priceRange[1]) return false;
      if (isRentPage && !matchesRentFilter(p, queryFilter)) return false;
      return true;
    });

    if (sortBy === "price-asc") result.sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") result.sort((a, b) => b.price - a.price);
    else if (sortBy === "newest") result.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return result;
  }, [allProperties, searchQuery, selectedBedrooms, selectedAmenities, priceRange, sortBy, queryType, queryFilter, isRentPage]);

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
      </div>

      <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className="hidden md:block w-64 shrink-0 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Filters</h3>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedBedrooms(null);
                  setSelectedAmenities([]);
                  setIsGeofencingActive(false);
                }}
                className="text-xs text-primary hover:underline"
              >
                Reset All
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-3">Price Range</h3>
            <Slider
              value={priceRange}
              onValueChange={setPriceRange}
              max={queryType === "rent" ? 500000 : 200000000}
              step={queryType === "rent" ? 5000 : 1000000}
              className="mb-4 touch-none"
            />
            <div className="flex justify-between text-sm font-medium mb-4">
              <span>{new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(priceRange[0])}</span>
              <span>
                {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(priceRange[1])}
                {priceRange[1] >= (queryType === "rent" ? 500000 : 200000000) ? "+" : ""}
              </span>
            </div>
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
                    id={a}
                    checked={selectedAmenities.includes(a)}
                    onCheckedChange={() => toggleAmenity(a)}
                  />
                  <label htmlFor={a} className="text-sm font-medium leading-none cursor-pointer">
                    {a}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="flex-1">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="font-bold text-xl">
                {isLoadingProps ? "Loading..." : `${filteredProperties.length} properties found`}
              </h1>
              <p className="text-sm text-muted-foreground">
                Showing <strong>{pageTitle()}</strong>
                {searchQuery && <span> matching &ldquo;<strong>{searchQuery}</strong>&rdquo;</span>}
              </p>
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

          {isLoadingProps ? (
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
                onClick={() => {
                  setSearchQuery("");
                  setSelectedBedrooms(null);
                  setSelectedAmenities([]);
                }}
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
