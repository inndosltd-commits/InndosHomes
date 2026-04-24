import { Navbar } from "@/components/layout/Navbar";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PROPERTIES } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Filter, MapPin, Search as SearchIcon, LocateFixed } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { useLanguage } from "@/lib/language";

export default function Search() {
  const [location] = useLocation();
  const queryType = new URLSearchParams(window.location.search).get("type") || "rent";
  const { t } = useLanguage();
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState([0, 200000000]); // Wide range default
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [isGeofencingActive, setIsGeofencingActive] = useState(false);
  const [sortBy, setSortBy] = useState("featured");

  const handleGeofenceClick = () => {
    if (isGeofencingActive) {
      setSearchQuery("");
      setIsGeofencingActive(false);
    } else {
      // Simulate getting user location and setting it to "Nairobi"
      setSearchQuery("Nairobi");
      setIsGeofencingActive(true);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity) 
        : [...prev, amenity]
    );
  };

  const filteredProperties = useMemo(() => {
    let result = PROPERTIES.filter(p => {
      // 1. Filter by Type (Rent/Sale)
      if (queryType !== "all" && p.type !== queryType) return false;

      // 2. Filter by Search Query (Location/Title)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          p.title.toLowerCase().includes(query) || 
          p.address.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // 3. Filter by Bedrooms
      if (selectedBedrooms !== null) {
        if (selectedBedrooms === 5) { // 5+ case
          if (p.specs.beds < 5) return false;
        } else {
          if (p.specs.beds !== selectedBedrooms) return false;
        }
      }

      // 4. Filter by Amenities
      if (selectedAmenities.length > 0) {
        const hasAllAmenities = selectedAmenities.every(amenity => 
          p.tags.some(tag => tag.toLowerCase().includes(amenity.toLowerCase()))
        );
        if (!hasAllAmenities) return false;
      }

      // 5. Filter by Price
      if (p.price < priceRange[0]) return false;
      // Only filter by max price if it's not the absolute max value of the slider
      const maxSliderValue = queryType === 'rent' ? 500000 : 200000000;
      if (priceRange[1] < maxSliderValue && p.price > priceRange[1]) return false;

      return true;
    });

    // Sort the results
    if (sortBy === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "newest") {
      // Assuming higher IDs or mock IDs mean newer for now since we don't have dates in mockData
      result.sort((a, b) => b.id.localeCompare(a.id));
    }
    // "featured" just uses the default order from mockData

    return result;
  }, [queryType, searchQuery, selectedBedrooms, selectedAmenities, priceRange, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Search Header */}
      <div className="bg-white border-b sticky top-20 z-30 shadow-sm">
        <div className="container mx-auto px-4 py-4">
           <div className="flex flex-col md:flex-row gap-4 items-center">
             <div className="relative flex-1 w-full">
               <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
               <Input 
                  placeholder={t('search.placeholder')} 
                  className="pl-10" 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value === "") setIsGeofencingActive(false);
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
                 {isGeofencingActive ? t('search.near_me') : t('search.use_location')}
               </Button>
               <Button className="flex-1 md:flex-none bg-primary">{t('search.search_btn')}</Button>
             </div>
           </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className="hidden md:block w-64 shrink-0 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{t('search.filters')}</h3>
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setSelectedBedrooms(null);
                  setSelectedAmenities([]);
                  setIsGeofencingActive(false);
                }}
                className="text-xs text-primary hover:underline"
              >
                {t('search.reset_all')}
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-3">{t('search.price_range')}</h3>
            <Slider 
              value={priceRange} 
              onValueChange={setPriceRange}
              max={queryType === 'rent' ? 500000 : 200000000} 
              step={queryType === 'rent' ? 5000 : 1000000} 
              className="mb-4" 
            />
            <div className="flex justify-between text-sm font-medium mb-4">
              <span>{new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(priceRange[0])}</span>
              <span>{new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(priceRange[1])}{priceRange[1] >= (queryType === 'rent' ? 500000 : 200000000) ? '+' : ''}</span>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-3">{t('search.bedrooms')}</h3>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5].map(n => (
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
             <h3 className="font-bold mb-3">{t('search.amenities')}</h3>
             <div className="space-y-2">
               {["Parking", "Pool", "Gym", "Pet Friendly", "Wifi", "Balcony", "Garden", "Security"].map(a => (
                 <div key={a} className="flex items-center space-x-2">
                   <Checkbox 
                      id={a} 
                      checked={selectedAmenities.includes(a)}
                      onCheckedChange={() => toggleAmenity(a)}
                   />
                   <label htmlFor={a} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
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
                 {filteredProperties.length} {t('search.properties_found')}
               </h1>
               <p className="text-sm text-muted-foreground">
                 {t('search.showing_properties')} <strong>{queryType === 'rent' ? t('nav.rent') : queryType === 'sale' ? t('nav.buy') : queryType === 'hotel' ? t('nav.hotels') : queryType === 'hostel' ? t('nav.hostels') : t('nav.bnb')}</strong>
                 {searchQuery && <span> {t('search.matching')} "<strong>{searchQuery}</strong>"</span>}
               </p>
             </div>
             <select 
               className="text-sm border rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
               value={sortBy}
               onChange={(e) => setSortBy(e.target.value)}
             >
               <option value="featured">{t('search.sort_featured')}</option>
               <option value="price-asc">{t('search.sort_price_asc')}</option>
               <option value="price-desc">{t('search.sort_price_desc')}</option>
               <option value="newest">{t('search.sort_newest')}</option>
             </select>
          </div>
          
          {filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map(p => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-lg border border-dashed">
              <div className="mx-auto h-12 w-12 text-gray-300 mb-4">
                <SearchIcon className="h-full w-full" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">{t('search.no_properties')}</h3>
              <p className="text-muted-foreground">{t('search.try_adjusting')}</p>
              <Button 
                variant="link" 
                onClick={() => {
                  setSearchQuery("");
                  setSelectedBedrooms(null);
                  setSelectedAmenities([]);
                }}
                className="mt-2"
              >
                {t('search.clear_filters')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
