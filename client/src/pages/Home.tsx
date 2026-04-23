import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PROPERTIES, Property } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, ShieldCheck, Users, Building2, Key, Bed, Search, MapPin } from "lucide-react";
import { Link } from "wouter";
import PropertyMap from "@/components/ui/PropertyMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";

export default function Home() {
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(PROPERTIES);

  useEffect(() => {
    // Load any dynamically approved listings from localStorage
    const savedActive = localStorage.getItem('activeListings');
    if (savedActive) {
      try {
        const parsedActive = JSON.parse(savedActive);
        if (Array.isArray(parsedActive) && parsedActive.length > 0) {
          setFilteredProperties(prev => [...parsedActive, ...PROPERTIES]);
        }
      } catch (e) {
        console.error("Error loading active listings", e);
      }
    }
  }, []);

  const rentalProperties = filteredProperties.filter(p => p.type === "rent");
  const saleProperties = filteredProperties.filter(p => p.type === "sale");
  const bnbProperties = filteredProperties.filter(p => p.type === "bnb");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="bg-white pt-4 pb-0">
          <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                 {/* Filter Pills */}
                 <div className="flex gap-2 overflow-x-auto pb-0 scrollbar-hide justify-center md:justify-start flex-shrink-0">
                    <Link href="/search?type=hotel">
                      <Button variant="outline" className="rounded-full px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-12">Hotel</Button>
                    </Link>
                    <Link href="/search?type=bnb">
                      <Button variant="outline" className="rounded-full px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-12">B&B</Button>
                    </Link>
                    <Link href="/search?type=rent">
                      <Button variant="outline" className="rounded-full px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-12">Rent</Button>
                    </Link>
                    <Link href="/search?type=sale">
                      <Button variant="outline" className="rounded-full px-6 bg-white border-gray-200 hover:bg-gray-50 hover:text-black shadow-sm font-medium h-12">Own</Button>
                    </Link>
                    <Link href="/add-listing">
                      <Button className="rounded-full px-6 bg-gray-200 text-black hover:bg-gray-300 border-none shadow-sm font-medium whitespace-nowrap h-12">List property</Button>
                    </Link>
                 </div>
                 
                 {/* Search Bar */}
                 <div className="relative flex-grow w-full md:w-auto">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <Input 
                      placeholder="Search locations" 
                      className="h-12 pl-11 rounded-full border-gray-200 bg-gray-50 hover:bg-white focus:bg-white shadow-sm text-base w-full transition-all" 
                    />
                 </div>
              </div>
          </div>
      </div>

      {/* Map Section replacing Hero */}
      <section className="relative h-[70vh] w-full bg-gray-100 border-t">
        <div className="absolute inset-0 z-0">
          <PropertyMap properties={filteredProperties} />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-gray-50 hover:bg-primary/5 transition-colors">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">Verified Listings</h3>
              <p className="text-muted-foreground text-sm">Every property is vetted for authenticity.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-gray-50 hover:bg-secondary/5 transition-colors">
              <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">Direct Connection</h3>
              <p className="text-muted-foreground text-sm">Connect directly with owners and buyers.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-gray-50 hover:bg-primary/5 transition-colors">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">Property Management</h3>
              <p className="text-muted-foreground text-sm">Tools for landlords to manage listings.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-gray-50 hover:bg-secondary/5 transition-colors">
              <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary mb-4">
                <Key className="h-6 w-6" />
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">Secure Booking</h3>
              <p className="text-muted-foreground text-sm">Safe and secure rental process.</p>
            </div>
          </div>
        </div>
      </section>

      {/* B&B & Hotels Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <Bed className="h-6 w-6 text-primary" />
                 <h2 className="text-3xl font-bold text-gray-900">B&B & Hotels</h2>
              </div>
              <p className="text-muted-foreground">Unique accommodations, offices, and meeting spaces.</p>
            </div>
            <div className="flex gap-4">
              <Link href="/search?type=bnb">
                <Button variant="ghost" className="text-primary">View B&Bs <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
              <Link href="/search?type=hotel">
                <Button variant="ghost" className="text-primary">View Hotels <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...bnbProperties, ...filteredProperties.filter(p => p.type === 'hotel')].slice(0, 12).map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
          <div className="mt-8 text-center flex justify-center gap-4">
             <Link href="/search?type=bnb">
               <Button size="lg" className="font-semibold">Explore B&B Stays</Button>
             </Link>
             <Link href="/search?type=hotel">
               <Button size="lg" variant="outline" className="font-semibold border-primary text-primary hover:bg-primary/5">Explore Hotels</Button>
             </Link>
          </div>
        </div>
      </section>

      {/* Featured Rentals */}
      <section className="py-16 container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Latest Rentals</h2>
            <p className="text-muted-foreground">Discover top-rated rental properties available now.</p>
          </div>
          <Link href="/search?type=rent">
            <Button variant="ghost" className="text-primary">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {rentalProperties.slice(0, 4).map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </section>

      {/* Featured Sales */}
      <section className="py-16 bg-white border-t">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Properties For Sale</h2>
              <p className="text-muted-foreground">Find your dream home from verified sellers.</p>
            </div>
            <Link href="/search?type=sale">
              <Button variant="ghost" className="text-secondary">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {saleProperties.slice(0, 4).map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
