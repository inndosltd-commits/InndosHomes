import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard, ApiProperty } from "@/components/property/PropertyCard";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SlidersHorizontal, X } from "lucide-react";
import { useState, useMemo, useEffect } from "react";

const CATEGORIES = [
  "All", "Cabins", "Beachfront", "Mansions", "Tiny Homes",
  "Lakefront", "Amazing Pools", "Farms", "Trending"
];

const MAX_PRICE = 50000;

export default function BNB() {
  const [selectedCategory, setSelectedCategory] = useState("All");
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
    if (selectedCategory === "Trending") {
      return [...properties].sort((a, b) => b.price - a.price).slice(0, 4);
    }
    if (selectedCategory !== "All") {
      properties = properties.filter((p) =>
        p.tags.some((tag) => tag.toLowerCase() === selectedCategory.toLowerCase())
      );
    }
    return properties;
  }, [selectedCategory, allProperties, priceRange]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Category Bar */}
      <div className="border-b sticky top-16 bg-white z-40 py-4 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  variant={cat === selectedCategory ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="rounded-full whitespace-nowrap"
                >
                  {cat}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant={showFilters ? "default" : "outline"}
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

          {/* Price Range Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
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

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Unique Stays & Experiences</h1>
          <p className="text-muted-foreground">Find the perfect place for your next trip in Kenya.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredBnbProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
