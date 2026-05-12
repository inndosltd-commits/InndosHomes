import type { Property } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { getImageUrl } from "@/utils/imageUrl";
import React from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

interface PropertyCardProps {
  property: Property;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH - 40;

function getTypeLabel(type: string): string {
  switch (type) {
    case "rent": return "For Rent";
    case "sale": return "For Sale";
    case "bnb": return "BnB";
    case "hotel": return "Hotel";
    case "hostel": return "Hostel";
    default: return type;
  }
}

function getPriceLabel(property: Property): string {
  const price = `KES ${property.price.toLocaleString()}`;
  if (property.type === "rent") return `${price}/mo`;
  if (property.type === "bnb" || property.type === "hotel" || property.type === "hostel") return `${price}/night`;
  return price;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const colors = useColors();
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={() => router.push({ pathname: "/property/[id]", params: { id: property.id } })}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: getImageUrl(property.image) }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay} />
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.typeBadgeText, { color: colors.primaryForeground }]}>
              {getTypeLabel(property.type)}
            </Text>
          </View>
          {property.isVerified && (
            <View style={[styles.verifiedBadge, { backgroundColor: "rgba(255,255,255,0.9)" }]}>
              <Feather name="check-circle" size={11} color={colors.primary === "#000000" ? "#000" : "#fff"} />
              <Text style={[styles.verifiedText, { color: "#000" }]}>Verified</Text>
            </View>
          )}
        </View>
        <View style={styles.priceOverlay}>
          <Text style={styles.priceText}>{getPriceLabel(property)}</Text>
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

        <View style={[styles.specs, { borderTopColor: colors.border }]}>
          {property.beds > 0 && (
            <View style={styles.specItem}>
              <Feather name="grid" size={13} color={colors.mutedForeground} />
              <Text style={[styles.specText, { color: colors.foreground }]}>{property.beds} bed</Text>
            </View>
          )}
          <View style={styles.specItem}>
            <Feather name="droplet" size={13} color={colors.mutedForeground} />
            <Text style={[styles.specText, { color: colors.foreground }]}>{property.baths} bath</Text>
          </View>
          {property.sqft > 0 && (
            <View style={styles.specItem}>
              <Feather name="maximize-2" size={13} color={colors.mutedForeground} />
              <Text style={[styles.specText, { color: colors.foreground }]}>{property.sqft} sqft</Text>
            </View>
          )}
        </View>

        {property.tags && property.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {property.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.muted }]}>
                <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{tag}</Text>
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
    overflow: "hidden",
    width: CARD_WIDTH,
  },
  imageContainer: {
    width: "100%",
    height: 200,
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
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
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
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  specItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  specText: {
    fontSize: 13,
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
