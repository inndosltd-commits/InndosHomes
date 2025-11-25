import { Building2, Home, MapPin, BedDouble, Bath, Square } from "lucide-react";

export interface Property {
  id: string;
  title: string;
  type: "rent" | "sale";
  price: number;
  address: string;
  specs: {
    beds: number;
    baths: number;
    sqft: number;
  };
  image: string;
  isVerified?: boolean;
  tags: string[];
}

export const PROPERTIES: Property[] = [
  {
    id: "1",
    title: "Modern Downtown Apartment",
    type: "rent",
    price: 2500,
    address: "123 Urban Ave, Downtown, Cityville",
    specs: { beds: 2, baths: 2, sqft: 1100 },
    image: "/attached_assets/generated_images/modern_apartment_exterior.png", // Placeholder, will use generated
    isVerified: true,
    tags: ["Furnished", "Gym", "Pool"],
  },
  {
    id: "2",
    title: "Cozy Suburban Family Home",
    type: "sale",
    price: 450000,
    address: "456 Maple Drive, Suburbia",
    specs: { beds: 3, baths: 2.5, sqft: 2200 },
    image: "/attached_assets/generated_images/cozy_modern_bedroom_interior.png", // Placeholder
    isVerified: true,
    tags: ["Garden", "Garage", "Quiet"],
  },
  {
    id: "3",
    title: "Luxury Waterfront Penthouse",
    type: "sale",
    price: 1200000,
    address: "789 Ocean Blvd, Seaside",
    specs: { beds: 4, baths: 3, sqft: 3500 },
    image: "/attached_assets/generated_images/modern_apartment_exterior.png",
    isVerified: true,
    tags: ["View", "Concierge", "Parking"],
  },
  {
    id: "4",
    title: "Studio Loft Near University",
    type: "rent",
    price: 1200,
    address: "101 College St, Campus Area",
    specs: { beds: 1, baths: 1, sqft: 600 },
    image: "/attached_assets/generated_images/cozy_modern_bedroom_interior.png",
    isVerified: false,
    tags: ["Student Friendly", "Wifi", "Close to Transit"],
  },
];
