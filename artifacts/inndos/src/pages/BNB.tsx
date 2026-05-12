import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard, ApiProperty } from "@/components/property/PropertyCard";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { useState, useMemo, useEffect } from "react";

const CATEGORIES = [
  "All", "Cabins", "Beachfront", "Mansions", "Tiny Homes",
  "Lakefront", "Amazing Pools", "Farms", "Trending"
];

export default function BNB() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [allProperties, setAllProperties] = useState<ApiProperty[]>([]);

  useEffect(() => {
    fetch("/api/properties?type=bnb")
      .then((r) => r.json())
      .then((data) => setAllProperties(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const filteredBnbProperties = useMemo(() => {
    let properties = allProperties;
    if (selectedCategory === "Trending") {
      return [...properties].sort((a, b) => b.price - a.price).slice(0, 4);
    }
    if (selectedCategory !== "All") {
      properties = properties.filter((p) =>
        p.tags.some((tag) => tag.toLowerCase() === selectedCategory.toLowerCase())
      );
    }
    return properties;
  }, [selectedCategory, allProperties]);

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
              <Button variant="outline" className="gap-2 rounded-full">
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </Button>
            </div>
          </div>
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
