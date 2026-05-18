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
    { ownerId: hostId, title: "Cozy Garden Cottage", type: "bnb" as const, price: 6500, address: "Karen, Nairobi", beds: 1, baths: 1, sqft: 400, guests: 2, image: "/api/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["WiFi", "Breakfast", "Garden", "Cabins"], lat: "-1.319", lng: "36.706", description: "A charming one-bedroom cottage nestled in a lush Karen garden. Wake up to birdsong, enjoy a homemade breakfast on the veranda, and unwind in complete peace just 20 minutes from Nairobi CBD. Ideal for couples seeking a quiet retreat." },
    { ownerId: hostId, title: "Urban Rooftop Studio", type: "bnb" as const, price: 9500, address: "Kilimani, Nairobi", beds: 1, baths: 1, sqft: 350, guests: 2, image: "/api/images/modern_apartment_exterior.png", isVerified: true, tags: ["View", "Gym Access", "WiFi", "Tiny Homes"], lat: "-1.292", lng: "36.786", description: "A sleek studio perched on a Kilimani rooftop with sweeping city views. The open-plan space features floor-to-ceiling windows, high-speed WiFi, and gym access. Perfect for solo travelers or couples who want to be in the heart of Nairobi." },
    { ownerId: safariId, title: "Safari Lodge Room", type: "bnb" as const, price: 19500, address: "Nairobi National Park", beds: 2, baths: 2, sqft: 600, guests: 4, image: "/api/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Wildlife", "Pool", "Full Board", "Amazing Pools"], lat: "-1.361", lng: "36.845", description: "Fall asleep to the sounds of the wild in this beautifully appointed lodge room bordering Nairobi National Park. Full-board meals, an infinity pool, and guided morning game drives are included. A once-in-a-lifetime experience just minutes from the city." },
    { ownerId: safariId, title: "Quiet Home Office Space", type: "bnb" as const, price: 4000, address: "Lavington, Nairobi", beds: 0, baths: 1, sqft: 200, guests: 5, image: "/api/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Desk", "High Speed WiFi", "Coffee", "Tiny Homes"], lat: "-1.275", lng: "36.766", description: "A dedicated, distraction-free work pod in a quiet Lavington home. Equipped with a standing desk, ergonomic chair, ultra-fast fibre WiFi, and a coffee station. Great for remote workers, freelancers, or small teams needing a professional space by the day." },
    { ownerId: hostId, title: "Lakeside Log Cabin", type: "bnb" as const, price: 15500, address: "Naivasha", beds: 2, baths: 1, sqft: 600, guests: 4, image: "/api/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Cabins", "Lakefront", "Nature"], lat: "-0.71", lng: "36.43", description: "A hand-crafted log cabin sitting right on the shores of Lake Naivasha. Two cozy bedrooms, a wraparound deck perfect for sundowners, and direct access to boat hire and hippo-watching. An ideal weekend escape for families or groups of four." },
    { ownerId: safariId, title: "Ocean View Villa", type: "bnb" as const, price: 25000, address: "Watamu", beds: 4, baths: 3, sqft: 1500, guests: 8, image: "/api/images/modern_apartment_exterior.png", isVerified: true, tags: ["Beachfront", "Amazing Pools", "Mansions"], lat: "-4.35", lng: "39.57", description: "A stunning four-bedroom villa steps from Watamu's white-sand beach. Enjoy a private infinity pool, panoramic Indian Ocean views, and nightly catered dinners. Spacious enough for large families or friend groups looking for a luxury coastal getaway." },
    // --- RENT ---
    { ownerId: ownerId, title: "Modern Downtown Apartment", type: "rent" as const, price: 85000, address: "Westlands, Nairobi", beds: 2, baths: 2, sqft: 1200, image: "/api/images/modern_apartment_exterior.png", isVerified: true, tags: ["Gym", "Pool", "Security"], lat: "-1.268", lng: "36.806", description: "A bright, fully-finished two-bedroom apartment in one of Westlands' most sought-after blocks. The open-plan kitchen and living area flows onto a private balcony. Residents enjoy a rooftop pool, fully-equipped gym, and 24/7 manned security." },
    { ownerId: aliceId, title: "Cozy Studio Near Campus", type: "rent" as const, price: 25000, address: "Juja, Nairobi", beds: 1, baths: 1, sqft: 400, image: "/api/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["WiFi", "Student Friendly"], lat: "-1.102", lng: "37.013", description: "A compact, well-maintained studio just five minutes' walk from JKUAT. All utilities are included in the rent, with high-speed WiFi already installed. The building has a shared common area and secure bike storage — ideal for students and young professionals." },
    { ownerId: bobId, title: "Luxury 3BR Apartment", type: "rent" as const, price: 150000, address: "Kilimani, Nairobi", beds: 3, baths: 3, sqft: 2000, image: "/api/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Backup Generator", "Elevator", "Pool"], lat: "-1.293", lng: "36.787", description: "A premium three-bedroom apartment in a landmark Kilimani tower. The expansive living space is fitted with imported finishes, a gourmet kitchen, and en-suite bathrooms in every bedroom. The complex features a swimming pool, elevator, and full backup power generation." },
    { ownerId: mariaId, title: "Garden Flat in Lavington", type: "rent" as const, price: 90000, address: "Lavington, Nairobi", beds: 2, baths: 2, sqft: 1400, image: "/api/images/modern_apartment_exterior.png", isVerified: false, tags: ["Garden", "Pet Friendly"], lat: "-1.277", lng: "36.767", description: "A spacious ground-floor flat with its own private garden in a serene Lavington compound. The two bedrooms are generously sized, and the large outdoor space is perfect for entertaining. Pets are warmly welcome here — a rare find in Nairobi." },
    { ownerId: ownerId, title: "Family Home in Karen", type: "rent" as const, price: 300000, address: "Karen, Nairobi", beds: 5, baths: 5, sqft: 5000, image: "/api/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Garden", "Gated Community", "DSQ"], lat: "-1.320", lng: "36.707", description: "An expansive five-bedroom family home in a prestigious Karen gated community. Set on a half-acre garden with mature trees, the property includes a DSQ, large entertainment terrace, and ample parking. Top international schools are within a short drive." },
    { ownerId: aliceId, title: "Beachfront Condo", type: "rent" as const, price: 120000, address: "Nyali, Mombasa", beds: 2, baths: 2, sqft: 1300, image: "/api/images/modern_apartment_exterior.png", isVerified: true, tags: ["Beach Access", "AC", "Pool"], lat: "-4.043", lng: "39.702", description: "A beautifully furnished two-bedroom condo with direct beach access in Nyali's most desirable stretch. Both bedrooms are fully air-conditioned, and the complex has a beachside pool and 24-hour security. Perfect for those who want sea air and city convenience." },
    // --- SALE ---
    { ownerId: ownerId, title: "Modern Townhouse", type: "sale" as const, price: 25000000, address: "Lavington, Nairobi", beds: 4, baths: 4, sqft: 2800, image: "/api/images/modern_apartment_exterior.png", isVerified: true, tags: ["Gated", "New Build"], lat: "-1.276", lng: "36.768", description: "A brand-new four-bedroom townhouse in a boutique gated development in Lavington. High ceilings, imported Italian tiles, and a private rooftop terrace set this property apart. Energy-efficient construction with solar water heating and a one-year defects warranty included." },
    { ownerId: mariaId, title: "Prime Plot of Land", type: "sale" as const, price: 8000000, address: "Ruiru, Kiambu", beds: 0, baths: 0, sqft: 5000, image: "/api/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Title Deed", "Ready to Build"], lat: "-1.146", lng: "36.960", description: "A level, 0.5-acre plot in a fast-growing Ruiru estate with clean title deed ready for transfer. All infrastructure — water, power, and tarmac road — is already in place. An excellent opportunity for residential development or long-term land banking close to Thika Road." },
    { ownerId: bobId, title: "Luxury Villa in Muthaiga", type: "sale" as const, price: 120000000, address: "Muthaiga, Nairobi", beds: 6, baths: 6, sqft: 8000, image: "/api/images/modern_apartment_exterior.png", isVerified: true, tags: ["Embassy Zone", "Pool", "High Security"], lat: "-1.250", lng: "36.830", description: "An iconic six-bedroom villa in Nairobi's most exclusive embassy-row neighborhood. The property features manicured gardens, a heated pool, a home cinema, and a state-of-the-art security system. Rarely available — a true trophy asset for the discerning buyer." },
    { ownerId: aliceId, title: "Starter Apartment", type: "sale" as const, price: 4500000, address: "Thika Road, Nairobi", beds: 2, baths: 1, sqft: 700, image: "/api/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Near Highway", "Parking"], lat: "-1.240", lng: "36.865", description: "An affordable two-bedroom apartment offering excellent value on Thika Road. The unit is in a well-managed block with ample parking and easy highway access. Suitable for first-time buyers or buy-to-let investors looking for strong rental yields in a high-demand corridor." },
    // --- HOTEL ---
    { ownerId: hostId, title: "Luxury City Hotel", type: "hotel" as const, price: 15000, address: "Westlands, Nairobi", beds: 1, baths: 1, sqft: 350, guests: 2, image: "/api/images/modern_apartment_exterior.png", isVerified: true, tags: ["Room Service", "Pool", "Gym"], lat: "-1.265", lng: "36.802", description: "A five-star city hotel in the heart of Westlands offering plush king-size rooms, 24-hour in-room dining, and stunning skyline views. Guests enjoy complimentary access to a heated rooftop pool and a fully-equipped fitness center. Ideal for business and leisure travelers alike." },
    { ownerId: safariId, title: "Boutique Business Hotel", type: "hotel" as const, price: 12000, address: "Upper Hill, Nairobi", beds: 1, baths: 1, sqft: 300, guests: 2, image: "/api/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Conference", "Restaurant", "WiFi"], lat: "-1.298", lng: "36.815", description: "A smart boutique hotel tailored for business travelers in Upper Hill — Nairobi's financial district. Each room is equipped with a work desk, high-speed WiFi, and blackout curtains. The on-site restaurant serves continental and Kenyan cuisine, and conference facilities are available." },
    { ownerId: safariId, title: "Resort & Spa", type: "hotel" as const, price: 25000, address: "Diani, Mombasa", beds: 2, baths: 1, sqft: 450, guests: 3, image: "/api/images/modern_apartment_exterior.png", isVerified: true, tags: ["Beachfront", "Spa", "All-Inclusive"], lat: "-4.279", lng: "39.593", description: "An all-inclusive beachfront resort on Diani's pristine coastline. The rate covers all meals, non-motorized water sports, and unlimited spa treatments. Spacious ocean-view suites, multiple pools, and nightly entertainment make this a complete holiday experience for the whole family." },
    // --- HOSTEL ---
    { ownerId: hostId, title: "Downtown Backpackers", type: "hostel" as const, price: 1500, address: "Nairobi CBD", beds: 1, baths: 4, sqft: 150, guests: 1, image: "/api/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Bunk Beds", "Shared Kitchen", "Social Area", "Free WiFi"], lat: "-1.283", lng: "36.816", description: "A vibrant, social hostel right in the CBD — the best base for exploring Nairobi on a budget. Clean bunk-bed dorms, a well-equipped shared kitchen, a cozy lounge with board games, and free WiFi throughout. Lockers are provided, and the friendly staff can arrange city tours and onward transport." },
    { ownerId: safariId, title: "Oasis Youth Hostel", type: "hostel" as const, price: 2500, address: "Westlands, Nairobi", beds: 1, baths: 2, sqft: 200, guests: 1, image: "/api/images/modern_happy_family_moving_into_new_home.png", isVerified: true, tags: ["Private Pods", "Bar", "Pool", "Events"], lat: "-1.267", lng: "36.805", description: "More than just a bed — Oasis is a community. Private sleeping pods offer privacy without the price of a hotel room. A rooftop bar, small pool, regular events (quiz nights, movie screenings), and a prime Westlands location make this the liveliest hostel in Nairobi." },
    { ownerId: hostId, title: "Beach Bums Hostel", type: "hostel" as const, price: 3000, address: "Diani, Mombasa", beds: 1, baths: 8, sqft: 250, guests: 1, image: "/api/images/cozy_modern_bedroom_interior.png", isVerified: true, tags: ["Beachfront", "Surf Lessons", "Hammocks", "Barbecue"], lat: "-4.285", lng: "39.590", description: "The ultimate chill-out spot on Diani Beach. Breezy dorms open onto a hammock garden steps from the ocean. Daily surf lessons, beach barbecues, and a relaxed communal vibe make this the place where budget travelers end up staying far longer than planned." },
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
