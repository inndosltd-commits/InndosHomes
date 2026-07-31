/**
 * Shared amenity label map.
 * Source of truth: the amenity arrays in AddListing.tsx.
 * Used by PropertyDetails.tsx and PropertyCard.tsx to resolve stored IDs
 * (e.g. "apt_prem_elevator") to human-readable labels ("Elevator (lift)").
 */

const ALL_AMENITIES: { id: string; label: string }[] = [
  // Unit / generic
  { id: "instant_shower", label: "Instant shower" },
  { id: "study_desk", label: "Study desk" },
  { id: "safe", label: "Safe" },
  { id: "babycot", label: "Baby court" },
  { id: "housekeeping", label: "Daily housekeeping" },
  { id: "private_chef", label: "Private chef (additional)" },
  { id: "hairdryer", label: "Hair dryer" },
  { id: "ironbox", label: "Iron box" },
  { id: "wifi", label: "WiFi" },
  { id: "laundry", label: "Laundry area" },
  { id: "balcony", label: "Balcony" },
  { id: "ac", label: "Air conditioner" },
  { id: "smoker_alert", label: "Smoker alerts" },
  { id: "fridge", label: "Fridge" },
  { id: "microwave", label: "Microwave" },
  { id: "dishwasher", label: "Dishwasher" },
  { id: "coffee", label: "Coffee maker/kettle" },
  { id: "smart_tv", label: "Smart TV" },
  { id: "smoking_allowed", label: "Smoking allowed" },
  { id: "no_smoking", label: "Smoking not allowed" },
  { id: "self_locking", label: "Self locking/keylocker" },

  // Premise / generic
  { id: "gym", label: "Gym" },
  { id: "borewater", label: "Borehole water" },
  { id: "garden", label: "Garden" },
  { id: "cctv", label: "CCTV" },
  { id: "parking", label: "Parking" },
  { id: "security", label: "24/7 security" },
  { id: "elevator", label: "Elevator" },
  { id: "electric_fence", label: "Electric fence" },
  { id: "solar", label: "Solar water heating" },
  { id: "pool", label: "Swimming pool" },
  { id: "smoking_area", label: "Smoking area" },
  { id: "generator", label: "Backup generator" },
  { id: "pet_friendly", label: "Pet friendly" },
  { id: "dsq", label: "DSQ" },

  // Apartment — unit
  { id: "apt_living_room", label: "Spacious living room" },
  { id: "apt_fitted_kitchen", label: "Modern fitted kitchen" },
  { id: "apt_dining_area", label: "Dining area" },
  { id: "apt_ensuite_beds", label: "En-suite bedrooms" },
  { id: "apt_wardrobes", label: "Built-in wardrobes" },
  { id: "apt_balcony", label: "Private balcony" },
  { id: "apt_floor_finishes", label: "High-quality floor finishes" },
  { id: "apt_hot_water", label: "Hot water supply" },
  { id: "apt_ac_fans", label: "Air conditioning or ceiling fans" },
  { id: "apt_laundry", label: "Laundry area" },
  { id: "apt_wifi", label: "High-speed internet / Wi-Fi" },
  { id: "apt_cable_tv", label: "Cable TV connection" },
  { id: "apt_smoke_detectors", label: "Smoke detectors" },
  { id: "apt_energy_lighting", label: "Energy-efficient lighting" },
  { id: "apt_storage", label: "Ample storage space" },

  // Apartment — premise
  { id: "apt_prem_secure_parking", label: "Secure parking" },
  { id: "apt_prem_security_247", label: "24-hour security" },
  { id: "apt_prem_cctv", label: "CCTV surveillance" },
  { id: "apt_prem_gate_access", label: "Controlled gate access" },
  { id: "apt_prem_generator", label: "Backup generator" },
  { id: "apt_prem_borehole", label: "Borehole and water storage" },
  { id: "apt_prem_internet", label: "High-speed internet" },
  { id: "apt_prem_elevator", label: "Elevator (lift)" },
  { id: "apt_prem_pool", label: "Swimming pool" },
  { id: "apt_prem_gym", label: "Gym" },
  { id: "apt_prem_playground", label: "Children's playground" },
  { id: "apt_prem_gardens", label: "Landscaped gardens" },
  { id: "apt_prem_rooftop", label: "Rooftop terrace" },
  { id: "apt_prem_waste", label: "Waste management services" },
  { id: "apt_prem_visitor_parking", label: "Visitor parking" },
  { id: "apt_prem_management", label: "Property management office" },

  // Home / House — unit
  { id: "home_living_room", label: "Living room" },
  { id: "home_dining_area", label: "Dining area" },
  { id: "home_modern_kitchen", label: "Modern kitchen" },
  { id: "home_wardrobes", label: "Bedrooms with wardrobes" },
  { id: "home_ensuite_bath", label: "En-suite bathrooms" },
  { id: "home_guest_toilet", label: "Guest toilet" },
  { id: "home_laundry", label: "Laundry area" },
  { id: "home_balcony", label: "Balcony or veranda" },
  { id: "home_parking", label: "Parking space" },
  { id: "home_garden", label: "Garden or landscaped yard" },
  { id: "home_perimeter_wall", label: "Perimeter wall and gate" },
  { id: "home_security_247", label: "24-hour security" },
  { id: "home_cctv", label: "CCTV surveillance" },
  { id: "home_water_supply", label: "Reliable water supply" },
  { id: "home_electricity_backup", label: "Electricity backup (generator/inverter)" },
  { id: "home_wifi", label: "High-speed Wi-Fi / Internet" },
  { id: "home_ac_fans", label: "Air conditioning or ceiling fans" },
  { id: "home_solar_water", label: "Solar water heating" },
  { id: "home_kids_play", label: "Children's play area" },
  { id: "home_pool", label: "Swimming pool (optional)" },
  { id: "home_gym", label: "Gym or fitness room (optional)" },

  // Home / House — premise
  { id: "home_prem_perimeter_wall", label: "Secure perimeter wall / fence" },
  { id: "home_prem_gated", label: "Gated entrance" },
  { id: "home_prem_security_247", label: "24-hour security" },
  { id: "home_prem_cctv", label: "CCTV surveillance" },
  { id: "home_prem_cabro_paved", label: "Cabro-paved driveway" },
  { id: "home_prem_parking", label: "Ample parking space" },
  { id: "home_prem_landscaped", label: "Landscaped gardens / lawn" },
  { id: "home_prem_outdoor_seating", label: "Outdoor seating area" },
  { id: "home_prem_kids_play", label: "Children's play area" },
  { id: "home_prem_walking_paths", label: "Walking paths" },
  { id: "home_prem_security_lighting", label: "Security lighting" },
  { id: "home_prem_water_supply", label: "Reliable water supply" },
  { id: "home_prem_water_tanks", label: "Water storage tanks" },
  { id: "home_prem_borehole", label: "Borehole (if available)" },
  { id: "home_prem_drainage", label: "Drainage system" },
  { id: "home_prem_waste_collection", label: "Waste collection area" },
  { id: "home_prem_outdoor_kitchen", label: "Outdoor kitchen / barbecue area" },
  { id: "home_prem_gazebo", label: "Gazebo or pergola" },
  { id: "home_prem_pool", label: "Swimming pool (optional)" },
  { id: "home_prem_pet_friendly", label: "Pet-friendly compound" },

  // Godown — premise
  { id: "godown_cafeteria", label: "Cafeteria" },
  { id: "godown_loading_docks", label: "Loading docks" },
  { id: "godown_cctv_biometrics", label: "CCTV and Biometrics" },
  { id: "godown_waste_mgmt", label: "Waste management" },
  { id: "godown_entrances_pathways", label: "Entrances & Pathways" },
  { id: "godown_parking", label: "Parking Spaces" },

  // Godown — unit
  { id: "godown_toilets", label: "Toilets" },
  { id: "godown_sprinkler", label: "Sprinkler systems" },
  { id: "godown_fire_extinguisher", label: "Fire extinguishers" },
  { id: "godown_emergency_exits", label: "Emergency exits" },
  { id: "godown_temp_regulation", label: "Temperature regulation" },
  { id: "godown_dehumidifiers", label: "Dehumidifiers" },
  { id: "godown_climate_controlled", label: "Climate-controlled" },
  { id: "godown_gym", label: "Gym" },
  { id: "godown_borewater", label: "Borehole water" },
  { id: "godown_garden", label: "Garden" },
  { id: "godown_cctv", label: "CCTV" },
  { id: "godown_parking_unit", label: "Parking" },
  { id: "godown_security_247", label: "24/7 security" },
  { id: "godown_elevator", label: "Elevator" },
  { id: "godown_electric_fence", label: "Electric fence" },
  { id: "godown_solar", label: "Solar water heating" },
  { id: "godown_pool", label: "Swimming pool" },
  { id: "godown_smoking_area", label: "Smoking area" },
  { id: "godown_generator", label: "Backup generator" },

  // Business Space — premise
  { id: "biz_waste_mgmt", label: "Waste management" },
  { id: "biz_drainage", label: "Proper drainage" },
  { id: "biz_conference_rooms", label: "Conference rooms" },
  { id: "biz_coffee_room", label: "Coffee room / food area" },
  { id: "biz_rampways", label: "Ramp ways" },
  { id: "biz_pathways", label: "Pathways" },
  { id: "biz_parking", label: "Parking Spaces" },
  { id: "biz_drinking_fountains", label: "Drinking Fountains" },
  { id: "biz_street_lighting", label: "Street lighting" },
  { id: "biz_elevator", label: "Elevator" },
  { id: "biz_generator", label: "Backup generator" },

  // Business Space — unit
  { id: "biz_fire_extinguisher", label: "Fire extinguisher" },
  { id: "biz_emergency_exits", label: "Emergency exits" },
  { id: "biz_security", label: "Security surveillance" },
  { id: "biz_clean_water", label: "Clean water" },
  { id: "biz_workstations", label: "Work stations" },
  { id: "biz_quiet_space", label: "Quiet space" },
  { id: "biz_signature_space", label: "Signature space" },

  // Commercial Space — unit
  { id: "com_quiet_soundproof", label: "Quiet space / soundproofing" },
  { id: "com_workstation", label: "Work station / desk space" },
  { id: "com_storage", label: "Storage space" },
  { id: "com_ac_ventilation", label: "Air conditioning / ventilation" },
  { id: "com_fire_extinguisher", label: "Fire extinguisher" },
  { id: "com_glass_window", label: "Glass window display (stalls/shops)" },
  { id: "com_wheelchair_entry", label: "Wheelchair accessible entry" },
  { id: "com_ensuite_washroom", label: "Ensuite washroom" },
  { id: "com_internet_point", label: "Internet/fiber point in-unit" },
  { id: "com_power_socket", label: "Dedicated power socket / backup point" },
  { id: "com_partitioning", label: "Partitioning options" },
  { id: "com_natural_lighting", label: "Natural lighting" },
  { id: "com_shelving", label: "Shelving / display racks (stalls)" },
  { id: "com_lockable_door", label: "Lockable door / security grill (stalls)" },
  { id: "com_ceiling_height", label: "Ceiling height suited to storage/stock" },

  // Commercial Space — premise
  { id: "com_meeting_rooms", label: "Meeting rooms (shared)" },
  { id: "com_cafeteria", label: "Coffee room & food station / cafeteria" },
  { id: "com_internet", label: "Internet connectivity" },
  { id: "com_waste_collection", label: "Waste collection" },
  { id: "com_loading_bay", label: "Loading bay" },
  { id: "com_wheelchair_ramps", label: "Wheelchair-accessible ramps & elevators" },
  { id: "com_parking", label: "Ample parking (customer & staff)" },
  { id: "com_perimeter_security", label: "Perimeter security" },
  { id: "com_generator", label: "Standby generator" },
  { id: "com_borehole_water", label: "Borehole / water tank backup" },
  { id: "com_elevator", label: "Elevator / lift access" },
  { id: "com_signage", label: "Signage & branding space" },
  { id: "com_24hr_access", label: "24-hour access" },
  { id: "com_fire_assembly", label: "Fire assembly point" },
  { id: "com_sprinkler", label: "Sprinkler system" },
  { id: "com_reception", label: "Reception" },
  { id: "com_atm", label: "ATM or banking hall" },
  { id: "com_public_restrooms", label: "Public restrooms" },
  { id: "com_rooftop", label: "Rooftop / terrace common area" },

  // Hotel — premise
  { id: "hotel_breakfast", label: "Complimentary Breakfast" },
  { id: "hotel_ramp", label: "Ramp" },
  { id: "hotel_conference_hall", label: "Conference Hall" },
  { id: "hotel_reception_24hr", label: "24hrs Reception" },
  { id: "hotel_housekeeping", label: "House Keeping" },
  { id: "hotel_restaurant_bar", label: "Restaurant & Bar" },
  { id: "hotel_pool", label: "Swimming Pool" },
  { id: "hotel_pool_billiards", label: "Pool Billiards" },
  { id: "hotel_kids_play", label: "Kids Play Area" },
  { id: "hotel_recreational", label: "Recreational Facilities" },
  { id: "hotel_valet", label: "Valet" },
  { id: "hotel_room_service", label: "Room Service" },
  { id: "hotel_ballroom", label: "Ballroom" },
  { id: "hotel_golf", label: "Golf Course" },
  { id: "hotel_tennis", label: "Tennis Court" },
  { id: "hotel_smoking_lounge", label: "Smoking Lounge" },

  // Land — zoning
  { id: "zone_residential", label: "Residential" },
  { id: "zone_commercial", label: "Commercial" },
  { id: "zone_agricultural", label: "Agricultural" },
  { id: "zone_mixed_use", label: "Mixed-use" },

  // Land — utilities
  { id: "land_electricity", label: "Electricity connection" },
  { id: "land_water_supply", label: "Water supply" },
  { id: "land_sewer", label: "Sewer" },
  { id: "land_septic", label: "Septic system" },
  { id: "land_internet", label: "Internet / fiber access" },

  // Land — surrounding
  { id: "land_surr_schools", label: "Nearness to schools" },
  { id: "land_surr_hospitals", label: "Nearness to hospitals / clinics" },
  { id: "land_surr_shopping", label: "Nearness to shopping centers / markets" },
  { id: "land_surr_worship", label: "Nearness to places of worship" },
  { id: "land_road_tarmac", label: "Tarmac road access" },
  { id: "land_road_murram", label: "Murram road access" },
  { id: "land_road_distance", label: "Close to main road" },
  { id: "land_police", label: "Proximity to police station" },
  { id: "land_security", label: "Security" },
  { id: "land_recreational", label: "Nearby recreational areas (parks, gyms)" },
  { id: "land_future_dev", label: "Future development plans in the area" },
];

/** Fast lookup: amenity ID → human-readable label */
export const AMENITY_LABEL_MAP: Record<string, string> = Object.fromEntries(
  ALL_AMENITIES.map(({ id, label }) => [id, label])
);

/**
 * Resolve an amenity ID to its display label.
 * Falls back to a title-cased version of the ID (underscores → spaces)
 * so nothing ever renders as a raw code.
 *
 * @example
 * resolveAmenityLabel("apt_prem_elevator") // → "Elevator (lift)"
 * resolveAmenityLabel("unknown_thing")     // → "Unknown Thing"
 */
export function resolveAmenityLabel(id: string): string {
  if (AMENITY_LABEL_MAP[id]) return AMENITY_LABEL_MAP[id];
  // Fallback: replace underscores with spaces and title-case each word
  return id
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
