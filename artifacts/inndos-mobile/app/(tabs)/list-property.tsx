import {
  getGetCurrentListingDraftQueryKey,
  useCreateProperty,
  useDeleteCurrentListingDraft,
  useGetCurrentListingDraft,
  useSaveCurrentListingDraft,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { LocationPicker } from "@/components/LocationPicker";
import { ListingVideoEditor, type ListingVideoEdit } from "@/components/ListingVideoEditor";
import { getApiBaseUrl } from "@/utils/api";
import { AccountUpgradeModal } from "@/components/AccountUpgradeModal";

// ── Listing types (matches website) ───────────────────────────────────────────
const LISTING_TYPES = [
  { label: "For Rent",            value: "rent"           },
  { label: "Rent - Office",       value: "rent-business"  },
  { label: "Rent - Godown",       value: "rent-godown"    },
  { label: "Rent - Stall",        value: "rent-stall"     },
  { label: "Rent - Shop",         value: "rent-shop"      },
  { label: "Sale - Apartment",    value: "sale-apartment" },
  { label: "Sale - House",        value: "sale-home"      },
  { label: "Sale - Land",         value: "sale-land"      },
  { label: "BnB / Short",         value: "bnb"            },
  { label: "Hotel",               value: "hotel"          },
  { label: "Hostel",              value: "hostel"         },
] as const;
type ListingType = (typeof LISTING_TYPES)[number]["value"];

// Derived helpers
const isLandType   = (t: string) => t === "sale-land";
const isSaleVariant= (t: string) => ["sale-land","sale-apartment","sale-home"].includes(t);
const isCommercial = (t: string) => ["rent-godown","rent-business","rent-stall","rent-shop"].includes(t);
const hideBedsBaths= (t: string) => isLandType(t) || isCommercial(t);
const hasStandardAmenities = (t: string) => !isLandType(t);

function toApiType(raw: string): "rent"|"sale"|"bnb"|"hotel"|"hostel" {
  if (isSaleVariant(raw)) return "sale";
  if (raw === "bnb")      return "bnb";
  if (raw === "hotel")    return "hotel";
  if (raw === "hostel")   return "hostel";
  return "rent";
}

function toApiSubtype(raw: string, subtype: string): string | undefined {
  if (isCommercial(raw)) return raw.replace("rent-", "");
  if (isSaleVariant(raw)) return raw.replace("sale-", "");
  if (raw === "hotel" || raw === "hostel") return subtype.trim() || raw;
  return subtype.trim() || undefined;
}

// ── Sub-types per listing type ────────────────────────────────────────────────
const SUBTYPES: Record<string, {label:string;value:string}[]> = {
  rent: [
    {label:"Studio / Bedsitter", value:"studio"},
    {label:"1 Bedroom",          value:"1-bedroom"},
    {label:"2 Bedrooms",         value:"2-bedroom"},
    {label:"3 Bedrooms",         value:"3-bedroom"},
    {label:"4+ Bedrooms",        value:"4-bedroom"},
    {label:"Penthouse",          value:"penthouse"},
    {label:"Own Compound",       value:"own-compound"},
    {label:"Condominium",        value:"condominium"},
  ],
  bnb: [
    {label:"Serviced Apartment", value:"serviced-apartment"},
    {label:"Entire Place",       value:"entire-place"},
    {label:"Private Room",       value:"private-room"},
    {label:"Shared Room",        value:"shared-room"},
    {label:"Unique Stays",       value:"unique-stays"},
    {label:"Hotel Room",         value:"hotel-room"},
    {label:"Vacation Home",      value:"vacation-home"},
    {label:"Nature Stay",        value:"nature-stay"},
    {label:"Other",              value:"other"},
  ],
  hostel: [
    {label:"Shared Room",   value:"shared-room"},
    {label:"Private Room",  value:"private-room"},
    {label:"Dormitory",     value:"dormitory"},
  ],
};

// ── Price units per listing type ───────────────────────────────────────────────
const PRICE_UNITS_BY_TYPE: Record<string,{label:string;value:string}[]> = {
  rent: [
    {label:"/month", value:"month"},
    {label:"/week",  value:"week"},
    {label:"/year",  value:"year"},
  ],
  hostel: [
    {label:"/night",    value:"night"},
    {label:"/month",    value:"month"},
    {label:"/semester", value:"semester"},
    {label:"/year",     value:"year"},
  ],
  hotel: [
    {label:"/night", value:"night"},
    {label:"/month", value:"month"},
  ],
  "rent-business": [
    {label:"/month", value:"month"},
    {label:"/sqft",  value:"sqft"},
    {label:"/year",  value:"year"},
  ],
  "rent-godown": [
    {label:"/month", value:"month"},
    {label:"/sqft",  value:"sqft"},
    {label:"/year",  value:"year"},
  ],
  "rent-stall": [
    {label:"/month", value:"month"},
    {label:"/sqft",  value:"sqft"},
    {label:"/year",  value:"year"},
  ],
  "rent-shop": [
    {label:"/month", value:"month"},
    {label:"/sqft",  value:"sqft"},
    {label:"/year",  value:"year"},
  ],
};

// ── Amenity data sets ─────────────────────────────────────────────────────────
// Canonical amenity/option constants — kept exactly in sync with the website
// (artifacts/inndos/src/pages/AddListing.tsx). IDs and labels must match verbatim.
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
const APARTMENT_UNIT = [
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
const APARTMENT_PREMISE = [
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
const HOME_UNIT = [
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
const HOME_PREMISE = [
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
const GODOWN_PREMISE = [
  { id: "godown_cafeteria", label: "Cafeteria" },
  { id: "godown_loading_docks", label: "Loading docks" },
  { id: "godown_cctv_biometrics", label: "CCTV and Biometrics" },
  { id: "godown_waste_mgmt", label: "Waste management" },
  { id: "godown_entrances_pathways", label: "Entrances & Pathways" },
  { id: "godown_parking", label: "Parking Spaces" },
];
const GODOWN_UNIT = [
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
const BUSINESS_PREMISE = [
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
const BUSINESS_UNIT = [
  { id: "biz_fire_extinguisher", label: "Fire extinguisher" },
  { id: "biz_emergency_exits", label: "Emergency exits" },
  { id: "biz_security", label: "Security surveillance" },
  { id: "biz_clean_water", label: "Clean water" },
  { id: "biz_workstations", label: "Work stations" },
  { id: "biz_quiet_space", label: "Quiet space" },
  { id: "biz_signature_space", label: "Signature space" },
];

// ── Commercial Space ─────────────────────────────────────────────────────────
const COMMERCIAL_UNIT = [
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
const COMMERCIAL_PREMISE = [
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
const HOTEL_PREMISE = [
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
const LAND_ZONING = [
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

function getAmenityLists(type: string): {unit:{id:string;label:string}[];premise:{id:string;label:string}[]} {
  if (type === "rent-godown")                        return {unit:GODOWN_UNIT,   premise:GODOWN_PREMISE};
  if (type === "rent-business")                      return {unit:BUSINESS_UNIT, premise:BUSINESS_PREMISE};
  if (type === "rent-stall" || type === "rent-shop") return {unit:COMMERCIAL_UNIT, premise:COMMERCIAL_PREMISE};
  if (type === "hotel")                              return {unit:UNIT_AMENITIES, premise:HOTEL_PREMISE};
  if (type === "sale-home")                          return {unit:HOME_UNIT, premise:HOME_PREMISE};
  if (type === "sale-apartment")                     return {unit:APARTMENT_UNIT, premise:APARTMENT_PREMISE};
  if (type === "rent")                               return {unit:APARTMENT_UNIT, premise:APARTMENT_PREMISE};
  return {unit:UNIT_AMENITIES, premise:PREMISE_AMENITIES};
}

// ── Form state ─────────────────────────────────────────────────────────────────
interface MediaItem {
  uri: string;
  uploaded: string | null;
  isVideo: boolean;
  mimeType: string;
  fileName: string;
  durationSeconds?: number;
}

const VIDEO_MAX_DURATION_MS = 300000; // 5 minutes
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

function ListingVideoPreview({ source }: { source: string }) {
  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={mediaPreviewS.video}
      nativeControls
      allowsFullscreen
      allowsPictureInPicture
      contentFit="cover"
      surfaceType="textureView"
    />
  );
}

const mediaPreviewS = StyleSheet.create({
  video: {
    width: "100%",
    height: 180,
    backgroundColor: "#000000",
    borderRadius: 8,
  },
});

interface FormState {
  title: string;
  listingType: ListingType;
  subtype: string;
  price: string;
  priceUnit: string;
  hourlyRate: string;
  address: string;
  beds: string;
  baths: string;
  sqft: string;
  guests: string;
  totalUnits: string;
  description: string;
  lat: string;
  lng: string;
  // Land fields
  acres: string;
  plotSizeFt: string;
  soilType: string;
  surveyMaps: string;
  titleDeed: string;
  legalRates: string;
  legalEncumbrances: string;
  paymentPlan: string;
  pricePerUnit: string;
}

const EMPTY_FORM: FormState = {
  title:"", listingType:"rent", subtype:"", price:"", priceUnit:"", hourlyRate:"",
  address:"", beds:"", baths:"", sqft:"", guests:"", totalUnits:"1",
  description:"", lat:"", lng:"",
  acres:"", plotSizeFt:"", soilType:"", surveyMaps:"", titleDeed:"",
  legalRates:"", legalEncumbrances:"", paymentPlan:"", pricePerUnit:"",
};

function draftKey(userId: string) { return `inndos_draft_listing_${userId}`; }

// ── Cross-platform flat draft shape (must match web DraftState exactly) ────────
// The server stores this via PUT /api/listing-drafts/current { data: ServerDraftState }.
// The local (AsyncStorage) format is the old nested { form, selectedAmenities, media }
// kept for offline compatibility; only the server payload is normalised here.
interface ServerDraftState {
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
  images: string[];     // uploaded objectPaths
  videos: string[];     // uploaded objectPaths
  pinPosition: { lat: number; lng: number } | null;
  savedAddress: string;
}

/** Serialise current mobile state to the flat web-compatible server draft. */
function toServerDraft(
  form: FormState,
  selectedAmenities: string[],
  media: MediaItem[],
): ServerDraftState {
  return {
    listingType:      form.listingType,
    title:            form.title,
    price:            form.price,
    address:          form.address,
    beds:             form.beds,
    baths:            form.baths,
    sqft:             form.sqft,
    description:      form.description,
    selectedAmenities,
    subtype:          form.subtype,
    hourlyRate:       form.hourlyRate,
    priceUnit:        form.priceUnit,
    totalUnits:       form.totalUnits,
    acres:            form.acres,
    plotSizeFt:       form.plotSizeFt,
    soilType:         form.soilType,
    surveyMaps:       form.surveyMaps,
    titleDeed:        form.titleDeed,
    legalRates:       form.legalRates,
    legalEncumbrances:form.legalEncumbrances,
    paymentPlan:      form.paymentPlan,
    pricePerUnit:     form.pricePerUnit,
    images: media.filter(m=>!m.isVideo).map(m=>m.uploaded).filter((p):p is string=>p!==null),
    videos: media.filter(m=>m.isVideo).map(m=>m.uploaded).filter((p):p is string=>p!==null),
    pinPosition: (form.lat && form.lng)
      ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) }
      : null,
    savedAddress: form.address,
  };
}

/**
 * Build a preview URI for an objectPath stored on the server.
 * e.g. "uploads/abc.jpg" → "https://api.host/api/storage/uploads/abc.jpg"
 */
function objectPathToUri(objectPath: string, apiBase: string): string {
  const clean = objectPath.startsWith("/") ? objectPath.slice(1) : objectPath;
  return `${apiBase}/api/storage/${clean}`;
}

/**
 * Deserialise a flat ServerDraftState (from server or from the old nested
 * local shape) into FormState + MediaItem[].  Defensive: accepts either shape.
 */
function fromServerDraft(
  raw: Record<string, unknown>,
  apiBase: string,
): { form: FormState; selectedAmenities: string[]; media: MediaItem[] } {
  // Detect old nested mobile shape: { form, selectedAmenities, media }
  if (raw.form && typeof raw.form === "object" && !Array.isArray(raw.form)) {
    const nested = raw as {
      form: FormState;
      selectedAmenities?: string[];
      media?: MediaItem[];
    };
    return {
      form: { ...EMPTY_FORM, ...nested.form },
      selectedAmenities: nested.selectedAmenities ?? [],
      media: nested.media ?? [],
    };
  }

  // Flat web DraftState shape.
  const s = raw as Partial<ServerDraftState>;
  const str = (v: unknown, fallback = "") =>
    typeof v === "string" ? v : fallback;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? (v as string[]) : [];

  const pin = s.pinPosition;
  const lat = pin ? String(pin.lat) : "";
  const lng = pin ? String(pin.lng) : "";

  const form: FormState = {
    ...EMPTY_FORM,
    listingType: (str(s.listingType) || "rent") as ListingType,
    title:        str(s.title),
    price:        str(s.price),
    address:      str(s.savedAddress) || str(s.address),
    beds:         str(s.beds),
    baths:        str(s.baths),
    sqft:         str(s.sqft),
    description:  str(s.description),
    subtype:      str(s.subtype),
    hourlyRate:   str(s.hourlyRate),
    priceUnit:    str(s.priceUnit),
    totalUnits:   str(s.totalUnits) || "1",
    acres:        str(s.acres),
    plotSizeFt:   str(s.plotSizeFt),
    soilType:     str(s.soilType),
    surveyMaps:   str(s.surveyMaps),
    titleDeed:    str(s.titleDeed),
    legalRates:   str(s.legalRates),
    legalEncumbrances: str(s.legalEncumbrances),
    paymentPlan:  str(s.paymentPlan),
    pricePerUnit: str(s.pricePerUnit),
    lat,
    lng,
  };

  // Rebuild MediaItem[] from objectPaths; preview URI points to storage.
  const toMediaItems = (paths: string[], isVideo: boolean): MediaItem[] =>
    paths.map((p) => {
      const fileName = p.split("/").pop() ?? (isVideo ? "video.mp4" : "image.jpg");
      const ext = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
      const mimeType = isVideo
        ? `video/${ext === "mov" ? "quicktime" : ext}`
        : `image/${ext === "jpg" ? "jpeg" : ext}`;
      return {
        uri:      objectPathToUri(p, apiBase),
        uploaded: p,
        isVideo,
        mimeType,
        fileName,
      };
    });

  const media: MediaItem[] = [
    ...toMediaItems(arr(s.images), false),
    ...toMediaItems(arr(s.videos), true),
  ];

  return { form, selectedAmenities: arr(s.selectedAmenities), media };
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function SectionLabel({text, colors}: {text:string; colors:ReturnType<typeof useColors>}) {
  return <Text style={[secS.label,{color:colors.mutedForeground}]}>{text}</Text>;
}
const secS = StyleSheet.create({
  label:{fontSize:11, fontFamily:"Outfit_600SemiBold", letterSpacing:0.8, textTransform:"uppercase", marginBottom:2, marginTop:4},
});

function Field({label, error, colors, hint, children}: {label:string; error?:string; colors:ReturnType<typeof useColors>; hint?:string; children:React.ReactNode}) {
  return (
    <View style={fieldS.wrapper}>
      <Text style={[fieldS.label,{color:colors.foreground}]}>{label}</Text>
      {children}
      {hint ? <Text style={[fieldS.hint,{color:colors.mutedForeground}]}>{hint}</Text> : null}
      {error ? <Text style={[fieldS.error,{color:colors.destructive}]}>{error}</Text> : null}
    </View>
  );
}
const fieldS = StyleSheet.create({
  wrapper:{gap:6},
  label:{fontSize:13, fontFamily:"Outfit_500Medium"},
  hint:{fontSize:11, fontFamily:"Outfit_400Regular"},
  error:{fontSize:12, fontFamily:"Outfit_400Regular"},
});

function ChipSelector({options, value, onChange, colors, small}: {
  options:{label:string;value:string}[];
  value:string;
  onChange:(v:string)=>void;
  colors:ReturnType<typeof useColors>;
  small?:boolean;
}) {
  return (
    <View style={{flexDirection:"row", flexWrap:"wrap", gap:small?6:8}}>
      {options.map(o=>(
        <Pressable
          key={o.value}
          style={[chipS.chip,{borderColor:value===o.value?colors.primary:colors.border,backgroundColor:value===o.value?colors.primary:colors.card,paddingHorizontal:small?10:14,paddingVertical:small?6:8}]}
          onPress={()=>{Haptics.selectionAsync();onChange(o.value);}}
        >
          <Text style={[chipS.text,{color:value===o.value?colors.primaryForeground:colors.foreground,fontSize:small?11:13}]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
const chipS = StyleSheet.create({
  chip:{borderWidth:1,paddingHorizontal:14,paddingVertical:8,borderRadius:8},
  text:{fontSize:13, fontFamily:"Outfit_500Medium"},
});

function AmenityChip({label, selected, onToggle, colors}: {label:string;selected:boolean;onToggle:()=>void;colors:ReturnType<typeof useColors>}) {
  return (
    <Pressable
      style={[amenS.chip,{borderColor:selected?colors.primary:colors.border,backgroundColor:selected?colors.primary+"18":colors.card}]}
      onPress={()=>{Haptics.selectionAsync();onToggle();}}
    >
      {selected && <Feather name="check" size={11} color={colors.primary}/>}
      <Text style={[amenS.text,{color:selected?colors.primary:colors.foreground}]}>{label}</Text>
    </Pressable>
  );
}
const amenS = StyleSheet.create({
  chip:{flexDirection:"row",alignItems:"center",gap:4,borderWidth:1,paddingHorizontal:10,paddingVertical:6,borderRadius:20},
  text:{fontSize:12, fontFamily:"Outfit_500Medium"},
});

function YesNoSelector({value, onChange, colors}: {value:string;onChange:(v:string)=>void;colors:ReturnType<typeof useColors>}) {
  return (
    <View style={{flexDirection:"row",gap:8}}>
      {["yes","no"].map(v=>(
        <Pressable
          key={v}
          style={[chipS.chip,{borderColor:value===v?colors.primary:colors.border,backgroundColor:value===v?colors.primary:colors.card,paddingHorizontal:20,paddingVertical:8}]}
          onPress={()=>{Haptics.selectionAsync();onChange(value===v?"":v);}}
        >
          <Text style={[chipS.text,{color:value===v?colors.primaryForeground:colors.foreground}]}>{v==="yes"?"Yes":"No"}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ListPropertyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {user, token} = useAuth();
  const isWeb = Platform.OS === "web";

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState|"imageUrl",string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [editingVideoIndex, setEditingVideoIndex] = useState<number | null>(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [imageLimit, setImageLimit] = useState(0);
  const [videoLimit, setVideoLimit] = useState(0);
  const [mediaLimitsLoaded, setMediaLimitsLoaded] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // "server" = draft is saved on account, "local" = device-only, null = none
  const [draftSource, setDraftSource] = useState<"server"|"local"|null>(null);
  const pickerAddressRef = useRef<string|null>(null);

  // Load plan limits
  useEffect(()=>{
    if(!token){
      setMediaLimitsLoaded(false);
      return;
    }
    setMediaLimitsLoaded(false);
    const base = getApiBaseUrl();
    fetch(`${base}/api/subscriptions/me`,{headers:{Authorization:"Bearer "+token}})
      .then(r=>r.json())
      .then((d:unknown)=>{
        const data = d as {imageLimit?:number;videoLimit?:number};
        setImageLimit(typeof data.imageLimit==="number" ? Math.max(0,data.imageLimit) : 0);
        setVideoLimit(typeof data.videoLimit==="number" ? Math.max(0,data.videoLimit) : 0);
        setMediaLimitsLoaded(true);
      })
      .catch(()=>{
        setImageLimit(0);
        setVideoLimit(0);
        setMediaLimitsLoaded(true);
      });
  },[token]);

  // ── Server draft hooks ────────────────────────────────────────────────────
  const { mutateAsync: saveServerDraft } = useSaveCurrentListingDraft();
  const { mutateAsync: deleteServerDraft } = useDeleteCurrentListingDraft();
  // Lazily fetch only when the user is logged in; don't auto-fetch on mount
  // (we do a one-shot check in the effect below via refetch).
  const {
    refetch: fetchServerDraft,
  } = useGetCurrentListingDraft({ query: { enabled: false, queryKey: getGetCurrentListingDraftQueryKey() } });

  // ── On mount: check server draft first, fall back to local ────────────────
  useEffect(()=>{
    if(!user) return;
    let cancelled = false;
    (async()=>{
      // 1. Try server draft
      try{
        const res = await fetchServerDraft();
        if(!cancelled && res.data){
          setDraftSource("server");
          return;
        }
      } catch{ /* server error — fall through to local check */ }
      // 2. Fall back to local draft
      try{
        const raw = await AsyncStorage.getItem(draftKey(user.id));
        if(!cancelled && raw) setDraftSource("local");
      } catch{ /* ignore */ }
    })();
    return ()=>{ cancelled=true; };
  },[user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save draft: local first (offline safety), then server ────────────────
  const saveDraft = useCallback(async ()=>{
    if(!user) return;
    // Local (AsyncStorage) keeps the nested mobile shape — convenient for offline restore.
    const localPayload = {form, selectedAmenities, media: media.map(m=>({...m}))};
    await AsyncStorage.setItem(draftKey(user.id), JSON.stringify(localPayload));
    let savedToServer = false;
    try{
      // Server receives the flat web-compatible shape so web and mobile share one draft.
      const serverPayload = toServerDraft(form, selectedAmenities, media);
      // Mutation variable: { data: SaveListingDraftInput }
      // SaveListingDraftInput: { data: SaveListingDraftInputData }
      await saveServerDraft({ data: { data: serverPayload as unknown as Record<string,unknown> } });
      savedToServer = true;
      setDraftSource("server");
    } catch{
      // Server unavailable — still safe locally.
      setDraftSource("local");
    }
    Alert.alert(
      "Draft saved",
      savedToServer
        ? "Your draft has been saved to your account (also backed up locally)."
        : "Your draft has been saved on this device only (offline — will sync next time you save).",
    );
  },[user, form, selectedAmenities, media, saveServerDraft]);

  // ── Restore draft: prefer server data, fall back to local ─────────────────
  const restoreDraft = useCallback(async ()=>{
    if(!user) return;
    const base = getApiBaseUrl();
    let restored: {form:FormState;selectedAmenities:string[];media:MediaItem[]}|null = null;
    let fromServer = false;

    // 1. Try server draft — may be flat (web) or old nested (mobile) shape.
    try{
      const res = await fetchServerDraft();
      if(res.data?.data && typeof res.data.data==="object" && !Array.isArray(res.data.data)){
        restored = fromServerDraft(res.data.data as Record<string,unknown>, base);
        fromServer = true;
      }
    } catch{ /* fall through */ }

    // 2. Fall back to local AsyncStorage — always the old nested mobile shape.
    if(!restored){
      try{
        const raw = await AsyncStorage.getItem(draftKey(user.id));
        if(raw){
          const parsed = JSON.parse(raw) as Record<string,unknown>;
          restored = fromServerDraft(parsed, base);
        }
      } catch{ /* ignore */ }
    }

    if(!restored){ Alert.alert("No draft","No draft data found."); return; }
    setForm(restored.form);
    setSelectedAmenities(restored.selectedAmenities);
    setMedia(restored.media);
    setDraftSource(null);
    Alert.alert(
      "Draft restored",
      fromServer
        ? "Draft restored from your account."
        : "Draft restored from this device.",
    );
  },[user, fetchServerDraft]);

  // ── Discard: remove from both server and local ────────────────────────────
  const discardDraft = useCallback(()=>{
    if(!user) return;
    Alert.alert("Discard draft","Are you sure you want to delete the saved draft?",[
      {text:"Cancel",style:"cancel"},
      {text:"Discard",style:"destructive",onPress:async()=>{
        await AsyncStorage.removeItem(draftKey(user.id)).catch(()=>{});
        deleteServerDraft().catch(()=>{});
        setDraftSource(null);
      }},
    ]);
  },[user, deleteServerDraft]);

  // ── Clear after successful submit: both server and local ──────────────────
  const clearDraftOnSuccess = useCallback(async()=>{
    if(!user) return;
    await AsyncStorage.removeItem(draftKey(user.id)).catch(()=>{});
    deleteServerDraft().catch(()=>{});
    setDraftSource(null);
  },[user, deleteServerDraft]);

  const {mutate:createProperty, isPending} = useCreateProperty({
    mutation:{
      onSuccess:()=>{
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        clearDraftOnSuccess();
        setSubmitted(true);
        setForm(EMPTY_FORM);
        setErrors({});
        setMedia([]);
        setSelectedAmenities([]);
      },
      onError:(error:unknown)=>{
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const errorData =
          typeof error === "object" && error !== null
            ? (
                (error as { response?: { data?: unknown } }).response?.data
                ?? (error as { data?: unknown }).data
                ?? (error as { body?: unknown }).body
              )
            : undefined;
        const responseError =
          typeof errorData === "object" && errorData !== null
            ? (errorData as { error?: unknown }).error
            : undefined;
        const fieldErrors =
          typeof errorData === "object" && errorData !== null
            ? (errorData as { details?: { fieldErrors?: Record<string, string[]> } }).details?.fieldErrors
            : undefined;
        if (fieldErrors && Object.keys(fieldErrors).length > 0) {
          const mappedErrors: Partial<Record<keyof FormState | "imageUrl", string>> = {};
          Object.entries(fieldErrors).forEach(([field, messages]) => {
            const target = field === "image" || field === "images" ? "imageUrl" : field;
            if (target in EMPTY_FORM || target === "imageUrl") {
              mappedErrors[target as keyof FormState | "imageUrl"] = messages[0] ?? "Please correct this field";
            }
          });
          setErrors(mappedErrors);
        }
        const message =
          typeof responseError === "string"
            ? responseError
            : error instanceof Error && error.message
              ? error.message
              : "Failed to submit your listing. Please try again.";
        Alert.alert(
          fieldErrors && Object.keys(fieldErrors).length > 0 ? "Please fix the highlighted fields" : "Could not submit listing",
          fieldErrors && Object.keys(fieldErrors).length > 0 ? "Review the errors in the form, then submit again." : message,
        );
      },
    },
  });

  const topPadding = isWeb ? 67 : insets.top;
  const styles = getStyles(colors);

  const ALLOWED_ROLES = ["owner","host","admin"];
  const canList = user && ALLOWED_ROLES.includes(user.role);

  if(!user) {
    return (
      <View style={[styles.container,{backgroundColor:colors.background}]}>
        <View style={[styles.header,{paddingTop:topPadding+16}]}>
          <Text style={[styles.title,{color:colors.foreground}]}>List a Property</Text>
        </View>
        <View style={styles.guestContainer}>
          <View style={[styles.iconCircle,{backgroundColor:colors.muted,borderColor:colors.border}]}>
            <Feather name="home" size={40} color={colors.mutedForeground}/>
          </View>
          <Text style={[styles.guestTitle,{color:colors.foreground}]}>Sign in to list a property</Text>
          <Text style={[styles.guestSubtitle,{color:colors.mutedForeground}]}>Only authenticated owners and hosts can add property listings</Text>
          <Pressable style={[styles.primaryBtn,{backgroundColor:colors.primary}]} onPress={()=>router.push("/(auth)/login")}>
            <Text style={[styles.primaryBtnText,{color:colors.primaryForeground}]}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if(!canList) {
    const isTenant = user.role === "tenant" || user.role === "guest";
    return (
      <>
        <View style={[styles.container,{backgroundColor:colors.background}]}>
          <View style={[styles.header,{paddingTop:topPadding+16}]}>
            <Text style={[styles.title,{color:colors.foreground}]}>List a Property</Text>
          </View>
          <View style={styles.guestContainer}>
            <View style={[styles.iconCircle,{backgroundColor:colors.muted,borderColor:colors.border}]}>
              <Feather name={isTenant ? "repeat" : "lock"} size={40} color={colors.mutedForeground}/>
            </View>
            <Text style={[styles.guestTitle,{color:colors.foreground}]}>
              {isTenant ? "Switch account to list" : "Owner account required"}
            </Text>
            <Text style={[styles.guestSubtitle,{color:colors.mutedForeground}]}>
              {isTenant ? "Choose Property Owner or Host / Agency and start your listing immediately." : "Contact support to upgrade your account to owner or host."}
            </Text>
            {isTenant && (
              <Pressable
                style={[styles.primaryBtn,{backgroundColor:colors.primary}]}
                onPress={() => setShowUpgradeModal(true)}
                testID="open-account-upgrade"
              >
                <Text style={[styles.primaryBtnText,{color:colors.primaryForeground}]}>Switch Account</Text>
              </Pressable>
            )}
          </View>
        </View>
        {isTenant && (
          <AccountUpgradeModal
            visible={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            onSuccess={() => router.replace("/(tabs)/list-property" as never)}
          />
        )}
      </>
    );
  }

  if(submitted) {
    return (
      <View style={[styles.container,{backgroundColor:colors.background}]}>
        <View style={[styles.header,{paddingTop:topPadding+16}]}>
          <Text style={[styles.title,{color:colors.foreground}]}>List a Property</Text>
        </View>
        <View style={styles.guestContainer}>
          <View style={[styles.iconCircle,{backgroundColor:"#dcfce7",borderColor:"#86efac"}]}>
            <Feather name="check-circle" size={40} color="#16a34a"/>
          </View>
          <Text style={[styles.guestTitle,{color:colors.foreground}]}>Listing Submitted!</Text>
          <Text style={[styles.guestSubtitle,{color:colors.mutedForeground}]}>Your property has been submitted for admin review. It will appear once approved.</Text>
          <Pressable style={[styles.primaryBtn,{backgroundColor:colors.primary}]} onPress={()=>setSubmitted(false)}>
            <Text style={[styles.primaryBtnText,{color:colors.primaryForeground}]}>List Another Property</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function setField<K extends keyof FormState>(key:K, value:FormState[K]) {
    setForm(prev=>({...prev,[key]:value}));
    if(errors[key]) setErrors(prev=>({...prev,[key]:undefined}));
  }

  function handleLocationChange(lat:string, lng:string) {
    setForm(prev=>({...prev,lat,lng}));
    setErrors(prev=>({...prev,lat:undefined,lng:undefined}));
  }

  function handleAddressResolved(resolved:string, options?:{replace?:boolean}) {
    setForm(prev=>{
      const canReplace = options?.replace || prev.address.trim()==="" || prev.address===pickerAddressRef.current;
      if(!canReplace) return prev;
      pickerAddressRef.current = resolved;
      return {...prev,address:resolved};
    });
    setErrors(prev=>({...prev,address:undefined}));
  }

  const toggleAmenity = (id:string)=>setSelectedAmenities(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);

  // ── Upload via presigned URL ───────────────────────────────────────────────
  // Contract: POST /api/storage/uploads/request-url  body { name, size, contentType }
  //           → response { uploadURL, objectPath }
  //           then PUT the local asset directly to uploadURL.
  //
  // iOS and Android picker URIs are local `file://` (and occasionally
  // `content://`) locations. Reading a video through fetch(...).blob() is
  // browser-oriented and can exhaust memory or fail before the upload begins.
  // Expo's native uploader streams the file instead.
  const uploadAsset = async (item: MediaItem): Promise<string|null>=>{
    const base = getApiBaseUrl();
    let size: number;
    let webBlob: Blob | undefined;

    if (Platform.OS === "web") {
      const blobRes = await fetch(item.uri);
      webBlob = await blobRes.blob();
      size = webBlob.size;
    } else {
      const info = await FileSystem.getInfoAsync(item.uri);
      if (!info.exists || info.isDirectory || !info.size) {
        throw new Error("The selected file is no longer available. Please choose it again.");
      }
      size = info.size;
    }

    const maxBytes = item.isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (size > maxBytes) {
      throw new Error(
        `${item.isVideo ? "Video" : "Photo"} exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB limit.`
      );
    }
    // Step 2: request presigned upload URL with exact contract.
    const reqRes = await fetch(`${base}/api/storage/uploads/request-url`,{
      method:"POST",
      headers:{Authorization:"Bearer "+(token||""),"Content-Type":"application/json"},
      body:JSON.stringify({name:item.fileName, size, contentType:item.mimeType}),
    });
    if(!reqRes.ok){
      throw new Error(`Failed to get upload URL (HTTP ${reqRes.status})`);
    }
    const {uploadURL, objectPath} = await reqRes.json() as {uploadURL:string;objectPath:string};

    // Step 3: stream native files directly; retain browser fetch for web.
    if (Platform.OS === "web") {
      const putRes = await fetch(uploadURL,{
        method:"PUT",
        headers:{"Content-Type":item.mimeType},
        body:webBlob,
      });
      if(!putRes.ok){
        throw new Error(`Upload failed (HTTP ${putRes.status})`);
      }
    } else {
      const result = await FileSystem.uploadAsync(uploadURL, item.uri, {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {"Content-Type":item.mimeType},
      });
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Upload failed (HTTP ${result.status})`);
      }
    }
    return objectPath;
  };

  const currentPhotoCount = media.filter(m=>!m.isVideo).length;
  const currentVideoCount = media.filter(m=>m.isVideo).length;

  // Build a MediaItem from a picker asset, preserving mimeType & fileName.
  const toMediaItem = (a:ImagePicker.ImagePickerAsset, isVideo:boolean): MediaItem => {
    const ext = (a.fileName?.split(".").pop() || a.uri.split(".").pop() || (isVideo?"mp4":"jpg")).toLowerCase();
    const fallbackMime = isVideo
      ? `video/${ext==="mov"?"quicktime":ext}`
      : `image/${ext==="jpg"?"jpeg":ext}`;
    return {
      uri: a.uri,
      uploaded: null,
      isVideo,
      mimeType: a.mimeType ?? fallbackMime,
      fileName: a.fileName ?? (a.uri.split("/").pop() || `asset.${ext}`),
      durationSeconds: isVideo && typeof a.duration === "number" ? a.duration / 1000 : undefined,
    };
  };

  const addPickerAssets = async (assets:ImagePicker.ImagePickerAsset[], isVideo:boolean)=>{
    setIsUploading(true);
    const newItems: MediaItem[] = assets.map(a=>toMediaItem(a, isVideo));
    setMedia(prev=>[...prev,...newItems]);
    const results = await Promise.all(newItems.map(item=>
      uploadAsset(item).catch((): null => null)
    ));
    setMedia(prev=>{
      const updated=[...prev];
      let idx=updated.length-newItems.length;
      results.forEach(path=>{
        if(idx<updated.length){updated[idx]={...updated[idx],uploaded:path};idx++;}
      });
      return updated;
    });
    const failed=results.filter(u=>u===null).length;
    if(failed>0){
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Upload failed",`${failed} file(s) could not be uploaded. Please remove and try again.`);
    }
    setIsUploading(false);
  };

  const pickPhotosFromLibrary = async ()=>{
    if(!mediaLimitsLoaded){Alert.alert("Checking plan allowance","Please wait while we load your photo upload limit.");return;}
    if(currentPhotoCount>=imageLimit){Alert.alert("Limit reached",`Your plan allows up to ${imageLimit} photo(s).`);return;}
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(perm.status!=="granted"){Alert.alert("Permission needed","Please allow photo library access.");return;}
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection:true,
      quality:0.8,
    });
    if(!result.canceled){
      const allowed = result.assets.slice(0,imageLimit-currentPhotoCount);
      if(allowed.length<result.assets.length) Alert.alert("Limit reached",`Only ${imageLimit-currentPhotoCount} more photo(s) can be added.`);
      await addPickerAssets(allowed,false);
    }
  };

  const pickPhotoFromCamera = async ()=>{
    if(!mediaLimitsLoaded){Alert.alert("Checking plan allowance","Please wait while we load your photo upload limit.");return;}
    if(currentPhotoCount>=imageLimit){Alert.alert("Limit reached",`Your plan allows up to ${imageLimit} photo(s).`);return;}
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if(perm.status!=="granted"){Alert.alert("Permission needed","Please allow camera access.");return;}
    const result = await ImagePicker.launchCameraAsync({quality:0.8});
    if(!result.canceled) await addPickerAssets(result.assets,false);
  };

  const pickVideoFromLibrary = async ()=>{
    if(!mediaLimitsLoaded){Alert.alert("Checking plan allowance","Please wait while we load your video upload limit.");return;}
    if(videoLimit===0){Alert.alert("Upgrade required","Video upload is included with Pro (1 video) and Enterprise (5 videos).");return;}
    if(currentVideoCount>=videoLimit){Alert.alert("Limit reached",`Your plan allows up to ${videoLimit} video(s).`);return;}
    if(Platform.OS==="web"){Alert.alert("Not supported","Video library not available on web.");return;}
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(perm.status!=="granted"){Alert.alert("Permission needed","Please allow media library access.");return;}
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection:false,
      videoMaxDuration:VIDEO_MAX_DURATION_MS/1000,
    });
    if(result.canceled) return;
    // Reject library videos longer than the max duration (duration is in ms).
    const tooLong = result.assets.filter(a=>typeof a.duration==="number" && a.duration>VIDEO_MAX_DURATION_MS);
    if(tooLong.length>0){
      Alert.alert("Video too long","Videos must be 5 minutes or shorter.");
      return;
    }
    await addPickerAssets(result.assets,true);
  };

  const recordVideo = async ()=>{
    if(!mediaLimitsLoaded){Alert.alert("Checking plan allowance","Please wait while we load your video upload limit.");return;}
    if(videoLimit===0){Alert.alert("Upgrade required","Video upload is included with Pro (1 video) and Enterprise (5 videos).");return;}
    if(currentVideoCount>=videoLimit){Alert.alert("Limit reached",`Your plan allows up to ${videoLimit} video(s).`);return;}
    if(Platform.OS==="web"){Alert.alert("Not supported","Video recording not available on web.");return;}
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if(perm.status!=="granted"){Alert.alert("Permission needed","Please allow camera access.");return;}
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes:ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration:VIDEO_MAX_DURATION_MS/1000,
    });
    if(!result.canceled) await addPickerAssets(result.assets,true);
  };

  const removeMedia = (index:number)=>setMedia(prev=>prev.filter((_,i)=>i!==index));

  const saveVideoEdit = async (edit: ListingVideoEdit) => {
    if (editingVideoIndex === null) return;
    const item = media[editingVideoIndex];
    if (!item?.uploaded) {
      Alert.alert("Video still uploading", "Wait for the video upload to finish before editing it.");
      return;
    }
    setIsProcessingVideo(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/properties/videos/process`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourcePath: item.uploaded,
          trimStart: edit.trimStart,
          trimEnd: edit.trimEnd,
          cropAspect: edit.cropAspect,
          caption: edit.caption,
          captionPosition: edit.captionPosition,
        }),
      });
      const data = await response.json() as { objectPath?: string; duration?: number; error?: string };
      if (!response.ok || !data.objectPath) {
        throw new Error(data.error ?? "The video edit could not be saved.");
      }
      const base = getApiBaseUrl();
      setMedia((previous) => previous.map((entry, index) => index === editingVideoIndex
        ? {
            ...entry,
            uploaded: data.objectPath!,
            uri: `${base}/api/storage${data.objectPath}`,
            mimeType: "video/mp4",
            fileName: entry.fileName.replace(/\.[^.]+$/, "") + "-edited.mp4",
            durationSeconds: data.duration ?? entry.durationSeconds,
          }
        : entry,
      ));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingVideoIndex(null);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Could not save edit", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsProcessingVideo(false);
    }
  };

  const moveMedia = (index:number, dir:-1|1)=>{
    setMedia(prev=>{
      const to=index+dir;
      if(to<0||to>=prev.length) return prev;
      const next=[...prev];
      [next[index],next[to]]=[next[to],next[index]];
      return next;
    });
  };

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState|"imageUrl",string>>={};
    if(!form.title.trim()) newErrors.title="Title is required";
    if(!form.address.trim()) newErrors.address="Address is required";
    if(!form.listingType) newErrors.listingType="Select a listing type";
    if((SUBTYPES[form.listingType] ?? []).length>0 && !form.subtype.trim()) newErrors.subtype="Select a property category";
    if((PRICE_UNITS_BY_TYPE[form.listingType] ?? []).length>0 && !form.priceUnit.trim()) newErrors.priceUnit="Select a price period";
    const photos=media.filter(m=>!m.isVideo);
    if(photos.length===0) newErrors.imageUrl="At least one photo is required";
    else if(media.some(m=>m.uploaded===null)) newErrors.imageUrl="Wait for media to finish uploading";
    const price=parseFloat(form.price);
    if(!form.price.trim()||isNaN(price)||price<=0) newErrors.price="Enter a valid price";
    if(!hideBedsBaths(form.listingType)){
      if(!form.beds.trim()||isNaN(parseInt(form.beds))||parseInt(form.beds)<0) newErrors.beds="Enter the number of bedrooms";
      if(!form.baths.trim()||isNaN(parseInt(form.baths))||parseInt(form.baths)<0) newErrors.baths="Enter the number of bathrooms";
      if(form.sqft&&(isNaN(parseInt(form.sqft))||parseInt(form.sqft)<0)) newErrors.sqft="Enter a valid number";
    }
    if(form.lat.trim()){
      const latVal=parseFloat(form.lat);
      if(isNaN(latVal)||latVal<-90||latVal>90) newErrors.lat="Latitude must be -90 to 90";
    }
    if(form.lng.trim()){
      const lngVal=parseFloat(form.lng);
      if(isNaN(lngVal)||lngVal<-180||lngVal>180) newErrors.lng="Longitude must be -180 to 180";
    }
    if(Boolean(form.lat.trim())!==Boolean(form.lng.trim())){
      newErrors.lat="Enter both latitude and longitude, or leave both blank";
      newErrors.lng="Enter both latitude and longitude, or leave both blank";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length===0;
  }

  function handleSubmit() {
    if(isUploading){Alert.alert("Please wait","Media is still uploading.");return;}
    if(!validate()){Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);return;}
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const isLand=isLandType(form.listingType);
    // Land listings send beds:0 (not acres) to avoid fractional values in the
    // integer bedrooms column; acres lives exclusively in details.land.
    const parsedBeds = !hideBedsBaths(form.listingType)&&form.beds ? parseInt(form.beds) : isLand ? 0 : undefined;
    const parsedBaths = !hideBedsBaths(form.listingType)&&form.baths ? parseInt(form.baths) : isLand ? 0 : undefined;

    // For land: compute sqft from plotSizeFt
    let parsedSqft: number|undefined = undefined;
    if(isLand&&form.plotSizeFt){
      const dimMatch = form.plotSizeFt.match(/^(\d+\.?\d*)X(\d+\.?\d*)$/i);
      parsedSqft = dimMatch ? Math.round(parseFloat(dimMatch[1])*parseFloat(dimMatch[2])) : parseInt(form.plotSizeFt)||undefined;
    } else if(!hideBedsBaths(form.listingType)&&form.sqft){
      parsedSqft = parseInt(form.sqft)||undefined;
    }

    const photos=media.filter(m=>!m.isVideo).map(m=>m.uploaded).filter((u):u is string=>u!==null);
    const videos=media.filter(m=>m.isVideo).map(m=>m.uploaded).filter((u):u is string=>u!==null);
    const totalUnits=isLand?1:Math.max(1,parseInt(form.totalUnits)||1);
    const guests=form.guests?parseInt(form.guests):undefined;
    const hourlyRate=form.hourlyRate?parseInt(form.hourlyRate):undefined;

    // Build land-specific details object aligned with web: { land: { ... } }.
    // acres is stored as a number (parseFloat || null) inside details.land — not
    // in the beds column.  Description also gets a human-readable block for
    // backwards compatibility with readers that render it as plain text.
    let finalDesc = form.description.trim();
    let propertyDetails: Record<string,unknown>|undefined = undefined;
    if(isLand){
      propertyDetails = {
        land: {
          acres:             parseFloat(form.acres) || null,
          plotSizeFt:        form.plotSizeFt        || null,
          soilType:          form.soilType          || null,
          surveyMaps:        form.surveyMaps        || null,
          titleDeed:         form.titleDeed         || null,
          legalRates:        form.legalRates        || null,
          legalEncumbrances: form.legalEncumbrances || null,
          paymentPlan:       form.paymentPlan       || null,
          pricePerUnit:      form.pricePerUnit      || null,
          utilities:   LAND_UTILITIES.map(o=>o.id).filter(id=>selectedAmenities.includes(id)),
          surrounding: LAND_SURROUNDING.map(o=>o.id).filter(id=>selectedAmenities.includes(id)),
          zoning:      LAND_ZONING.map(o=>o.id).filter(id=>selectedAmenities.includes(id)),
        },
      };
      // Human-readable fallback in description.
      const extras:string[]=[];
      if(form.soilType)         extras.push(`Soil type: ${form.soilType}`);
      if(form.surveyMaps)       extras.push(`Survey maps & beacons: ${form.surveyMaps}`);
      if(form.titleDeed)        extras.push(`Ready title deed: ${form.titleDeed}`);
      if(form.legalRates)       extras.push(`Rates / land rent status: ${form.legalRates}`);
      if(form.legalEncumbrances)extras.push(`Encumbrances or disputes: ${form.legalEncumbrances}`);
      if(form.paymentPlan)      extras.push(`Payment plan: ${form.paymentPlan}`);
      if(form.pricePerUnit)     extras.push(`Price per unit: ${form.pricePerUnit}`);
      if(extras.length>0) finalDesc=[finalDesc,extras.join("\n")].filter(Boolean).join("\n\n");
    }

    createProperty({
      data:{
        title:form.title.trim(),
        type:toApiType(form.listingType),
        price:parseFloat(form.price),
        address:form.address.trim(),
        ...(parsedBeds!=null?{beds:parsedBeds}:{}),
        ...(parsedBaths!=null?{baths:parsedBaths}:{}),
        ...(parsedSqft!=null?{sqft:parsedSqft}:{}),
        ...(guests?{guests}:{}),
        ...(hourlyRate?{hourlyRate}:{}),
        ...((form.listingType==="bnb" ? "night" : form.priceUnit.trim())
          ? {priceUnit:form.listingType==="bnb" ? "night" : form.priceUnit.trim()}
          : {}),
        subtype:toApiSubtype(form.listingType,form.subtype),
        totalUnits,
        ...(finalDesc?{description:finalDesc}:{}),
        image:photos[0]||"",
        images:photos,
        ...(videos.length>0?{videos}:{}),
        tags:selectedAmenities,
        ...(propertyDetails?{details:propertyDetails}:{}),
        ...(form.lat.trim()&&form.lng.trim()?{lat:form.lat.trim(),lng:form.lng.trim()}:{}),
      },
    });
  }

  const lt = form.listingType;
  const subtypeOptions = SUBTYPES[lt] ?? [];
  const priceUnitOptions = PRICE_UNITS_BY_TYPE[lt] ?? [];
  const showHourlyRate = lt==="bnb"||lt==="hotel";
  const showGuests = lt==="bnb"||lt==="hotel"||lt==="hostel";
  const showTotalUnits = !isLandType(lt);
  const showBedsBaths = !hideBedsBaths(lt);
  const isLand = isLandType(lt);
  const amenityLists = hasStandardAmenities(lt) ? getAmenityLists(lt) : null;
  const photos = media.filter(m=>!m.isVideo);
  const videoMedia = media.filter(m=>m.isVideo);

  return (
    <View style={[styles.container,{backgroundColor:colors.background}]}>
      <View style={[styles.header,{paddingTop:topPadding+16}]}>
        <Text style={[styles.title,{color:colors.foreground}]}>List a Property</Text>
        <Text style={[styles.subtitle,{color:colors.mutedForeground}]}>Fill in the details. Your listing goes to admin review before publishing.</Text>
      </View>

      {/* Draft controls */}
      {draftSource !== null && (
        <View style={[styles.draftBar,{backgroundColor:colors.muted,borderColor:colors.border}]}>
          <View style={{flex:1,gap:2}}>
            <Text style={[styles.draftText,{color:colors.foreground}]}>Saved draft found</Text>
            <Text style={{fontSize:11,fontFamily:"Outfit_400Regular",color:colors.mutedForeground}}>
              {draftSource==="server" ? "☁ Saved to your account" : "📱 Saved on this device only"}
            </Text>
          </View>
          <View style={{flexDirection:"row",gap:8}}>
            <Pressable style={[styles.draftBtn,{backgroundColor:colors.primary}]} onPress={restoreDraft}>
              <Text style={[styles.draftBtnText,{color:colors.primaryForeground}]}>Restore</Text>
            </Pressable>
            <Pressable style={[styles.draftBtn,{backgroundColor:colors.card,borderWidth:1,borderColor:colors.border}]} onPress={discardDraft}>
              <Text style={[styles.draftBtnText,{color:colors.foreground}]}>Discard</Text>
            </Pressable>
          </View>
        </View>
      )}

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}>
        <ScrollView
          contentContainerStyle={[styles.content,{paddingBottom:isWeb?34+84:insets.bottom+100}]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Basic Info ── */}
          <SectionLabel text="Basic Info" colors={colors}/>

          <Field label="Property Title *" error={errors.title} colors={colors}>
            <TextInput
              style={[styles.input,{color:colors.foreground,borderColor:errors.title?colors.destructive:colors.border,backgroundColor:colors.card}]}
              placeholder="e.g. Modern 2BR Apartment in Westlands"
              placeholderTextColor={colors.mutedForeground}
              value={form.title}
              onChangeText={v=>setField("title",v)}
              returnKeyType="next"
            />
          </Field>

          <Field label="Listing Type *" error={errors.listingType} colors={colors}>
            <ChipSelector
              options={LISTING_TYPES.map(t=>({label:t.label,value:t.value}))}
              value={lt}
              onChange={v=>{setField("listingType",v as ListingType);setField("subtype","");setField("priceUnit","");}}
              colors={colors}
              small
            />
          </Field>

          {/* Sub-type */}
          {subtypeOptions.length>0 && (
            <Field label={lt==="rent"?"Apartment Type":lt==="bnb"?"B&B Property Type":"Sub-type"} colors={colors}
              hint="Helps guests find your property in the right category.">
              <ChipSelector
                options={subtypeOptions}
                value={form.subtype}
                onChange={v=>setField("subtype",v===form.subtype?"":v)}
                colors={colors}
                small
              />
            </Field>
          )}

          {/* Price */}
          <View style={{flexDirection:"row",gap:10}}>
            <View style={{flex:1}}>
              <Field label="Price (KES) *" error={errors.price} colors={colors}>
                <TextInput
                  style={[styles.input,{color:colors.foreground,borderColor:errors.price?colors.destructive:colors.border,backgroundColor:colors.card}]}
                  placeholder="e.g. 8500"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.price}
                  onChangeText={v=>setField("price",v)}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </Field>
            </View>
            {priceUnitOptions.length>0 && (
              <View style={{flex:1}}>
                <Field label="Price Per" colors={colors}>
                  <ChipSelector
                    options={priceUnitOptions}
                    value={form.priceUnit}
                    onChange={v=>setField("priceUnit",form.priceUnit===v?"":v)}
                    colors={colors}
                    small
                  />
                </Field>
              </View>
            )}
          </View>

          {/* BnB pricing */}
          {showHourlyRate && (
            <Field label="Hourly Rate (KES, optional)" colors={colors} hint="Leave blank if hourly is not available.">
              <TextInput
                style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                placeholder="e.g. 800"
                placeholderTextColor={colors.mutedForeground}
                value={form.hourlyRate}
                onChangeText={v=>setField("hourlyRate",v)}
                keyboardType="number-pad"
                returnKeyType="next"
              />
            </Field>
          )}

          <Field label="Address * (auto-filled when you pin a location)" error={errors.address} colors={colors}>
            <TextInput
              style={[styles.input,{color:colors.foreground,borderColor:errors.address?colors.destructive:colors.border,backgroundColor:colors.card}]}
              placeholder="e.g. 14 Lenana Road, Nairobi"
              placeholderTextColor={colors.mutedForeground}
              value={form.address}
              onChangeText={v=>{pickerAddressRef.current=null;setField("address",v);}}
              returnKeyType="next"
            />
          </Field>

          {/* ── Features & Amenities ── */}
          <SectionLabel text="Features & Amenities" colors={colors}/>

          {/* Beds / Baths / Sqft (hidden for land + commercial) */}
          {showBedsBaths && (
            <View style={styles.row}>
              <View style={{flex:1}}>
                <Field label={lt==="hostel"?"Beds/Units":"Bedrooms"} error={errors.beds} colors={colors}>
                  <TextInput style={[styles.input,{color:colors.foreground,borderColor:errors.beds?colors.destructive:colors.border,backgroundColor:colors.card}]}
                    placeholder="2" placeholderTextColor={colors.mutedForeground} value={form.beds}
                    onChangeText={v=>setField("beds",v)} keyboardType="number-pad" returnKeyType="next"/>
                </Field>
              </View>
              <View style={{flex:1}}>
                <Field label="Bathrooms" error={errors.baths} colors={colors}>
                  <TextInput style={[styles.input,{color:colors.foreground,borderColor:errors.baths?colors.destructive:colors.border,backgroundColor:colors.card}]}
                    placeholder="1" placeholderTextColor={colors.mutedForeground} value={form.baths}
                    onChangeText={v=>setField("baths",v)} keyboardType="number-pad" returnKeyType="next"/>
                </Field>
              </View>
              <View style={{flex:1}}>
                <Field label="Sq Ft" error={errors.sqft} colors={colors}>
                  <TextInput style={[styles.input,{color:colors.foreground,borderColor:errors.sqft?colors.destructive:colors.border,backgroundColor:colors.card}]}
                    placeholder="900" placeholderTextColor={colors.mutedForeground} value={form.sqft}
                    onChangeText={v=>setField("sqft",v)} keyboardType="number-pad" returnKeyType="next"/>
                </Field>
              </View>
            </View>
          )}

          {/* Land-specific fields */}
          {isLand && (
            <View style={[styles.landBox,{backgroundColor:colors.muted,borderColor:colors.border}]}>
              <Text style={[styles.landSectionTitle,{color:colors.foreground}]}>Size of Land</Text>
              <View style={styles.row}>
                <View style={{flex:1}}>
                  <Field label="Acres" colors={colors}>
                    <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                      placeholder="e.g. 0.5" placeholderTextColor={colors.mutedForeground}
                      value={form.acres} onChangeText={v=>setField("acres",v)} keyboardType="decimal-pad" returnKeyType="next"/>
                  </Field>
                </View>
                <View style={{flex:1}}>
                  <Field label="Plot size (feet)" colors={colors}>
                    <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                      placeholder="e.g. 50X100" placeholderTextColor={colors.mutedForeground}
                      value={form.plotSizeFt}
                      onChangeText={v=>setField("plotSizeFt",v.replace(/[^0-9Xx.]/g,"").toUpperCase())}
                      autoCapitalize="characters" returnKeyType="next"/>
                  </Field>
                </View>
              </View>

              <Text style={[styles.landSectionTitle,{color:colors.foreground,marginTop:12}]}>Land / Parcel Features</Text>
              <Field label="Soil type" colors={colors}>
                <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                  placeholder="e.g. Red clay, Sandy loam" placeholderTextColor={colors.mutedForeground}
                  value={form.soilType} onChangeText={v=>setField("soilType",v)} returnKeyType="next"/>
              </Field>
              <View style={styles.row}>
                <View style={{flex:1}}>
                  <Field label="Survey maps & beacons" colors={colors}>
                    <YesNoSelector value={form.surveyMaps} onChange={v=>setField("surveyMaps",v)} colors={colors}/>
                  </Field>
                </View>
                <View style={{flex:1}}>
                  <Field label="Ready title deed" colors={colors}>
                    <YesNoSelector value={form.titleDeed} onChange={v=>setField("titleDeed",v)} colors={colors}/>
                  </Field>
                </View>
              </View>

              <Text style={[styles.landSectionTitle,{color:colors.foreground,marginTop:12}]}>Utilities on the Land</Text>
              <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
                {LAND_UTILITIES.map(opt=>(
                  <AmenityChip key={opt.id} label={opt.label} selected={selectedAmenities.includes(opt.id)} onToggle={()=>toggleAmenity(opt.id)} colors={colors}/>
                ))}
              </View>

              <Text style={[styles.landSectionTitle,{color:colors.foreground,marginTop:12}]}>Premise & Surrounding Amenities</Text>
              <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
                {LAND_SURROUNDING.map(opt=>(
                  <AmenityChip key={opt.id} label={opt.label} selected={selectedAmenities.includes(opt.id)} onToggle={()=>toggleAmenity(opt.id)} colors={colors}/>
                ))}
              </View>

              <Text style={[styles.landSectionTitle,{color:colors.foreground,marginTop:12}]}>Zoning Classification</Text>
              <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
                {LAND_ZONING.map(opt=>(
                  <AmenityChip key={opt.id} label={opt.label} selected={selectedAmenities.includes(opt.id)} onToggle={()=>toggleAmenity(opt.id)} colors={colors}/>
                ))}
              </View>

              <Text style={[styles.landSectionTitle,{color:colors.foreground,marginTop:12}]}>Legal / Financial</Text>
              <Field label="Rates / land rent status" colors={colors}>
                <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                  placeholder="e.g. Up to date" placeholderTextColor={colors.mutedForeground}
                  value={form.legalRates} onChangeText={v=>setField("legalRates",v)} returnKeyType="next"/>
              </Field>
              <Field label="Encumbrances or disputes" colors={colors}>
                <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                  placeholder="e.g. None" placeholderTextColor={colors.mutedForeground}
                  value={form.legalEncumbrances} onChangeText={v=>setField("legalEncumbrances",v)} returnKeyType="next"/>
              </Field>
              <Field label="Payment plan options" colors={colors}>
                <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                  placeholder="e.g. Installments available" placeholderTextColor={colors.mutedForeground}
                  value={form.paymentPlan} onChangeText={v=>setField("paymentPlan",v)} returnKeyType="next"/>
              </Field>
              <Field label="Price per unit (acre / sqm)" colors={colors}>
                <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                  placeholder="e.g. KES 2M per acre" placeholderTextColor={colors.mutedForeground}
                  value={form.pricePerUnit} onChangeText={v=>setField("pricePerUnit",v)} returnKeyType="next"/>
              </Field>
            </View>
          )}

          {/* Total Units (hidden for land) */}
          {showTotalUnits && (
            <View style={styles.row}>
              {showGuests && (
                <View style={{flex:1}}>
                  <Field label="Max Guests" colors={colors}>
                    <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                      placeholder="4" placeholderTextColor={colors.mutedForeground} value={form.guests}
                      onChangeText={v=>setField("guests",v)} keyboardType="number-pad" returnKeyType="next"/>
                  </Field>
                </View>
              )}
              <View style={{flex:1}}>
                <Field label="Total Units" colors={colors} hint="How many identical units you have.">
                  <TextInput style={[styles.input,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
                    placeholder="1" placeholderTextColor={colors.mutedForeground} value={form.totalUnits}
                    onChangeText={v=>setField("totalUnits",v)} keyboardType="number-pad" returnKeyType="next"/>
                </Field>
              </View>
            </View>
          )}

          {/* Dynamic amenities (non-land) */}
          {amenityLists && (
            <>
              <Text style={[{fontSize:12,fontFamily:"Outfit_500Medium",color:colors.foreground,marginTop:4}]}>Unit Amenities</Text>
              <Text style={[{fontSize:11,fontFamily:"Outfit_400Regular",color:colors.mutedForeground,marginBottom:4}]}>Features inside the individual unit/space</Text>
              <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
                {amenityLists.unit.map(a=>(
                  <AmenityChip key={a.id} label={a.label} selected={selectedAmenities.includes(a.id)} onToggle={()=>toggleAmenity(a.id)} colors={colors}/>
                ))}
              </View>

              <Text style={[{fontSize:12,fontFamily:"Outfit_500Medium",color:colors.foreground,marginTop:12}]}>Premise Amenities</Text>
              <Text style={[{fontSize:11,fontFamily:"Outfit_400Regular",color:colors.mutedForeground,marginBottom:4}]}>Shared facilities on the property</Text>
              <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
                {amenityLists.premise.map(a=>(
                  <AmenityChip key={a.id} label={a.label} selected={selectedAmenities.includes(a.id)} onToggle={()=>toggleAmenity(a.id)} colors={colors}/>
                ))}
              </View>
            </>
          )}

          {selectedAmenities.length>0 && (
            <View style={[{backgroundColor:colors.muted,padding:10,borderRadius:8}]}>
              <Text style={{fontSize:11,color:colors.mutedForeground,fontFamily:"Outfit_400Regular"}}>
                Selected: {selectedAmenities.length} feature(s)
              </Text>
            </View>
          )}

          <Field label="Description" colors={colors}>
            <TextInput
              style={[styles.input,styles.textarea,{color:colors.foreground,borderColor:colors.border,backgroundColor:colors.card}]}
              placeholder="Describe your property — amenities, location, rules…"
              placeholderTextColor={colors.mutedForeground}
              value={form.description}
              onChangeText={v=>setField("description",v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Field>

          {/* ── Photos ── */}
          <SectionLabel text={`Photos * (${photos.length}/${imageLimit})`} colors={colors}/>
          <Text style={{fontSize:12,fontFamily:"Outfit_400Regular",color:colors.mutedForeground,marginTop:-8}}>
            {mediaLimitsLoaded
              ? "At least one photo required. Use arrows to reorder."
              : "Checking your photo upload allowance…"}
          </Text>
          <View style={{flexDirection:"row",gap:8}}>
            <Pressable style={[styles.mediaPickerBtn,{backgroundColor:colors.muted,borderColor:colors.border,opacity:isUploading||!mediaLimitsLoaded||currentPhotoCount>=imageLimit?0.5:1}]}
              onPress={pickPhotosFromLibrary} disabled={isUploading||!mediaLimitsLoaded||currentPhotoCount>=imageLimit}>
              <Feather name="image" size={18} color={colors.foreground}/>
              <Text style={[styles.mediaPickerText,{color:colors.foreground}]}>Gallery</Text>
            </Pressable>
            <Pressable style={[styles.mediaPickerBtn,{backgroundColor:colors.muted,borderColor:colors.border,opacity:isUploading||!mediaLimitsLoaded||currentPhotoCount>=imageLimit?0.5:1}]}
              onPress={pickPhotoFromCamera} disabled={isUploading||!mediaLimitsLoaded||currentPhotoCount>=imageLimit}>
              <Feather name="camera" size={18} color={colors.foreground}/>
              <Text style={[styles.mediaPickerText,{color:colors.foreground}]}>Camera</Text>
            </Pressable>
          </View>

          {isUploading && (
            <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
              <ActivityIndicator size="small" color={colors.primary}/>
              <Text style={{fontSize:13,fontFamily:"Outfit_400Regular",color:colors.mutedForeground}}>Uploading...</Text>
            </View>
          )}

          {photos.length>0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>
              {photos.map((photo,index)=>{
                // Find real index in media array
                const mediaIndex = media.indexOf(photo);
                const isFirst = index===0;
                const isLast = index===photos.length-1;
                return (
                  <View key={mediaIndex} style={{width:90,height:90,position:"relative"}}>
                    <Image source={{uri:photo.uri}} style={{width:90,height:90,borderRadius:8}} resizeMode="cover"/>
                    {isFirst && (
                      <View style={{position:"absolute",bottom:4,left:4,backgroundColor:colors.primary,paddingHorizontal:5,paddingVertical:2,borderRadius:4}}>
                        <Text style={{fontSize:9,color:colors.primaryForeground,fontFamily:"Outfit_600SemiBold"}}>Cover</Text>
                      </View>
                    )}
                    {photo.uploaded===null && !isUploading && (
                      <View style={{position:"absolute",inset:0,backgroundColor:"rgba(0,0,0,0.4)",borderRadius:8,alignItems:"center",justifyContent:"center"}}>
                        <Feather name="alert-circle" size={16} color="#fff"/>
                      </View>
                    )}
                    <Pressable style={{position:"absolute",top:-6,right:-6,backgroundColor:"#ef4444",borderRadius:10,width:20,height:20,alignItems:"center",justifyContent:"center"}}
                      onPress={()=>removeMedia(mediaIndex)}>
                      <Feather name="x" size={12} color="#fff"/>
                    </Pressable>
                    {photos.length>1 && (
                      <View style={{position:"absolute",bottom:4,right:4,flexDirection:"row",gap:2}}>
                        {!isFirst && (
                          <Pressable style={{backgroundColor:"rgba(0,0,0,0.65)",borderRadius:3,padding:3}}
                            onPress={()=>moveMedia(mediaIndex,-1)}>
                            <Feather name="arrow-left" size={10} color="#fff"/>
                          </Pressable>
                        )}
                        {!isLast && (
                          <Pressable style={{backgroundColor:"rgba(0,0,0,0.65)",borderRadius:3,padding:3}}
                            onPress={()=>moveMedia(mediaIndex,1)}>
                            <Feather name="arrow-right" size={10} color="#fff"/>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
          {errors.imageUrl ? <Text style={{fontSize:12,fontFamily:"Outfit_400Regular",color:colors.destructive}}>{errors.imageUrl}</Text> : null}

          {/* ── Videos ── */}
          <SectionLabel text={`Videos (${videoMedia.length}/${videoLimit})`} colors={colors}/>
          {!mediaLimitsLoaded ? (
            <View style={[{backgroundColor:colors.muted,borderColor:colors.border,borderWidth:1,borderRadius:8,padding:12,flexDirection:"row",alignItems:"center",gap:8}]}>
              <ActivityIndicator size="small" color={colors.primary}/>
              <Text style={{fontSize:12,fontFamily:"Outfit_400Regular",color:colors.mutedForeground,flex:1}}>
                Checking your video upload allowance…
              </Text>
            </View>
          ) : videoLimit===0 ? (
            <View style={[{backgroundColor:colors.muted,borderColor:colors.border,borderWidth:1,borderRadius:8,padding:12,flexDirection:"row",alignItems:"center",gap:8}]}>
              <Feather name="alert-circle" size={16} color={colors.mutedForeground}/>
              <Text style={{fontSize:12,fontFamily:"Outfit_400Regular",color:colors.mutedForeground,flex:1}}>
                Video upload is included with Pro (1 video) and Enterprise (5 videos).
              </Text>
            </View>
          ) : (
            <>
              <Text style={{fontSize:12,fontFamily:"Outfit_400Regular",color:colors.mutedForeground,marginTop:-8}}>Max 5 minutes per video · {videoMedia.length}/{videoLimit} used</Text>
              <View style={{flexDirection:"row",gap:8}}>
                <Pressable style={[styles.mediaPickerBtn,{backgroundColor:colors.muted,borderColor:colors.border,opacity:currentVideoCount>=videoLimit||isUploading?0.5:1}]}
                  onPress={pickVideoFromLibrary} disabled={isUploading||currentVideoCount>=videoLimit}>
                  <Feather name="video" size={18} color={colors.foreground}/>
                  <Text style={[styles.mediaPickerText,{color:colors.foreground}]}>Video Library</Text>
                </Pressable>
                <Pressable style={[styles.mediaPickerBtn,{backgroundColor:colors.muted,borderColor:colors.border,opacity:currentVideoCount>=videoLimit||isUploading?0.5:1}]}
                  onPress={recordVideo} disabled={isUploading||currentVideoCount>=videoLimit}>
                  <Feather name="aperture" size={18} color={colors.foreground}/>
                  <Text style={[styles.mediaPickerText,{color:colors.foreground}]}>Record</Text>
                </Pressable>
              </View>
              {videoMedia.length>0 && (
                <View style={{gap:8}}>
                  {videoMedia.map((v,index)=>{
                    const mediaIndex=media.indexOf(v);
                    return (
                      <View key={mediaIndex} style={[{backgroundColor:colors.card,borderColor:colors.border,borderWidth:1,borderRadius:8,padding:10,gap:10}]}>
                        <ListingVideoPreview source={v.uri}/>
                        <View style={{flexDirection:"row",alignItems:"center",gap:10}}>
                          <Feather name="video" size={20} color={colors.primary}/>
                          <View style={{flex:1}}>
                            <Text style={{fontSize:13,fontFamily:"Outfit_500Medium",color:colors.foreground}}>Video {index+1}</Text>
                            {v.uploaded===null && !isUploading && (
                              <Text style={{fontSize:11,color:colors.destructive,fontFamily:"Outfit_400Regular"}}>Upload failed</Text>
                            )}
                            {v.uploaded===null && isUploading && (
                              <Text style={{fontSize:11,color:colors.mutedForeground,fontFamily:"Outfit_400Regular"}}>Uploading…</Text>
                            )}
                            {v.uploaded!==null && (
                              <Text style={{fontSize:11,color:"#16a34a",fontFamily:"Outfit_400Regular"}}>Uploaded</Text>
                            )}
                          </View>
                           <Pressable
                             onPress={()=>setEditingVideoIndex(mediaIndex)}
                             disabled={!v.uploaded || isUploading || isProcessingVideo}
                             style={{opacity: !v.uploaded || isUploading || isProcessingVideo ? 0.45 : 1}}
                           >
                             <Feather name="edit-3" size={17} color={colors.primary}/>
                           </Pressable>
                          <Pressable onPress={()=>removeMedia(mediaIndex)}>
                            <Feather name="trash-2" size={16} color={colors.destructive}/>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* ── Location ── */}
          <SectionLabel text="Location" colors={colors}/>
          <LocationPicker
            lat={form.lat}
            lng={form.lng}
            onLocationChange={handleLocationChange}
            onAddressResolved={handleAddressResolved}
            latError={errors.lat}
            lngError={errors.lng}
          />

          {/* ── Actions ── */}
          <View style={{flexDirection:"row",gap:10}}>
            <Pressable
              style={[styles.saveDraftBtn,{borderColor:colors.border,backgroundColor:colors.card}]}
              onPress={saveDraft}
            >
              <Feather name="save" size={16} color={colors.foreground}/>
              <Text style={[styles.saveDraftText,{color:colors.foreground}]}>Save Draft</Text>
            </Pressable>
            <Pressable
              style={[styles.submitBtn,{backgroundColor:isPending?colors.muted:colors.primary,flex:1}]}
              onPress={handleSubmit}
              disabled={isPending||isUploading}
            >
              {isPending ? <ActivityIndicator size="small" color={colors.mutedForeground}/> : (
                <>
                  <Feather name="upload" size={18} color={colors.primaryForeground}/>
                  <Text style={[styles.submitBtnText,{color:colors.primaryForeground}]}>Submit Listing</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
        {editingVideoIndex !== null && media[editingVideoIndex] ? (
          <ListingVideoEditor
            source={media[editingVideoIndex].uri}
            durationSeconds={media[editingVideoIndex].durationSeconds}
            processing={isProcessingVideo}
            onClose={() => !isProcessingVideo && setEditingVideoIndex(null)}
            onSave={saveVideoEdit}
          />
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container:{flex:1},
    header:{paddingHorizontal:20,paddingBottom:12,gap:4},
    title:{fontSize:24,fontFamily:"Outfit_700Bold"},
    subtitle:{fontSize:13,fontFamily:"Outfit_400Regular",lineHeight:18},
    content:{paddingHorizontal:20,paddingTop:8,gap:16},
    guestContainer:{flex:1,alignItems:"center",justifyContent:"center",gap:14,paddingHorizontal:40},
    iconCircle:{width:88,height:88,borderRadius:44,alignItems:"center",justifyContent:"center",borderWidth:1,marginBottom:8},
    guestTitle:{fontSize:22,fontFamily:"Outfit_700Bold",textAlign:"center"},
    guestSubtitle:{fontSize:14,fontFamily:"Outfit_400Regular",textAlign:"center",lineHeight:20},
    primaryBtn:{paddingHorizontal:48,paddingVertical:14,marginTop:8,width:"100%",alignItems:"center",flexDirection:"row",justifyContent:"center",gap:8,borderRadius:8},
    primaryBtnText:{fontSize:15,fontFamily:"Outfit_600SemiBold"},
    input:{borderWidth:1,paddingHorizontal:14,paddingVertical:12,fontSize:14,fontFamily:"Outfit_400Regular",borderRadius:8},
    textarea:{height:100,paddingTop:12},
    row:{flexDirection:"row",gap:10},
    submitBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,paddingVertical:15,marginTop:8,borderRadius:8},
    submitBtnText:{fontSize:16,fontFamily:"Outfit_600SemiBold"},
    saveDraftBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:15,marginTop:8,borderRadius:8,borderWidth:1,paddingHorizontal:16},
    saveDraftText:{fontSize:14,fontFamily:"Outfit_500Medium"},
    mediaPickerBtn:{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,paddingVertical:14,borderWidth:1,borderRadius:8},
    mediaPickerText:{fontSize:13,fontFamily:"Outfit_600SemiBold"},
    draftBar:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginHorizontal:20,marginBottom:4,padding:12,borderRadius:8,borderWidth:1},
    draftText:{fontSize:13,fontFamily:"Outfit_500Medium"},
    draftBtn:{paddingHorizontal:14,paddingVertical:7,borderRadius:6},
    draftBtnText:{fontSize:12,fontFamily:"Outfit_600SemiBold"},
    landBox:{borderWidth:1,borderRadius:10,padding:14,gap:12},
    landSectionTitle:{fontSize:13,fontFamily:"Outfit_600SemiBold"},
  });
}
