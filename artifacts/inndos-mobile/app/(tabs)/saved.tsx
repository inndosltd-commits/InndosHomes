import { useListFavorites, getListFavoritesQueryKey } from "@workspace/api-client-react";
import { PropertyCard } from "@/components/PropertyCard";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";

export default function SavedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const { data: properties, isLoading } = useListFavorites();

  if (!user) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Feather name="heart" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in to see your saved properties</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
          Tap the heart icon on any property to save it for later.
        </Text>
        <Pressable
          style={[styles.signInBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={[styles.signInBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Saved</Text>
        </View>
        <View style={[styles.center, { flex: 1 }]}>
          <Feather name="heart" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No saved properties yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Tap the heart icon on any property to save it here.
          </Text>
          <Pressable
            style={[styles.browseBtn, { borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={[styles.browseBtnText, { color: colors.foreground }]}>Browse Properties</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Saved</Text>
        <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>
          {properties.length} {properties.length === 1 ? "property" : "properties"}
        </Text>
      </View>
      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <PropertyCard property={item} />
            {item.savedAt ? (
              <Text style={[styles.savedDate, { color: colors.mutedForeground }]}>
                Saved {new Date(item.savedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            ) : null}
          </View>
        )}
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Outfit_700Bold",
  },
  headerCount: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  signInBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 8,
  },
  signInBtnText: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
  },
  browseBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  browseBtnText: {
    fontSize: 14,
    fontFamily: "Outfit_500Medium",
  },
  cardWrapper: {
    alignItems: "center",
    marginBottom: 16,
  },
  savedDate: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    marginTop: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 20,
  },
});
