import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export function Hero() {
  const [activeTab, setActiveTab] = useState<"rent" | "buy">("rent");
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyType, setPropertyType] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("type", activeTab === "rent" ? "rent" : "sale");
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (propertyType) params.set("propertyType", propertyType);
    setLocation(`/search?${params.toString()}`);
  };

  return (
    <div className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/modern_happy_family_moving_into_new_home.png"
          alt="Modern home"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container px-4 mx-auto text-center">
        <h1 className="font-heading text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
          Find your next home <br className="hidden md:block" /> or buyer with ease.
        </h1>
        <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto">
          INNDOS connects property owners, agents, tenants, and buyers on one smart platform.
        </p>

        {/* Search Box */}
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-2xl p-2 md:p-4">
          <div className="flex gap-2 mb-4 px-2">
            <button
              onClick={() => setActiveTab("rent")}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === "rent"
                  ? "bg-primary text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Rent
            </button>
            <button
              onClick={() => setActiveTab("buy")}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === "buy"
                  ? "bg-secondary text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Buy
            </button>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input 
                placeholder="Location, city, or property name" 
                className="pl-10 h-12 bg-gray-50 border-gray-200 focus:ring-2 focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="md:w-48">
              <select
                className="w-full h-12 px-3 rounded-md border border-gray-200 bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
              >
                <option value="">Property Type</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="villa">Villa</option>
                <option value="studio">Studio</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <Button 
              type="submit"
              size="lg" 
              className={`h-12 px-8 text-base ${activeTab === 'rent' ? 'bg-primary hover:bg-primary/90' : 'bg-secondary hover:bg-secondary/90'}`}
            >
              <Search className="mr-2 h-5 w-5" />
              Search
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
