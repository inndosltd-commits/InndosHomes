import {
  useCreateBooking,
  useGetProperty,
  useCheckFavorite,
  useAddFavorite,
  useRemoveFavorite,
  getListFavoritesQueryKey,
  getCheckFavoriteQueryKey,
} from "@workspace/api-client-react";
import { getListBookingsQueryKey } from "@workspace/api-client-react";
import { getImageUrl } from "@/utils/imageUrl";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
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

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

const today = new Date();
today.setHours(0, 0, 0, 0);

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === "web";

  const [checkIn, setCheckIn] = useState<Date>(today);
  const [bookingNights, setBookingNights] = useState(1);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);

  const checkOut = addDays(checkIn, bookingNights);

  const { data: property, isLoading, error } = useGetProperty(id ?? "");
  const { mutate: createBooking, isPending: isBooking } = useCreateBooking();

  const { data: favoriteStatus } = useCheckFavorite(id ?? "");
  const isFavorited = favoriteStatus?.isFavorited ?? false;
  const { mutate: addFavorite, isPending: isAdding } = useAddFavorite();
  const { mutate: removeFavorite, isPending: isRemoving } = useRemoveFavorite();
  const isFavoriteLoading = isAdding || isRemoving;

  const handleFavoriteToggle = () => {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isFavorited) {
      removeFavorite(
        { propertyId: id ?? "" },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListFavoritesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getCheckFavoriteQueryKey(id ?? "") });
          },
        }
      );
    } else {
      addFavorite(
        { data: { propertyId: id ?? "" } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListFavoritesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getCheckFavoriteQueryKey(id ?? "") });
          },
        }
      );
    }
  };

  const handleCheckInChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowCheckInPicker(false);
    if (!date) return;
    const picked = new Date(date);
    picked.setHours(0, 0, 0, 0);
    if (picked < today) return;
    setCheckIn(picked);
  };

  const handleCheckOutChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowCheckOutPicker(false);
    if (!date) return;
    const picked = new Date(date);
    picked.setHours(0, 0, 0, 0);
    const minOut = addDays(checkIn, 1);
    if (picked <= checkIn) return;
    setBookingNights(daysBetween(checkIn, picked));
  };

  const adjustNights = (delta: number) => {
    setBookingNights((n) => Math.max(1, n + delta));
  };

  const handleBook = () => {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    if (!property) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const totalPrice = property.price * bookingNights;

    Alert.alert(
      "Confirm Booking",
      `Book "${property.title}"?\n\nCheck-in: ${formatDate(checkIn)}\nCheck-out: ${formatDate(checkOut)}\nNights: ${bookingNights}\n\nTotal: KES ${totalPrice.toLocaleString()}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            createBooking(
              {
                data: {
                  propertyId: property.id,
                  startDate: checkIn.toISOString(),
                  endDate: checkOut.toISOString(),
                  totalPrice,
                },
              },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert("Booked!", "Your booking has been submitted and is pending confirmation.", [
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
            source={{ uri: getImageUrl(property.image) }}
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
            <Pressable
              style={[styles.heartCircle]}
              onPress={handleFavoriteToggle}
              disabled={isFavoriteLoading}
            >
              {isFavoriteLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather
                  name="heart"
                  size={20}
                  color={isFavorited ? "#ef4444" : "#fff"}
                />
              )}
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
            <View style={[styles.bookingSection, { borderColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SELECT DATES</Text>

              <View style={styles.datePickerRow}>
                <View style={styles.datePickerBlock}>
                  <Text style={[styles.datePickerLabel, { color: colors.mutedForeground }]}>CHECK IN</Text>
                  {isWeb ? (
                    <TextInput
                      style={[styles.webDateInput, { color: colors.foreground, borderColor: colors.border }]}
                      value={checkIn.toISOString().split("T")[0]}
                      onChangeText={(val) => {
                        const d = new Date(val);
                        if (!isNaN(d.getTime()) && d >= today) setCheckIn(d);
                      }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  ) : (
                    <Pressable
                      style={[styles.datePickerBtn, { borderColor: colors.border }]}
                      onPress={() => setShowCheckInPicker(true)}
                    >
                      <Feather name="calendar" size={14} color={colors.primary} />
                      <Text style={[styles.datePickerValue, { color: colors.foreground }]}>
                        {formatDate(checkIn)}
                      </Text>
                    </Pressable>
                  )}
                </View>

                <Feather name="arrow-right" size={16} color={colors.mutedForeground} style={styles.dateArrow} />

                <View style={styles.datePickerBlock}>
                  <Text style={[styles.datePickerLabel, { color: colors.mutedForeground }]}>CHECK OUT</Text>
                  {isWeb ? (
                    <TextInput
                      style={[styles.webDateInput, { color: colors.foreground, borderColor: colors.border }]}
                      value={checkOut.toISOString().split("T")[0]}
                      onChangeText={(val) => {
                        const d = new Date(val);
                        if (!isNaN(d.getTime()) && d > checkIn) {
                          setBookingNights(daysBetween(checkIn, d));
                        }
                      }}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  ) : (
                    <Pressable
                      style={[styles.datePickerBtn, { borderColor: colors.border }]}
                      onPress={() => setShowCheckOutPicker(true)}
                    >
                      <Feather name="calendar" size={14} color={colors.primary} />
                      <Text style={[styles.datePickerValue, { color: colors.foreground }]}>
                        {formatDate(checkOut)}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={styles.nightsRow}>
                <Text style={[styles.nightsLabel, { color: colors.foreground }]}>
                  {bookingNights} night{bookingNights !== 1 ? "s" : ""}
                </Text>
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

              <View style={[styles.priceSummary, { backgroundColor: colors.muted }]}>
                <View style={styles.priceSummaryRow}>
                  <Text style={[styles.priceSummaryLabel, { color: colors.mutedForeground }]}>
                    KES {property.price.toLocaleString()} × {bookingNights} night{bookingNights !== 1 ? "s" : ""}
                  </Text>
                  <Text style={[styles.priceSummaryValue, { color: colors.foreground }]}>
                    KES {totalPrice.toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.priceDivider, { backgroundColor: colors.border }]} />
                <View style={styles.priceSummaryRow}>
                  <Text style={[styles.priceTotalLabel, { color: colors.foreground }]}>Total</Text>
                  <Text style={[styles.priceTotalValue, { color: colors.primary }]}>
                    KES {totalPrice.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {showBooking && !isNightly && property.type === "rent" && (
            <View style={[styles.rentSummary, { backgroundColor: colors.muted }]}>
              <Feather name="info" size={16} color={colors.mutedForeground} />
              <Text style={[styles.rentSummaryText, { color: colors.mutedForeground }]}>
                Monthly rate · KES {property.price.toLocaleString()}/mo
              </Text>
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

      {showCheckInPicker && Platform.OS === "ios" && (
        <Modal transparent animationType="slide">
          <View style={styles.iosPickerBackdrop}>
            <Pressable style={styles.iosPickerOverlay} onPress={() => setShowCheckInPicker(false)} />
            <View style={[styles.iosPickerSheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
              <View style={styles.iosPickerHeader}>
                <Text style={[styles.iosPickerTitle, { color: colors.foreground }]}>Check-in Date</Text>
                <Pressable onPress={() => setShowCheckInPicker(false)}>
                  <Text style={[styles.iosPickerDone, { color: colors.primary }]}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={checkIn}
                mode="date"
                display="spinner"
                minimumDate={today}
                onChange={handleCheckInChange}
              />
            </View>
          </View>
        </Modal>
      )}

      {showCheckInPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={checkIn}
          mode="date"
          display="default"
          minimumDate={today}
          onChange={handleCheckInChange}
        />
      )}

      {showCheckOutPicker && Platform.OS === "ios" && (
        <Modal transparent animationType="slide">
          <View style={styles.iosPickerBackdrop}>
            <Pressable style={styles.iosPickerOverlay} onPress={() => setShowCheckOutPicker(false)} />
            <View style={[styles.iosPickerSheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
              <View style={styles.iosPickerHeader}>
                <Text style={[styles.iosPickerTitle, { color: colors.foreground }]}>Check-out Date</Text>
                <Pressable onPress={() => setShowCheckOutPicker(false)}>
                  <Text style={[styles.iosPickerDone, { color: colors.primary }]}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={checkOut}
                mode="date"
                display="spinner"
                minimumDate={addDays(checkIn, 1)}
                onChange={handleCheckOutChange}
              />
            </View>
          </View>
        </Modal>
      )}

      {showCheckOutPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={checkOut}
          mode="date"
          display="default"
          minimumDate={addDays(checkIn, 1)}
          onChange={handleCheckOutChange}
        />
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
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    backCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    heartCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(0,0,0,0.4)",
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
    bookingSection: {
      borderWidth: 1,
      padding: 16,
      gap: 14,
    },
    datePickerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    datePickerBlock: {
      flex: 1,
      gap: 6,
    },
    datePickerLabel: {
      fontSize: 10,
      fontFamily: "Outfit_600SemiBold",
      letterSpacing: 1,
    },
    datePickerBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    datePickerValue: {
      fontSize: 13,
      fontFamily: "Outfit_500Medium",
      flex: 1,
    },
    webDateInput: {
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 10,
      fontSize: 13,
      fontFamily: "Outfit_500Medium",
    },
    dateArrow: {
      marginTop: 20,
    },
    nightsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    nightsLabel: {
      fontSize: 14,
      fontFamily: "Outfit_500Medium",
    },
    nightsControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    nightsBtn: {
      width: 32,
      height: 32,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    nightsCount: {
      fontSize: 18,
      fontFamily: "Outfit_700Bold",
      minWidth: 28,
      textAlign: "center",
    },
    priceSummary: {
      padding: 14,
      gap: 10,
    },
    priceSummaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    priceSummaryLabel: {
      fontSize: 13,
      fontFamily: "Outfit_400Regular",
    },
    priceSummaryValue: {
      fontSize: 13,
      fontFamily: "Outfit_500Medium",
    },
    priceDivider: {
      height: 1,
    },
    priceTotalLabel: {
      fontSize: 14,
      fontFamily: "Outfit_700Bold",
    },
    priceTotalValue: {
      fontSize: 16,
      fontFamily: "Outfit_700Bold",
    },
    rentSummary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 14,
    },
    rentSummaryText: {
      fontSize: 13,
      fontFamily: "Outfit_400Regular",
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
    iosPickerBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
    },
    iosPickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    iosPickerSheet: {
      borderTopWidth: 1,
    },
    iosPickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    iosPickerTitle: {
      fontSize: 16,
      fontFamily: "Outfit_600SemiBold",
    },
    iosPickerDone: {
      fontSize: 16,
      fontFamily: "Outfit_600SemiBold",
    },
  });
}
