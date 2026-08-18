import { useListProperties } from "@workspace/api-client-react";
import type { ListPropertiesParams, Property } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyMapView } from "@/components/PropertyMapView";
import { Feather } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

const FILTER_TYPES = [
  { label: "All", value: undefined },
  { label: "Rent", value: "rent" as const },
  { label: "Sale", value: "sale" as const },
  { label: "BnB", value: "bnb" as const },
  { label: "Hotel", value: "hotel" as const },
  { label: "Hostel", value: "hostel" as const },
];

type SortOption = "price-asc" | "price-desc" | "newest" | "distance";

const SORT_OPTIONS: { label: string; value: SortOption; icon: string }[] = [
  { label: "Price ↑", value: "price-asc", icon: "trending-up" },
  { label: "Price ↓", value: "price-desc", icon: "trending-down" },
  { label: "Newest", value: "newest", icon: "clock" },
  { label: "Nearest", value: "distance", icon: "navigation" },
];

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
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
  const [activeType, setActiveType] = useState<ListPropertiesParams["type"]>(undefined);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const listParams: ListPropertiesParams = {
    type: activeType,
    search: debouncedSearch || undefined,
  };

  const { data: properties, isLoading, error, refetch } = useListProperties(listParams);

  const filteredProperties = useMemo<Property[]>(() => {
    if (!properties) return [];
    const sorted = [...properties];

    if (sortBy === "price-asc") {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortBy === "distance" && userLocation) {
      sorted.sort((a, b) => {
        if (!a.lat || !a.lng) return 1;
        if (!b.lat || !b.lng) return -1;
        const da = haversineKm(userLocation.lat, userLocation.lng, parseFloat(a.lat), parseFloat(a.lng));
        const db = haversineKm(userLocation.lat, userLocation.lng, parseFloat(b.lat), parseFloat(b.lng));
        return da - db;
      });
    } else {
      sorted.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }
    return sorted;
  }, [properties, sortBy, userLocation]);

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

  const handleTypeChange = (type: ListPropertiesParams["type"]) => {
    setActiveType(type);
  };

  const handleSortChange = async (option: SortOption) => {
    if (option === "distance") {
      if (userLocation) {
        setSortBy("distance");
        return;
      }
      setLocationLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationLoading(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortBy("distance");
      } catch {
        // silently fall back — keep previous sort
      } finally {
        setLocationLoading(false);
      }
    } else {
      setSortBy(option);
    }
  };

  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const styles = getStyles(colors);

  // Map height = 2/3 of usable screen area (below header/chips)
  const headerChipsHeight = topPadding + 16 + 48 + 12 + 44 + 10 + 44 + 12;
  const contentHeight = SCREEN_HEIGHT - headerChipsHeight - insets.bottom - 84;
  const mapHeight = Math.round(contentHeight * (2 / 3));
  const listHeight = contentHeight - mapHeight;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header — title only, no toggle button */}
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>inndos</Text>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground, fontFamily: "Outfit_400Regular" }]}
          placeholder="Search properties..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => { setSearch(""); setDebouncedSearch(""); }}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* Filter type chips — evenly distributed across full width */}
      <View style={styles.filterRow}>
        {FILTER_TYPES.map((item) => {
          const isActive = activeType === item.value;
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
              onPress={() => handleTypeChange(item.value)}
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
            </Pressable>
          );
        })}
      </View>

      {/* Sort chips — evenly distributed across full width */}
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
                style={[
                  styles.sortChipText,
                  { color: isActive ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content: Map (2/3) + horizontal card strip (1/3) */}
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
          {/* Map — 2/3 of content area */}
          <View style={{ height: mapHeight, overflow: "hidden" }}>
            <PropertyMapView properties={filteredProperties} />
          </View>

          {/* Horizontal property card strip — 1/3 */}
          <View style={{ height: listHeight }}>
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
                    <View style={[styles.stripCardImg, { backgroundColor: colors.muted }]}>
                      {item.image ? (
                        // eslint-disable-next-line @typescript-eslint/no-require-imports
                        <Text style={[styles.stripCardPrice, { color: colors.primary, position: "absolute", bottom: 4, left: 6, zIndex: 1 }]}>
                          KES {item.price.toLocaleString()}
                        </Text>
                      ) : null}
                      <Feather name="home" size={24} color={colors.mutedForeground} />
                    </View>
                    <View style={styles.stripCardBody}>
                      <Text numberOfLines={1} style={[styles.stripCardTitle, { color: colors.foreground }]}>
                        {item.title}
                      </Text>
                      <Text numberOfLines={1} style={[styles.stripCardAddr, { color: colors.mutedForeground }]}>
                        {item.address}
                      </Text>
                      <Text style={[styles.stripCardPrice, { color: colors.primary }]}>
                        KES {item.price.toLocaleString()}
                      </Text>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useColors>) {
  const hPad = 12;
  const chipGap = 6;
  const filterCount = FILTER_TYPES.length; // 6
  const sortCount = SORT_OPTIONS.length;   // 4
  // Each chip gets an equal share of the available width
  const filterChipW = Math.floor((SCREEN_WIDTH - hPad * 2 - chipGap * (filterCount - 1)) / filterCount);
  const sortChipW = Math.floor((SCREEN_WIDTH - hPad * 2 - chipGap * (sortCount - 1)) / sortCount);

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: hPad,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: "Outfit_700Bold",
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: hPad,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: 1,
      borderRadius: 20,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
    },
    // Type filter chips — fixed equal width, no scroll
    filterRow: {
      flexDirection: "row",
      paddingHorizontal: hPad,
      paddingTop: 12,
      gap: chipGap,
    },
    filterChip: {
      width: filterChipW,
      alignItems: "center",
      paddingVertical: 8,
      borderWidth: 1,
      borderRadius: 20,
    },
    filterChipText: {
      fontSize: 12,
      fontFamily: "Outfit_600SemiBold",
    },
    // Sort chips — fixed equal width, no scroll
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
    cardStrip: {
      paddingHorizontal: hPad,
      paddingVertical: 10,
      gap: 10,
    },
    stripCard: {
      width: 190,
      borderRadius: 10,
      borderWidth: 1,
      overflow: "hidden",
    },
    stripCardImg: {
      height: 80,
      alignItems: "center",
      justifyContent: "center",
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
    stripCardPrice: {
      fontSize: 12,
      fontFamily: "Outfit_700Bold",
    },
    emptyStrip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: hPad,
      borderRadius: 10,
      marginTop: 10,
    },
    emptyStripText: {
      fontSize: 13,
      fontFamily: "Outfit_400Regular",
    },
  });
}
