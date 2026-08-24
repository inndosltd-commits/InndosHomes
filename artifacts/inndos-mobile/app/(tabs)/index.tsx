import { useListProperties, useListFeaturedProperties } from "@workspace/api-client-react";
import type { ListPropertiesParams, Property } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import React, { useMemo, useState } from "react";
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
  const subtype = (property.subtype ?? "").toLowerCase();
  const title = (property.title ?? "").toLowerCase();
  const has = (...terms: string[]) => terms.some((term) => subtype.includes(term) || title.includes(term));

  switch (category) {
    case "Studio / Bedsitter": return has("studio", "bedsitter");
    case "By Bedrooms": return (property.beds ?? 0) >= 1;
    case "Penthouse": return has("penthouse");
    case "Own Compound": return has("compound", "bungalow", "villa", "maisonette");
    case "Condominiums": return has("condo", "apartment", "flat");
    case "Office Space": return has("office", "business");
    case "Godowns": return has("godown");
    case "Stalls": return has("stall");
    case "Shops": return has("shop");
    case "Apartments": return has("apartment", "flat", "condo");
    case "Homes": return has("home", "house", "bungalow", "villa", "maisonette", "townhouse");
    case "Lands": return has("land", "plot", "acre");
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

  const listParams: ListPropertiesParams = {
    type: activeType,
    search: debouncedSearch || undefined,
    ...(mapBounds ?? {}),
  };

  const { data: properties, isLoading, error, refetch } = useListProperties(listParams);
  const { data: featuredProperties, refetch: refetchFeatured } = useListFeaturedProperties();

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
              returnKeyType="search"
            />
            {search.length > 0 && <Pressable onPress={() => { setSearch(""); setDebouncedSearch(""); }}><Feather name="x" size={13} color={colors.mutedForeground} /></Pressable>}
          </View>
        </View>

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
              <PropertyMapView properties={filteredProperties} onSearchArea={setMapBounds} />
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
    header: { paddingTop: topPadding + 16, paddingHorizontal: hPad, paddingBottom: 10 },
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
    mapWrapper: { height: MAP_HEIGHT, marginTop: 4 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
    loadingState: { minHeight: MAP_HEIGHT },
    emptyState: { minHeight: MAP_HEIGHT * 0.5 },
    emptyText: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center" },
    retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 8 },
    retryText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  });
}
