import { useListProperties, useListFeaturedProperties } from "@workspace/api-client-react";
import type { ListPropertiesParams, Property } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyMapView, type MapBBox } from "@/components/PropertyMapView";
import { BrandLogo } from "@/components/BrandLogo";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl } from "@/utils/api";
import { AccountUpgradeModal } from "@/components/AccountUpgradeModal";
import { normalizePropertySubtype } from "@workspace/property-categories";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_HEIGHT = Math.round(SCREEN_HEIGHT * 0.36);

// ── Filter types ────────────────────────────────────────────────────────────
type FilterItem = {
  label: string;
  value: ListPropertiesParams["type"];
  hasDropdown: boolean;
};

const FILTER_TYPES: FilterItem[] = [
  { label: "All",    value: undefined,  hasDropdown: false },
  { label: "BnB",    value: "bnb",      hasDropdown: false },
  { label: "Rent",   value: "rent",     hasDropdown: true  },
  { label: "Hostel", value: "hostel",   hasDropdown: false },
  { label: "Hotel",  value: "hotel",    hasDropdown: false },
  { label: "Buy",    value: "sale",     hasDropdown: true  },
];

const RENT_SUBS = [
  { section: "Apartments",  items: ["Studio / Bedsitter", "By Bedrooms", "Penthouse", "Own Compound", "Condominiums"] },
  { section: "Commercial",  items: ["Office Space", "Godowns", "Stalls", "Shops"] },
];

const BUY_SUBS = [
  { section: null, items: ["Apartments", "Homes", "Lands"] },
];

type SortOption = "price-asc" | "price-desc" | "newest" | "distance";

const SORT_OPTIONS: { label: string; value: SortOption; icon: string }[] = [
  { label: "Price ↑", value: "price-asc",  icon: "trending-up"   },
  { label: "Price ↓", value: "price-desc", icon: "trending-down"  },
  { label: "Newest",  value: "newest",     icon: "clock"          },
  { label: "Nearest", value: "distance",   icon: "navigation"     },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function matchesSubCategory(property: Property, category: string | null): boolean {
  if (!category) return true;
  const subtype = normalizePropertySubtype(property.subtype) ?? "";
  const is = (...values: string[]) => values.includes(subtype);

  switch (category) {
    case "Studio / Bedsitter": return is("studio", "bedsitter");
    case "By Bedrooms": return (property.beds ?? 0) >= 1;
    case "Penthouse": return is("penthouse");
    case "Own Compound": return is("own-compound", "bungalow", "villa", "maisonette");
    case "Condominiums": return is("condominium", "condo");
    case "Office Space": return is("business", "office");
    case "Godowns": return is("godown");
    case "Stalls": return is("stall");
    case "Shops": return is("shop");
    case "Apartments": return is("apartment", "condominium", "condo");
    case "Homes": return is("home", "bungalow", "villa", "maisonette", "townhouse");
    case "Lands": return is("land");
    default: return true;
  }
}

// ── Section Block ────────────────────────────────────────────────────────────
function SectionBlock({
  title,
  properties,
  total,
  onExploreMore,
  colors,
}: {
  title: string;
  properties: Property[];
  total: number;
  onExploreMore?: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  if (properties.length === 0) return null;
  // Pair items for 2-column layout
  const rows: Property[][] = [];
  for (let i = 0; i < properties.length; i += 2) {
    rows.push(properties.slice(i, i + 2));
  }

  return (
    <View style={secStyles.wrapper}>
      <View style={secStyles.sectionHeader}>
        <Text style={[secStyles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        {total > 10 && onExploreMore && (
          <Pressable onPress={onExploreMore}>
            <Text style={[secStyles.viewAll, { color: colors.primary }]}>View all ({total})</Text>
          </Pressable>
        )}
      </View>
      {rows.map((row, idx) => (
        <View key={idx} style={secStyles.row}>
          {row.map((p) => <PropertyCard key={p.id} property={p} />)}
          {row.length === 1 && <View style={{ width: (SCREEN_WIDTH - 48) / 2 }} />}
        </View>
      ))}
      {total > 10 && onExploreMore && (
        <Pressable
          style={[secStyles.exploreBtn, { borderColor: colors.border, backgroundColor: colors.muted }]}
          onPress={onExploreMore}
        >
          <Feather name="arrow-right-circle" size={16} color={colors.primary} />
          <Text style={[secStyles.exploreBtnText, { color: colors.foreground }]}>
            Explore {total - 10}+ more
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const secStyles = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontFamily: "Outfit_700Bold" },
  viewAll: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  row: { flexDirection: "row", gap: 16, marginBottom: 16 },
  exploreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderWidth: 1, borderRadius: 10, marginTop: 4, marginBottom: 8 },
  exploreBtnText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
});

// ── Sub-category modal ───────────────────────────────────────────────────────
interface ModalSection { section: string | null; items: string[]; }

function SubCategoryModal({ visible, onClose, title, sections, activeItem, onSelect, colors }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  sections: ModalSection[];
  activeItem: string | null;
  onSelect: (sub: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={modalS.overlay} onPress={onClose}>
        <Pressable style={[modalS.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={[modalS.handle, { backgroundColor: colors.border }]} />
          <Text style={[modalS.title, { color: colors.foreground }]}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {sections.map((sec, si) => (
              <View key={si}>
                {sec.section && (
                  <Text style={[modalS.sectionLabel, { color: colors.mutedForeground }]}>{sec.section.toUpperCase()}</Text>
                )}
                {sec.items.map((item) => {
                  const isActive = activeItem === item;
                  return (
                    <Pressable key={item} style={[modalS.item, { borderBottomColor: colors.border }, isActive && { backgroundColor: colors.muted }]} onPress={() => onSelect(item)}>
                      <Text style={[modalS.itemText, { color: colors.foreground }]}>{item}</Text>
                      {isActive && <Feather name="check" size={16} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          <Pressable style={[modalS.cancelBtn, { borderTopColor: colors.border }]} onPress={onClose}>
            <Text style={[modalS.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, maxHeight: "75%" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontFamily: "Outfit_700Bold", paddingHorizontal: 20, marginBottom: 12 },
  sectionLabel: { fontSize: 10, fontFamily: "Outfit_600SemiBold", letterSpacing: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  itemText: { fontSize: 15, fontFamily: "Outfit_400Regular" },
  cancelBtn: { paddingVertical: 18, alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4 },
  cancelText: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
});

// ── Main screen ──────────────────────────────────────────────────────────────
export default function BrowseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [activeType, setActiveType] = useState<ListPropertiesParams["type"]>(undefined);
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [rentModalVisible, setRentModalVisible] = useState(false);
  const [buyModalVisible, setBuyModalVisible] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBBox | null>(null);
  const [mapFocusRegion, setMapFocusRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [placeResults, setPlaceResults] = useState<Array<{ placeId: string; description: string; secondaryText: string }>>([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeFocused, setPlaceFocused] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const placeRequestRef = useRef(0);

  const handleListPropertyPress = () => {
    if (!user) {
      router.push("/(auth)/login" as never);
    } else if (user.role === "tenant" || user.role === "guest") {
      setShowUpgradeModal(true);
    } else {
      router.push("/(tabs)/list-property" as never);
    }
  };

  const listParams: ListPropertiesParams = {
    type: activeType,
    subtype:
      activeSubCategory === "Office Space" ? "business" :
      activeSubCategory === "Godowns" ? "godown" :
      activeSubCategory === "Stalls" ? "stall" :
      activeSubCategory === "Shops" ? "shop" :
      undefined,
    search: debouncedSearch || undefined,
    ...(mapBounds ?? {}),
  };

  const { data: properties, isLoading, error, refetch } = useListProperties(listParams);
  const { data: featuredProperties, refetch: refetchFeatured } = useListFeaturedProperties();

  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    (async () => {
      setLocationLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!active) return;
        if (status !== "granted") {
          setLocationNotice("Location is off. You can still search a place or browse the default map area.");
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!active) return;
        const region = { latitude: position.coords.latitude, longitude: position.coords.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 };
        setUserLocation({ lat: region.latitude, lng: region.longitude });
        setMapFocusRegion(region);
      } catch {
        if (active) setLocationNotice("Your location could not be loaded. You can still search a place or browse the default map area.");
      } finally {
        if (active) setLocationLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filteredProperties = useMemo<Property[]>(() => {
    if (!properties) return [];
    let arr = [...properties];
    arr = arr.filter((property) => matchesSubCategory(property, activeSubCategory));
    const maxP = priceMax ? Number(priceMax.replace(/,/g, "")) : NaN;
    if (!isNaN(maxP) && maxP > 0) arr = arr.filter((p) => p.price <= maxP);
    if (sortBy === "price-asc") arr.sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") arr.sort((a, b) => b.price - a.price);
    else if (sortBy === "distance" && userLocation) {
      arr.sort((a, b) => {
        if (!a.lat || !a.lng) return 1;
        if (!b.lat || !b.lng) return -1;
        return haversineKm(userLocation.lat, userLocation.lng, parseFloat(a.lat), parseFloat(a.lng)) -
               haversineKm(userLocation.lat, userLocation.lng, parseFloat(b.lat), parseFloat(b.lng));
      });
    } else {
      arr.sort((a, b) => {
        const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bT - aT;
      });
    }
    return arr;
  }, [properties, sortBy, userLocation, priceMax, activeSubCategory]);

  // Categorised sections (when no active type filter)
  const bnbHotelProperties = useMemo(
    () => filteredProperties.filter((p) => ["bnb", "hotel", "hostel"].includes(p.type)),
    [filteredProperties]
  );
  const rentProperties = useMemo(
    () => filteredProperties.filter((p) => p.type === "rent"),
    [filteredProperties]
  );
  const saleProperties = useMemo(
    () => filteredProperties.filter((p) => p.type === "sale"),
    [filteredProperties]
  );

  const handleSearch = (text: string) => {
    setSearch(text);
    clearTimeout((handleSearch as { _t?: ReturnType<typeof setTimeout> })._t);
    (handleSearch as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => setDebouncedSearch(text), 400);
    const requestId = ++placeRequestRef.current;
    if (!token || text.trim().length < 2) {
      setPlaceResults([]);
      setPlaceLoading(false);
      return;
    }
    setPlaceLoading(true);
    setTimeout(async () => {
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/api/maps/places?query=${encodeURIComponent(text.trim())}&sessiontoken=browse-${Date.now()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const payload = await response.json() as { results?: Array<{ placeId: string; description: string; secondaryText: string }> };
        if (requestId === placeRequestRef.current) setPlaceResults(payload.results ?? []);
      } catch {
        if (requestId === placeRequestRef.current) setPlaceResults([]);
      } finally {
        if (requestId === placeRequestRef.current) setPlaceLoading(false);
      }
    }, 350);
  };

  const selectPlace = async (place: { placeId: string; description: string }) => {
    if (!token) return;
    setPlaceLoading(true);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/maps/places/${encodeURIComponent(place.placeId)}?sessiontoken=browse-${Date.now()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const payload = await response.json() as { place?: { latitude: number; longitude: number }; error?: string };
      if (!response.ok || !payload.place) throw new Error(payload.error ?? "Place unavailable");
      const region = { latitude: payload.place.latitude, longitude: payload.place.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 };
      setSearch(place.description);
      setDebouncedSearch("");
      setPlaceResults([]);
      setPlaceFocused(false);
      setMapFocusRegion(region);
      setMapBounds({
        minLat: region.latitude - region.latitudeDelta / 2,
        maxLat: region.latitude + region.latitudeDelta / 2,
        minLng: region.longitude - region.longitudeDelta / 2,
        maxLng: region.longitude + region.longitudeDelta / 2,
      });
    } catch (error) {
      setLocationNotice(error instanceof Error ? error.message : "That place could not be loaded. Please choose another suggestion.");
    } finally {
      setPlaceLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchFeatured()]);
    setRefreshing(false);
  };

  const handleFilterChipPress = (item: FilterItem) => {
    if (item.hasDropdown) {
      if (item.value === "rent") setRentModalVisible(true);
      else if (item.value === "sale") setBuyModalVisible(true);
    } else {
      setActiveType(item.value);
      setActiveSubCategory(null);
    }
  };

  const handleSubCategorySelect = (mainType: ListPropertiesParams["type"], sub: string) => {
    setActiveType(mainType);
    setActiveSubCategory(sub);
    setRentModalVisible(false);
    setBuyModalVisible(false);
  };

  const handleSortChange = async (option: SortOption) => {
    if (option === "distance") {
      if (userLocation) { setSortBy("distance"); return; }
      setLocationLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortBy("distance");
      } catch { /* keep previous */ }
      finally { setLocationLoading(false); }
    } else {
      setSortBy(option);
    }
  };

  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const styles = getStyles(colors, topPadding);

  const hasAnySections = bnbHotelProperties.length > 0 || rentProperties.length > 0 || saleProperties.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isWeb ? 34 + 100 : insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header, menu, map, and listings intentionally share one scroll surface. */}
        <View style={styles.header}>
          <BrandLogo />
          <Pressable
            style={[styles.listPropertyButton, { borderColor: colors.border, backgroundColor: colors.muted }]}
            onPress={handleListPropertyPress}
            testID="browse-list-property"
          >
            <Feather name="plus-square" size={15} color={colors.foreground} />
            <Text style={[styles.listPropertyButtonText, { color: colors.foreground }]}>List</Text>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          {FILTER_TYPES.map((item) => {
            const isActive = activeType === item.value || (item.value === "rent" && activeType === "rent") || (item.value === "sale" && activeType === "sale");
            return (
              <Pressable
                key={item.label}
                style={[styles.filterChip, { backgroundColor: isActive ? colors.primary : colors.muted, borderColor: isActive ? colors.primary : colors.border }]}
                onPress={() => handleFilterChipPress(item)}
              >
                <Text numberOfLines={1} style={[styles.filterChipText, { color: isActive ? colors.primaryForeground : colors.foreground }]}>
                  {item.label}
                </Text>
                {item.hasDropdown && <Feather name="chevron-down" size={10} color={isActive ? colors.primaryForeground : colors.mutedForeground} />}
              </Pressable>
            );
          })}
        </View>

        {activeSubCategory && (
          <View style={[styles.subCategoryBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.subCategoryText, { color: colors.mutedForeground }]}>{activeSubCategory}</Text>
            <Pressable onPress={() => setActiveSubCategory(null)}>
              <Feather name="x" size={12} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}

        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((opt) => {
            const isActive = sortBy === opt.value;
            const isDistanceLoading = opt.value === "distance" && locationLoading;
            return (
              <Pressable
                key={opt.value}
                style={[styles.sortChip, { backgroundColor: isActive ? colors.primary : colors.muted, borderColor: isActive ? colors.primary : colors.border, opacity: isDistanceLoading ? 0.6 : 1 }]}
                onPress={() => handleSortChange(opt.value)}
                disabled={isDistanceLoading}
              >
                {isDistanceLoading ? <ActivityIndicator size={12} color={colors.mutedForeground} /> : (
                  <Feather name={opt.icon as React.ComponentProps<typeof Feather>["name"]} size={11} color={isActive ? colors.primaryForeground : colors.mutedForeground} />
                )}
                <Text numberOfLines={1} style={[styles.sortChipText, { color: isActive ? colors.primaryForeground : colors.foreground }]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.searchRow}>
          <View style={[styles.searchCol, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="tag" size={14} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchColInput, { color: colors.foreground, fontFamily: "Outfit_400Regular" }]}
              placeholder="Max price…"
              placeholderTextColor={colors.mutedForeground}
              value={priceMax}
              onChangeText={setPriceMax}
              keyboardType="numeric"
              returnKeyType="done"
            />
            {priceMax.length > 0 && <Pressable onPress={() => setPriceMax("")}><Feather name="x" size={13} color={colors.mutedForeground} /></Pressable>}
          </View>
          <View style={[styles.searchCol, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="search" size={14} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchColInput, { color: colors.foreground, fontFamily: "Outfit_400Regular" }]}
              placeholder="Name, area…"
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={handleSearch}
              onFocus={() => setPlaceFocused(true)}
              onBlur={() => setTimeout(() => setPlaceFocused(false), 150)}
              returnKeyType="search"
            />
            {search.length > 0 && <Pressable onPress={() => { setSearch(""); setDebouncedSearch(""); }}><Feather name="x" size={13} color={colors.mutedForeground} /></Pressable>}
          </View>
        </View>
        {placeFocused && search.trim().length >= 2 && (
          <View style={[styles.placeSuggestions, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {placeLoading && placeResults.length === 0 ? <ActivityIndicator color={colors.primary} /> : placeResults.map((place) => (
              <Pressable key={place.placeId} style={[styles.placeSuggestion, { borderBottomColor: colors.border }]} onPress={() => void selectPlace(place)}>
                <Feather name="map-pin" size={14} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.placeMain, { color: colors.foreground }]} numberOfLines={1}>{place.description}</Text>
                  {!!place.secondaryText && <Text style={[styles.placeSecondary, { color: colors.mutedForeground }]} numberOfLines={1}>{place.secondaryText}</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        )}
        {locationNotice && <Text style={[styles.locationNotice, { color: colors.mutedForeground }]}>{locationNotice}</Text>}

        {isLoading ? (
          <View style={[styles.center, styles.loadingState]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading properties…</Text>
          </View>
        ) : error ? (
          <View style={[styles.center, styles.loadingState]}>
            <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Failed to load properties</Text>
            <Pressable style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.mapWrapper}>
              <PropertyMapView properties={filteredProperties} onSearchArea={setMapBounds} focusRegion={mapFocusRegion} />
            </View>

            {filteredProperties.length === 0 ? (
              <View style={[styles.center, styles.emptyState]}>
                <Feather name="home" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No properties found</Text>
              </View>
            ) : activeType ? (
              <SectionBlock
                title={activeSubCategory ? activeSubCategory : FILTER_TYPES.find((f) => f.value === activeType)?.label ?? "Results"}
                properties={filteredProperties}
                total={filteredProperties.length}
                colors={colors}
              />
            ) : hasAnySections ? (
              <>
                {!!featuredProperties?.length && (
                  <SectionBlock
                    title="Featured Listings"
                    properties={featuredProperties.slice(0, 10)}
                    total={featuredProperties.length}
                    colors={colors}
                  />
                )}
                <SectionBlock
                  title="BnB & Hotels"
                  properties={bnbHotelProperties.slice(0, 10)}
                  total={bnbHotelProperties.length}
                  onExploreMore={() => { setActiveType("bnb"); setActiveSubCategory(null); }}
                  colors={colors}
                />
                <SectionBlock
                  title="Latest Rentals"
                  properties={rentProperties.slice(0, 10)}
                  total={rentProperties.length}
                  onExploreMore={() => { setActiveType("rent"); setActiveSubCategory(null); }}
                  colors={colors}
                />
                <SectionBlock
                  title="Properties For Sale"
                  properties={saleProperties.slice(0, 10)}
                  total={saleProperties.length}
                  onExploreMore={() => { setActiveType("sale"); setActiveSubCategory(null); }}
                  colors={colors}
                />
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <SubCategoryModal visible={rentModalVisible} onClose={() => setRentModalVisible(false)} title="Rent a Property" sections={RENT_SUBS} activeItem={activeType === "rent" ? activeSubCategory : null} onSelect={(sub) => handleSubCategorySelect("rent", sub)} colors={colors} />
      <SubCategoryModal visible={buyModalVisible} onClose={() => setBuyModalVisible(false)} title="Buy a Property" sections={BUY_SUBS} activeItem={activeType === "sale" ? activeSubCategory : null} onSelect={(sub) => handleSubCategorySelect("sale", sub)} colors={colors} />
      <AccountUpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={() => router.push("/(tabs)/list-property" as never)}
      />
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useColors>, topPadding: number) {
  const hPad = 12;
  const chipGap = 6;
  const filterCount = FILTER_TYPES.length;
  const sortCount = SORT_OPTIONS.length;
  const filterChipW = Math.floor((SCREEN_WIDTH - hPad * 2 - chipGap * (filterCount - 1)) / filterCount);
  const sortChipW   = Math.floor((SCREEN_WIDTH - hPad * 2 - chipGap * (sortCount - 1)) / sortCount);

  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: topPadding + 16, paddingHorizontal: hPad, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    listPropertyButton: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
    listPropertyButtonText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
    scrollView: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    filterRow: { flexDirection: "row", paddingHorizontal: hPad, gap: chipGap },
    filterChip: { width: filterChipW, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 8, borderWidth: 1, borderRadius: 20 },
    filterChipText: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },
    subCategoryBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginHorizontal: hPad, marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    subCategoryText: { fontSize: 11, fontFamily: "Outfit_400Regular" },
    sortRow: { flexDirection: "row", paddingHorizontal: hPad, paddingTop: 8, gap: chipGap },
    sortChip: { width: sortChipW, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 7, borderWidth: 1, borderRadius: 20 },
    sortChipText: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },
    searchRow: { flexDirection: "row", paddingHorizontal: hPad, paddingTop: 8, gap: 8 },
    searchCol: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderRadius: 10, gap: 6 },
    searchColInput: { flex: 1, fontSize: 13, padding: 0 },
    placeSuggestions: { marginHorizontal: hPad, borderWidth: 1, borderRadius: 10, overflow: "hidden", zIndex: 3 },
    placeSuggestion: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
    placeMain: { fontSize: 13, fontFamily: "Outfit_500Medium" },
    placeSecondary: { fontSize: 11, fontFamily: "Outfit_400Regular", marginTop: 1 },
    locationNotice: { marginHorizontal: hPad, paddingTop: 6, fontSize: 12, fontFamily: "Outfit_400Regular" },
    mapWrapper: { height: MAP_HEIGHT, marginTop: 4 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
    loadingState: { minHeight: MAP_HEIGHT },
    emptyState: { minHeight: MAP_HEIGHT * 0.5 },
    emptyText: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center" },
    retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 8 },
    retryText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  });
}
