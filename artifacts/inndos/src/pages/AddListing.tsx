import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Upload, Image as ImageIcon, Check, Camera, X, MapPin, Loader2, GripVertical, Video, AlertCircle, Pencil, Save, RotateCcw } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import { useUpload } from "@workspace/object-storage-web";
import { GoogleMap, Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import { AdvancedMarker } from "@/components/ui/AdvancedMarker";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string;
import { GOOGLE_MAPS_LIBRARIES } from "@/lib/maps";
import { VideoEditModal } from "@/components/VideoEditModal";
const NAIROBI_CENTER = { lat: -1.2921, lng: 36.8219 };

function getImageDisplayUrl(objectPath: string): string {
  if (objectPath.startsWith("/objects/")) {
    return `/api/storage${objectPath}`;
  }
  if (objectPath.startsWith("http")) {
    return objectPath;
  }
  return `/api${objectPath}`;
}

const UNIT_AMENITIES = [
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
  { id: "self_locking", label: "Self locking/keylocker" }
];

const PREMISE_AMENITIES = [
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
  { id: "dsq", label: "DSQ" }
];

// ── Apartment ────────────────────────────────────────────────────────────────
const APARTMENT_UNIT_AMENITIES = [
  { id: "apt_living_room",       label: "Spacious living room" },
  { id: "apt_fitted_kitchen",    label: "Modern fitted kitchen" },
  { id: "apt_dining_area",       label: "Dining area" },
  { id: "apt_ensuite_beds",      label: "En-suite bedrooms" },
  { id: "apt_wardrobes",         label: "Built-in wardrobes" },
  { id: "apt_balcony",           label: "Private balcony" },
  { id: "apt_floor_finishes",    label: "High-quality floor finishes" },
  { id: "apt_hot_water",         label: "Hot water supply" },
  { id: "apt_ac_fans",           label: "Air conditioning or ceiling fans" },
  { id: "apt_laundry",           label: "Laundry area" },
  { id: "apt_wifi",              label: "High-speed internet / Wi-Fi" },
  { id: "apt_cable_tv",          label: "Cable TV connection" },
  { id: "apt_smoke_detectors",   label: "Smoke detectors" },
  { id: "apt_energy_lighting",   label: "Energy-efficient lighting" },
  { id: "apt_storage",           label: "Ample storage space" },
];
const APARTMENT_PREMISE_AMENITIES = [
  { id: "apt_prem_secure_parking",   label: "Secure parking" },
  { id: "apt_prem_security_247",     label: "24-hour security" },
  { id: "apt_prem_cctv",             label: "CCTV surveillance" },
  { id: "apt_prem_gate_access",      label: "Controlled gate access" },
  { id: "apt_prem_generator",        label: "Backup generator" },
  { id: "apt_prem_borehole",         label: "Borehole and water storage" },
  { id: "apt_prem_internet",         label: "High-speed internet" },
  { id: "apt_prem_elevator",         label: "Elevator (lift)" },
  { id: "apt_prem_pool",             label: "Swimming pool" },
  { id: "apt_prem_gym",              label: "Gym" },
  { id: "apt_prem_playground",       label: "Children's playground" },
  { id: "apt_prem_gardens",          label: "Landscaped gardens" },
  { id: "apt_prem_rooftop",          label: "Rooftop terrace" },
  { id: "apt_prem_waste",            label: "Waste management services" },
  { id: "apt_prem_visitor_parking",  label: "Visitor parking" },
  { id: "apt_prem_management",       label: "Property management office" },
];

// ── Home / House ─────────────────────────────────────────────────────────────
const HOME_UNIT_AMENITIES = [
  { id: "home_living_room",        label: "Living room" },
  { id: "home_dining_area",        label: "Dining area" },
  { id: "home_modern_kitchen",     label: "Modern kitchen" },
  { id: "home_wardrobes",          label: "Bedrooms with wardrobes" },
  { id: "home_ensuite_bath",       label: "En-suite bathrooms" },
  { id: "home_guest_toilet",       label: "Guest toilet" },
  { id: "home_laundry",            label: "Laundry area" },
  { id: "home_balcony",            label: "Balcony or veranda" },
  { id: "home_parking",            label: "Parking space" },
  { id: "home_garden",             label: "Garden or landscaped yard" },
  { id: "home_perimeter_wall",     label: "Perimeter wall and gate" },
  { id: "home_security_247",       label: "24-hour security" },
  { id: "home_cctv",               label: "CCTV surveillance" },
  { id: "home_water_supply",       label: "Reliable water supply" },
  { id: "home_electricity_backup", label: "Electricity backup (generator/inverter)" },
  { id: "home_wifi",               label: "High-speed Wi-Fi / Internet" },
  { id: "home_ac_fans",            label: "Air conditioning or ceiling fans" },
  { id: "home_solar_water",        label: "Solar water heating" },
  { id: "home_kids_play",          label: "Children's play area" },
  { id: "home_pool",               label: "Swimming pool (optional)" },
  { id: "home_gym",                label: "Gym or fitness room (optional)" },
];
const HOME_PREMISE_AMENITIES = [
  { id: "home_prem_perimeter_wall",    label: "Secure perimeter wall / fence" },
  { id: "home_prem_gated",             label: "Gated entrance" },
  { id: "home_prem_security_247",      label: "24-hour security" },
  { id: "home_prem_cctv",              label: "CCTV surveillance" },
  { id: "home_prem_cabro_paved",       label: "Cabro-paved driveway" },
  { id: "home_prem_parking",           label: "Ample parking space" },
  { id: "home_prem_landscaped",        label: "Landscaped gardens / lawn" },
  { id: "home_prem_outdoor_seating",   label: "Outdoor seating area" },
  { id: "home_prem_kids_play",         label: "Children's play area" },
  { id: "home_prem_walking_paths",     label: "Walking paths" },
  { id: "home_prem_security_lighting", label: "Security lighting" },
  { id: "home_prem_water_supply",      label: "Reliable water supply" },
  { id: "home_prem_water_tanks",       label: "Water storage tanks" },
  { id: "home_prem_borehole",          label: "Borehole (if available)" },
  { id: "home_prem_drainage",          label: "Drainage system" },
  { id: "home_prem_waste_collection",  label: "Waste collection area" },
  { id: "home_prem_outdoor_kitchen",   label: "Outdoor kitchen / barbecue area" },
  { id: "home_prem_gazebo",            label: "Gazebo or pergola" },
  { id: "home_prem_pool",              label: "Swimming pool (optional)" },
  { id: "home_prem_pet_friendly",      label: "Pet-friendly compound" },
];

// ── Godown ──────────────────────────────────────────────────────────────────
const GODOWN_PREMISE_AMENITIES = [
  { id: "godown_cafeteria", label: "Cafeteria" },
  { id: "godown_loading_docks", label: "Loading docks" },
  { id: "godown_cctv_biometrics", label: "CCTV and Biometrics" },
  { id: "godown_waste_mgmt", label: "Waste management" },
  { id: "godown_entrances_pathways", label: "Entrances & Pathways" },
  { id: "godown_parking", label: "Parking Spaces" },
];
const GODOWN_UNIT_AMENITIES = [
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
];

// ── Business Space ───────────────────────────────────────────────────────────
const BUSINESS_PREMISE_AMENITIES = [
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
];
const BUSINESS_UNIT_AMENITIES = [
  { id: "biz_fire_extinguisher", label: "Fire extinguisher" },
  { id: "biz_emergency_exits", label: "Emergency exits" },
  { id: "biz_security", label: "Security surveillance" },
  { id: "biz_clean_water", label: "Clean water" },
  { id: "biz_workstations", label: "Work stations" },
  { id: "biz_quiet_space", label: "Quiet space" },
  { id: "biz_signature_space", label: "Signature space" },
];

// ── Commercial Space ─────────────────────────────────────────────────────────
const COMMERCIAL_UNIT_AMENITIES = [
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
];
const COMMERCIAL_PREMISE_AMENITIES = [
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
];

// ── Hotel ────────────────────────────────────────────────────────────────────
const HOTEL_PREMISE_AMENITIES = [
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
];

// ── Land checkboxes ──────────────────────────────────────────────────────────
const LAND_ZONING_OPTIONS = [
  { id: "zone_residential", label: "Residential" },
  { id: "zone_commercial", label: "Commercial" },
  { id: "zone_agricultural", label: "Agricultural" },
  { id: "zone_mixed_use", label: "Mixed-use" },
];
const LAND_UTILITIES = [
  { id: "land_electricity", label: "Electricity connection" },
  { id: "land_water_supply", label: "Water supply" },
  { id: "land_sewer", label: "Sewer" },
  { id: "land_septic", label: "Septic system" },
  { id: "land_internet", label: "Internet / fiber access" },
];
const LAND_SURROUNDING = [
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
  { id: "land_fencing", label: "Fencing" },
  { id: "land_gated", label: "Gated" },
  { id: "land_corner_plot", label: "Corner plot" },
];

function getAmenityLists(type: string, subtype?: string) {
  if (type === "rent-godown") return { unit: GODOWN_UNIT_AMENITIES, premise: GODOWN_PREMISE_AMENITIES };
  if (type === "rent-business") return { unit: BUSINESS_UNIT_AMENITIES, premise: BUSINESS_PREMISE_AMENITIES };
  if (type === "rent-stall" || type === "rent-shop") return { unit: COMMERCIAL_UNIT_AMENITIES, premise: COMMERCIAL_PREMISE_AMENITIES };
  if (type === "hotel") return { unit: UNIT_AMENITIES, premise: HOTEL_PREMISE_AMENITIES };
  if (type === "rent") return { unit: APARTMENT_UNIT_AMENITIES, premise: APARTMENT_PREMISE_AMENITIES };
  if (type === "sale-home" || (type === "sale" && subtype === "home")) return { unit: HOME_UNIT_AMENITIES, premise: HOME_PREMISE_AMENITIES };
  if (type === "sale-apartment") return { unit: APARTMENT_UNIT_AMENITIES, premise: APARTMENT_PREMISE_AMENITIES };
  return { unit: UNIT_AMENITIES, premise: PREMISE_AMENITIES };
}

type ApiPropertyType = "rent" | "sale" | "bnb" | "hotel" | "hostel";

function toApiType(raw: string): ApiPropertyType {
  if (raw === "sale" || raw === "land" || raw === "sale-land" || raw === "sale-apartment" || raw === "sale-home") return "sale";
  if (raw === "bnb") return "bnb";
  if (raw === "hotel") return "hotel";
  if (raw === "hostel") return "hostel";
  return "rent";
}

const isLandType = (t: string) => t === "land" || t === "sale-land";
const isSaleVariant = (t: string) => ["sale-land", "sale-apartment", "sale-home"].includes(t);
const isCommercialVariant = (t: string) =>
  ["rent-godown", "rent-business", "rent-stall", "rent-shop"].includes(t);
const hideBedsBaths = (t: string) => isLandType(t) || isCommercialVariant(t);
const hasStandardAmenities = (t: string) => !isLandType(t);

function getEditId(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has("edit")) return searchParams.get("edit");
  const hashParts = window.location.hash.split("?");
  if (hashParts.length > 1) {
    const hp = new URLSearchParams(hashParts[1]);
    if (hp.has("edit")) return hp.get("edit");
  }
  return null;
}

// ── Draft persistence helpers ─────────────────────────────────────────────────
interface DraftState {
  listingType: string;
  title: string;
  price: string;
  address: string;
  beds: string;
  baths: string;
  sqft: string;
  description: string;
  selectedAmenities: string[];
  subtype: string;
  hourlyRate: string;
  priceUnit: string;
  totalUnits: string;
  acres: string;
  plotSizeFt: string;
  soilType: string;
  surveyMaps: string;
  titleDeed: string;
  legalRates: string;
  legalEncumbrances: string;
  paymentPlan: string;
  pricePerUnit: string;
  images: string[];
  videos: string[];
  pinPosition: { lat: number; lng: number } | null;
  savedAddress: string;
}

function getDraftKey(userId: string) {
  return `inndos_add_listing_draft_${userId}`;
}

/** Write DraftState into localStorage (synchronous, offline-safe). */
function writeDraftLocal(userId: string, d: DraftState) {
  try { localStorage.setItem(getDraftKey(userId), JSON.stringify(d)); } catch { /* storage full */ }
}

/** Remove draft from localStorage. */
function removeDraftLocal(userId: string) {
  try { localStorage.removeItem(getDraftKey(userId)); } catch { /* ignore */ }
}

/** PUT draft to server; throws if response is not ok (so callers can catch 401/500). */
async function putDraftServer(token: string, d: DraftState): Promise<void> {
  const res = await fetch("/api/listing-drafts/current", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data: d }),
  });
  if (!res.ok) throw new Error(`PUT /api/listing-drafts/current failed: ${res.status}`);
}

/** DELETE draft on server; throws if response is not ok. */
async function deleteDraftServer(token: string): Promise<void> {
  const res = await fetch("/api/listing-drafts/current", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`DELETE /api/listing-drafts/current failed: ${res.status}`);
}

/**
 * Coerce a server draft payload to flat DraftState.
 * Accepts two shapes:
 *   - Canonical (new):  the response body IS a DraftState (flat keys at top level inside data).
 *   - Legacy mobile:    {form:{…}, selectedAmenities:[…], media:{images,videos}}.
 */
function normaliseDraftPayload(raw: unknown): DraftState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  // Legacy mobile shape: has a "form" sub-object
  if (r.form && typeof r.form === "object") {
    const f = r.form as Record<string, unknown>;
    const media = (r.media && typeof r.media === "object") ? r.media as Record<string, unknown> : {};
    return {
      listingType:        String(f.listingType        ?? ""),
      title:              String(f.title              ?? ""),
      price:              String(f.price              ?? ""),
      address:            String(f.address            ?? ""),
      beds:               String(f.beds               ?? ""),
      baths:              String(f.baths              ?? ""),
      sqft:               String(f.sqft               ?? ""),
      description:        String(f.description        ?? ""),
      selectedAmenities:  Array.isArray(r.selectedAmenities) ? (r.selectedAmenities as string[]) : [],
      subtype:            String(f.subtype            ?? ""),
      hourlyRate:         String(f.hourlyRate         ?? ""),
      priceUnit:          String(f.priceUnit          ?? ""),
      totalUnits:         String(f.totalUnits         ?? "1"),
      acres:              String(f.acres              ?? ""),
      plotSizeFt:         String(f.plotSizeFt         ?? ""),
      soilType:           String(f.soilType           ?? ""),
      surveyMaps:         String(f.surveyMaps         ?? ""),
      titleDeed:          String(f.titleDeed          ?? ""),
      legalRates:         String(f.legalRates         ?? ""),
      legalEncumbrances:  String(f.legalEncumbrances  ?? ""),
      paymentPlan:        String(f.paymentPlan        ?? ""),
      pricePerUnit:       String(f.pricePerUnit       ?? ""),
      images:             Array.isArray(media.images)  ? (media.images as string[])  : [],
      videos:             Array.isArray(media.videos)  ? (media.videos as string[])  : [],
      pinPosition:        (f.pinPosition && typeof f.pinPosition === "object")
                            ? (f.pinPosition as { lat: number; lng: number })
                            : null,
      savedAddress:       String(f.savedAddress ?? f.address ?? ""),
    } satisfies DraftState;
  }

  // Canonical flat DraftState shape — use as-is (safe cast; missing keys default gracefully in applyDraft)
  return r as unknown as DraftState;
}

/** Fetch server draft; returns normalised DraftState or null. */
async function fetchDraftServer(token: string): Promise<DraftState | null> {
  try {
    const res = await fetch("/api/listing-drafts/current", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json() as Record<string, unknown>;
    return normaliseDraftPayload(json?.data);
  } catch {
    return null;
  }
}

export default function AddListing() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { token, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [videoLimit, setVideoLimit] = useState(0);
  const [imageLimit, setImageLimit] = useState(0);
  const [uploadingVideoCount, setUploadingVideoCount] = useState(0);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [editingVideoIdx, setEditingVideoIdx] = useState<number | null>(null);
  const [editingVideoSrc, setEditingVideoSrc] = useState<string>("");
  const [isLocationPinned, setIsLocationPinned] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [pinPosition, setPinPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [draftPin, setDraftPin] = useState<google.maps.LatLngLiteral | null>(null);
  const [draftAddress, setDraftAddress] = useState("");
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(NAIROBI_CENTER);

  // Draft state
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isDraftSyncing, setIsDraftSyncing] = useState(false);

  const { isLoaded: mapsLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_API_KEY, libraries: GOOGLE_MAPS_LIBRARIES });

  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place || !place.geometry?.location) return;
    const loc = place.geometry.location;
    const pos = { lat: loc.lat(), lng: loc.lng() };
    setDraftPin(pos);
    setMapCenter(pos);
    setDraftAddress(place.formatted_address ?? place.name ?? "");
    mapRef.current?.panTo(pos);
    mapRef.current?.setZoom(16);
  }, []);

  // Fallback: geocode whatever is typed when Enter is pressed and no autocomplete selection
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !window.google) return;
    const query = searchInputRef.current?.value;
    if (!query) return;
    new google.maps.Geocoder().geocode({ address: query }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const loc = results[0].geometry.location;
        const pos = { lat: loc.lat(), lng: loc.lng() };
        setDraftPin(pos);
        setMapCenter(pos);
        setDraftAddress(results[0].formatted_address);
        mapRef.current?.panTo(pos);
        mapRef.current?.setZoom(16);
      }
    });
  }, []);

  const reverseGeocodeDraft = useCallback((pos: google.maps.LatLngLiteral) => {
    if (!window.google) return;
    new google.maps.Geocoder().geocode({ location: pos }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        setDraftAddress(results[0].formatted_address);
      }
    });
  }, []);

  // On modal open: restore existing pin or geolocate user
  useEffect(() => {
    if (!isMapModalOpen) return;
    setDraftPin(pinPosition);
    setDraftAddress(address || searchQuery);
    if (pinPosition) {
      setMapCenter(pinPosition);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMapCenter(userPos);
          // Pan if map already loaded
          mapRef.current?.panTo(userPos);
          mapRef.current?.setZoom(14);
        },
        () => { /* permission denied – stay on default */ },
        { timeout: 5000 }
      );
    }
  }, [isMapModalOpen]);

  const [searchQuery, setSearchQuery] = useState("Nairobi, Kenya");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dragSrcRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { uploadFile } = useUpload({
    requestHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  // Controlled state for Select fields
  const [listingType, setListingType] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [subtype, setSubtype] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [priceUnit, setPriceUnit] = useState("");
  const [totalUnits, setTotalUnits] = useState("1");

  // Land-specific fields
  const [acres, setAcres] = useState("");
  const [plotSizeFt, setPlotSizeFt] = useState("");
  const [soilType, setSoilType] = useState("");
  const [surveyMaps, setSurveyMaps] = useState("");
  const [titleDeed, setTitleDeed] = useState("");
  const [legalRates, setLegalRates] = useState("");
  const [legalEncumbrances, setLegalEncumbrances] = useState("");
  const [paymentPlan, setPaymentPlan] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");

  const toggleAmenity = (id: string) => {
    setSelectedAmenities(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const editId = getEditId();
  const isEditing = editId !== null;

  // Fetch subscription to determine video + image limit
  useEffect(() => {
    if (!token) return;
    fetch("/api/subscriptions/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: { videoLimit?: number; imageLimit?: number }) => {
        setVideoLimit(typeof data.videoLimit === "number" ? data.videoLimit : 0);
        setImageLimit(typeof data.imageLimit === "number" ? data.imageLimit : 0);
      })
      .catch(() => {});
  }, [token]);

  // ── Draft: check if a saved draft exists (server preferred, local fallback) ──
  useEffect(() => {
    if (isEditing || !user?.id || !token) return;
    // Prefer server draft; fall back to localStorage
    fetchDraftServer(token).then(serverDraft => {
      if (serverDraft) {
        // Server has a draft — also persist locally for offline resilience
        writeDraftLocal(user.id, serverDraft);
        setHasSavedDraft(true);
        return;
      }
      // No server draft — check localStorage fallback
      const raw = localStorage.getItem(getDraftKey(user.id));
      if (raw) {
        try {
          JSON.parse(raw);
          setHasSavedDraft(true);
        } catch {
          removeDraftLocal(user.id);
        }
      }
    }).catch(() => {
      // Network error — fall back to localStorage check only
      const raw = localStorage.getItem(getDraftKey(user.id));
      if (raw) {
        try { JSON.parse(raw); setHasSavedDraft(true); } catch { removeDraftLocal(user.id); }
      }
    });
  }, [user?.id, token, isEditing]);

  // ── Draft: apply a DraftState object to form fields ─────────────────────────
  const applyDraft = useCallback((d: DraftState) => {
    setListingType(d.listingType ?? "");
    setTitle(d.title ?? "");
    setPrice(d.price ?? "");
    setAddress(d.savedAddress ?? d.address ?? "");
    setBeds(d.beds ?? "");
    setBaths(d.baths ?? "");
    setSqft(d.sqft ?? "");
    setDescription(d.description ?? "");
    setSelectedAmenities(d.selectedAmenities ?? []);
    setSubtype(d.subtype ?? "");
    setHourlyRate(d.hourlyRate ?? "");
    setPriceUnit(d.priceUnit ?? "");
    setTotalUnits(d.totalUnits ?? "1");
    setAcres(d.acres ?? "");
    setPlotSizeFt(d.plotSizeFt ?? "");
    setSoilType(d.soilType ?? "");
    setSurveyMaps(d.surveyMaps ?? "");
    setTitleDeed(d.titleDeed ?? "");
    setLegalRates(d.legalRates ?? "");
    setLegalEncumbrances(d.legalEncumbrances ?? "");
    setPaymentPlan(d.paymentPlan ?? "");
    setPricePerUnit(d.pricePerUnit ?? "");
    setImages(d.images ?? []);
    setVideos(d.videos ?? []);
    if (d.pinPosition) {
      setPinPosition(d.pinPosition);
      setIsLocationPinned(true);
    }
  }, []);

  // ── Draft: restore saved draft (server preferred, local fallback) ─────────────
  const restoreDraft = useCallback(async () => {
    if (!user?.id || !token) return;
    setIsDraftSyncing(true);
    try {
      const serverDraft = await fetchDraftServer(token);
      if (serverDraft) {
        writeDraftLocal(user.id, serverDraft);
        applyDraft(serverDraft);
        setHasSavedDraft(false);
        toast({ title: "Draft restored", description: "Your saved draft has been loaded from your account." });
        return;
      }
    } catch { /* fall through to local */ } finally {
      setIsDraftSyncing(false);
    }
    // Fallback: local storage
    const raw = localStorage.getItem(getDraftKey(user.id));
    if (!raw) return;
    try {
      const d: DraftState = JSON.parse(raw);
      applyDraft(d);
      setHasSavedDraft(false);
      toast({ title: "Draft restored", description: "Your saved draft has been loaded (offline copy)." });
    } catch {
      removeDraftLocal(user.id);
    }
  }, [user?.id, token, applyDraft, toast]);

  // ── Draft: save current form state ──────────────────────────────────────────
  // Writes localStorage immediately (offline-safe), then syncs to server account.
  const saveDraft = useCallback(async () => {
    if (!user?.id || isEditing) return;
    const d: DraftState = {
      listingType,
      title,
      price,
      address,
      beds,
      baths,
      sqft,
      description,
      selectedAmenities,
      subtype,
      hourlyRate,
      priceUnit,
      totalUnits,
      acres,
      plotSizeFt,
      soilType,
      surveyMaps,
      titleDeed,
      legalRates,
      legalEncumbrances,
      paymentPlan,
      pricePerUnit,
      images,
      videos,
      pinPosition,
      savedAddress: address,
    };
    // 1. Write locally first — instant, works offline
    writeDraftLocal(user.id, d);
    toast({ title: "Draft saved", description: "Saved locally. Syncing to your account…" });
    // 2. Sync to server (best-effort; don't block UI)
    if (token) {
      setIsDraftSyncing(true);
      putDraftServer(token, d)
        .then(() => {
          toast({ title: "Draft synced", description: "Draft saved to your account — accessible on web & mobile." });
        })
        .catch(() => {
          toast({ title: "Sync failed", description: "Draft is saved locally. It will sync when you're back online.", variant: "destructive" });
        })
        .finally(() => setIsDraftSyncing(false));
    }
  }, [
    user?.id, token, isEditing, listingType, title, price, address, beds, baths, sqft,
    description, selectedAmenities, subtype, hourlyRate, priceUnit, totalUnits,
    acres, plotSizeFt, soilType, surveyMaps, titleDeed, legalRates, legalEncumbrances,
    paymentPlan, pricePerUnit, images, videos, pinPosition, toast,
  ]);

  // ── Draft: discard saved draft (both localStorage and server) ───────────────
  const discardDraft = useCallback(() => {
    if (!user?.id) return;
    removeDraftLocal(user.id);
    setHasSavedDraft(false);
    setShowDiscardConfirm(false);
    toast({ title: "Draft discarded", description: "Your saved draft has been deleted." });
    // Best-effort server delete
    if (token) deleteDraftServer(token).catch(() => {});
  }, [user?.id, token, toast]);

  // ── Clear draft on successful submit (both localStorage and server) ──────────
  const clearDraftAfterSubmit = useCallback(() => {
    if (!user?.id || isEditing) return;
    removeDraftLocal(user.id);
    if (token) deleteDraftServer(token).catch(() => {});
  }, [user?.id, token, isEditing]);

  // Fetch existing property data when in edit mode
  useEffect(() => {
    if (!editId || !token) return;
    setIsLoadingProperty(true);
    fetch(`/api/properties/${editId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Property not found");
        return res.json();
      })
      .then((prop: {
        title: string; type: string; price: number; address: string;
        beds: number; baths: number; sqft: number; totalUnits?: number;
        image?: string; images?: string[]; videos?: string[];
        description?: string; tags?: string[]; subtype?: string;
        hourlyRate?: number; priceUnit?: string;
        details?: { land?: {
          acres?: number | null; plotSizeFt?: string | null; soilType?: string | null;
          surveyMaps?: string | null; titleDeed?: string | null;
          legalRates?: string | null; legalEncumbrances?: string | null;
          paymentPlan?: string | null; pricePerUnit?: string | null;
          utilities?: string[]; surrounding?: string[]; zoning?: string[];
        } };
      }) => {
        setTitle(prop.title ?? "");
        // Reconstruct frontend listing type from API type + subtype for sale properties
        let frontendType = prop.type ?? "";
        if (frontendType === "sale" && prop.subtype) {
          if (prop.subtype === "apartment") frontendType = "sale-apartment";
          else if (prop.subtype === "home") frontendType = "sale-home";
          else if (prop.subtype === "land") frontendType = "sale-land";
        }
        setListingType(frontendType);
        setPrice(prop.price != null ? String(prop.price) : "");
        setAddress(prop.address ?? "");
        setTotalUnits(prop.totalUnits != null ? String(prop.totalUnits) : "1");
        setDescription(prop.description ?? "");
        if (prop.images && prop.images.length > 0) {
          setImages(prop.images);
        } else if (prop.image) {
          setImages([prop.image]);
        }
        if (prop.videos && prop.videos.length > 0) setVideos(prop.videos);
        if (prop.tags) setSelectedAmenities(prop.tags);
        if (prop.subtype) setSubtype(prop.subtype);
        if (prop.hourlyRate != null) setHourlyRate(String(prop.hourlyRate));
        if (prop.priceUnit) setPriceUnit(prop.priceUnit);

        // ── Restore land fields: prefer structured details.land, fall back to legacy beds/sqft ──
        const isLandProp = (frontendType === "land" || frontendType === "sale-land");
        if (isLandProp && prop.details?.land) {
          const ld = prop.details.land;
          setAcres(ld.acres != null ? String(ld.acres) : "");
          setPlotSizeFt(ld.plotSizeFt ?? "");
          setSoilType(ld.soilType ?? "");
          setSurveyMaps(ld.surveyMaps ?? "");
          setTitleDeed(ld.titleDeed ?? "");
          setLegalRates(ld.legalRates ?? "");
          setLegalEncumbrances(ld.legalEncumbrances ?? "");
          setPaymentPlan(ld.paymentPlan ?? "");
          setPricePerUnit(ld.pricePerUnit ?? "");
          // Merge utility/surrounding/zoning IDs back into selectedAmenities
          const landTags = [
            ...(ld.utilities ?? []),
            ...(ld.surrounding ?? []),
            ...(ld.zoning ?? []),
          ];
          if (landTags.length > 0) {
            setSelectedAmenities(prev => Array.from(new Set([...prev, ...landTags])));
          }
        } else if (isLandProp) {
          // Legacy fallback: beds field held acres, sqft held plot area
          setAcres(prop.beds != null ? String(prop.beds) : "");
          setPlotSizeFt(prop.sqft != null ? String(prop.sqft) : "");
        } else {
          // Non-land: restore standard beds/baths/sqft
          setBeds(prop.beds != null ? String(prop.beds) : "");
          setBaths(prop.baths != null ? String(prop.baths) : "");
          setSqft(prop.sqft != null ? String(prop.sqft) : "");
        }
      })
      .catch(() => {
        toast({ title: "Could not load property", description: "The property could not be fetched for editing.", variant: "destructive" });
      })
      .finally(() => setIsLoadingProperty(false));
  }, [editId, token]);

  const uploadImageFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    // Check image limit
    if (imageLimit > 0) {
      const remaining = imageLimit - images.length;
      if (remaining <= 0) {
        toast({ title: "Photo limit reached", description: `Your plan allows ${imageLimit} photo${imageLimit === 1 ? "" : "s"} per listing.`, variant: "destructive" });
        return;
      }
      const toUpload = files.slice(0, remaining);
      if (toUpload.length < files.length) {
        toast({ title: "Too many photos", description: `Only ${remaining} slot${remaining === 1 ? "" : "s"} remaining. Extra files skipped.`, variant: "destructive" });
      }
      files = toUpload;
    }
    setUploadingCount(prev => prev + files.length);
    const results = await Promise.all(
      files.map(async (file) => {
        const result = await uploadFile(file);
        return result?.objectPath ?? null;
      })
    );
    const uploaded = (results as (string | null)[]).filter((p): p is string => p !== null);
    if (uploaded.length < files.length) {
      toast({ title: "Some uploads failed", description: "One or more photos could not be uploaded.", variant: "destructive" });
    }
    if (uploaded.length > 0) {
      setImages(prev => [...prev, ...uploaded]);
    }
    setUploadingCount(prev => prev - files.length);
  }, [uploadFile, toast, imageLimit, images.length]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    e.target.value = "";
    await uploadImageFiles(fileArray);
  }, [uploadImageFiles]);

  const handleUploadZoneDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    await uploadImageFiles(files);
  }, [uploadImageFiles]);

  const moveImage = useCallback((from: number, direction: -1 | 1) => {
    const to = from + direction;
    setImages(prev => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }, []);

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const openVideoEditor = (index: number) => {
    const url = videos[index];
    const resolved = url.startsWith("/objects/") ? `/api/storage${url}` : url;
    setEditingVideoIdx(index);
    setEditingVideoSrc(resolved);
  };

  const handleVideoEditSave = async ({ file, previewUrl }: { file: File; previewUrl: string }) => {
    if (editingVideoIdx === null) return;
    // Close editor first (show optimistic preview)
    const idx = editingVideoIdx;
    setEditingVideoIdx(null);
    setEditingVideoSrc("");
    // Upload the processed file
    setUploadingVideoCount(prev => prev + 1);
    try {
      const result = await uploadFile(file);
      const path = result && typeof result === "object" && "objectPath" in result ? result.objectPath as string : null;
      if (path) {
        setVideos(prev => prev.map((v, i) => i === idx ? path : v));
        toast({ title: "Video updated", description: "Your edited video has been saved." });
      } else {
        toast({ title: "Upload failed", description: "Could not save the edited video.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", description: "Could not save the edited video.", variant: "destructive" });
    } finally {
      setUploadingVideoCount(prev => prev - 1);
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    e.target.value = "";

    const remaining = videoLimit - videos.length;
    if (remaining <= 0) {
      toast({ title: "Video limit reached", description: `Your plan allows ${videoLimit} video${videoLimit === 1 ? "" : "s"} per listing.`, variant: "destructive" });
      return;
    }
    const toUpload = fileArray.slice(0, remaining);
    if (toUpload.length < fileArray.length) {
      toast({ title: "Too many videos", description: `Only ${remaining} slot${remaining === 1 ? "" : "s"} remaining. Extra files skipped.`, variant: "destructive" });
    }

    // Validate each video is ≤5 minutes
    const validFiles: File[] = [];
    for (const file of toUpload) {
      const duration = await new Promise<number>((resolve) => {
        const vid = document.createElement("video");
        vid.preload = "metadata";
        vid.onloadedmetadata = () => { URL.revokeObjectURL(vid.src); resolve(vid.duration); };
        vid.onerror = () => { URL.revokeObjectURL(vid.src); resolve(Infinity); };
        vid.src = URL.createObjectURL(file);
      });
      if (duration > 300) {
        toast({ title: "Video too long", description: `"${file.name}" is longer than 5 minutes and was skipped. Trim it before uploading.`, variant: "destructive" });
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;
    setUploadingVideoCount(prev => prev + validFiles.length);
    const results = await Promise.all(validFiles.map(f => uploadFile(f).catch(() => null)));
    const uploaded = results
      .map(r => (r && typeof r === "object" && "objectPath" in r ? r.objectPath : null))
      .filter((p): p is string => p !== null);
    if (uploaded.length < validFiles.length) {
      toast({ title: "Some uploads failed", description: "One or more videos could not be uploaded.", variant: "destructive" });
    }
    if (uploaded.length > 0) {
      setVideos(prev => [...prev, ...uploaded]);
    }
    setUploadingVideoCount(prev => prev - validFiles.length);
  }, [uploadFile, toast, videoLimit, videos.length]);

  const handleDragStart = (index: number) => {
    dragSrcRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const srcIndex = dragSrcRef.current;
    if (srcIndex === null || srcIndex === dropIndex) {
      dragSrcRef.current = null;
      setDragOverIndex(null);
      return;
    }
    setImages(prev => {
      const next = [...prev];
      const [moved] = next.splice(srcIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    dragSrcRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragSrcRef.current = null;
    setDragOverIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({ title: "Sign in required", description: "Please sign in to add a listing.", variant: "destructive" });
      return;
    }
    if (!listingType) {
      toast({ title: "Missing field", description: "Please select a listing type.", variant: "destructive" });
      return;
    }
    if (uploadingCount > 0) {
      toast({ title: "Upload in progress", description: "Please wait for all photos to finish uploading.", variant: "destructive" });
      return;
    }
    if (images.length === 0) {
      toast({ title: "Photo required", description: "Please upload at least one photo of the property before submitting.", variant: "destructive" });
      return;
    }

    const parsedPrice = parseInt(price, 10);
    const parsedBeds = parseInt(beds, 10);
    const parsedBaths = parseInt(baths, 10);
    const parsedSqft = parseInt(sqft, 10);
    const isLand = isLandType(listingType);

    const clientErrors: Record<string, string[]> = {};
    if (!title.trim()) clientErrors.title = ["Title is required"];
    if (isNaN(parsedPrice) || parsedPrice <= 0) clientErrors.price = ["Price must be greater than 0"];
    if (!address.trim() && !searchQuery.trim()) clientErrors.address = ["Address is required"];
    if (!isLand && !isNaN(parsedBeds) && parsedBeds < 0) clientErrors.beds = ["Bedrooms cannot be negative"];
    if (!isLand && !isNaN(parsedBaths) && parsedBaths < 0) clientErrors.baths = ["Bathrooms cannot be negative"];

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      toast({ title: "Please fix the errors below", variant: "destructive" });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const parsedTotalUnits = parseInt(totalUnits, 10);

      // ── Compute land plot sqft ────────────────────────────────────────────────
      const computeLandSqft = () => {
        const dimMatch = plotSizeFt.match(/^(\d+\.?\d*)X(\d+\.?\d*)$/i);
        if (dimMatch) return Math.round(parseFloat(dimMatch[1]) * parseFloat(dimMatch[2]));
        return parseInt(plotSizeFt, 10) || 0;
      };

      // ── For land listings, build a structured details object ─────────────────
      // Description stays as-is (pure human text); all structured data goes into details.
      const landDetails = isLand ? {
        land: {
          acres: parseFloat(acres) || null,
          plotSizeFt: plotSizeFt || null,
          soilType: soilType || null,
          surveyMaps: surveyMaps || null,
          titleDeed: titleDeed || null,
          legalRates: legalRates || null,
          legalEncumbrances: legalEncumbrances || null,
          paymentPlan: paymentPlan || null,
          pricePerUnit: pricePerUnit || null,
          utilities: LAND_UTILITIES.map(o => o.id).filter(id => selectedAmenities.includes(id)),
          surrounding: LAND_SURROUNDING.map(o => o.id).filter(id => selectedAmenities.includes(id)),
          zoning: LAND_ZONING_OPTIONS.map(o => o.id).filter(id => selectedAmenities.includes(id)),
        },
      } : undefined;

      const body = {
        title,
        type: toApiType(listingType),
        price: parsedPrice,
        address: address || searchQuery,
        beds: isLand ? 0 : (isNaN(parsedBeds) ? 0 : parsedBeds),
        baths: isLand ? 0 : (isNaN(parsedBaths) ? 0 : parsedBaths),
        sqft: isLand ? computeLandSqft() : (isNaN(parsedSqft) ? 0 : parsedSqft),
        totalUnits: isNaN(parsedTotalUnits) || parsedTotalUnits < 1 ? 1 : parsedTotalUnits,
        description: description || null,
        details: landDetails,
        images,
        videos,
        tags: selectedAmenities,
        // Persist the category as subtype so Search can filter correctly
        subtype: isCommercialVariant(listingType)
          ? listingType.replace("rent-", "")   // "rent-godown" → "godown", "rent-business" → "business", etc.
          : isSaleVariant(listingType)
            ? listingType.replace("sale-", "") // "sale-apartment" → "apartment", "sale-home" → "home", "sale-land" → "land"
            : (subtype || undefined),
        hourlyRate: (listingType === "bnb" && hourlyRate) ? parseInt(hourlyRate, 10) : undefined,
        priceUnit: priceUnit || undefined,
        lat: pinPosition?.lat != null ? String(pinPosition.lat) : undefined,
        lng: pinPosition?.lng != null ? String(pinPosition.lng) : undefined,
      };

      const url = isEditing ? `/api/properties/${editId}` : "/api/properties";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; details?: { fieldErrors?: Record<string, string[]> } };
        if (data.details?.fieldErrors && Object.keys(data.details.fieldErrors).length > 0) {
          setFieldErrors(data.details.fieldErrors);
          toast({
            title: isEditing ? "Update failed" : "Submission failed",
            description: "Please fix the highlighted errors below.",
            variant: "destructive",
          });
        } else {
          toast({
            title: isEditing ? "Update failed" : "Submission failed",
            description: data.error || "Could not submit listing. Please try again.",
            variant: "destructive",
          });
        }
        return;
      }
      setFieldErrors({});
      clearDraftAfterSubmit();
      toast({
        title: isEditing ? "Listing Updated" : "Listing Submitted for Review",
        description: isEditing
          ? "Your property has been updated."
          : "Your listing has been submitted and is pending admin approval before it goes live.",
      });
      setLocation("/dashboard");
    } catch {
      toast({ title: "Network error", description: "Could not reach the server. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProperty) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-muted-foreground">Loading property details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-heading">{isEditing ? "Edit Listing" : "Add New Listing"}</h1>
            <p className="text-muted-foreground">{isEditing ? "Update your property details below." : "Fill in the details below to publish your property. Admin approval is required before the listing goes live."}</p>
          </div>

          {/* Draft banner — new listings only */}
          {!isEditing && hasSavedDraft && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <RotateCcw className="h-4 w-4 text-blue-600 shrink-0" />
              <p className="flex-1 text-sm text-blue-800 font-medium">You have a saved draft. Restore it to continue where you left off. Drafts saved to your account are available on all your devices.</p>
              <Button size="sm" variant="outline" onClick={restoreDraft} disabled={isDraftSyncing} className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100">
                {isDraftSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Restore Draft"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowDiscardConfirm(true)} className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                Discard
              </Button>
            </div>
          )}

          {/* Discard confirmation dialog */}
          <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Discard Draft?</DialogTitle>
                <DialogDescription>
                  This will permanently delete your saved draft, including any uploaded photos and videos referenced in it. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowDiscardConfirm(false)}>Cancel</Button>
                <Button variant="destructive" onClick={discardDraft}>Discard Draft</Button>
              </div>
            </DialogContent>
          </Dialog>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Details</CardTitle>
                  <CardDescription>The basics about your property</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Property Title</Label>
                    <Input id="title" placeholder="e.g. Modern Apartment in Westlands" value={title} onChange={e => { setTitle(e.target.value); setFieldErrors(prev => ({ ...prev, title: [] })); }} required className={fieldErrors.title?.length ? "border-red-500" : ""} />
                    {fieldErrors.title?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Listing Type</Label>
                      <Select value={listingType} onValueChange={setListingType} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rent">For Rent</SelectItem>
                          <SelectItem value="rent-business">For Rent - Office Space</SelectItem>
                          <SelectItem value="rent-godown">For Rent - Godown</SelectItem>
                          <SelectItem value="rent-stall">For Rent - Stall</SelectItem>
                          <SelectItem value="rent-shop">For Rent - Shop</SelectItem>
                          <SelectItem value="sale-apartment">For Sale - Apartment</SelectItem>
                          <SelectItem value="sale-home">For Sale - House / Home</SelectItem>
                          <SelectItem value="sale-land">For Sale - Land</SelectItem>
                          <SelectItem value="bnb">B&B / Short Stay</SelectItem>
                          <SelectItem value="hotel">Hotel</SelectItem>
                          <SelectItem value="hostel">Hostel (Student Rentals)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {listingType !== 'bnb' && (
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (KES)</Label>
                      <Input id="price" type="number" placeholder="e.g. 85000" value={price} onChange={e => { setPrice(e.target.value); setFieldErrors(prev => ({ ...prev, price: [] })); }} required className={fieldErrors.price?.length ? "border-red-500" : ""} />
                      {fieldErrors.price?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    </div>
                    )}
                  </div>

                  {/* Subtype selector — Rent: apartment category; Sale: property category */}
                  {(listingType === 'rent') && (
                  <div className="space-y-2">
                    <Label htmlFor="subtype">Apartment Type</Label>
                    <Select value={subtype} onValueChange={setSubtype}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select apartment type (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="studio">Studio / Bedsitter</SelectItem>
                        <SelectItem value="1-bedroom">1 Bedroom</SelectItem>
                        <SelectItem value="2-bedroom">2 Bedrooms</SelectItem>
                        <SelectItem value="3-bedroom">3 Bedrooms</SelectItem>
                        <SelectItem value="4-bedroom">4+ Bedrooms</SelectItem>
                        <SelectItem value="penthouse">Penthouse</SelectItem>
                        <SelectItem value="own-compound">Own Compound</SelectItem>
                        <SelectItem value="condominium">Condominium</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Helps guests find your property under the right category.</p>
                  </div>
                  )}

                  {/* Price Per — standard rent */}
                  {listingType === 'rent' && (
                  <div className="space-y-2">
                    <Label htmlFor="rent_price_unit">Price Per</Label>
                    <Select value={priceUnit} onValueChange={setPriceUnit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Per Month</SelectItem>
                        <SelectItem value="week">Per Week</SelectItem>
                        <SelectItem value="year">Per Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Select how often the rent is charged.</p>
                  </div>
                  )}

                  {/* BnB Type selector */}
                  {listingType === 'bnb' && (
                  <div className="space-y-3">
                    <Label htmlFor="bnb_subtype">B&B Property Type</Label>
                    <Select value={subtype} onValueChange={setSubtype}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select B&B type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="serviced-apartment">
                          <div>
                            <div className="font-medium">Serviced Apartment</div>
                            <div className="text-xs text-muted-foreground">Fully furnished with hotel-like amenities</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="entire-place">
                          <div>
                            <div className="font-medium">Entire Place</div>
                            <div className="text-xs text-muted-foreground">Private home, apartment or villa with dedicated entrance</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="private-room">
                          <div>
                            <div className="font-medium">Private Room</div>
                            <div className="text-xs text-muted-foreground">Own bedroom; shared kitchen, living room or bathroom</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="shared-room">
                          <div>
                            <div className="font-medium">Shared Room</div>
                            <div className="text-xs text-muted-foreground">Shared bedroom and common areas with other guests</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="unique-stays">
                          <div>
                            <div className="font-medium">Unique Stays</div>
                            <div className="text-xs text-muted-foreground">Treehouses, container homes, yurts, houseboats and more</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="hotel-room">
                          <div>
                            <div className="font-medium">Hotel Room / Boutique Hotel</div>
                            <div className="text-xs text-muted-foreground">Rooms in hotels, hostels or Bed & Breakfasts</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="vacation-home">
                          <div>
                            <div className="font-medium">Vacation Home</div>
                            <div className="text-xs text-muted-foreground">Cabins, rustic villas or standalone getaway properties</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="nature-stay">
                          <div>
                            <div className="font-medium">Nature-Focused Stay</div>
                            <div className="text-xs text-muted-foreground">Cabins, bungalows, container homes, villas in nature settings</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="other">
                          <div>
                            <div className="font-medium">Other</div>
                            <div className="text-xs text-muted-foreground">Any other type of short-stay accommodation</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Helps guests understand what kind of stay they are booking.</p>
                  </div>
                  )}

                  {/* BnB Pricing — daily (existing price) + optional hourly rate */}
                  {listingType === 'bnb' && (
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div>
                      <Label className="text-sm font-semibold text-blue-800">B&B Pricing Options</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Set daily rate, hourly rate, or both.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="price_bnb" className="text-sm">Daily Rate (KES)</Label>
                        <Input id="price_bnb" type="number" min="0" placeholder="e.g. 5000" value={price} onChange={e => { setPrice(e.target.value); setFieldErrors(prev => ({ ...prev, price: [] })); }} />
                        <p className="text-xs text-muted-foreground">Price per night/day</p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="hourly_rate" className="text-sm">Hourly Rate (KES) <span className="text-gray-400 font-normal">(optional)</span></Label>
                        <Input id="hourly_rate" type="number" min="0" placeholder="e.g. 800" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Leave blank if hourly is not available</p>
                      </div>
                    </div>
                  </div>
                  )}

                  {listingType === 'hostel' && (
                  <div className="space-y-2">
                    <Label htmlFor="hostel_price_unit">Price Per</Label>
                    <Select value={priceUnit} onValueChange={setPriceUnit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="night">Per Night</SelectItem>
                        <SelectItem value="month">Per Month</SelectItem>
                        <SelectItem value="semester">Per Semester / Term</SelectItem>
                        <SelectItem value="year">Per Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Select the payment period so students know when they book.</p>
                  </div>
                  )}

                  {listingType === 'hotel' && (
                  <div className="space-y-2">
                    <Label htmlFor="hotel_price_unit">Price Per</Label>
                    <Select value={priceUnit} onValueChange={setPriceUnit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pricing period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="night">Per Night</SelectItem>
                        <SelectItem value="month">Per Month</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Default is per night. Choose per month for long-stay guests.</p>
                  </div>
                  )}

                  {isCommercialVariant(listingType) && (
                  <div className="space-y-2">
                    <Label htmlFor="commercial_price_unit">Price Per</Label>
                    <Select value={priceUnit} onValueChange={setPriceUnit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pricing unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Per Month</SelectItem>
                        <SelectItem value="sqft">Per Sq Ft</SelectItem>
                        <SelectItem value="year">Per Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Select the pricing unit for this commercial space.</p>
                  </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="address">Full Address</Label>
                    <Input id="address" placeholder="e.g. 123 Peponi Road, Westlands, Nairobi" value={address} onChange={e => { setAddress(e.target.value); setFieldErrors(prev => ({ ...prev, address: [] })); }} required className={fieldErrors.address?.length ? "border-red-500" : ""} />
                    {fieldErrors.address?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                  </div>

                  <div className="space-y-2">
                    <Label>Map Location (Pin)</Label>
                    <div className="text-sm text-gray-500 mb-2">Set the exact location of your property on the map. This helps guests find your property easily.</div>
                    <div 
                      className={`bg-gray-100 rounded-lg h-[200px] border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-colors ${isLocationPinned ? 'border-green-500' : 'border-gray-200'}`}
                      onClick={() => setIsMapModalOpen(true)}
                    >
                      <img src="/images/modern_apartment_exterior.png" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm" />
                      <div className="relative z-10 flex flex-col items-center bg-white/90 p-4 rounded-lg shadow-sm">
                        {isLocationPinned ? (
                          <>
                            <Check className="h-8 w-8 text-green-500 mb-2" />
                            <span className="font-medium text-sm text-green-600">Location Pinned! Click to edit</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="h-8 w-8 text-primary mb-2" />
                            <span className="font-medium text-sm">Click to set exact pin location</span>
                          </>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Specs */}
              <Card>
                <CardHeader>
                  <CardTitle>Features & Amenities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* ── Standard beds / baths / sqft (hidden for land + commercial variants) ── */}
                  {!hideBedsBaths(listingType) && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="beds">{listingType === "hostel" ? "Beds / Units" : "Bedrooms"}</Label>
                      <Input id="beds" type="number" min="0" value={beds} onChange={e => { setBeds(e.target.value); setFieldErrors(prev => ({ ...prev, beds: [] })); }} className={fieldErrors.beds?.length ? "border-red-500" : ""} />
                      {fieldErrors.beds?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="baths">Bathrooms</Label>
                      <Input id="baths" type="number" min="0" value={baths} onChange={e => { setBaths(e.target.value); setFieldErrors(prev => ({ ...prev, baths: [] })); }} className={fieldErrors.baths?.length ? "border-red-500" : ""} />
                      {fieldErrors.baths?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sqft">Square Ft</Label>
                      <Input id="sqft" type="number" min="0" value={sqft} onChange={e => { setSqft(e.target.value); setFieldErrors(prev => ({ ...prev, sqft: [] })); }} className={fieldErrors.sqft?.length ? "border-red-500" : ""} />
                      {fieldErrors.sqft?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    </div>
                  </div>
                  )}

                  {/* ── LAND-specific fields ──────────────────────────── */}
                  {isLandType(listingType) && (
                  <div className="space-y-6">
                    {/* Size */}
                    <div>
                      <Label className="text-sm font-semibold">Size of Land</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="space-y-1">
                          <Label htmlFor="acres" className="text-xs text-muted-foreground">Acres</Label>
                          <Input id="acres" type="number" min="0" step="0.01" placeholder="e.g. 0.5" value={acres} onChange={e => setAcres(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="plotSizeFt" className="text-xs text-muted-foreground">Plot size (feet)</Label>
                          <Input
                            id="plotSizeFt"
                            type="text"
                            inputMode="text"
                            placeholder="e.g. 50X100 or 20X60"
                            value={plotSizeFt}
                            onChange={e => {
                              // Allow digits, X/x separator, and decimal point only
                              const val = e.target.value.replace(/[^0-9Xx.]/g, "").toUpperCase();
                              setPlotSizeFt(val);
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Land / Parcel Features */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Land / Parcel Features</Label>
                      <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                        <div className="space-y-1">
                          <Label htmlFor="soilType" className="text-xs">Soil type</Label>
                          <Input id="soilType" placeholder="e.g. Red clay, Sandy loam" value={soilType} onChange={e => setSoilType(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="surveyMaps" className="text-xs">Survey maps & beacons</Label>
                            <Select value={surveyMaps} onValueChange={setSurveyMaps}>
                              <SelectTrigger><SelectValue placeholder="Yes / No" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="titleDeed" className="text-xs">Ready title deed / land ref no.</Label>
                            <Select value={titleDeed} onValueChange={setTitleDeed}>
                              <SelectTrigger><SelectValue placeholder="Yes / No" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Utilities on the Land */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Utilities on the Land</Label>
                      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border">
                        {LAND_UTILITIES.map(opt => (
                          <div key={opt.id} className="flex items-center space-x-2">
                            <Checkbox id={opt.id} checked={selectedAmenities.includes(opt.id)} onCheckedChange={() => toggleAmenity(opt.id)} />
                            <label htmlFor={opt.id} className="text-sm cursor-pointer">{opt.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Surrounding Amenities */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Premise & Surrounding Amenities</Label>
                      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border">
                        {LAND_SURROUNDING.map(opt => (
                          <div key={opt.id} className="flex items-center space-x-2">
                            <Checkbox id={opt.id} checked={selectedAmenities.includes(opt.id)} onCheckedChange={() => toggleAmenity(opt.id)} />
                            <label htmlFor={opt.id} className="text-sm cursor-pointer">{opt.label}</label>
                          </div>
                        ))}
                      </div>
                      {/* Zoning classification */}
                      <div className="space-y-2 pt-2">
                        <Label className="text-xs font-medium text-gray-600">Zoning classification</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {LAND_ZONING_OPTIONS.map(opt => (
                            <div key={opt.id} className="flex items-center space-x-2">
                              <Checkbox id={opt.id} checked={selectedAmenities.includes(opt.id)} onCheckedChange={() => toggleAmenity(opt.id)} />
                              <label htmlFor={opt.id} className="text-sm cursor-pointer">{opt.label}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Legal / Financial */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Legal / Financial</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
                        <div className="space-y-1">
                          <Label htmlFor="legalRates" className="text-xs">Rates / land rent status</Label>
                          <Input id="legalRates" placeholder="e.g. Up to date" value={legalRates} onChange={e => setLegalRates(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="legalEncumbrances" className="text-xs">Encumbrances or disputes</Label>
                          <Input id="legalEncumbrances" placeholder="e.g. None" value={legalEncumbrances} onChange={e => setLegalEncumbrances(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="paymentPlan" className="text-xs">Payment plan options</Label>
                          <Input id="paymentPlan" placeholder="e.g. Installments available" value={paymentPlan} onChange={e => setPaymentPlan(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="pricePerUnit" className="text-xs">Price per unit (acre / sqm)</Label>
                          <Input id="pricePerUnit" placeholder="e.g. KES 2M per acre" value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Number of Units (hidden for land) */}
                  {!isLandType(listingType) && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="totalUnits" className="text-sm font-semibold">Number of Units Available</Label>
                        <p className="text-xs text-muted-foreground">
                          How many identical units do you have for this listing? (e.g. 5 apartments in a block, 10 hotel rooms of the same type). Guests can book any available unit on their chosen dates — once all units are booked, the dates are shown as unavailable.
                        </p>
                      </div>
                      <div className="w-24 shrink-0">
                        <Input
                          id="totalUnits"
                          type="number"
                          min="1"
                          value={totalUnits}
                          onChange={e => setTotalUnits(e.target.value)}
                          className="text-center font-semibold"
                        />
                      </div>
                    </div>
                    {parseInt(totalUnits, 10) > 1 && (
                      <p className="text-xs text-blue-600 font-medium">
                        ✓ Up to {totalUnits} bookings can be confirmed for the same dates simultaneously.
                      </p>
                    )}
                  </div>
                  )}

                  {/* ── Dynamic amenities (all non-land types) ─────────── */}
                  {hasStandardAmenities(listingType) && (() => {
                    const { unit, premise } = getAmenityLists(listingType, subtype);
                    return (
                      <>
                        {/* Unit Amenities */}
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm font-semibold">Unit Amenities</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Features inside the individual unit/space</p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border">
                            {unit.map((item) => (
                              <div key={item.id} className="flex items-center space-x-2">
                                <Checkbox id={`amenity-${item.id}`} checked={selectedAmenities.includes(item.id)} onCheckedChange={() => toggleAmenity(item.id)} />
                                <label htmlFor={`amenity-${item.id}`} className="text-sm leading-none cursor-pointer">{item.label}</label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Premise Amenities */}
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm font-semibold">Premise Amenities</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Shared facilities available on the property</p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border">
                            {premise.map((item) => (
                              <div key={item.id} className="flex items-center space-x-2">
                                <Checkbox id={`amenity-${item.id}`} checked={selectedAmenities.includes(item.id)} onCheckedChange={() => toggleAmenity(item.id)} />
                                <label htmlFor={`amenity-${item.id}`} className="text-sm leading-none cursor-pointer">{item.label}</label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Describe the property features, neighborhood, etc." 
                      className="min-h-[150px]"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      required 
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Photos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5">Photos <span className="text-red-500 text-base">*</span></CardTitle>
                  <CardDescription>
                    At least one photo is required. Upload or take high quality images of your property.
                    {imageLimit > 0 && (
                      <span className="ml-1 font-medium text-gray-700">
                        ({images.length}/{imageLimit} used — your plan allows {imageLimit} photo{imageLimit === 1 ? "" : "s"})
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    <div
                      className="relative flex-1 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleUploadZoneDrop}
                    >
                      <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary pointer-events-none">
                        <Upload className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-sm pointer-events-none">Upload Photos</h3>
                      <p className="text-xs text-muted-foreground pointer-events-none">Tap to browse or drag files here</p>
                      {imageLimit > 0 && (
                        <p className="text-xs text-muted-foreground pointer-events-none">{images.length}/{imageLimit} used</p>
                      )}
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        disabled={imageLimit > 0 && images.length >= imageLimit}
                      />
                    </div>

                    <div
                      className="relative flex-1 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                    >
                      <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 pointer-events-none">
                        <Camera className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-sm pointer-events-none">Take Photo</h3>
                      <p className="text-xs text-muted-foreground pointer-events-none">Open camera</p>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        ref={cameraInputRef}
                        onChange={handleImageUpload}
                        disabled={imageLimit > 0 && images.length >= imageLimit}
                      />
                    </div>
                  </div>

                  {/* Plan-aware image limit warning */}
                  {imageLimit > 0 && images.length >= imageLimit && (
                    <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-3">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Photo limit reached ({imageLimit} photos). Upgrade your plan to upload more.
                      <a href="/#/pricing" className="ml-auto text-xs text-primary underline underline-offset-2 shrink-0">Upgrade</a>
                    </div>
                  )}
                  
                  {(images.length > 0 || uploadingCount > 0) ? (
                    <>
                      {images.length > 1 && (
                        <p className="text-xs text-muted-foreground mb-2 mt-4 flex items-center gap-1">
                          <GripVertical className="h-3 w-3" /> Drag to reorder on desktop · use arrows on mobile. First photo is the cover.
                        </p>
                      )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {images.map((img, i) => (
                        <div
                          key={img}
                          draggable
                          onDragStart={() => handleDragStart(i)}
                          onDragOver={e => handleDragOver(e, i)}
                          onDrop={e => handleDrop(e, i)}
                          onDragEnd={handleDragEnd}
                          className={`relative aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-grab active:cursor-grabbing transition-all ${dragOverIndex === i && dragSrcRef.current !== i ? "ring-2 ring-primary scale-105" : ""}`}
                        >
                          <img src={getImageDisplayUrl(img)} alt={`Photo ${i + 1}`} className="w-full h-full object-cover pointer-events-none" />
                          {i === 0 && (
                            <span className="absolute bottom-1 left-1 bg-primary text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">Cover</span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-md"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          {images.length > 1 && (
                            <div className="absolute bottom-1 right-1 flex gap-0.5">
                              {i > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(i, -1)}
                                  className="bg-black/60 text-white rounded px-1 py-0.5 text-[10px] font-bold leading-none hover:bg-black/80"
                                  title="Move left"
                                >←</button>
                              )}
                              {i < images.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(i, 1)}
                                  className="bg-black/60 text-white rounded px-1 py-0.5 text-[10px] font-bold leading-none hover:bg-black/80"
                                  title="Move right"
                                >→</button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {Array.from({ length: uploadingCount }).map((_, i) => (
                        <div key={`uploading-${i}`} className="relative aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="sr-only">Uploading…</span>
                        </div>
                      ))}
                    </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 opacity-50">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Videos */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle>Property Videos</CardTitle>
                      <CardDescription>
                        {videoLimit === 0
                          ? "Video upload requires a Silver or Gold plan"
                          : `Upload up to ${videoLimit} video${videoLimit === 1 ? "" : "s"}, max 5 minutes each`}
                      </CardDescription>
                    </div>
                    {videoLimit === 0 && (
                      <a href="/#/pricing" className="text-xs text-primary underline underline-offset-2 shrink-0 mt-1">Upgrade plan</a>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {videoLimit === 0 ? (
                    <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Your Standard plan does not include property videos. Upgrade to Silver (1 video) or Gold (2 videos) to unlock this feature.
                    </div>
                  ) : (
                    <>
                      {videos.length < videoLimit && (
                        <div
                          className={`relative border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${uploadingVideoCount > 0 ? "opacity-50 pointer-events-none" : ""}`}
                        >
                          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary pointer-events-none">
                            <Video className="h-5 w-5" />
                          </div>
                          <h3 className="font-semibold text-sm pointer-events-none">Upload Video</h3>
                          <p className="text-xs text-muted-foreground pointer-events-none">{videos.length}/{videoLimit} used · max 5 minutes</p>
                          <input
                            type="file"
                            accept="video/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            ref={videoInputRef}
                            onChange={handleVideoUpload}
                          />
                        </div>
                      )}

                      {(videos.length > 0 || uploadingVideoCount > 0) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                          {videos.map((url, i) => (
                            <div key={url} className="relative rounded-lg overflow-hidden bg-black group">
                              <video
                                src={url.startsWith("/objects/") ? `/api/storage${url}` : url}
                                className="w-full aspect-video object-cover"
                                controls
                                preload="metadata"
                                playsInline
                              />
                              {/* Remove — always visible on mobile, hover-revealed on desktop */}
                              <button
                                type="button"
                                onClick={() => removeVideo(i)}
                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full transition-opacity sm:opacity-0 sm:group-hover:opacity-100 shadow"
                                title="Remove video"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                              {/* Edit — always visible on mobile, hover-revealed on desktop */}
                              <button
                                type="button"
                                onClick={() => openVideoEditor(i)}
                                className="absolute top-2 right-10 bg-gray-900/80 hover:bg-gray-900 text-white p-1.5 rounded-full transition-opacity sm:opacity-0 sm:group-hover:opacity-100 shadow"
                                title="Edit video (trim, crop, caption)"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">Video {i + 1}</span>
                            </div>
                          ))}
                          {Array.from({ length: uploadingVideoCount }).map((_, i) => (
                            <div key={`uploading-video-${i}`} className="relative aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              <span className="sr-only">Uploading…</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Video Edit Modal */}
              {editingVideoIdx !== null && editingVideoSrc && (
                <VideoEditModal
                  videoSrc={editingVideoSrc}
                  onSave={handleVideoEditSave}
                  onClose={() => { setEditingVideoIdx(null); setEditingVideoSrc(""); }}
                />
              )}

              <div className="flex gap-4 justify-end">
                {/* Save Draft — new listings only */}
                {!isEditing && (
                  <Button variant="outline" type="button" onClick={saveDraft} disabled={isDraftSyncing} className="gap-2">
                    {isDraftSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isDraftSyncing ? "Syncing…" : "Save Draft"}
                  </Button>
                )}
                <Button variant="outline" type="button" onClick={() => setLocation("/dashboard")}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary" disabled={isSubmitting || uploadingCount > 0 || uploadingVideoCount > 0}>
                  {uploadingCount > 0 || uploadingVideoCount > 0 ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Uploading media…</span>
                  ) : isSubmitting ? (
                    isEditing ? "Updating..." : "Submitting..."
                  ) : (
                    isEditing ? "Update Property" : <span className="flex items-center gap-2"><Check className="h-4 w-4" /> Submit for Approval</span>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
        <DialogContent
          className="sm:max-w-[600px] p-0 overflow-hidden"
          onInteractOutside={(e) => {
            // Prevent Radix from treating clicks on Google autocomplete dropdown as "outside" the dialog
            const target = e.target as Element | null;
            if (target?.closest?.(".pac-container")) e.preventDefault();
          }}
        >
          <DialogHeader className="p-4 bg-white border-b">
            <DialogTitle>Pin Property Location</DialogTitle>
            <DialogDescription>
              Click the map to drop a pin. Drag the pin to fine-tune the position.
            </DialogDescription>
          </DialogHeader>
          <div className="relative h-[400px] w-full overflow-hidden">
            {mapsLoaded ? (
              <>
                <Autocomplete
                  onLoad={(ref) => { autocompleteRef.current = ref; }}
                  onPlaceChanged={handlePlaceChanged}
                  options={{ componentRestrictions: { country: "ke" } }}
                >
                  <div className="absolute top-3 left-3 right-3 z-10">
                    <div className="relative">
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search for a neighbourhood or address…"
                        className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
                        onKeyDown={handleSearchKeyDown}
                      />
                      <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </Autocomplete>
                <GoogleMap
                  mapContainerClassName="w-full h-full"
                  center={mapCenter}
                  zoom={14}
                  options={{ mapId: "c7cd60c6a53a720a14502d1b", mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}
                  onLoad={(map) => { mapRef.current = map; }}
                  onClick={(e) => {
                    if (e.latLng) {
                      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                      setDraftPin(pos);
                      reverseGeocodeDraft(pos);
                    }
                  }}
                >
                  {draftPin && (
                    <AdvancedMarker
                      position={draftPin}
                      draggable
                      onDragEnd={(e) => {
                        if (e.latLng) {
                          const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                          setDraftPin(pos);
                          reverseGeocodeDraft(pos);
                        }
                      }}
                    />
                  )}
                </GoogleMap>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}
            {draftPin && draftAddress && (
              <div className="absolute bottom-4 left-4 right-4 z-30 bg-white rounded-md shadow-lg px-3 py-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm text-gray-700 truncate">{draftAddress}</span>
              </div>
            )}
            {!draftPin && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none text-center">
                <div className="bg-white/90 rounded-lg shadow px-4 py-2 text-sm text-gray-600">
                  Click anywhere on the map to pin your property
                </div>
              </div>
            )}
          </div>
          <div className="p-4 bg-white border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsMapModalOpen(false)}>Cancel</Button>
            <Button
              className="bg-primary"
              disabled={!draftPin}
              onClick={() => {
                setPinPosition(draftPin);
                if (draftAddress) {
                  setAddress(draftAddress);
                  setSearchQuery(draftAddress);
                }
                setIsLocationPinned(true);
                setIsMapModalOpen(false);
                toast({
                  title: "Location Saved",
                  description: "Your property location has been pinned.",
                });
              }}
            >
              Confirm Location
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
