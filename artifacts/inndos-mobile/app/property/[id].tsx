import { useCreateBooking, useGetProperty } from "@workspace/api-client-react";
import { getListBookingsQueryKey } from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

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

function getPriceLabel(type: string, price: number): string {
  const formatted = `KES ${price.toLocaleString()}`;
  if (type === "rent") return `${formatted}/mo`;
  if (type === "bnb" || type === "hotel" || type === "hostel") return `${formatted}/night`;
  return formatted;
}

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === "web";

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [bookingNights, setBookingNights] = useState(1);

  const { data: property, isLoading, error } = useGetProperty(id ?? "");
  const { mutate: createBooking, isPending: isBooking } = useCreateBooking();

  const handleBook = () => {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    if (!property) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + bookingNights);

    const totalPrice = property.price * bookingNights;

    Alert.alert(
      "Confirm Booking",
      `Book "${property.title}" for ${bookingNights} night${bookingNights !== 1 ? "s" : ""}?\n\nTotal: KES ${totalPrice.toLocaleString()}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            createBooking(
              {
                data: {
                  propertyId: property.id,
                  startDate: start.toISOString(),
                  endDate: end.toISOString(),
                  totalPrice,
                },
              },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert("Booked!", "Your booking is confirmed.", [
                    { text: "View Bookings", onPress: () => router.push("/(tabs)/bookings") },
                    { text: "OK" },
                  ]);
                },
                onError: () => {
                  Alert.alert("Error", "Failed to create booking. Please try again.");
                },
              }
            );
          },
        },
      ]
    );
  };

  const adjustNights = (delta: number) => {
    setBookingNights((n) => Math.max(1, n + delta));
  };

  const bottomPad = isWeb ? 34 : insets.bottom;
  const styles = getStyles(colors);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !property) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>Property not found</Text>
        <Pressable
          style={[styles.backBtn, { borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backBtnText, { color: colors.foreground }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isNightly = ["bnb", "hotel", "hostel"].includes(property.type);
  const showBooking = property.type !== "sale";
  const totalPrice = property.price * bookingNights;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 120 }}
      >
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: property.image }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
          <View style={[styles.heroBackBtn, { top: isWeb ? 67 + 12 : insets.top + 12 }]}>
            <Pressable
              style={[styles.backCircle, { backgroundColor: "rgba(255,255,255,0.9)" }]}
              onPress={() => router.back()}
            >
              <Feather name="arrow-left" size={20} color="#000" />
            </Pressable>
          </View>
          <View style={styles.heroPriceRow}>
            <Text style={styles.heroPriceText}>{getPriceLabel(property.type, property.price)}</Text>
            <View style={[styles.typeChip, { backgroundColor: colors.primary }]}>
              <Text style={[styles.typeChipText, { color: colors.primaryForeground }]}>
                {getTypeLabel(property.type)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.titleRow}>
            <Text style={[styles.propertyTitle, { color: colors.foreground }]}>{property.title}</Text>
            {property.isVerified && (
              <Feather name="check-circle" size={20} color={colors.primary} />
            )}
          </View>
          <View style={styles.addressRow}>
            <Feather name="map-pin" size={14} color={colors.mutedForeground} />
            <Text style={[styles.addressText, { color: colors.mutedForeground }]}>{property.address}</Text>
          </View>

          <View style={[styles.specsRow, { borderColor: colors.border }]}>
            {property.beds > 0 && (
              <View style={styles.specItem}>
                <Feather name="grid" size={20} color={colors.foreground} />
                <Text style={[styles.specValue, { color: colors.foreground }]}>{property.beds}</Text>
                <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>Beds</Text>
              </View>
            )}
            <View style={styles.specItem}>
              <Feather name="droplet" size={20} color={colors.foreground} />
              <Text style={[styles.specValue, { color: colors.foreground }]}>{property.baths}</Text>
              <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>Baths</Text>
            </View>
            {property.sqft > 0 && (
              <View style={styles.specItem}>
                <Feather name="maximize-2" size={20} color={colors.foreground} />
                <Text style={[styles.specValue, { color: colors.foreground }]}>{property.sqft}</Text>
                <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>sqft</Text>
              </View>
            )}
            {property.guests != null && property.guests > 0 && (
              <View style={styles.specItem}>
                <Feather name="users" size={20} color={colors.foreground} />
                <Text style={[styles.specValue, { color: colors.foreground }]}>{property.guests}</Text>
                <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>Guests</Text>
              </View>
            )}
          </View>

          {property.ownerName && (
            <View style={[styles.ownerCard, { backgroundColor: colors.muted }]}>
              <View style={[styles.ownerAvatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.ownerInitial, { color: colors.primaryForeground }]}>
                  {property.ownerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={[styles.ownerLabel, { color: colors.mutedForeground }]}>Listed by</Text>
                <Text style={[styles.ownerName, { color: colors.foreground }]}>{property.ownerName}</Text>
              </View>
            </View>
          )}

          {property.tags && property.tags.length > 0 && (
            <View>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>FEATURES</Text>
              <View style={styles.tagsRow}>
                {property.tags.map((tag) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Text style={[styles.tagText, { color: colors.foreground }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {showBooking && isNightly && (
            <View style={[styles.nightsSelector, { borderColor: colors.border }]}>
              <Text style={[styles.nightsLabel, { color: colors.foreground }]}>Nights</Text>
              <View style={styles.nightsControls}>
                <Pressable
                  style={[styles.nightsBtn, { borderColor: colors.border }]}
                  onPress={() => adjustNights(-1)}
                >
                  <Feather name="minus" size={16} color={colors.foreground} />
                </Pressable>
                <Text style={[styles.nightsCount, { color: colors.foreground }]}>{bookingNights}</Text>
                <Pressable
                  style={[styles.nightsBtn, { borderColor: colors.border }]}
                  onPress={() => adjustNights(1)}
                >
                  <Feather name="plus" size={16} color={colors.foreground} />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {showBooking && (
        <View style={[styles.bookingBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad + 12 }]}>
          <View>
            <Text style={[styles.bookingPriceLabel, { color: colors.mutedForeground }]}>
              {isNightly ? `${bookingNights} night${bookingNights !== 1 ? "s" : ""}` : "Monthly"}
            </Text>
            <Text style={[styles.bookingTotalPrice, { color: colors.foreground }]}>
              KES {(isNightly ? totalPrice : property.price).toLocaleString()}
            </Text>
          </View>
          <Pressable
            style={[styles.bookBtn, { backgroundColor: colors.primary }, isBooking && { opacity: 0.6 }]}
            onPress={handleBook}
            disabled={isBooking}
          >
            {isBooking ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.bookBtnText, { color: colors.primaryForeground }]}>
                {user ? "Book Now" : "Sign In to Book"}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { alignItems: "center", justifyContent: "center", gap: 12 },
    heroContainer: {
      height: 320,
      position: "relative",
    },
    heroImage: {
      width: "100%",
      height: "100%",
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.2)",
    },
    heroBackBtn: {
      position: "absolute",
      left: 16,
    },
    backCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    heroPriceRow: {
      position: "absolute",
      bottom: 16,
      left: 16,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    heroPriceText: {
      fontSize: 24,
      fontFamily: "Outfit_700Bold",
      color: "#ffffff",
    },
    typeChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    typeChipText: {
      fontSize: 12,
      fontFamily: "Outfit_600SemiBold",
    },
    detailsSection: {
      paddingHorizontal: 20,
      paddingTop: 20,
      gap: 16,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    propertyTitle: {
      fontSize: 22,
      fontFamily: "Outfit_700Bold",
      flex: 1,
    },
    addressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    addressText: {
      fontSize: 14,
      fontFamily: "Outfit_400Regular",
      flex: 1,
    },
    specsRow: {
      flexDirection: "row",
      borderWidth: 1,
      paddingVertical: 16,
    },
    specItem: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    specValue: {
      fontSize: 18,
      fontFamily: "Outfit_700Bold",
    },
    specLabel: {
      fontSize: 12,
      fontFamily: "Outfit_400Regular",
    },
    ownerCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
    },
    ownerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    ownerInitial: {
      fontSize: 18,
      fontFamily: "Outfit_700Bold",
    },
    ownerLabel: {
      fontSize: 11,
      fontFamily: "Outfit_400Regular",
    },
    ownerName: {
      fontSize: 15,
      fontFamily: "Outfit_600SemiBold",
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: "Outfit_600SemiBold",
      letterSpacing: 1.5,
      marginBottom: 10,
    },
    tagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tag: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
    },
    tagText: {
      fontSize: 13,
      fontFamily: "Outfit_400Regular",
    },
    nightsSelector: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      padding: 16,
    },
    nightsLabel: {
      fontSize: 15,
      fontFamily: "Outfit_500Medium",
    },
    nightsControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    nightsBtn: {
      width: 36,
      height: 36,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    nightsCount: {
      fontSize: 20,
      fontFamily: "Outfit_700Bold",
      minWidth: 30,
      textAlign: "center",
    },
    bookingBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
    },
    bookingPriceLabel: {
      fontSize: 12,
      fontFamily: "Outfit_400Regular",
    },
    bookingTotalPrice: {
      fontSize: 20,
      fontFamily: "Outfit_700Bold",
    },
    bookBtn: {
      paddingHorizontal: 32,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 140,
    },
    bookBtnText: {
      fontSize: 15,
      fontFamily: "Outfit_600SemiBold",
    },
    errorText: {
      fontSize: 18,
      fontFamily: "Outfit_600SemiBold",
    },
    backBtn: {
      borderWidth: 1,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    backBtnText: {
      fontSize: 14,
      fontFamily: "Outfit_500Medium",
    },
  });
}
