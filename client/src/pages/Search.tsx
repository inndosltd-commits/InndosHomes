import { Navbar } from "@/components/layout/Navbar";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PROPERTIES } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Filter, MapPin, Search as SearchIcon } from "lucide-react";
import { useLocation } from "wouter";

export default function Search() {
  const [location] = useLocation();
  const queryType = new URLSearchParams(window.location.search).get("type") || "rent";
  
  const filteredProperties = PROPERTIES.filter(p => 
    queryType === "all" ? true : p.type === queryType
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Search Header */}
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="container mx-auto px-4 py-4">
           <div className="flex flex-col md:flex-row gap-4 items-center">
             <div className="relative flex-1 w-full">
               <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
               <Input placeholder="Search by location, property name..." className="pl-10" />
             </div>
             <div className="flex gap-2 w-full md:w-auto">
               <Button variant="outline" className="flex-1 md:flex-none gap-2">
                 <Filter className="h-4 w-4" /> Filters
               </Button>
               <Button className="flex-1 md:flex-none bg-primary">Search</Button>
             </div>
           </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters - Hidden on mobile for now */}
        <div className="hidden md:block w-64 shrink-0 space-y-6">
          <div>
            <h3 className="font-bold mb-3">Price Range</h3>
            <Slider defaultValue={[33]} max={100} step={1} className="mb-2" />
            <div className="flex justify-between text-sm text-gray-500">
              <span>$0</span>
              <span>$5k+</span>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-3">Bedrooms</h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, "5+"].map(n => (
                <button key={n} className="h-8 w-8 rounded border hover:border-primary hover:text-primary flex items-center justify-center text-sm transition-colors">
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
             <h3 className="font-bold mb-3">Amenities</h3>
             <div className="space-y-2">
               {["Parking", "Pool", "Gym", "Pet Friendly", "Wifi", "Balcony"].map(a => (
                 <div key={a} className="flex items-center space-x-2">
                   <Checkbox id={a} />
                   <label htmlFor={a} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                     {a}
                   </label>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="flex-1">
          <div className="mb-4 flex justify-between items-center">
             <h1 className="font-bold text-xl">
               {filteredProperties.length} Properties {queryType === 'rent' ? 'for Rent' : 'for Sale'}
             </h1>
             <select className="text-sm border rounded px-2 py-1">
               <option>Sort by: Featured</option>
               <option>Price: Low to High</option>
               <option>Price: High to Low</option>
               <option>Newest</option>
             </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(p => (
              <PropertyCard key={p.id} property={p} />
            ))}
             {/* Filling space */}
            {filteredProperties.map(p => (
              <PropertyCard key={`${p.id}-dup`} property={{...p, id: `${p.id}-dup`}} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
