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
import { useLanguage } from "@/lib/language";

export default function Home() {
  const [filteredProperties, setFilteredProperties] = useState<Property[]>(PROPERTIES);
  const { t } = useLanguage();

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
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 w-full">
                 {/* Search Bar */}
                 <div className="flex w-full items-center justify-center py-2">
                    <div className="relative w-full max-w-2xl">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input 
                        placeholder={t('search.placeholder_location') || "Search locations..."} 
                        className="w-full pl-10 pr-4 h-12 bg-white border-gray-200 rounded-full shadow-sm focus:ring-primary focus:border-primary transition-all text-base"
                      />
                    </div>
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
              <h3 className="font-heading font-bold text-lg mb-2">{t('home.verified_listings')}</h3>
              <p className="text-muted-foreground text-sm">{t('home.verified_desc')}</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-gray-50 hover:bg-secondary/5 transition-colors">
              <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">{t('home.direct_connection')}</h3>
              <p className="text-muted-foreground text-sm">{t('home.direct_desc')}</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-gray-50 hover:bg-primary/5 transition-colors">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">{t('home.property_management')}</h3>
              <p className="text-muted-foreground text-sm">{t('home.property_desc')}</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-gray-50 hover:bg-secondary/5 transition-colors">
              <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary mb-4">
                <Key className="h-6 w-6" />
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">{t('home.secure_booking')}</h3>
              <p className="text-muted-foreground text-sm">{t('home.secure_desc')}</p>
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
                 <h2 className="text-3xl font-bold text-gray-900">{t('home.bnb_hotels')}</h2>
              </div>
              <p className="text-muted-foreground">{t('home.bnb_hotels_desc')}</p>
            </div>
            <div className="flex gap-4">
              <Link href="/search?type=bnb">
                <Button variant="ghost" className="text-primary">{t('home.view_bnbs')} <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
              <Link href="/search?type=hotel">
                <Button variant="ghost" className="text-primary">{t('home.view_hotels')} <ArrowRight className="ml-2 h-4 w-4" /></Button>
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
               <Button size="lg" className="font-semibold">{t('home.explore_bnbs')}</Button>
             </Link>
             <Link href="/search?type=hotel">
               <Button size="lg" variant="outline" className="font-semibold border-primary text-primary hover:bg-primary/5">{t('home.explore_hotels')}</Button>
             </Link>
          </div>
        </div>
      </section>

      {/* Featured Rentals */}
      <section className="py-16 container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('home.latest_rentals')}</h2>
            <p className="text-muted-foreground">{t('home.latest_rentals_desc')}</p>
          </div>
          <Link href="/search?type=rent">
            <Button variant="ghost" className="text-primary">{t('home.view_all')} <ArrowRight className="ml-2 h-4 w-4" /></Button>
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
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('home.properties_for_sale')}</h2>
              <p className="text-muted-foreground">{t('home.properties_for_sale_desc')}</p>
            </div>
            <Link href="/search?type=sale">
              <Button variant="ghost" className="text-secondary">{t('home.view_all')} <ArrowRight className="ml-2 h-4 w-4" /></Button>
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
