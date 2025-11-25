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
    image: "/images/modern_apartment_exterior.png",
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
    image: "/images/cozy_modern_bedroom_interior.png",
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
    image: "/images/modern_apartment_exterior.png",
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
    image: "/images/cozy_modern_bedroom_interior.png",
    isVerified: false,
    tags: ["Student Friendly", "Wifi", "Close to Transit"],
  },
  {
    id: "5",
    title: "Spacious Apartment in Kilimani",
    type: "rent",
    price: 85000, // KES roughly
    address: "Kilimani, Nairobi, Kenya",
    specs: { beds: 3, baths: 2, sqft: 1500 },
    image: "/images/modern_apartment_exterior.png",
    isVerified: true,
    tags: ["Gym", "Pool", "Backup Generator"],
  },
  {
    id: "6",
    title: "Executive House in Runda",
    type: "sale",
    price: 65000000, // KES
    address: "Runda, Nairobi, Kenya",
    specs: { beds: 5, baths: 5, sqft: 4500 },
    image: "/images/modern_happy_family_moving_into_new_home.png",
    isVerified: true,
    tags: ["Garden", "Security", "DSQ"],
  },
  {
    id: "7",
    title: "Beachfront Villa",
    type: "rent",
    price: 150000, // KES
    address: "Nyali, Mombasa, Kenya",
    specs: { beds: 4, baths: 4, sqft: 3000 },
    image: "/images/modern_apartment_exterior.png",
    isVerified: true,
    tags: ["Beach Access", "Pool", "Air Conditioning"],
  },
  {
    id: "8",
    title: "Affordable Starter Home",
    type: "sale",
    price: 4500000, // KES
    address: "Kitengela, Kajiado, Kenya",
    specs: { beds: 2, baths: 1, sqft: 900 },
    image: "/images/cozy_modern_bedroom_interior.png",
    isVerified: false,
    tags: ["Gated Community", "Parking"],
  },
];
