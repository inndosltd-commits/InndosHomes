import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard, ApiProperty } from "@/components/property/PropertyCard";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SlidersHorizontal } from "lucide-react";
import { useState, useMemo, useEffect } from "react";

interface Category {
  label: string;
  subtype: string | null;
  icon: string;
  description: string;
}

const CATEGORIES: Category[] = [
  { label: "All",                          subtype: null,               icon: "🏠", description: "All B&B listings" },
  { label: "Serviced Apartments",          subtype: "serviced-apartment", icon: "🏢", description: "Fully furnished with hotel-like amenities" },
  { label: "Entire Place",                 subtype: "entire-place",     icon: "🏡", description: "Private home, apartment or villa" },
  { label: "Private Room",                 subtype: "private-room",     icon: "🛏️", description: "Own bedroom, shared common areas" },
  { label: "Shared Room",                  subtype: "shared-room",      icon: "👥", description: "Shared bedroom and common areas" },
  { label: "Unique Stays",                 subtype: "unique-stays",     icon: "🌳", description: "Treehouses, container homes, yurts, houseboats" },
  { label: "Hotel & Boutique",             subtype: "hotel-room",       icon: "🏨", description: "Hotels, hostels or Bed & Breakfasts" },
  { label: "Vacation Homes",               subtype: "vacation-home",    icon: "🏖️", description: "Cabins, rustic villas or getaway properties" },
  { label: "Nature-Focused",               subtype: "nature-stay",      icon: "🌿", description: "Cabins, bungalows, containers, villas in nature" },
  { label: "Others",                       subtype: "other",            icon: "✨", description: "Other short-stay accommodations" },
];

const MAX_PRICE = 50000;

export default function BNB() {
  const [selectedCategory, setSelectedCategory] = useState<Category>(CATEGORIES[0]);
  const [allProperties, setAllProperties] = useState<ApiProperty[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, MAX_PRICE]);

  useEffect(() => {
    fetch("/api/properties?type=bnb")
      .then((r) => r.json())
      .then((data) => setAllProperties(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const filteredBnbProperties = useMemo(() => {
    let properties = allProperties.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );
    if (selectedCategory.subtype !== null) {
      properties = properties.filter(
        (p) => p.subtype === selectedCategory.subtype
      );
    }
    return properties;
  }, [selectedCategory, allProperties, priceRange]);

  const activeCat = selectedCategory;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Category Filter Bar */}
      <div className="border-b sticky top-16 bg-white z-40 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4 py-3">
            {/* Scrollable pill row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-1 min-w-0">
              {CATEGORIES.map((cat) => {
                const isActive = cat.label === activeCat.label;
                return (
                  <button
                    key={cat.label}
                    onClick={() => setSelectedCategory(cat)}
                    className={`
                      inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                      transition-all border
                      ${isActive
                        ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                        : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50"}
                    `}
                  >
                    <span className="text-base leading-none">{cat.icon}</span>
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Filters button — stays fixed at right */}
            <div className="shrink-0">
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                className="gap-2 rounded-full"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4" /> Filters
                {(priceRange[0] > 0 || priceRange[1] < MAX_PRICE) && (
                  <span className="h-2 w-2 rounded-full bg-white ml-1" />
                )}
              </Button>
            </div>
          </div>

          {/* Active category description */}
          {activeCat.subtype !== null && (
            <div className="pb-2 text-xs text-zinc-500">
              <span className="font-medium text-zinc-700">{activeCat.label}:</span> {activeCat.description}
            </div>
          )}

          {/* Price Range Filter Panel */}
          {showFilters && (
            <div className="mt-2 pt-4 border-t pb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Price Range (KES / night)</span>
                <button
                  className="text-xs text-gray-500 underline hover:text-gray-800"
                  onClick={() => setPriceRange([0, MAX_PRICE])}
                >
                  Reset
                </button>
              </div>
              <Slider
                min={0}
                max={MAX_PRICE}
                step={500}
                value={priceRange}
                onValueChange={(v) => setPriceRange(v as [number, number])}
                className="mb-3"
              />
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Min (KES)</label>
                  <input
                    type="number"
                    min={0}
                    max={priceRange[1]}
                    value={priceRange[0]}
                    onChange={e => {
                      const v = Math.max(0, Math.min(Number(e.target.value), priceRange[1]));
                      setPriceRange([v, priceRange[1]]);
                    }}
                    className="w-full border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <span className="text-gray-400 mt-5">–</span>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Max (KES)</label>
                  <input
                    type="number"
                    min={priceRange[0]}
                    max={MAX_PRICE}
                    value={priceRange[1]}
                    onChange={e => {
                      const v = Math.max(priceRange[0], Math.min(Number(e.target.value), MAX_PRICE));
                      setPriceRange([priceRange[0], v]);
                    }}
                    className="w-full border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Listings */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">
            {activeCat.subtype === null ? "All B&B Stays" : activeCat.label}
          </h1>
          <p className="text-muted-foreground text-sm">{activeCat.description}</p>
        </div>

        {filteredBnbProperties.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-medium text-gray-600">No listings in this category yet</p>
            <p className="text-sm mt-1">Be the first to list a <span className="font-semibold">{activeCat.label}</span> property.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredBnbProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
