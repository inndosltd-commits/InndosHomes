import { Building2, Home, MapPin, BedDouble, Bath, Square } from "lucide-react";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "owner" | "tenant" | "admin" | "host" | "guest";
  avatar?: string;
  status: "active" | "pending" | "suspended";
  joinDate: string;
}

export interface Property {
  id: string;
  ownerId: string; // Link to owner/host
  title: string;
  type: "rent" | "sale" | "bnb" | "hotel" | "hostel";
  price: number;
  address: string;
  specs: {
    beds: number;
    baths: number;
    sqft: number;
    guests?: number; // specific for bnb/hotel
  };
  image: string;
  isVerified?: boolean;
  tags: string[];
  location?: { lat: number; lng: number }; // For map pins
}

// --- MOCK USERS ---

export const ADMINS: UserProfile[] = [
  { id: "admin1", name: "Super Admin", email: "admin@inndos.com", role: "admin", status: "active", joinDate: "2023-01-01" }
];

export const HOSTS: UserProfile[] = [
  { id: "h1", name: "Mama Safi", email: "host@inndos.com", role: "host", status: "active", joinDate: "2023-04-10" },
  { id: "h2", name: "Safari Stays", email: "safari@stays.com", role: "host", status: "active", joinDate: "2023-05-22" },
];

export const GUESTS: UserProfile[] = [
  { id: "g1", name: "John Traveler", email: "guest@inndos.com", role: "guest", status: "active", joinDate: "2023-06-15" }
];

export const OWNERS: UserProfile[] = [
  { id: "o1", name: "John Landlord", email: "owner@inndos.com", role: "owner", status: "active", joinDate: "2023-05-15" }, // Demo Owner
  { id: "o2", name: "Alice Smith", email: "alice@properties.com", role: "owner", status: "active", joinDate: "2023-06-20" },
  { id: "o3", name: "Robert Chen", email: "bob@chenrealty.com", role: "owner", status: "active", joinDate: "2023-07-10" },
  { id: "o4", name: "Maria Garcia", email: "maria@homes.com", role: "owner", status: "active", joinDate: "2023-08-05" },
  { id: "o5", name: "David Kim", email: "david@investments.com", role: "owner", status: "active", joinDate: "2023-09-12" },
  { id: "o6", name: "Sarah Connor", email: "sarah@skyline.com", role: "owner", status: "active", joinDate: "2023-10-30" },
  { id: "o7", name: "Michael Jordan", email: "mike@courtside.com", role: "owner", status: "active", joinDate: "2023-11-11" },
  { id: "o8", name: "Emily Blunt", email: "emily@futurehomes.com", role: "owner", status: "suspended", joinDate: "2023-12-01" },
  { id: "o9", name: "Chris Evans", email: "chris@marvelous.com", role: "owner", status: "active", joinDate: "2024-01-15" },
  { id: "o10", name: "Jessica Chastain", email: "jessica@prime.com", role: "owner", status: "active", joinDate: "2024-02-20" },
];

export const TENANTS: UserProfile[] = [
  { id: "t1", name: "Sarah Tenant", email: "tenant@inndos.com", role: "tenant", status: "active", joinDate: "2023-06-01" }, // Demo Tenant
  { id: "t2", name: "Tom Holland", email: "tom@spidey.com", role: "tenant", status: "active", joinDate: "2023-07-22" },
  { id: "t3", name: "Zendaya Coleman", email: "zendaya@dunemovie.com", role: "tenant", status: "active", joinDate: "2023-08-14" },
  { id: "t4", name: "Timothee Chalamet", email: "tim@wonka.com", role: "tenant", status: "active", joinDate: "2023-09-05" },
  { id: "t5", name: "Florence Pugh", email: "flo@midsummer.com", role: "tenant", status: "active", joinDate: "2023-10-18" },
];

// --- MOCK PROPERTIES ---

const BNB_LISTINGS: Property[] = [
  {
    id: "b1", ownerId: "h1", title: "Cozy Garden Cottage", type: "bnb", price: 6500, address: "Karen, Nairobi",
    specs: { beds: 1, baths: 1, sqft: 400, guests: 2 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["WiFi", "Breakfast", "Garden", "Cabins"],
    location: { lat: -1.319, lng: 36.706 }
  },
  {
    id: "b2", ownerId: "h1", title: "Urban Rooftop Studio", type: "bnb", price: 9500, address: "Kilimani, Nairobi",
    specs: { beds: 1, baths: 1, sqft: 350, guests: 2 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["View", "Gym Access", "WiFi", "Tiny Homes"],
    location: { lat: -1.292, lng: 36.786 }
  },
  {
    id: "b3", ownerId: "h2", title: "Safari Lodge Room", type: "bnb", price: 19500, address: "Nairobi National Park",
    specs: { beds: 2, baths: 2, sqft: 600, guests: 4 }, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Wildlife", "Pool", "Full Board", "Amazing Pools"],
    location: { lat: -1.361, lng: 36.845 }
  },
  {
    id: "b4", ownerId: "h2", title: "Quiet Home Office Space", type: "bnb", price: 4000, address: "Lavington, Nairobi",
    specs: { beds: 0, baths: 1, sqft: 200, guests: 5 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Desk", "High Speed WiFi", "Coffee", "Tiny Homes"],
    location: { lat: -1.275, lng: 36.766 }
  },
  {
    id: "b5", ownerId: "h1", title: "Meeting Room for 10", type: "bnb", price: 13000, address: "Westlands, Nairobi",
    specs: { beds: 0, baths: 2, sqft: 500, guests: 10 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Projector", "Whiteboard", "AC"],
    location: { lat: -1.268, lng: 36.804 }
  },
  {
    id: "b6", ownerId: "h2", title: "Luxury Guest Wing", type: "bnb", price: 12000, address: "Runda, Nairobi",
    specs: { beds: 2, baths: 1, sqft: 800, guests: 3 }, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Private Entrance", "Security", "Garden", "Mansions"],
    location: { lat: -1.218, lng: 36.812 }
  },
  {
    id: "b7", ownerId: "h1", title: "Backpacker's Bunk", type: "bnb", price: 2000, address: "Nairobi CBD",
    specs: { beds: 1, baths: 4, sqft: 100, guests: 1 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: false, tags: ["Shared Kitchen", "Social", "Central"],
    location: { lat: -1.286, lng: 36.817 }
  },
  {
    id: "b8", ownerId: "h2", title: "Airport Transit Stay", type: "bnb", price: 5500, address: "Syokimau, Nairobi",
    specs: { beds: 1, baths: 1, sqft: 300, guests: 2 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Near Airport", "Transfer", "24/7 Check-in"],
    location: { lat: -1.357, lng: 36.932 }
  },
  {
    id: "b9", ownerId: "h1", title: "Lakeside Log Cabin", type: "bnb", price: 15500, address: "Naivasha",
    specs: { beds: 2, baths: 1, sqft: 600, guests: 4 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Cabins", "Lakefront", "Nature"],
    location: { lat: -0.71, lng: 36.43 }
  },
  {
    id: "b10", ownerId: "h2", title: "Organic Farm Stay", type: "bnb", price: 8000, address: "Limuru",
    specs: { beds: 3, baths: 2, sqft: 800, guests: 6 }, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Farms", "Animals", "Breakfast"],
    location: { lat: -1.1, lng: 36.64 }
  },
  {
    id: "b11", ownerId: "h1", title: "Ocean View Villa", type: "bnb", price: 25000, address: "Watamu",
    specs: { beds: 4, baths: 3, sqft: 1500, guests: 8 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Beachfront", "Amazing Pools", "Mansions"],
    location: { lat: -4.35, lng: 39.57 }
  }
];

const RENT_PROPERTIES: Property[] = [
  {
    id: "r1", ownerId: "o1", title: "Modern Downtown Apartment", type: "rent", price: 85000, address: "Westlands, Nairobi",
    specs: { beds: 2, baths: 2, sqft: 1200 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Gym", "Pool", "Security"],
    location: { lat: -1.268, lng: 36.806 }
  },
  {
    id: "r2", ownerId: "o2", title: "Cozy Studio Near Campus", type: "rent", price: 25000, address: "Juja, Nairobi",
    specs: { beds: 1, baths: 1, sqft: 400 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["WiFi", "Student Friendly"],
    location: { lat: -1.102, lng: 37.013 }
  },
  {
    id: "r3", ownerId: "o3", title: "Luxury 3BR Apartment", type: "rent", price: 150000, address: "Kilimani, Nairobi",
    specs: { beds: 3, baths: 3, sqft: 2000 }, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Backup Generator", "Elevator", "Pool"],
    location: { lat: -1.293, lng: 36.787 }
  },
  {
    id: "r4", ownerId: "o4", title: "Garden Flat in Lavington", type: "rent", price: 90000, address: "Lavington, Nairobi",
    specs: { beds: 2, baths: 2, sqft: 1400 }, image: "/images/modern_apartment_exterior.png", isVerified: false, tags: ["Garden", "Pet Friendly"],
    location: { lat: -1.277, lng: 36.767 }
  },
  {
    id: "r5", ownerId: "o5", title: "Serviced Apartment", type: "rent", price: 200000, address: "Gigiri, Nairobi",
    specs: { beds: 2, baths: 2, sqft: 1100 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Furnished", "Cleaning", "Gym"],
    location: { lat: -1.233, lng: 36.805 }
  },
  {
    id: "r6", ownerId: "o6", title: "Spacious Penthouse", type: "rent", price: 250000, address: "Kileleshwa, Nairobi",
    specs: { beds: 4, baths: 4, sqft: 3500 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["View", "Terrace", "Jacuzzi"],
    location: { lat: -1.282, lng: 36.782 }
  },
  {
    id: "r7", ownerId: "o7", title: "Affordable 1BR", type: "rent", price: 35000, address: "South B, Nairobi",
    specs: { beds: 1, baths: 1, sqft: 600 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Water 24/7", "Parking"],
    location: { lat: -1.309, lng: 36.833 }
  },
  {
    id: "r8", ownerId: "o1", title: "Family Home in Karen", type: "rent", price: 300000, address: "Karen, Nairobi",
    specs: { beds: 5, baths: 5, sqft: 5000 }, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Garden", "Gated Community", "DSQ"],
    location: { lat: -1.320, lng: 36.707 }
  },
  {
    id: "r9", ownerId: "o2", title: "Beachfront Condo", type: "rent", price: 120000, address: "Nyali, Mombasa",
    specs: { beds: 2, baths: 2, sqft: 1300 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Beach Access", "AC", "Pool"],
    location: { lat: -4.043, lng: 39.702 }
  },
  {
    id: "r10", ownerId: "o3", title: "City Center Loft", type: "rent", price: 60000, address: "CBD, Nairobi",
    specs: { beds: 1, baths: 1, sqft: 800 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Walk to Work", "Security"],
    location: { lat: -1.286, lng: 36.822 }
  },
];

const SALE_PROPERTIES: Property[] = [
  {
    id: "s1", ownerId: "o1", title: "Modern Townhouse", type: "sale", price: 25000000, address: "Lavington, Nairobi",
    specs: { beds: 4, baths: 4, sqft: 2800 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Gated", "New Build"],
    location: { lat: -1.276, lng: 36.768 }
  },
  {
    id: "s2", ownerId: "o4", title: "Prime Plot of Land", type: "sale", price: 8000000, address: "Ruiru, Kiambu",
    specs: { beds: 0, baths: 0, sqft: 5000 }, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Title Deed", "Ready to Build"],
    location: { lat: -1.146, lng: 36.960 }
  },
  {
    id: "s3", ownerId: "o5", title: "Luxury Villa in Muthaiga", type: "sale", price: 120000000, address: "Muthaiga, Nairobi",
    specs: { beds: 6, baths: 6, sqft: 8000 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Embassy Zone", "Pool", "High Security"],
    location: { lat: -1.250, lng: 36.830 }
  },
  {
    id: "s4", ownerId: "o6", title: "Apartment Block Investment", type: "sale", price: 450000000, address: "Kilimani, Nairobi",
    specs: { beds: 40, baths: 40, sqft: 20000 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Investment", "High Yield"],
    location: { lat: -1.294, lng: 36.789 }
  },
  {
    id: "s5", ownerId: "o7", title: "Cozy Bungalow", type: "sale", price: 14000000, address: "Syokimau, Nairobi",
    specs: { beds: 3, baths: 2, sqft: 1500 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Garden", "Quiet"],
    location: { lat: -1.358, lng: 36.935 }
  },
  {
    id: "s6", ownerId: "o8", title: "Off-Plan Apartment", type: "sale", price: 6500000, address: "Kasarani, Nairobi",
    specs: { beds: 2, baths: 2, sqft: 900 }, image: "/images/modern_apartment_exterior.png", isVerified: false, tags: ["Off Plan", "Payment Plan"],
    location: { lat: -1.220, lng: 36.895 }
  },
  {
    id: "s7", ownerId: "o9", title: "Executive Mansion", type: "sale", price: 85000000, address: "Runda, Nairobi",
    specs: { beds: 5, baths: 5, sqft: 6000 }, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Forest View", "Smart Home"],
    location: { lat: -1.219, lng: 36.814 }
  },
  {
    id: "s8", ownerId: "o10", title: "Holiday Home", type: "sale", price: 35000000, address: "Diani, Mombasa",
    specs: { beds: 3, baths: 3, sqft: 2200 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Beachfront", "Furnished"],
    location: { lat: -4.295, lng: 39.585 }
  },
  {
    id: "s9", ownerId: "o2", title: "Starter Apartment", type: "sale", price: 4500000, address: "Thika Road, Nairobi",
    specs: { beds: 2, baths: 1, sqft: 700 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Near Highway", "Parking"],
    location: { lat: -1.240, lng: 36.865 }
  },
  {
    id: "s10", ownerId: "o3", title: "Country Home", type: "sale", price: 40000000, address: "Naivasha, Kenya",
    specs: { beds: 4, baths: 4, sqft: 3500 }, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Golf Course", "Lake View"],
    location: { lat: -0.717, lng: 36.431 }
  },
];

const HOTEL_LISTINGS: Property[] = [
  {
    id: "h1", ownerId: "h1", title: "Luxury City Hotel", type: "hotel", price: 15000, address: "Westlands, Nairobi",
    specs: { beds: 1, baths: 1, sqft: 350, guests: 2 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Room Service", "Pool", "Gym"],
    location: { lat: -1.265, lng: 36.802 }
  },
  {
    id: "h2", ownerId: "h2", title: "Boutique Business Hotel", type: "hotel", price: 12000, address: "Upper Hill, Nairobi",
    specs: { beds: 1, baths: 1, sqft: 300, guests: 2 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Conference", "Restaurant", "WiFi"],
    location: { lat: -1.298, lng: 36.815 }
  },
  {
    id: "h3", ownerId: "h1", title: "Airport Transit Hotel", type: "hotel", price: 8000, address: "Mombasa Road, Nairobi",
    specs: { beds: 1, baths: 1, sqft: 250, guests: 2 }, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Shuttle", "24/7 Dining", "Express Check-in"],
    location: { lat: -1.332, lng: 36.865 }
  },
  {
    id: "h4", ownerId: "h2", title: "Resort & Spa", type: "hotel", price: 25000, address: "Diani, Mombasa",
    specs: { beds: 2, baths: 1, sqft: 450, guests: 3 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Beachfront", "Spa", "All-Inclusive"],
    location: { lat: -4.279, lng: 39.593 }
  }
];

const HOSTEL_LISTINGS: Property[] = [
  {
    id: "ho1", ownerId: "h1", title: "Downtown Backpackers", type: "hostel", price: 1500, address: "Nairobi CBD",
    specs: { beds: 1, baths: 4, sqft: 150, guests: 1 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Bunk Beds", "Shared Kitchen", "Social Area", "Free WiFi"],
    location: { lat: -1.283, lng: 36.816 }
  },
  {
    id: "ho2", ownerId: "h2", title: "Oasis Youth Hostel", type: "hostel", price: 2500, address: "Westlands, Nairobi",
    specs: { beds: 1, baths: 2, sqft: 200, guests: 1 }, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Private Pods", "Bar", "Pool", "Events"],
    location: { lat: -1.267, lng: 36.805 }
  },
  {
    id: "ho3", ownerId: "h1", title: "Eco-Friendly Hostel", type: "hostel", price: 1800, address: "Karen, Nairobi",
    specs: { beds: 1, baths: 6, sqft: 180, guests: 1 }, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Garden", "Organic Breakfast", "Bicycle Rental", "Quiet"],
    location: { lat: -1.321, lng: 36.705 }
  },
  {
    id: "ho4", ownerId: "h2", title: "Beach Bums Hostel", type: "hostel", price: 3000, address: "Diani, Mombasa",
    specs: { beds: 1, baths: 8, sqft: 250, guests: 1 }, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Beachfront", "Surf Lessons", "Hammocks", "Barbecue"],
    location: { lat: -4.285, lng: 39.590 }
  }
];

export const PROPERTIES: Property[] = [...RENT_PROPERTIES, ...SALE_PROPERTIES, ...BNB_LISTINGS, ...HOTEL_LISTINGS, ...HOSTEL_LISTINGS];
