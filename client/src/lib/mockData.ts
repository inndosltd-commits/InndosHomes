import { Building2, Home, MapPin, BedDouble, Bath, Square } from "lucide-react";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "owner" | "tenant" | "admin";
  avatar?: string;
  status: "active" | "pending" | "suspended";
  joinDate: string;
}

export interface Property {
  id: string;
  ownerId: string; // Link to owner
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

// --- MOCK USERS ---

export const ADMINS: UserProfile[] = [
  { id: "admin1", name: "Super Admin", email: "admin@inndos.com", role: "admin", status: "active", joinDate: "2023-01-01" }
];

export const OWNERS: UserProfile[] = [
  { id: "o1", name: "John Landlord", email: "owner@inndos.com", role: "owner", status: "active", joinDate: "2023-05-15" }, // Demo Owner
  { id: "o2", name: "Alice Smith", email: "alice@properties.com", role: "owner", status: "active", joinDate: "2023-06-20" },
  { id: "o3", name: "Robert Chen", email: "bob@chenrealty.com", role: "owner", status: "active", joinDate: "2023-07-10" },
  { id: "o4", name: "Maria Garcia", email: "maria@homes.com", role: "owner", status: "pending", joinDate: "2023-08-05" },
  { id: "o5", name: "David Kim", email: "david@investments.com", role: "owner", status: "active", joinDate: "2023-09-12" },
  { id: "o6", name: "Sarah Connor", email: "sarah@skyline.com", role: "owner", status: "active", joinDate: "2023-10-30" },
  { id: "o7", name: "Michael Jordan", email: "mike@courtside.com", role: "owner", status: "active", joinDate: "2023-11-11" },
  { id: "o8", name: "Emily Blunt", email: "emily@futurehomes.com", role: "owner", status: "suspended", joinDate: "2023-12-01" },
  { id: "o9", name: "Chris Evans", email: "chris@marvelous.com", role: "owner", status: "active", joinDate: "2024-01-15" },
  { id: "o10", name: "Jessica Chastain", email: "jessica@prime.com", role: "owner", status: "pending", joinDate: "2024-02-20" },
];

export const TENANTS: UserProfile[] = [
  { id: "t1", name: "Sarah Tenant", email: "tenant@inndos.com", role: "tenant", status: "active", joinDate: "2023-06-01" }, // Demo Tenant
  { id: "t2", name: "Tom Holland", email: "tom@spidey.com", role: "tenant", status: "active", joinDate: "2023-07-22" },
  { id: "t3", name: "Zendaya Coleman", email: "zendaya@dunemovie.com", role: "tenant", status: "active", joinDate: "2023-08-14" },
  { id: "t4", name: "Timothee Chalamet", email: "tim@wonka.com", role: "tenant", status: "pending", joinDate: "2023-09-05" },
  { id: "t5", name: "Florence Pugh", email: "flo@midsummer.com", role: "tenant", status: "active", joinDate: "2023-10-18" },
];

// --- MOCK PROPERTIES ---

const RENT_PROPERTIES: Property[] = [
  {
    id: "r1", ownerId: "o1", title: "Modern Downtown Apartment", type: "rent", price: 85000, address: "Westlands, Nairobi",
    specs: { beds: 2, baths: 2, sqft: 1200 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Gym", "Pool", "Security"]
  },
  {
    id: "r2", ownerId: "o2", title: "Cozy Studio Near Campus", type: "rent", price: 25000, address: "Juja, Nairobi",
    specs: { beds: 1, baths: 1, sqft: 400 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["WiFi", "Student Friendly"]
  },
  {
    id: "r3", ownerId: "o3", title: "Luxury 3BR Apartment", type: "rent", price: 150000, address: "Kilimani, Nairobi",
    specs: { beds: 3, baths: 3, sqft: 2000 }, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Backup Generator", "Elevator", "Pool"]
  },
  {
    id: "r4", ownerId: "o4", title: "Garden Flat in Lavington", type: "rent", price: 90000, address: "Lavington, Nairobi",
    specs: { beds: 2, baths: 2, sqft: 1400 }, image: "/images/modern_apartment_exterior.png", isVerified: false, tags: ["Garden", "Pet Friendly"]
  },
  {
    id: "r5", ownerId: "o5", title: "Serviced Apartment", type: "rent", price: 200000, address: "Gigiri, Nairobi",
    specs: { beds: 2, baths: 2, sqft: 1100 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Furnished", "Cleaning", "Gym"]
  },
  {
    id: "r6", ownerId: "o6", title: "Spacious Penthouse", type: "rent", price: 250000, address: "Kileleshwa, Nairobi",
    specs: { beds: 4, baths: 4, sqft: 3500 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["View", "Terrace", "Jacuzzi"]
  },
  {
    id: "r7", ownerId: "o7", title: "Affordable 1BR", type: "rent", price: 35000, address: "South B, Nairobi",
    specs: { beds: 1, baths: 1, sqft: 600 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Water 24/7", "Parking"]
  },
  {
    id: "r8", ownerId: "o1", title: "Family Home in Karen", type: "rent", price: 300000, address: "Karen, Nairobi",
    specs: { beds: 5, baths: 5, sqft: 5000 }, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Garden", "Gated Community", "DSQ"]
  },
  {
    id: "r9", ownerId: "o2", title: "Beachfront Condo", type: "rent", price: 120000, address: "Nyali, Mombasa",
    specs: { beds: 2, baths: 2, sqft: 1300 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Beach Access", "AC", "Pool"]
  },
  {
    id: "r10", ownerId: "o3", title: "City Center Loft", type: "rent", price: 60000, address: "CBD, Nairobi",
    specs: { beds: 1, baths: 1, sqft: 800 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Walk to Work", "Security"]
  },
];

const SALE_PROPERTIES: Property[] = [
  {
    id: "s1", ownerId: "o1", title: "Modern Townhouse", type: "sale", price: 25000000, address: "Lavington, Nairobi",
    specs: { beds: 4, baths: 4, sqft: 2800 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Gated", "New Build"]
  },
  {
    id: "s2", ownerId: "o4", title: "Prime Plot of Land", type: "sale", price: 8000000, address: "Ruiru, Kiambu",
    specs: { beds: 0, baths: 0, sqft: 5000 }, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Title Deed", "Ready to Build"]
  },
  {
    id: "s3", ownerId: "o5", title: "Luxury Villa in Muthaiga", type: "sale", price: 120000000, address: "Muthaiga, Nairobi",
    specs: { beds: 6, baths: 6, sqft: 8000 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Embassy Zone", "Pool", "High Security"]
  },
  {
    id: "s4", ownerId: "o6", title: "Apartment Block Investment", type: "sale", price: 450000000, address: "Kilimani, Nairobi",
    specs: { beds: 40, baths: 40, sqft: 20000 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Investment", "High Yield"]
  },
  {
    id: "s5", ownerId: "o7", title: "Cozy Bungalow", type: "sale", price: 14000000, address: "Syokimau, Nairobi",
    specs: { beds: 3, baths: 2, sqft: 1500 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Garden", "Quiet"]
  },
  {
    id: "s6", ownerId: "o8", title: "Off-Plan Apartment", type: "sale", price: 6500000, address: "Kasarani, Nairobi",
    specs: { beds: 2, baths: 2, sqft: 900 }, image: "/images/modern_apartment_exterior.png", isVerified: false, tags: ["Off Plan", "Payment Plan"]
  },
  {
    id: "s7", ownerId: "o9", title: "Executive Mansion", type: "sale", price: 85000000, address: "Runda, Nairobi",
    specs: { beds: 5, baths: 5, sqft: 6000 }, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Forest View", "Smart Home"]
  },
  {
    id: "s8", ownerId: "o10", title: "Holiday Home", type: "sale", price: 35000000, address: "Diani, Mombasa",
    specs: { beds: 3, baths: 3, sqft: 2200 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Beachfront", "Furnished"]
  },
  {
    id: "s9", ownerId: "o2", title: "Starter Apartment", type: "sale", price: 4500000, address: "Thika Road, Nairobi",
    specs: { beds: 2, baths: 1, sqft: 700 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Near Highway", "Parking"]
  },
  {
    id: "s10", ownerId: "o3", title: "Country Home", type: "sale", price: 40000000, address: "Naivasha, Kenya",
    specs: { beds: 4, baths: 4, sqft: 3500 }, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Golf Course", "Lake View"]
  },
];

export const PROPERTIES: Property[] = [...RENT_PROPERTIES, ...SALE_PROPERTIES];
