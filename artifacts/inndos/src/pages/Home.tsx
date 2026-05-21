import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard, ApiProperty } from "@/components/property/PropertyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, ShieldCheck, Users, Building2, Key, Bed, MapPin } from "lucide-react";
import { Link } from "wouter";
import PropertyMap from "@/components/ui/PropertyMap";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language";

export default function Home() {
  const [allProperties, setAllProperties] = useState<ApiProperty[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<ApiProperty[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data) => {
        const props = Array.isArray(data) ? data : [];
        setAllProperties(props);
        setFilteredProperties(props);
      })
      .catch(() => {});
  }, []);

  const rentalProperties = allProperties.filter((p) => p.type === "rent");
  const saleProperties = allProperties.filter((p) => p.type === "sale");
  const bnbProperties = allProperties.filter((p) => p.type === "bnb");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Map Section */}
      <section className="relative h-[70vh] w-full bg-gray-100 border-t">
        {/* Floating Search Bar */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[400] w-[90%] max-w-xl pointer-events-none">
          <div className="relative w-full pointer-events-auto">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-black rounded-full shadow-[0_0_0_2px_white,0_0_0_4px_black]"></div>
            <Input
              placeholder="Where to?"
              className="w-full pl-12 pr-6 h-14 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.1)] rounded-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg font-medium text-gray-900 placeholder:text-gray-500"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                const query = e.target.value.toLowerCase();
                if (query) {
                  setFilteredProperties(
                    allProperties.filter(
                      (p) =>
                        p.title.toLowerCase().includes(query) ||
                        p.address.toLowerCase().includes(query) ||
                        p.type.toLowerCase().includes(query)
                    )
                  );
                } else {
                  setFilteredProperties(allProperties);
                }
              }}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />

            {/* Autocomplete Dropdown */}
            {isSearchFocused && searchQuery && (
              <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden z-[500] border border-gray-100">
                {filteredProperties.length > 0 ? (
                  <div className="max-h-[300px] overflow-y-auto py-2">
                    {filteredProperties.slice(0, 5).map((property, index) => (
                      <div
                        key={property.id}
                        className="px-4 hover:bg-gray-50 cursor-pointer flex items-start gap-4 transition-colors group"
                        onClick={() => {
                          setSearchQuery(property.address);
                          setFilteredProperties([property]);
                          setIsSearchFocused(false);
                        }}
                      >
                        <div className="mt-4 flex items-center justify-center shrink-0">
                          <MapPin className="h-5 w-5 text-gray-400 group-hover:text-black transition-colors" />
                        </div>
                        <div className={`flex-1 min-w-0 py-4 ${index !== Math.min(filteredProperties.length, 5) - 1 ? "border-b border-gray-100" : ""}`}>
                          <div className="font-medium text-gray-900 text-base truncate">{property.address}</div>
                          <div className="text-sm text-gray-500 truncate mt-0.5">{property.title}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No locations found matching &ldquo;{searchQuery}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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
              <h3 className="font-heading font-bold text-lg mb-2">{t("home.verified_listings")}</h3>
              <p className="text-muted-foreground text-sm">{t("home.verified_desc")}</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-gray-50 hover:bg-secondary/5 transition-colors">
              <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary mb-4">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">{t("home.direct_connection")}</h3>
              <p className="text-muted-foreground text-sm">{t("home.direct_desc")}</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-gray-50 hover:bg-primary/5 transition-colors">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">{t("home.property_management")}</h3>
              <p className="text-muted-foreground text-sm">{t("home.property_desc")}</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-gray-50 hover:bg-secondary/5 transition-colors">
              <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary mb-4">
                <Key className="h-6 w-6" />
              </div>
              <h3 className="font-heading font-bold text-lg mb-2">{t("home.secure_booking")}</h3>
              <p className="text-muted-foreground text-sm">{t("home.secure_desc")}</p>
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
                <h2 className="text-3xl font-bold text-gray-900">{t("home.bnb_hotels")}</h2>
              </div>
              <p className="text-muted-foreground">{t("home.bnb_hotels_desc")}</p>
            </div>
            <div className="flex gap-4">
              <Link href="/search?type=bnb">
                <Button variant="ghost" className="text-primary">{t("home.view_bnbs")} <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
              <Link href="/search?type=hotel">
                <Button variant="ghost" className="text-primary">{t("home.view_hotels")} <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...bnbProperties, ...allProperties.filter((p) => p.type === "hotel")].slice(0, 12).map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
          <div className="mt-8 text-center flex justify-center gap-4">
            <Link href="/search?type=bnb">
              <Button size="lg" className="font-semibold">{t("home.explore_bnbs")}</Button>
            </Link>
            <Link href="/search?type=hotel">
              <Button size="lg" variant="outline" className="font-semibold border-primary text-primary hover:bg-primary/5">{t("home.explore_hotels")}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Rentals */}
      <section className="py-16 container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t("home.latest_rentals")}</h2>
            <p className="text-muted-foreground">{t("home.latest_rentals_desc")}</p>
          </div>
          <Link href="/search?type=rent">
            <Button variant="ghost" className="text-primary">{t("home.view_all")} <ArrowRight className="ml-2 h-4 w-4" /></Button>
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
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t("home.properties_for_sale")}</h2>
              <p className="text-muted-foreground">{t("home.properties_for_sale_desc")}</p>
            </div>
            <Link href="/search?type=sale">
              <Button variant="ghost" className="text-secondary">{t("home.view_all")} <ArrowRight className="ml-2 h-4 w-4" /></Button>
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
