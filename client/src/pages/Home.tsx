import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PROPERTIES } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, ShieldCheck, Users, Building2, Key, Bed, Search, MapPin } from "lucide-react";
import { Link } from "wouter";
import PropertyMap from "@/components/ui/PropertyMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Home() {
  const rentalProperties = PROPERTIES.filter(p => p.type === "rent");
  const saleProperties = PROPERTIES.filter(p => p.type === "sale");
  const bnbProperties = PROPERTIES.filter(p => p.type === "bnb");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Map Section replacing Hero */}
      <section className="relative h-[650px] w-full bg-gray-100">
        <div className="absolute inset-0 z-0">
          <PropertyMap properties={PROPERTIES} />
        </div>
        
        {/* Overlay with Search */}
        <div className="absolute inset-0 bg-black/10 pointer-events-none z-10 flex flex-col justify-start pt-24 items-center">
          <div className="container mx-auto px-4 pointer-events-auto">
             <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl p-6 transform transition-all hover:scale-[1.01]">
               <h1 className="text-3xl font-bold font-heading mb-6 text-center text-gray-900">
                 Find Your Place in Kenya
               </h1>
               
               <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-4">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Location (e.g. Westlands)" className="pl-9 h-12 text-lg" />
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <Select defaultValue="rent">
                      <SelectTrigger className="h-12 text-lg">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rent">For Rent</SelectItem>
                        <SelectItem value="sale">For Sale</SelectItem>
                        <SelectItem value="bnb">B&B Stays</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3">
                     <Select>
                      <SelectTrigger className="h-12 text-lg">
                        <SelectValue placeholder="Price Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Price</SelectItem>
                        <SelectItem value="low">Under 50k</SelectItem>
                        <SelectItem value="mid">50k - 150k</SelectItem>
                        <SelectItem value="high">150k+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Button size="lg" className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90">
                      <Search className="h-5 w-5 mr-2" /> Search
                    </Button>
                  </div>
               </div>
               
               <div className="mt-4 flex gap-4 justify-center text-sm text-muted-foreground">
                 <span>Popular:</span>
                 <span className="cursor-pointer hover:text-primary underline decoration-dotted">Kilimani</span>
                 <span className="cursor-pointer hover:text-primary underline decoration-dotted">Westlands</span>
                 <span className="cursor-pointer hover:text-primary underline decoration-dotted">Karen</span>
                 <span className="cursor-pointer hover:text-primary underline decoration-dotted">Mombasa</span>
               </div>
             </div>
          </div>
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

      {/* B&B Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <Bed className="h-6 w-6 text-primary" />
                 <h2 className="text-3xl font-bold text-gray-900">B&B & Short Stays</h2>
              </div>
              <p className="text-muted-foreground">Unique accommodations, offices, and meeting spaces.</p>
            </div>
            <Link href="/search?type=bnb">
              <Button variant="ghost" className="text-primary">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bnbProperties.slice(0, 12).map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
          <div className="mt-8 text-center">
             <Link href="/bnb">
               <Button size="lg" className="font-semibold">Explore All B&B Stays</Button>
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
