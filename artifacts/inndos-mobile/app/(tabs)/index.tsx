import { useListProperties } from "@workspace/api-client-react";
import type { ListPropertiesParams, Property } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { Feather } from "@expo/vector-icons";

const FILTER_TYPES = [
  { label: "All", value: undefined },
  { label: "Rent", value: "rent" as const },
  { label: "Sale", value: "sale" as const },
  { label: "BnB", value: "bnb" as const },
  { label: "Hotel", value: "hotel" as const },
  { label: "Hostel", value: "hostel" as const },
];

export default function BrowseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<ListPropertiesParams["type"]>(undefined);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: properties, isLoading, error, refetch } = useListProperties({
    type: activeType,
    search: debouncedSearch || undefined,
  });

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

  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const styles = getStyles(colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>INNDOS</Text>
        <Pressable onPress={() => router.push("/property/search")} style={styles.headerIcon}>
          <Feather name="map" size={22} color={colors.foreground} />
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
                onPress={() => setActiveType(item.value)}
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
        <FlatList
          data={properties ?? []}
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
          scrollEnabled={!!properties && properties.length > 0}
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
