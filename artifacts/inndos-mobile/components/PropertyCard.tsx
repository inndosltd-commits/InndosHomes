import type { Property } from "@workspace/api-client-react";
import {
  useCheckFavorite,
  useAddFavorite,
  useRemoveFavorite,
  getListFavoritesQueryKey,
  getCheckFavoriteQueryKey,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { getImageUrl } from "@/utils/imageUrl";
import { useAuth } from "@/context/AuthContext";
import React from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { resolveAmenityLabel } from "@/utils/amenities";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { propertyTypeLabel } from "@workspace/property-categories";
import { formatPropertyPrice } from "@/utils/price";

interface PropertyCardProps {
  property: Property;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

function getLandMeasurements(property: Property): { acres?: string; plotSize?: string } {
  const details = property.details;
  const land = details && typeof details === "object" && !Array.isArray(details)
    ? (details as { land?: unknown }).land
    : undefined;
  if (!land || typeof land !== "object" || Array.isArray(land)) return {};
  const values = land as { acres?: unknown; plotSizeFt?: unknown };
  const acres = values.acres === null || values.acres === undefined || String(values.acres).trim() === ""
    ? undefined : String(values.acres);
  const plotSize = values.plotSizeFt === null || values.plotSizeFt === undefined || String(values.plotSizeFt).trim() === ""
    ? undefined : String(values.plotSizeFt);
  return { acres, plotSize };
}

export function PropertyCard({ property }: PropertyCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favoriteStatus } = useCheckFavorite(property.id);
  const isFavorited = favoriteStatus?.isFavorited ?? false;

  const { mutate: addFavorite, isPending: isAdding } = useAddFavorite();
  const { mutate: removeFavorite, isPending: isRemoving } = useRemoveFavorite();
  const isFavoriteLoading = isAdding || isRemoving;
  const previewImage = property.images?.[0] ?? property.videoPosters?.[0] ?? property.image;
  const previewImageUrl = getImageUrl(previewImage);

  const handleFavoriteToggle = (e: { stopPropagation?: () => void }) => {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isFavorited) {
      removeFavorite(
        { propertyId: property.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListFavoritesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getCheckFavoriteQueryKey(property.id) });
          },
        }
      );
    } else {
      addFavorite(
        { data: { propertyId: property.id } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListFavoritesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getCheckFavoriteQueryKey(property.id) });
          },
        }
      );
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={() => router.push({ pathname: "/property/[id]", params: { id: property.id } })}
    >
      <View style={styles.imageContainer}>
        {previewImageUrl ? (
          <Image
            source={{ uri: previewImageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, { alignItems: "center", justifyContent: "center", backgroundColor: colors.muted }]}>
            <Feather name="home" size={30} color={colors.mutedForeground} />
          </View>
        )}
        <View style={styles.imageOverlay} />
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.typeBadgeText, { color: colors.primaryForeground }]}>
              {propertyTypeLabel(property.type)}
            </Text>
          </View>
          {property.isVerified && (
            <View style={[styles.verifiedBadge, { backgroundColor: "rgba(255,255,255,0.9)" }]}>
              <Feather name="check-circle" size={11} color={colors.primary === "#000000" ? "#000" : "#fff"} />
              <Text style={[styles.verifiedText, { color: "#000" }]}>Verified</Text>
            </View>
          )}
        </View>
        <Pressable
          style={styles.heartBtn}
          onPress={handleFavoriteToggle}
          hitSlop={8}
        >
          {isFavoriteLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather
              name="heart"
              size={18}
              color={isFavorited ? "#ef4444" : "#fff"}
              style={isFavorited ? styles.heartFilled : undefined}
            />
          )}
        </Pressable>
        <View style={styles.priceOverlay}>
          <Text style={styles.priceText}>
            {formatPropertyPrice(property.type, property.price, property.priceUnit)}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.propertyTitle, { color: colors.foreground }]} numberOfLines={1}>
          {property.title}
        </Text>
        <View style={styles.addressRow}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={[styles.addressText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {property.address}
          </Text>
        </View>

        {(() => {
          const isLand = property.subtype === "land" || Boolean(property.details?.land);
          const landMeasurements = getLandMeasurements(property);
          const specs = [
            !isLand && property.beds > 0 ? { icon: "grid" as const, value: `${property.beds} bed` } : null,
            !isLand && property.baths > 0 ? { icon: "droplet" as const, value: `${property.baths} bath` } : null,
            isLand && landMeasurements.acres ? { icon: "maximize-2" as const, value: `${landMeasurements.acres} acres` } : null,
            isLand && landMeasurements.plotSize ? { icon: "maximize-2" as const, value: landMeasurements.plotSize } : null,
            !isLand && property.sqft > 0
              ? { icon: "maximize-2" as const, value: `${property.sqft} sqft` }
              : null,
          ].filter((spec): spec is { icon: "grid" | "droplet" | "maximize-2"; value: string } => spec !== null);
          return specs.length > 0 ? (
            <View style={[styles.specs, { borderTopColor: colors.border }]}>
              {specs.map((spec) => (
                <View key={spec.value} style={styles.specItem}>
                  <Feather name={spec.icon} size={13} color={colors.mutedForeground} />
                  <Text
                    style={[styles.specText, { color: colors.foreground }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {spec.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : null;
        })()}

        {property.tags && property.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {property.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.muted }]}>
                <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{resolveAmenityLabel(tag)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    width: CARD_WIDTH,
  },
  imageContainer: {
    width: "100%",
    height: 150,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  badgeRow: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
  },
  heartBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  heartFilled: {
    color: "#ef4444",
  },
  priceOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  priceText: {
    fontSize: 18,
    fontFamily: "Outfit_700Bold",
    color: "#ffffff",
  },
  content: {
    padding: 14,
    gap: 8,
  },
  propertyTitle: {
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  addressText: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    flex: 1,
  },
  specs: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  specItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  specText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontFamily: "Outfit_500Medium",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
  },
});
