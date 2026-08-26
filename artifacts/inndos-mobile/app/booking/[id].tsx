import {
  useListBookings,
  useGetProperty,
  getListBookingsQueryKey,
  getGetPropertyQueryKey,
} from "@workspace/api-client-react";
import { getImageUrl } from "@/utils/imageUrl";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;

type BookingStatus = "pending" | "confirmed" | "cancelled";

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "#f59e0b",
  confirmed: "#10b981",
  cancelled: "#ef4444",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending Confirmation",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

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

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);

  const { data: bookings, isLoading: bookingsLoading } = useListBookings({
    query: { queryKey: getListBookingsQueryKey() },
  });

  const booking = bookings?.find((b) => b.id === id);

  const { data: property, isLoading: propertyLoading } = useGetProperty(
    booking?.propertyId ?? "",
    {
      query: {
        queryKey: getGetPropertyQueryKey(booking?.propertyId ?? ""),
        enabled: !!booking?.propertyId,
      },
    }
  );

  const isLoading = bookingsLoading || (!!booking?.propertyId && propertyLoading);

  const styles = getStyles(colors);
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const handleCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActivePhotoIndex(idx);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Booking not found</Text>
        <Pressable
          style={[styles.backBtn, { borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backBtnText, { color: colors.foreground }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const status = booking.status as BookingStatus;
  const allPhotos: string[] = (booking.propertyImages && booking.propertyImages.length > 0)
    ? booking.propertyImages
    : booking.propertyVideoPosters && booking.propertyVideoPosters.length > 0
      ? booking.propertyVideoPosters
    : booking.propertyImage
      ? [booking.propertyImage]
      : [];

  const amenityTags = property?.tags ?? [];
  const specs = property
    ? [
        property.beds > 0 ? { icon: "grid" as const, value: property.beds, label: "Beds" } : null,
        property.baths > 0 ? { icon: "droplet" as const, value: property.baths, label: "Baths" } : null,
        property.sqft > 0 ? { icon: "maximize-2" as const, value: property.sqft, label: "sqft" } : null,
        (property.guests != null && property.guests > 0)
          ? { icon: "users" as const, value: property.guests, label: "Guests" }
          : null,
      ].filter(Boolean)
    : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back button overlay */}
      <View style={[styles.headerOverlay, { top: topPad + 12 }]}>
        <Pressable
          style={[styles.backCircle, { backgroundColor: "rgba(255,255,255,0.92)" }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color="#000" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 32 }}
      >
        {/* Photo Gallery */}
        {allPhotos.length > 0 ? (
          <View style={styles.heroContainer}>
            <FlatList
              ref={carouselRef}
              data={allPhotos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleCarouselScroll}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: getImageUrl(item) }}
                  style={{ width: SCREEN_WIDTH, height: 280 }}
                  resizeMode="cover"
                />
              )}
            />
            {allPhotos.length > 1 && (
              <View style={styles.dotsRow}>
                {allPhotos.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      idx === activePhotoIndex ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>
            )}
            {allPhotos.length > 1 && (
              <View style={styles.photoCountBadge}>
                <Feather name="image" size={12} color="#fff" />
                <Text style={styles.photoCountText}>{activePhotoIndex + 1}/{allPhotos.length}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: colors.muted }]}>
            <Feather name="image" size={40} color={colors.mutedForeground} />
          </View>
        )}

        <View style={styles.content}>
          {/* Status Banner */}
          <View
            style={[
              styles.statusBanner,
              { backgroundColor: STATUS_COLORS[status] + "18", borderColor: STATUS_COLORS[status] + "40" },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
            <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>
              {STATUS_LABELS[status]}
            </Text>
          </View>

          {/* Property Title & Address */}
          <View style={styles.titleSection}>
            {booking.propertyType && (
              <View style={[styles.typeChip, { backgroundColor: colors.primary }]}>
                <Text style={[styles.typeChipText, { color: colors.primaryForeground }]}>
                  {getTypeLabel(booking.propertyType)}
                </Text>
              </View>
            )}
            <Text style={[styles.propertyTitle, { color: colors.foreground }]}>
              {booking.propertyTitle ?? "Property"}
            </Text>
            {booking.propertyAddress ? (
              <View style={styles.addressRow}>
                <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                <Text style={[styles.addressText, { color: colors.mutedForeground }]}>
                  {booking.propertyAddress}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Link-Up details */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LINK-UP DETAILS</Text>

            <View style={[styles.datesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.dateRow}>
                <View style={styles.dateBlock}>
                  <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>REQUEST</Text>
                  <Text style={[styles.dateValue, { color: colors.foreground }]}>
                    The owner will contact you about availability and next steps.
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[styles.priceCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}
            >
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>LISTED PRICE</Text>
              <Text style={[styles.priceValue, { color: colors.foreground }]}>
                KES {booking.totalPrice.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Specs (from property) */}
          {specs.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PROPERTY SPECS</Text>
                <View style={[styles.specsRow, { borderColor: colors.border }]}>
                  {specs.map((spec) => spec && (
                    <View key={spec.label} style={styles.specItem}>
                      <Feather name={spec.icon} size={20} color={colors.foreground} />
                      <Text style={[styles.specValue, { color: colors.foreground }]}>{spec.value}</Text>
                      <Text style={[styles.specItemLabel, { color: colors.mutedForeground }]}>{spec.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Amenities */}
          {amenityTags.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>AMENITIES</Text>
                <View style={styles.tagsWrap}>
                  {amenityTags.map((tag) => (
                    <View
                      key={tag}
                      style={[styles.tag, { backgroundColor: colors.muted, borderColor: colors.border }]}
                    >
                      <Feather name="check" size={12} color={colors.primary} />
                      <Text style={[styles.tagText, { color: colors.foreground }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Owner Info */}
          {property?.ownerName && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LISTED BY</Text>
                <View style={[styles.ownerCard, { backgroundColor: colors.muted }]}>
                  <View style={[styles.ownerAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.ownerInitial, { color: colors.primaryForeground }]}>
                      {property.ownerName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.ownerName, { color: colors.foreground }]}>{property.ownerName}</Text>
                    <Text style={[styles.ownerSub, { color: colors.mutedForeground }]}>Property Owner</Text>
                  </View>
                </View>
              </View>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Action Button */}
          <Pressable
            style={[styles.viewPropertyBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/property/${booking.propertyId}` as never)}
          >
            <Feather name="home" size={16} color={colors.primaryForeground} />
            <Text style={[styles.viewPropertyText, { color: colors.primaryForeground }]}>
              View Property
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingHorizontal: 40,
    },
    headerOverlay: {
      position: "absolute",
      left: 16,
      zIndex: 10,
    },
    backCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    heroContainer: {
      position: "relative",
    },
    heroPlaceholder: {
      height: 280,
      alignItems: "center",
      justifyContent: "center",
    },
    dotsRow: {
      position: "absolute",
      bottom: 12,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    dotActive: {
      backgroundColor: "#fff",
      width: 18,
    },
    dotInactive: {
      backgroundColor: "rgba(255,255,255,0.5)",
    },
    photoCountBadge: {
      position: "absolute",
      bottom: 12,
      right: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(0,0,0,0.5)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    photoCountText: {
      color: "#fff",
      fontSize: 11,
      fontFamily: "Outfit_500Medium",
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 20,
      gap: 0,
    },
    statusBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 20,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 13,
      fontFamily: "Outfit_600SemiBold",
    },
    titleSection: {
      gap: 8,
      marginBottom: 20,
    },
    typeChip: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 4,
    },
    typeChipText: {
      fontSize: 11,
      fontFamily: "Outfit_600SemiBold",
      letterSpacing: 0.5,
    },
    propertyTitle: {
      fontSize: 22,
      fontFamily: "Outfit_700Bold",
      lineHeight: 28,
    },
    addressRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
    },
    addressText: {
      fontSize: 13,
      fontFamily: "Outfit_400Regular",
      flex: 1,
    },
    divider: {
      height: 1,
      marginVertical: 20,
    },
    section: {
      gap: 12,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: "Outfit_600SemiBold",
      letterSpacing: 1.2,
    },
    datesCard: {
      borderWidth: 1,
      borderRadius: 10,
      overflow: "hidden",
    },
    dateRow: {
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    dateBlock: {
      gap: 4,
    },
    dateLabel: {
      fontSize: 10,
      fontFamily: "Outfit_600SemiBold",
      letterSpacing: 1,
    },
    dateValue: {
      fontSize: 14,
      fontFamily: "Outfit_500Medium",
    },
    dateDivider: {
      height: 1,
    },
    priceCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderRadius: 10,
    },
    priceLabel: {
      fontSize: 10,
      fontFamily: "Outfit_600SemiBold",
      letterSpacing: 1,
    },
    priceValue: {
      fontSize: 20,
      fontFamily: "Outfit_700Bold",
    },
    specsRow: {
      flexDirection: "row",
      borderWidth: 1,
      borderRadius: 10,
      overflow: "hidden",
    },
    specItem: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 14,
      gap: 4,
    },
    specValue: {
      fontSize: 16,
      fontFamily: "Outfit_700Bold",
    },
    specItemLabel: {
      fontSize: 11,
      fontFamily: "Outfit_400Regular",
    },
    tagsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    tagText: {
      fontSize: 13,
      fontFamily: "Outfit_400Regular",
    },
    ownerCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 10,
    },
    ownerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    ownerInitial: {
      fontSize: 18,
      fontFamily: "Outfit_700Bold",
    },
    ownerName: {
      fontSize: 15,
      fontFamily: "Outfit_600SemiBold",
    },
    ownerSub: {
      fontSize: 12,
      fontFamily: "Outfit_400Regular",
    },
    viewPropertyBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 16,
      borderRadius: 10,
      marginTop: 4,
    },
    viewPropertyText: {
      fontSize: 15,
      fontFamily: "Outfit_600SemiBold",
    },
    notFoundText: {
      fontSize: 18,
      fontFamily: "Outfit_600SemiBold",
    },
    backBtn: {
      borderWidth: 1,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    backBtnText: {
      fontSize: 14,
      fontFamily: "Outfit_600SemiBold",
    },
  });
}
