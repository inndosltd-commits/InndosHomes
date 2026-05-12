import { useListProperties, getListPropertiesQueryKey } from "@workspace/api-client-react";
import type { ListPropertiesParams } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { PropertyCard } from "@/components/PropertyCard";
import { Feather } from "@expo/vector-icons";

type PropertyType = "rent" | "sale" | "bnb" | "hotel" | "hostel";

const TYPES: { label: string; value: PropertyType; icon: string }[] = [
  { label: "Rent", value: "rent", icon: "key" },
  { label: "Sale", value: "sale", icon: "tag" },
  { label: "BnB", value: "bnb", icon: "sun" },
  { label: "Hotel", value: "hotel", icon: "star" },
  { label: "Hostel", value: "hostel", icon: "users" },
];

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<PropertyType>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);

  const activeType: ListPropertiesParams["type"] =
    selectedTypes.size === 1 ? [...selectedTypes][0] : undefined;

  const searchParams = { type: activeType, search: debouncedSearch || undefined };
  const { data: properties, isLoading, refetch } = useListProperties(
    searchParams,
    {
      query: {
        queryKey: getListPropertiesQueryKey(searchParams),
        enabled: hasSearched || selectedTypes.size > 0,
      },
    }
  );

  const toggleType = (type: PropertyType) => {
    const next = new Set(selectedTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.clear();
      next.add(type);
    }
    setSelectedTypes(next);
    setHasSearched(true);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    clearTimeout((handleSearch as { _t?: ReturnType<typeof setTimeout> })._t);
    (handleSearch as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      setDebouncedSearch(text);
      if (text.length > 0) setHasSearched(true);
    }, 400);
  };

  const topPadding = isWeb ? 67 : insets.top;
  const styles = getStyles(colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Search</Text>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Location, property name..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={handleSearch}
          returnKeyType="search"
          onSubmitEditing={() => setHasSearched(true)}
          autoFocus
        />
        {search.length > 0 && (
          <Pressable onPress={() => { setSearch(""); setDebouncedSearch(""); }}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={styles.filtersSection}>
        <Text style={[styles.filtersLabel, { color: colors.mutedForeground }]}>PROPERTY TYPE</Text>
        <View style={styles.typeGrid}>
          {TYPES.map((type) => {
            const isActive = selectedTypes.has(type.value);
            return (
              <Pressable
                key={type.value}
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => toggleType(type.value)}
              >
                <Feather
                  name={type.icon as keyof typeof Feather.glyphMap}
                  size={20}
                  color={isActive ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    { color: isActive ? colors.primaryForeground : colors.foreground },
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {!hasSearched && selectedTypes.size === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="search" size={48} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Find your space</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Search by name, location, or select a type
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
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
          scrollEnabled={!!properties && properties.length > 0}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="inbox" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Try different search terms or filters
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
    container: { flex: 1 },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    title: {
      fontSize: 24,
      fontFamily: "Outfit_700Bold",
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
      fontFamily: "Outfit_400Regular",
    },
    filtersSection: {
      paddingHorizontal: 20,
      marginTop: 20,
    },
    filtersLabel: {
      fontSize: 11,
      fontFamily: "Outfit_600SemiBold",
      letterSpacing: 1.5,
      marginBottom: 12,
    },
    typeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    typeCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: 1,
    },
    typeLabel: {
      fontSize: 14,
      fontFamily: "Outfit_500Medium",
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingHorizontal: 40,
    },
    loadingState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: "Outfit_700Bold",
    },
    emptySubtitle: {
      fontSize: 14,
      fontFamily: "Outfit_400Regular",
      textAlign: "center",
    },
    listContent: {
      paddingTop: 16,
      paddingHorizontal: 20,
      gap: 16,
    },
  });
}
