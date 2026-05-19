import { useListProperties } from "@workspace/api-client-react";
import type { ListPropertiesParams, Property } from "@workspace/api-client-react";
import type { MapBBox } from "@/components/PropertyMapView";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { PriceRangeSlider } from "@/components/PriceRangeSlider";
import { Feather } from "@expo/vector-icons";

const PRICE_FILTER_KEY = "@inndos/price_filter";

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
  const [showMap, setShowMap] = useState(false);

  const [priceLow, setPriceLow] = useState<number | undefined>(undefined);
  const [priceHigh, setPriceHigh] = useState<number | undefined>(undefined);
  const hasCustomPrice = useRef(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapBBox, setMapBBox] = useState<MapBBox | undefined>(undefined);

  const listParams: ListPropertiesParams = {
    type: activeType,
    search: debouncedSearch || undefined,
    ...(mapBBox && showMap
      ? {
          minLat: mapBBox.minLat,
          maxLat: mapBBox.maxLat,
          minLng: mapBBox.minLng,
          maxLng: mapBBox.maxLng,
        }
      : {}),
  };

  const { data: properties, isLoading, error, refetch } = useListProperties(listParams);

  const priceBounds = useMemo<{ min: number; max: number }>(() => {
    if (!properties || properties.length === 0) return { min: 0, max: 0 };
    const prices = properties.map((p: Property) => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [properties]);

  useEffect(() => {
    AsyncStorage.getItem(PRICE_FILTER_KEY).then((val) => {
      if (!val) return;
      try {
        const { low, high } = JSON.parse(val) as { low: number; high: number };
        if (typeof low === "number" && typeof high === "number") {
          setPriceLow(low);
          setPriceHigh(high);
          hasCustomPrice.current = true;
        }
      } catch {
        // ignore corrupt stored value
      }
    });
  }, []);

  useEffect(() => {
    if (priceBounds.min === 0 && priceBounds.max === 0) return;
    if (hasCustomPrice.current) return;
    setPriceLow(priceBounds.min);
    setPriceHigh(priceBounds.max);
  }, [priceBounds.min, priceBounds.max]);

  const filteredProperties = useMemo<Property[]>(() => {
    if (!properties) return [];
    const lo = priceLow ?? priceBounds.min;
    const hi = priceHigh ?? priceBounds.max;
    const filtered =
      lo <= priceBounds.min && hi >= priceBounds.max
        ? [...properties]
        : properties.filter((p: Property) => p.price >= lo && p.price <= hi);

    if (sortBy === "price-asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === "distance" && userLocation) {
      filtered.sort((a, b) => {
        const aLat = parseFloat(a.lat ?? "");
        const aLng = parseFloat(a.lng ?? "");
        const bLat = parseFloat(b.lat ?? "");
        const bLng = parseFloat(b.lng ?? "");
        const aDist =
          isNaN(aLat) || isNaN(aLng)
            ? Infinity
            : haversineKm(userLocation.lat, userLocation.lng, aLat, aLng);
        const bDist =
          isNaN(bLat) || isNaN(bLng)
            ? Infinity
            : haversineKm(userLocation.lat, userLocation.lng, bLat, bLng);
        return aDist - bDist;
      });
    } else {
      filtered.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }
    return filtered;
  }, [properties, priceLow, priceHigh, priceBounds, sortBy, userLocation]);

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
    setPriceLow(undefined);
    setPriceHigh(undefined);
    hasCustomPrice.current = false;
    AsyncStorage.removeItem(PRICE_FILTER_KEY);
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

  const showPriceSlider =
    priceBounds.min < priceBounds.max &&
    priceLow !== undefined &&
    priceHigh !== undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>INNDOS</Text>
        <Pressable
          onPress={() => {
            setShowMap((v) => {
              if (v) setMapBBox(undefined);
              return !v;
            });
          }}
          style={[
            styles.headerIcon,
            showMap && { backgroundColor: colors.primary, borderRadius: 8 },
          ]}
        >
          <Feather
            name={showMap ? "list" : "map"}
            size={22}
            color={showMap ? colors.primaryForeground : colors.foreground}
          />
        </Pressable>
      </View>

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

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_TYPES}
          keyExtractor={(item) => item.label}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => {
            const isActive = activeType === item.value;
            return (
              <Pressable
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
                  style={[
                    styles.filterChipText,
                    { color: isActive ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

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
                  size={12}
                  color={isActive ? colors.primaryForeground : colors.mutedForeground}
                />
              )}
              <Text
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

      {showPriceSlider && (
        <PriceRangeSlider
          min={priceBounds.min}
          max={priceBounds.max}
          low={priceLow!}
          high={priceHigh!}
          onLowChange={(val) => {
            setPriceLow(val);
            hasCustomPrice.current = true;
            AsyncStorage.setItem(PRICE_FILTER_KEY, JSON.stringify({ low: val, high: priceHigh }));
          }}
          onHighChange={(val) => {
            setPriceHigh(val);
            hasCustomPrice.current = true;
            AsyncStorage.setItem(PRICE_FILTER_KEY, JSON.stringify({ low: priceLow, high: val }));
          }}
          onReset={() => {
            setPriceLow(priceBounds.min);
            setPriceHigh(priceBounds.max);
            hasCustomPrice.current = false;
            AsyncStorage.removeItem(PRICE_FILTER_KEY);
          }}
        />
      )}

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
      ) : showMap ? (
        <PropertyMapView
          properties={filteredProperties}
          onSearchArea={(bbox) => setMapBBox(bbox)}
        />
      ) : (
        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PropertyCard property={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          scrollEnabled={filteredProperties.length > 0}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="home" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No properties found</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Try adjusting your search or filters
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: "Outfit_700Bold",
      letterSpacing: 2,
    },
    headerIcon: {
      padding: 8,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 20,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
    },
    filterRow: {
      marginTop: 12,
    },
    filterContent: {
      paddingHorizontal: 20,
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
    },
    filterChipText: {
      fontSize: 13,
      fontFamily: "Outfit_600SemiBold",
    },
    sortRow: {
      flexDirection: "row",
      paddingHorizontal: 20,
      paddingTop: 10,
      gap: 8,
    },
    sortChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
    },
    sortChipText: {
      fontSize: 12,
      fontFamily: "Outfit_600SemiBold",
    },
    listContent: {
      paddingTop: 16,
      paddingHorizontal: 20,
      gap: 16,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingHorizontal: 40,
      paddingTop: 80,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Outfit_600SemiBold",
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Outfit_400Regular",
      textAlign: "center",
    },
    retryBtn: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      marginTop: 8,
    },
    retryText: {
      fontSize: 14,
      fontFamily: "Outfit_600SemiBold",
    },
  });
}
