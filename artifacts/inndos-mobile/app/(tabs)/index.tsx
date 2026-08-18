import { useListProperties } from "@workspace/api-client-react";
import type { ListPropertiesParams, Property } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
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
import { PropertyMapView } from "@/components/PropertyMapView";
import { getImageUrl } from "@/utils/imageUrl";
import { Feather } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;

// ── Filter types — matches website nav exactly ─────────────────────────────
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

// ── Rent sub-categories (mirrors website dropdown) ─────────────────────────
const RENT_SUBS = [
  {
    section: "Apartments",
    items: ["Studio / Bedsitter", "By Bedrooms", "Penthouse", "Own Compound", "Condominiums"],
  },
  {
    section: "Commercial",
    items: ["Office Space", "Godowns", "Stalls", "Shops"],
  },
];

// ── Buy sub-categories (mirrors website dropdown) ──────────────────────────
const BUY_SUBS = [
  {
    section: null,
    items: ["Apartments", "Homes", "Lands"],
  },
];

// ── Sort options ───────────────────────────────────────────────────────────
type SortOption = "price-asc" | "price-desc" | "newest" | "distance";

const SORT_OPTIONS: { label: string; value: SortOption; icon: string }[] = [
  { label: "Price ↑",  value: "price-asc",  icon: "trending-up"   },
  { label: "Price ↓",  value: "price-desc", icon: "trending-down"  },
  { label: "Newest",   value: "newest",     icon: "clock"          },
  { label: "Nearest",  value: "distance",   icon: "navigation"     },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

  const listParams: ListPropertiesParams = {
    type: activeType,
    search: debouncedSearch || undefined,
  };

  const { data: properties, isLoading, error, refetch } = useListProperties(listParams);

  const filteredProperties = useMemo<Property[]>(() => {
    if (!properties) return [];
    let arr = [...properties];

    // Client-side max price filter
    const maxP = priceMax ? Number(priceMax.replace(/,/g, "")) : NaN;
    if (!isNaN(maxP) && maxP > 0) {
      arr = arr.filter((p) => p.price <= maxP);
    }

    if (sortBy === "price-asc") {
      arr.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      arr.sort((a, b) => b.price - a.price);
    } else if (sortBy === "distance" && userLocation) {
      arr.sort((a, b) => {
        if (!a.lat || !a.lng) return 1;
        if (!b.lat || !b.lng) return -1;
        const da = haversineKm(userLocation.lat, userLocation.lng, parseFloat(a.lat), parseFloat(a.lng));
        const db = haversineKm(userLocation.lat, userLocation.lng, parseFloat(b.lat), parseFloat(b.lng));
        return da - db;
      });
    } else {
      arr.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }
    return arr;
  }, [properties, sortBy, userLocation, priceMax]);

  const handleSearch = (text: string) => {
    setSearch(text);
    clearTimeout((handleSearch as { _timer?: ReturnType<typeof setTimeout> })._timer);
    (handleSearch as { _timer?: ReturnType<typeof setTimeout> })._timer = setTimeout(() => {
      setDebouncedSearch(text);
    }, 400);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Tap on a filter chip
  const handleFilterChipPress = (item: FilterItem) => {
    if (item.hasDropdown) {
      if (item.value === "rent") setRentModalVisible(true);
      else if (item.value === "sale") setBuyModalVisible(true);
    } else {
      setActiveType(item.value);
      setActiveSubCategory(null);
    }
  };

  // Select a sub-category from the Rent or Buy modal
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
        if (status !== "granted") { setLocationLoading(false); return; }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortBy("distance");
      } catch { /* keep previous sort */ }
      finally { setLocationLoading(false); }
    } else {
      setSortBy(option);
    }
  };

  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const styles = getStyles(colors, topPadding);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Image
          source={require("@/assets/images/logo-inndos.png")}
          style={styles.headerLogo}
          resizeMode="contain"
          tintColor={Platform.OS !== "web" ? colors.foreground : undefined}
        />
      </View>

      {/* ── Type filter chips ────────────────────────────────────────────── */}
      <View style={styles.filterRow}>
        {FILTER_TYPES.map((item) => {
          const isActive =
            activeType === item.value ||
            (item.value === "rent" && activeType === "rent") ||
            (item.value === "sale" && activeType === "sale");
          return (
            <Pressable
              key={item.label}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.muted,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleFilterChipPress(item)}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.filterChipText,
                  { color: isActive ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {item.label}
              </Text>
              {item.hasDropdown && (
                <Feather
                  name="chevron-down"
                  size={10}
                  color={isActive ? colors.primaryForeground : colors.mutedForeground}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Active sub-category label */}
      {activeSubCategory && (
        <View style={[styles.subCategoryBadge, { backgroundColor: colors.muted }]}>
          <Text style={[styles.subCategoryText, { color: colors.mutedForeground }]}>
            {activeSubCategory}
          </Text>
          <Pressable onPress={() => setActiveSubCategory(null)}>
            <Feather name="x" size={12} color={colors.mutedForeground} />
          </Pressable>
        </View>
      )}

      {/* ── Sort chips ───────────────────────────────────────────────────── */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => {
          const isActive = sortBy === opt.value;
          const isDistanceLoading = opt.value === "distance" && locationLoading;
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.sortChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.muted,
                  borderColor: isActive ? colors.primary : colors.border,
                  opacity: isDistanceLoading ? 0.6 : 1,
                },
              ]}
              onPress={() => handleSortChange(opt.value)}
              disabled={isDistanceLoading}
            >
              {isDistanceLoading ? (
                <ActivityIndicator size={12} color={colors.mutedForeground} />
              ) : (
                <Feather
                  name={opt.icon as React.ComponentProps<typeof Feather>["name"]}
                  size={11}
                  color={isActive ? colors.primaryForeground : colors.mutedForeground}
                />
              )}
              <Text
                numberOfLines={1}
                style={[styles.sortChipText, { color: isActive ? colors.primaryForeground : colors.foreground }]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Two-column search row (just above the map) ───────────────────── */}
      <View style={styles.searchRow}>
        {/* Max price */}
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
          {priceMax.length > 0 && (
            <Pressable onPress={() => setPriceMax("")}>
              <Feather name="x" size={13} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Word search */}
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
          {search.length > 0 && (
            <Pressable onPress={() => { setSearch(""); setDebouncedSearch(""); }}>
              <Feather name="x" size={13} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Map + card strip ─────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Failed to load properties
          </Text>
          <Pressable style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Map — 2/3 of content */}
          <View style={{ flex: 2, overflow: "hidden" }}>
            <PropertyMapView properties={filteredProperties} />
          </View>

          {/* Horizontal card strip — 1/3 of content */}
          <View style={{ flex: 1 }}>
            {filteredProperties.length === 0 ? (
              <View style={[styles.emptyStrip, { backgroundColor: colors.muted }]}>
                <Feather name="home" size={20} color={colors.mutedForeground} />
                <Text style={[styles.emptyStripText, { color: colors.mutedForeground }]}>
                  No properties found
                </Text>
              </View>
            ) : (
              <FlatList
                horizontal
                data={filteredProperties}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardStrip}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={colors.primary}
                  />
                }
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.stripCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push({ pathname: "/property/[id]", params: { id: item.id } })}
                  >
                    {/* Property photo */}
                    <View style={[styles.stripCardImg, { backgroundColor: colors.muted }]}>
                      {item.image ? (
                        <Image
                          source={{ uri: getImageUrl(item.image) }}
                          style={StyleSheet.absoluteFill}
                          resizeMode="cover"
                        />
                      ) : (
                        <Feather name="home" size={24} color={colors.mutedForeground} />
                      )}
                      <View style={styles.stripPriceBadge}>
                        <Text style={styles.stripPriceBadgeText}>
                          KES {item.price.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.stripCardBody}>
                      <Text numberOfLines={1} style={[styles.stripCardTitle, { color: colors.foreground }]}>
                        {item.title}
                      </Text>
                      <Text numberOfLines={1} style={[styles.stripCardAddr, { color: colors.mutedForeground }]}>
                        {item.address}
                      </Text>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      )}

      {/* ── Rent dropdown modal ──────────────────────────────────────────── */}
      <SubCategoryModal
        visible={rentModalVisible}
        onClose={() => setRentModalVisible(false)}
        title="Rent a Property"
        sections={RENT_SUBS}
        activeItem={activeType === "rent" ? activeSubCategory : null}
        onSelect={(sub) => handleSubCategorySelect("rent", sub)}
        colors={colors}
      />

      {/* ── Buy dropdown modal ───────────────────────────────────────────── */}
      <SubCategoryModal
        visible={buyModalVisible}
        onClose={() => setBuyModalVisible(false)}
        title="Buy a Property"
        sections={BUY_SUBS}
        activeItem={activeType === "sale" ? activeSubCategory : null}
        onSelect={(sub) => handleSubCategorySelect("sale", sub)}
        colors={colors}
      />
    </View>
  );
}

// ── Sub-category bottom-sheet modal ────────────────────────────────────────
interface ModalSection { section: string | null; items: string[]; }

function SubCategoryModal({
  visible, onClose, title, sections, activeItem, onSelect, colors,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  sections: ModalSection[];
  activeItem: string | null;
  onSelect: (sub: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable style={[modalStyles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          {/* Handle */}
          <View style={[modalStyles.handle, { backgroundColor: colors.border }]} />

          {/* Title */}
          <Text style={[modalStyles.title, { color: colors.foreground }]}>{title}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {sections.map((sec, si) => (
              <View key={si}>
                {sec.section && (
                  <Text style={[modalStyles.sectionLabel, { color: colors.mutedForeground }]}>
                    {sec.section.toUpperCase()}
                  </Text>
                )}
                {sec.items.map((item) => {
                  const isActive = activeItem === item;
                  return (
                    <Pressable
                      key={item}
                      style={[
                        modalStyles.item,
                        { borderBottomColor: colors.border },
                        isActive && { backgroundColor: colors.muted },
                      ]}
                      onPress={() => onSelect(item)}
                    >
                      <Text style={[modalStyles.itemText, { color: colors.foreground }]}>{item}</Text>
                      {isActive && <Feather name="check" size={16} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          {/* Cancel */}
          <Pressable
            style={[modalStyles.cancelBtn, { borderTopColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[modalStyles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    maxHeight: "75%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "Outfit_700Bold",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
  },
  cancelBtn: {
    paddingVertical: 18,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
  },
});

// ── Main styles ────────────────────────────────────────────────────────────
function getStyles(colors: ReturnType<typeof useColors>, topPadding: number) {
  const hPad = 12;
  const chipGap = 6;
  const filterCount = FILTER_TYPES.length; // 6
  const sortCount = SORT_OPTIONS.length;   // 4
  const filterChipW = Math.floor((SCREEN_WIDTH - hPad * 2 - chipGap * (filterCount - 1)) / filterCount);
  const sortChipW   = Math.floor((SCREEN_WIDTH - hPad * 2 - chipGap * (sortCount - 1))   / sortCount);

  return StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
      paddingTop: topPadding + 16,
      paddingHorizontal: hPad,
      paddingBottom: 10,
    },
    headerLogo: {
      height: 36,
      width: 140,
    },

    // Type filter chips
    filterRow: {
      flexDirection: "row",
      paddingHorizontal: hPad,
      gap: chipGap,
    },
    filterChip: {
      width: filterChipW,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      paddingVertical: 8,
      borderWidth: 1,
      borderRadius: 20,
    },
    filterChipText: {
      fontSize: 11,
      fontFamily: "Outfit_600SemiBold",
    },

    // Active sub-category badge
    subCategoryBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      marginHorizontal: hPad,
      marginTop: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    subCategoryText: {
      fontSize: 11,
      fontFamily: "Outfit_400Regular",
    },

    // Sort chips
    sortRow: {
      flexDirection: "row",
      paddingHorizontal: hPad,
      paddingTop: 8,
      gap: chipGap,
    },
    sortChip: {
      width: sortChipW,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: 7,
      borderWidth: 1,
      borderRadius: 20,
    },
    sortChipText: {
      fontSize: 11,
      fontFamily: "Outfit_600SemiBold",
    },

    // Two-column search row
    searchRow: {
      flexDirection: "row",
      paddingHorizontal: hPad,
      paddingTop: 8,
      gap: 8,
    },
    searchCol: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderWidth: 1,
      borderRadius: 10,
      gap: 6,
    },
    searchColInput: {
      flex: 1,
      fontSize: 13,
      padding: 0,
    },

    // Loading / error
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingHorizontal: 40,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Outfit_400Regular",
      textAlign: "center",
    },
    retryBtn: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 8,
    },
    retryText: {
      fontSize: 14,
      fontFamily: "Outfit_600SemiBold",
    },

    // Card strip
    cardStrip: {
      paddingHorizontal: hPad,
      paddingVertical: 8,
      gap: 10,
    },
    stripCard: {
      width: 180,
      borderRadius: 10,
      borderWidth: 1,
      overflow: "hidden",
    },
    stripCardImg: {
      height: 90,
      alignItems: "center",
      justifyContent: "center",
    },
    stripPriceBadge: {
      position: "absolute",
      bottom: 6,
      left: 6,
      backgroundColor: "rgba(0,0,0,0.6)",
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },
    stripPriceBadgeText: {
      fontSize: 11,
      fontFamily: "Outfit_700Bold",
      color: "#fff",
    },
    stripCardBody: {
      padding: 8,
      gap: 2,
    },
    stripCardTitle: {
      fontSize: 13,
      fontFamily: "Outfit_600SemiBold",
    },
    stripCardAddr: {
      fontSize: 11,
      fontFamily: "Outfit_400Regular",
    },
    emptyStrip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: hPad,
      borderRadius: 10,
      marginTop: 8,
    },
    emptyStripText: {
      fontSize: 13,
      fontFamily: "Outfit_400Regular",
    },
  });
}
