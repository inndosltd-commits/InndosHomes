import { db, users, properties } from "@workspace/db";
import bcrypt from "bcryptjs";

const DEMO_USERS = [
  { name: "Super Admin", email: "admin@inndos.com", password: "admin123", role: "admin" as const },
  { name: "John Landlord", email: "owner@inndos.com", password: "owner123", role: "owner" as const },
  { name: "Sarah Tenant", email: "tenant@inndos.com", password: "tenant123", role: "tenant" as const },
  { name: "Mama Safi", email: "host@inndos.com", password: "host123", role: "host" as const },
  { name: "John Traveler", email: "guest@inndos.com", password: "guest123", role: "guest" as const },
  // Extra owners
  { name: "Alice Smith", email: "alice@properties.com", password: "alice123", role: "owner" as const },
  { name: "Robert Chen", email: "bob@chenrealty.com", password: "bob123", role: "owner" as const },
  { name: "Maria Garcia", email: "maria@homes.com", password: "maria123", role: "owner" as const },
  // Extra host
  { name: "Safari Stays", email: "safari@stays.com", password: "safari123", role: "host" as const },
];

async function seed() {
  console.log("Seeding database...");

  // Hash passwords and insert users
  const seededUsers: { id: string; email: string; role: string }[] = [];
  for (const u of DEMO_USERS) {
    const hashed = await bcrypt.hash(u.password, 10);
    const [user] = await db
      .insert(users)
      .values({ name: u.name, email: u.email, password: hashed, role: u.role })
      .onConflictDoNothing()
      .returning({ id: users.id, email: users.email, role: users.role });
    if (user) seededUsers.push(user);
  }

  const allUsers = await db.select({ id: users.id, email: users.email, role: users.role }).from(users);
  const byEmail = Object.fromEntries(allUsers.map(u => [u.email, u.id]));

  const ownerId = byEmail["owner@inndos.com"];
  const aliceId = byEmail["alice@properties.com"];
  const bobId = byEmail["bob@chenrealty.com"];
  const mariaId = byEmail["maria@homes.com"];
  const hostId = byEmail["host@inndos.com"];
  const safariId = byEmail["safari@stays.com"];

  const PROPERTIES = [
    // --- BNB ---
    { ownerId: hostId, title: "Cozy Garden Cottage", type: "bnb" as const, price: 6500, address: "Karen, Nairobi", beds: 1, baths: 1, sqft: 400, guests: 2, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["WiFi", "Breakfast", "Garden", "Cabins"], lat: "-1.319", lng: "36.706" },
    { ownerId: hostId, title: "Urban Rooftop Studio", type: "bnb" as const, price: 9500, address: "Kilimani, Nairobi", beds: 1, baths: 1, sqft: 350, guests: 2, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["View", "Gym Access", "WiFi", "Tiny Homes"], lat: "-1.292", lng: "36.786" },
    { ownerId: safariId, title: "Safari Lodge Room", type: "bnb" as const, price: 19500, address: "Nairobi National Park", beds: 2, baths: 2, sqft: 600, guests: 4, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Wildlife", "Pool", "Full Board", "Amazing Pools"], lat: "-1.361", lng: "36.845" },
    { ownerId: safariId, title: "Quiet Home Office Space", type: "bnb" as const, price: 4000, address: "Lavington, Nairobi", beds: 0, baths: 1, sqft: 200, guests: 5, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Desk", "High Speed WiFi", "Coffee", "Tiny Homes"], lat: "-1.275", lng: "36.766" },
    { ownerId: hostId, title: "Lakeside Log Cabin", type: "bnb" as const, price: 15500, address: "Naivasha", beds: 2, baths: 1, sqft: 600, guests: 4, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Cabins", "Lakefront", "Nature"], lat: "-0.71", lng: "36.43" },
    { ownerId: safariId, title: "Ocean View Villa", type: "bnb" as const, price: 25000, address: "Watamu", beds: 4, baths: 3, sqft: 1500, guests: 8, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Beachfront", "Amazing Pools", "Mansions"], lat: "-4.35", lng: "39.57" },
    // --- RENT ---
    { ownerId: ownerId, title: "Modern Downtown Apartment", type: "rent" as const, price: 85000, address: "Westlands, Nairobi", beds: 2, baths: 2, sqft: 1200, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Gym", "Pool", "Security"], lat: "-1.268", lng: "36.806" },
    { ownerId: aliceId, title: "Cozy Studio Near Campus", type: "rent" as const, price: 25000, address: "Juja, Nairobi", beds: 1, baths: 1, sqft: 400, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["WiFi", "Student Friendly"], lat: "-1.102", lng: "37.013" },
    { ownerId: bobId, title: "Luxury 3BR Apartment", type: "rent" as const, price: 150000, address: "Kilimani, Nairobi", beds: 3, baths: 3, sqft: 2000, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Backup Generator", "Elevator", "Pool"], lat: "-1.293", lng: "36.787" },
    { ownerId: mariaId, title: "Garden Flat in Lavington", type: "rent" as const, price: 90000, address: "Lavington, Nairobi", beds: 2, baths: 2, sqft: 1400, image: "/images/modern_apartment_exterior.png", isVerified: false, tags: ["Garden", "Pet Friendly"], lat: "-1.277", lng: "36.767" },
    { ownerId: ownerId, title: "Family Home in Karen", type: "rent" as const, price: 300000, address: "Karen, Nairobi", beds: 5, baths: 5, sqft: 5000, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Garden", "Gated Community", "DSQ"], lat: "-1.320", lng: "36.707" },
    { ownerId: aliceId, title: "Beachfront Condo", type: "rent" as const, price: 120000, address: "Nyali, Mombasa", beds: 2, baths: 2, sqft: 1300, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Beach Access", "AC", "Pool"], lat: "-4.043", lng: "39.702" },
    // --- SALE ---
    { ownerId: ownerId, title: "Modern Townhouse", type: "sale" as const, price: 25000000, address: "Lavington, Nairobi", beds: 4, baths: 4, sqft: 2800, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Gated", "New Build"], lat: "-1.276", lng: "36.768" },
    { ownerId: mariaId, title: "Prime Plot of Land", type: "sale" as const, price: 8000000, address: "Ruiru, Kiambu", beds: 0, baths: 0, sqft: 5000, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Title Deed", "Ready to Build"], lat: "-1.146", lng: "36.960" },
    { ownerId: bobId, title: "Luxury Villa in Muthaiga", type: "sale" as const, price: 120000000, address: "Muthaiga, Nairobi", beds: 6, baths: 6, sqft: 8000, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Embassy Zone", "Pool", "High Security"], lat: "-1.250", lng: "36.830" },
    { ownerId: aliceId, title: "Starter Apartment", type: "sale" as const, price: 4500000, address: "Thika Road, Nairobi", beds: 2, baths: 1, sqft: 700, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Near Highway", "Parking"], lat: "-1.240", lng: "36.865" },
    // --- HOTEL ---
    { ownerId: hostId, title: "Luxury City Hotel", type: "hotel" as const, price: 15000, address: "Westlands, Nairobi", beds: 1, baths: 1, sqft: 350, guests: 2, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Room Service", "Pool", "Gym"], lat: "-1.265", lng: "36.802" },
    { ownerId: safariId, title: "Boutique Business Hotel", type: "hotel" as const, price: 12000, address: "Upper Hill, Nairobi", beds: 1, baths: 1, sqft: 300, guests: 2, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Conference", "Restaurant", "WiFi"], lat: "-1.298", lng: "36.815" },
    { ownerId: safariId, title: "Resort & Spa", type: "hotel" as const, price: 25000, address: "Diani, Mombasa", beds: 2, baths: 1, sqft: 450, guests: 3, image: "/images/modern_apartment_exterior.png", isVerified: true, tags: ["Beachfront", "Spa", "All-Inclusive"], lat: "-4.279", lng: "39.593" },
    // --- HOSTEL ---
    { ownerId: hostId, title: "Downtown Backpackers", type: "hostel" as const, price: 1500, address: "Nairobi CBD", beds: 1, baths: 4, sqft: 150, guests: 1, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Bunk Beds", "Shared Kitchen", "Social Area", "Free WiFi"], lat: "-1.283", lng: "36.816" },
    { ownerId: safariId, title: "Oasis Youth Hostel", type: "hostel" as const, price: 2500, address: "Westlands, Nairobi", beds: 1, baths: 2, sqft: 200, guests: 1, image: "/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Private Pods", "Bar", "Pool", "Events"], lat: "-1.267", lng: "36.805" },
    { ownerId: hostId, title: "Beach Bums Hostel", type: "hostel" as const, price: 3000, address: "Diani, Mombasa", beds: 1, baths: 8, sqft: 250, guests: 1, image: "/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Beachfront", "Surf Lessons", "Hammocks", "Barbecue"], lat: "-4.285", lng: "39.590" },
  ];

  for (const p of PROPERTIES) {
    if (!p.ownerId) continue;
    await db.insert(properties).values(p).onConflictDoNothing();
  }

  console.log(`Seeded ${DEMO_USERS.length} users and ${PROPERTIES.length} properties.`);
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
