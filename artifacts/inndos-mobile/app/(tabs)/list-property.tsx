import { useCreateProperty } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
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
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { LocationPicker } from "@/components/LocationPicker";
import { getApiBaseUrl } from "@/utils/api";

// ── Property types ────────────────────────────────────────────────────────────
const PROPERTY_TYPES = [
  { label: "For Rent",     value: "rent"   },
  { label: "For Sale",     value: "sale"   },
  { label: "BnB / Short",  value: "bnb"    },
  { label: "Hotel",        value: "hotel"  },
  { label: "Hostel",       value: "hostel" },
] as const;
type PropertyType = (typeof PROPERTY_TYPES)[number]["value"];

// ── Sub-types ─────────────────────────────────────────────────────────────────
const SUBTYPES_SALE    = ["Apartment", "Home", "Land"];
const SUBTYPES_RENT    = ["Studio / Bedsitter", "1 Bedroom", "2 Bedrooms", "3 Bedrooms", "4+ Bedrooms", "Penthouse", "Own Compound", "Office Space", "Godown", "Stall"];
const SUBTYPES_BNB     = ["Airbnb", "Serviced Apartment", "Guest House", "Villa", "Cottage", "Bungalow"];
const SUBTYPES_HOSTEL  = ["Shared Room", "Private Room", "Dormitory"];

function getSubtypes(type: PropertyType): string[] {
  if (type === "sale")   return SUBTYPES_SALE;
  if (type === "rent")   return SUBTYPES_RENT;
  if (type === "bnb")    return SUBTYPES_BNB;
  if (type === "hostel") return SUBTYPES_HOSTEL;
  return [];
}

// ── Amenities ─────────────────────────────────────────────────────────────────
const AMENITIES_UNIT = [
  "WiFi", "Air conditioning", "Balcony", "Fridge", "Microwave", "Coffee maker",
  "Smart TV", "Washing machine", "Dishwasher", "Hair dryer", "Iron", "Safe",
  "Instant shower", "Hot water", "Study desk", "Baby cot", "Smoking allowed",
];
const AMENITIES_BUILDING = [
  "Parking", "24/7 Security", "CCTV", "Gym", "Swimming pool", "Garden",
  "Elevator", "Generator", "Borehole water", "Solar water heating",
  "Electric fence", "DSQ", "Rooftop terrace", "Pet friendly", "Smoking area",
];

// ── Price unit ─────────────────────────────────────────────────────────────────
const PRICE_UNITS = [
  { label: "/night",  value: "night"  },
  { label: "/month",  value: "month"  },
  { label: "/hour",   value: "hour"   },
  { label: "/year",   value: "year"   },
  { label: "total",   value: "total"  },
];

// ── Form state ─────────────────────────────────────────────────────────────────
interface FormState {
  title: string;
  type: PropertyType;
  price: string;
  address: string;
  beds: string;
  baths: string;
  sqft: string;
  guests: string;
  description: string;
  lat: string;
  lng: string;
  subtype: string;
  hourlyRate: string;
  totalUnits: string;
  priceUnit: string;
}

const EMPTY_FORM: FormState = {
  title: "", type: "rent", price: "", address: "",
  beds: "", baths: "", sqft: "", guests: "",
  description: "", lat: "", lng: "",
  subtype: "", hourlyRate: "", totalUnits: "1", priceUnit: "",
};

// ── Components ─────────────────────────────────────────────────────────────────
function SectionLabel({ text, colors }: { text: string; colors: ReturnType<typeof useColors> }) {
  return <Text style={[secS.label, { color: colors.mutedForeground }]}>{text}</Text>;
}
const secS = StyleSheet.create({
  label: { fontSize: 11, fontFamily: "Outfit_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2, marginTop: 4 },
});

function Field({ label, error, colors, children }: { label: string; error?: string; colors: ReturnType<typeof useColors>; children: React.ReactNode }) {
  return (
    <View style={fieldS.wrapper}>
      <Text style={[fieldS.label, { color: colors.foreground }]}>{label}</Text>
      {children}
      {error ? <Text style={[fieldS.error, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}
const fieldS = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  error: { fontSize: 12, fontFamily: "Outfit_400Regular" },
});

// Chip selector (type / subtype / price unit)
function ChipSelector({ options, value, onChange, colors }: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          style={[chipS.chip, { borderColor: value === o.value ? colors.primary : colors.border, backgroundColor: value === o.value ? colors.primary : colors.card }]}
          onPress={() => { Haptics.selectionAsync(); onChange(o.value); }}
        >
          <Text style={[chipS.text, { color: value === o.value ? colors.primaryForeground : colors.foreground }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
const chipS = StyleSheet.create({
  chip: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  text: { fontSize: 13, fontFamily: "Outfit_500Medium" },
});

// Amenity checkbox chip
function AmenityChip({ label, selected, onToggle, colors }: { label: string; selected: boolean; onToggle: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <Pressable
      style={[amenS.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + "18" : colors.card }]}
      onPress={() => { Haptics.selectionAsync(); onToggle(); }}
    >
      {selected && <Feather name="check" size={11} color={colors.primary} />}
      <Text style={[amenS.text, { color: selected ? colors.primary : colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}
const amenS = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  text: { fontSize: 12, fontFamily: "Outfit_500Medium" },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ListPropertyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();
  const isWeb = Platform.OS === "web";

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "imageUrl", string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [photos, setPhotos] = useState<Array<{ uri: string; uploaded: string | null }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const pickerAddressRef = useRef<string | null>(null);

  const { mutate: createProperty, isPending } = useCreateProperty({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSubmitted(true);
        setForm(EMPTY_FORM);
        setErrors({});
        setPhotos([]);
        setSelectedAmenities([]);
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "Failed to submit your listing. Please try again.");
      },
    },
  });

  const topPadding = isWeb ? 67 : insets.top;
  const styles = getStyles(colors);

  const ALLOWED_ROLES = ["owner", "host", "admin"];
  const canList = user && ALLOWED_ROLES.includes(user.role);

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>List a Property</Text>
        </View>
        <View style={styles.guestContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="home" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.foreground }]}>Sign in to list a property</Text>
          <Text style={[styles.guestSubtitle, { color: colors.mutedForeground }]}>Only authenticated owners and hosts can add property listings</Text>
          <Pressable style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(auth)/login")}>
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!canList) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>List a Property</Text>
        </View>
        <View style={styles.guestContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="lock" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.foreground }]}>Owner account required</Text>
          <Text style={[styles.guestSubtitle, { color: colors.mutedForeground }]}>Contact support to upgrade your account to owner or host.</Text>
        </View>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>List a Property</Text>
        </View>
        <View style={styles.guestContainer}>
          <View style={[styles.iconCircle, { backgroundColor: "#dcfce7", borderColor: "#86efac" }]}>
            <Feather name="check-circle" size={40} color="#16a34a" />
          </View>
          <Text style={[styles.guestTitle, { color: colors.foreground }]}>Listing Submitted!</Text>
          <Text style={[styles.guestSubtitle, { color: colors.mutedForeground }]}>Your property has been submitted for admin review. It will appear once approved.</Text>
          <Pressable style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => setSubmitted(false)}>
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>List Another Property</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleLocationChange(lat: string, lng: string) {
    setForm((prev) => ({ ...prev, lat, lng }));
    setErrors((prev) => ({ ...prev, lat: undefined, lng: undefined }));
  }

  function handleAddressResolved(resolved: string, options?: { replace?: boolean }) {
    setForm((prev) => {
      const canReplace = options?.replace
        || prev.address.trim() === ""
        || prev.address === pickerAddressRef.current;
      if (!canReplace) return prev;
      pickerAddressRef.current = resolved;
      return { ...prev, address: resolved };
    });
    setErrors((prev) => ({ ...prev, address: undefined }));
  }

  const toggleAmenity = (a: string) => {
    setSelectedAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      const filename = uri.split("/").pop() || "photo.jpg";
      const ext = filename.split(".").pop() || "jpg";
      const formData = new FormData();
      formData.append("file", { uri, name: filename, type: "image/" + ext } as never);
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/storage/objects`, {
        method: "POST",
        headers: { Authorization: "Bearer " + (token || "") },
        body: formData,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.url || data.path || null;
    } catch { return null; }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") { Alert.alert("Permission needed", "Please allow photo library access."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.8 });
    if (!result.canceled) await addAssets(result.assets);
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== "granted") { Alert.alert("Permission needed", "Please allow camera access."); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) await addAssets(result.assets);
  };

  const addAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    setIsUploading(true);
    const newItems = assets.map((a) => ({ uri: a.uri, uploaded: null as string | null }));
    setPhotos((prev) => [...prev, ...newItems]);
    const urls = await Promise.all(newItems.map((item) => uploadPhoto(item.uri)));
    setPhotos((prev) => {
      const updated = [...prev];
      let idx = updated.length - newItems.length;
      urls.forEach((url) => { if (idx < updated.length) { updated[idx] = { ...updated[idx], uploaded: url }; idx++; } });
      return updated;
    });
    const failed = urls.filter((u) => u === null).length;
    if (failed > 0) Alert.alert("Upload issue", `${failed} photo(s) could not be uploaded.`);
    setIsUploading(false);
  };

  const removePhoto = (index: number) => setPhotos((prev) => prev.filter((_, i) => i !== index));

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState | "imageUrl", string>> = {};
    if (!form.title.trim()) newErrors.title = "Title is required";
    if (!form.address.trim()) newErrors.address = "Address is required";
    if (photos.length === 0) newErrors.imageUrl = "At least one photo is required";
    else if (photos.some((p) => p.uploaded === null)) newErrors.imageUrl = "Wait for photos to finish uploading";
    const price = parseFloat(form.price);
    if (!form.price.trim() || isNaN(price) || price <= 0) newErrors.price = "Enter a valid price";
    if (form.beds && (isNaN(parseInt(form.beds)) || parseInt(form.beds) < 0)) newErrors.beds = "Enter a valid number";
    if (form.baths && (isNaN(parseInt(form.baths)) || parseInt(form.baths) < 0)) newErrors.baths = "Enter a valid number";
    if (form.sqft && (isNaN(parseInt(form.sqft)) || parseInt(form.sqft) < 0)) newErrors.sqft = "Enter a valid number";
    if (form.lat.trim() !== "") {
      const latVal = parseFloat(form.lat);
      if (isNaN(latVal) || latVal < -90 || latVal > 90) newErrors.lat = "Latitude must be between -90 and 90";
    }
    if (form.lng.trim() !== "") {
      const lngVal = parseFloat(form.lng);
      if (isNaN(lngVal) || lngVal < -180 || lngVal > 180) newErrors.lng = "Longitude must be between -180 and 180";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (isUploading) { Alert.alert("Please wait", "Photos are still uploading."); return; }
    if (!validate()) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const guests = form.guests ? parseInt(form.guests) : undefined;
    const hourlyRate = form.hourlyRate ? parseInt(form.hourlyRate) : undefined;
    const totalUnits = form.totalUnits ? parseInt(form.totalUnits) : 1;
    createProperty({
      data: {
        title: form.title.trim(),
        type: form.type,
        price: parseFloat(form.price),
        address: form.address.trim(),
        ...(form.beds ? { beds: parseInt(form.beds) } : {}),
        ...(form.baths ? { baths: parseInt(form.baths) } : {}),
        ...(form.sqft ? { sqft: parseInt(form.sqft) } : {}),
        ...(guests ? { guests } : {}),
        ...(hourlyRate ? { hourlyRate } : {}),
        ...(form.subtype ? { subtype: form.subtype.toLowerCase().replace(/ /g, "_") } : {}),
        ...(form.priceUnit ? { priceUnit: form.priceUnit } : {}),
        totalUnits: isNaN(totalUnits) || totalUnits < 1 ? 1 : totalUnits,
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
        image: photos[0]?.uploaded || "",
        images: photos.map((p) => p.uploaded).filter((u): u is string => u !== null),
        tags: selectedAmenities,
        ...(form.lat.trim() && form.lng.trim() ? { lat: form.lat.trim(), lng: form.lng.trim() } : {}),
      },
    });
  }

  const subtypes = getSubtypes(form.type);
  const showHourlyRate = form.type === "bnb" || form.type === "hotel";
  const showGuests = form.type === "bnb" || form.type === "hotel" || form.type === "hostel";
  const showTotalUnits = form.type !== "sale";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>List a Property</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Fill in the details. Your listing goes to admin review before publishing.</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: isWeb ? 34 + 84 : insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Basic Info ── */}
          <SectionLabel text="Basic Info" colors={colors} />

          <Field label="Property Title *" error={errors.title} colors={colors}>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: errors.title ? colors.destructive : colors.border, backgroundColor: colors.card }]}
              placeholder="e.g. Modern 2BR Apartment in Westlands"
              placeholderTextColor={colors.mutedForeground}
              value={form.title}
              onChangeText={(v) => setField("title", v)}
              returnKeyType="next"
            />
          </Field>

          <Field label="Property Type *" error={undefined} colors={colors}>
            <ChipSelector
              options={PROPERTY_TYPES.map((t) => ({ label: t.label, value: t.value }))}
              value={form.type}
              onChange={(v) => { setField("type", v as PropertyType); setField("subtype", ""); }}
              colors={colors}
            />
          </Field>

          {/* Sub-type */}
          {subtypes.length > 0 && (
            <Field label="Sub-type" error={undefined} colors={colors}>
              <ChipSelector
                options={subtypes.map((s) => ({ label: s, value: s }))}
                value={form.subtype}
                onChange={(v) => setField("subtype", v)}
                colors={colors}
              />
            </Field>
          )}

          {/* Price & unit */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Price (KES) *" error={errors.price} colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: errors.price ? colors.destructive : colors.border, backgroundColor: colors.card }]}
                  placeholder="e.g. 8500"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.price}
                  onChangeText={(v) => setField("price", v)}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Price Unit" error={undefined} colors={colors}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {PRICE_UNITS.map((u) => (
                    <Pressable key={u.value} style={[chipS.chip, { borderColor: form.priceUnit === u.value ? colors.primary : colors.border, backgroundColor: form.priceUnit === u.value ? colors.primary : colors.card, paddingHorizontal: 10, paddingVertical: 6 }]}
                      onPress={() => setField("priceUnit", form.priceUnit === u.value ? "" : u.value)}>
                      <Text style={[chipS.text, { color: form.priceUnit === u.value ? colors.primaryForeground : colors.foreground, fontSize: 11 }]}>{u.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </Field>
            </View>
          </View>

          {/* Hourly rate for BnB/Hotel */}
          {showHourlyRate && (
            <Field label="Hourly Rate (KES, optional)" error={undefined} colors={colors}>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="e.g. 500"
                placeholderTextColor={colors.mutedForeground}
                value={form.hourlyRate}
                onChangeText={(v) => setField("hourlyRate", v)}
                keyboardType="number-pad"
                returnKeyType="next"
              />
            </Field>
          )}

          <Field label="Address * (auto-filled when you pin a location)" error={errors.address} colors={colors}>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: errors.address ? colors.destructive : colors.border, backgroundColor: colors.card }]}
              placeholder="e.g. 14 Lenana Road, Nairobi"
              placeholderTextColor={colors.mutedForeground}
              value={form.address}
              onChangeText={(v) => {
                pickerAddressRef.current = null;
                setField("address", v);
              }}
              returnKeyType="next"
            />
          </Field>

          {/* ── Details ── */}
          <SectionLabel text="Details (optional)" colors={colors} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Beds" error={errors.beds} colors={colors}>
                <TextInput style={[styles.input, { color: colors.foreground, borderColor: errors.beds ? colors.destructive : colors.border, backgroundColor: colors.card }]}
                  placeholder="2" placeholderTextColor={colors.mutedForeground} value={form.beds} onChangeText={(v) => setField("beds", v)} keyboardType="number-pad" returnKeyType="next" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Baths" error={errors.baths} colors={colors}>
                <TextInput style={[styles.input, { color: colors.foreground, borderColor: errors.baths ? colors.destructive : colors.border, backgroundColor: colors.card }]}
                  placeholder="1" placeholderTextColor={colors.mutedForeground} value={form.baths} onChangeText={(v) => setField("baths", v)} keyboardType="number-pad" returnKeyType="next" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Sqft" error={errors.sqft} colors={colors}>
                <TextInput style={[styles.input, { color: colors.foreground, borderColor: errors.sqft ? colors.destructive : colors.border, backgroundColor: colors.card }]}
                  placeholder="900" placeholderTextColor={colors.mutedForeground} value={form.sqft} onChangeText={(v) => setField("sqft", v)} keyboardType="number-pad" returnKeyType="next" />
              </Field>
            </View>
          </View>

          <View style={styles.row}>
            {showGuests && (
              <View style={{ flex: 1 }}>
                <Field label="Max Guests" error={undefined} colors={colors}>
                  <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                    placeholder="4" placeholderTextColor={colors.mutedForeground} value={form.guests} onChangeText={(v) => setField("guests", v)} keyboardType="number-pad" returnKeyType="next" />
                </Field>
              </View>
            )}
            {showTotalUnits && (
              <View style={{ flex: 1 }}>
                <Field label="Total Units" error={undefined} colors={colors}>
                  <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                    placeholder="1" placeholderTextColor={colors.mutedForeground} value={form.totalUnits} onChangeText={(v) => setField("totalUnits", v)} keyboardType="number-pad" returnKeyType="next" />
                </Field>
              </View>
            )}
          </View>

          <Field label="Description" error={undefined} colors={colors}>
            <TextInput
              style={[styles.input, styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Describe your property — amenities, location, rules…"
              placeholderTextColor={colors.mutedForeground}
              value={form.description}
              onChangeText={(v) => setField("description", v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Field>

          {/* ── Amenities ── */}
          <SectionLabel text="Amenities / Features" colors={colors} />

          <Text style={[{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.mutedForeground, marginTop: -6 }]}>Unit amenities</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {AMENITIES_UNIT.map((a) => (
              <AmenityChip key={a} label={a} selected={selectedAmenities.includes(a)} onToggle={() => toggleAmenity(a)} colors={colors} />
            ))}
          </View>

          <Text style={[{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.mutedForeground, marginTop: 4 }]}>Building / complex</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {AMENITIES_BUILDING.map((a) => (
              <AmenityChip key={a} label={a} selected={selectedAmenities.includes(a)} onToggle={() => toggleAmenity(a)} colors={colors} />
            ))}
          </View>

          {selectedAmenities.length > 0 && (
            <View style={[{ backgroundColor: colors.muted, padding: 10, borderRadius: 8, flexDirection: "row", flexWrap: "wrap", gap: 4 }]}>
              <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }}>
                Selected: {selectedAmenities.join(", ")}
              </Text>
            </View>
          )}

          {/* ── Photos ── */}
          <SectionLabel text="Photos *" colors={colors} />
          <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.mutedForeground, marginTop: -8 }}>At least one photo is required</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable style={[styles.photoPickerBtn, { backgroundColor: colors.muted, borderColor: colors.border }]} onPress={pickFromLibrary} disabled={isUploading}>
              <Feather name="image" size={20} color={colors.foreground} />
              <Text style={[styles.photoPickerText, { color: colors.foreground }]}>Gallery</Text>
            </Pressable>
            <Pressable style={[styles.photoPickerBtn, { backgroundColor: colors.muted, borderColor: colors.border }]} onPress={pickFromCamera} disabled={isUploading}>
              <Feather name="camera" size={20} color={colors.foreground} />
              <Text style={[styles.photoPickerText, { color: colors.foreground }]}>Camera</Text>
            </Pressable>
          </View>
          {isUploading && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ fontSize: 13, fontFamily: "Outfit_400Regular", color: colors.mutedForeground }}>Uploading...</Text>
            </View>
          )}
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {photos.map((photo, index) => (
                <View key={index} style={{ width: 80, height: 80, position: "relative" }}>
                  <Image source={{ uri: photo.uri }} style={{ width: 80, height: 80, borderRadius: 8 }} resizeMode="cover" />
                  {photo.uploaded === null && !isUploading && (
                    <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 8, alignItems: "center", justifyContent: "center" }}>
                      <Feather name="alert-circle" size={16} color="#fff" />
                    </View>
                  )}
                  <Pressable style={{ position: "absolute", top: -6, right: -6, backgroundColor: "#ef4444", borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center" }} onPress={() => removePhoto(index)}>
                    <Feather name="x" size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
          {errors.imageUrl ? <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.destructive }}>{errors.imageUrl}</Text> : null}

          {/* ── Location ── */}
          <SectionLabel text="Location (optional)" colors={colors} />
          <LocationPicker
            lat={form.lat}
            lng={form.lng}
            onLocationChange={handleLocationChange}
            onAddressResolved={handleAddressResolved}
            latError={errors.lat}
            lngError={errors.lng}
          />

          <Pressable
            style={[styles.submitBtn, { backgroundColor: isPending ? colors.muted : colors.primary }]}
            onPress={handleSubmit}
            disabled={isPending}
          >
            {isPending ? <ActivityIndicator size="small" color={colors.mutedForeground} /> : (
              <>
                <Feather name="upload" size={18} color={colors.primaryForeground} />
                <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>Submit Listing</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingBottom: 12, gap: 4 },
    title: { fontSize: 24, fontFamily: "Outfit_700Bold" },
    subtitle: { fontSize: 13, fontFamily: "Outfit_400Regular", lineHeight: 18 },
    content: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },
    guestContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
    iconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 8 },
    guestTitle: { fontSize: 22, fontFamily: "Outfit_700Bold", textAlign: "center" },
    guestSubtitle: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 20 },
    primaryBtn: { paddingHorizontal: 48, paddingVertical: 14, marginTop: 8, width: "100%", alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
    primaryBtnText: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
    input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Outfit_400Regular", borderRadius: 8 },
    textarea: { height: 100, paddingTop: 12 },
    row: { flexDirection: "row", gap: 10 },
    submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, marginTop: 8, borderRadius: 8 },
    submitBtnText: { fontSize: 16, fontFamily: "Outfit_600SemiBold" },
    photoPickerBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderWidth: 1, borderRadius: 8 },
    photoPickerText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  });
}
