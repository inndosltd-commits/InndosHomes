import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BedDouble, Bath, Square, Heart, MapPin } from "lucide-react";
import type { Property } from "@/lib/mockData";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Link href={`/property/${property.id}`}>
      <Card className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={property.image}
            alt={property.title}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge 
              className={`${
                property.type === "rent" ? "bg-primary" : "bg-secondary"
              } text-white hover:bg-opacity-90`}
            >
              {property.type === "rent" ? "For Rent" : "For Sale"}
            </Badge>
            {property.isVerified && (
              <Badge variant="secondary" className="bg-white/90 text-primary backdrop-blur-sm">
                Verified
              </Badge>
            )}
          </div>
          <button className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-red-500 transition-colors">
            <Heart className="h-4 w-4" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <p className="text-white font-bold text-xl">
              {property.type === "rent" 
                ? `${formatCurrency(property.price)}/mo` 
                : formatCurrency(property.price)}
            </p>
          </div>
        </div>

        <CardContent className="p-4 flex-1">
          <h3 className="font-heading font-semibold text-lg text-gray-900 line-clamp-1 mb-1 group-hover:text-primary transition-colors">
            {property.title}
          </h3>
          <div className="flex items-center text-muted-foreground text-sm mb-4">
            <MapPin className="h-3 w-3 mr-1" />
            <span className="line-clamp-1">{property.address}</span>
          </div>
          
          <div className="flex justify-between items-center py-3 border-t border-gray-100">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <BedDouble className="h-4 w-4 text-primary/70" />
              <span>{property.specs.beds} <span className="hidden sm:inline">Beds</span></span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Bath className="h-4 w-4 text-primary/70" />
              <span>{property.specs.baths} <span className="hidden sm:inline">Baths</span></span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Square className="h-4 w-4 text-primary/70" />
              <span>{property.specs.sqft} <span className="hidden sm:inline">sqft</span></span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
