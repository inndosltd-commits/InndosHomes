import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PROPERTIES } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Calendar, Users, SlidersHorizontal } from "lucide-react";

const CATEGORIES = [
  "All", "Cabins", "Beachfront", "Mansions", "Tiny Homes", 
  "Lakefront", "Amazing Pools", "Farms", "Trending"
];

export default function BNB() {
  const bnbProperties = PROPERTIES.filter(p => p.type === "bnb");

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Search Bar */}
      <div className="border-b sticky top-16 bg-white z-40 py-4 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
              {CATEGORIES.map(cat => (
                <Button 
                  key={cat} 
                  variant={cat === 'All' ? 'default' : 'ghost'} 
                  size="sm" 
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
          {bnbProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
          {/* Duplicate to fill space for demo */}
          {bnbProperties.map((property) => (
            <PropertyCard key={`${property.id}-dup`} property={{...property, id: `${property.id}-dup`}} />
          ))}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
