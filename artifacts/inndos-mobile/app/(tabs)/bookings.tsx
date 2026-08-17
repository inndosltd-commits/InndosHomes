import { useCancelBooking, useListBookings, getListBookingsQueryKey } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getImageUrl } from "@/utils/imageUrl";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

type BookingStatus = "pending" | "confirmed" | "cancelled";

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "#f59e0b",
  confirmed: "#10b981",
  cancelled: "#ef4444",
};

export default function BookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const isWeb = Platform.OS === "web";

  const { data: bookings, isLoading, error, refetch } = useListBookings({
    query: { queryKey: getListBookingsQueryKey(), enabled: !!user },
  });

  const { mutate: cancelBooking, isPending: isCancelling } = useCancelBooking();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCancel = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Cancel Link-Up",
      "Are you sure you want to cancel this link-up?",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => {
            cancelBooking(
              { id },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
              }
            );
          },
        },
      ]
    );
  };

  const topPadding = isWeb ? 67 : insets.top;
  const styles = getStyles(colors);

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Link-Ups</Text>
        </View>
        <View style={styles.guestState}>
          <Feather name="link" size={48} color={colors.border} />
          <Text style={[styles.guestTitle, { color: colors.foreground }]}>Your link-ups</Text>
          <Text style={[styles.guestSubtitle, { color: colors.mutedForeground }]}>
            Sign in to view and manage your link-ups
          </Text>
          <Pressable
            style={[styles.authBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={[styles.authBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Link-Ups</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Could not load link-ups
          </Text>
          <Pressable
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
          >
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={bookings ?? []}
          keyExtractor={(item) => item.id}
          scrollEnabled={!!bookings && bookings.length > 0}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 },
          ]}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="calendar" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No link-ups yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Browse properties to make your first link-up
              </Text>
              <Pressable
                style={[styles.browseBtn, { borderColor: colors.primary }]}
                onPress={() => router.push("/")}
              >
                <Text style={[styles.browseBtnText, { color: colors.primary }]}>Browse Properties</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const status = item.status as BookingStatus;
            const startDate = new Date(item.startDate).toLocaleDateString("en-KE", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const endDate = new Date(item.endDate).toLocaleDateString("en-KE", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            const coverImage = (item.propertyImages && item.propertyImages.length > 0) ? item.propertyImages[0] : item.propertyImage;
            const imageUrl = getImageUrl(coverImage);

            return (
              <Pressable
                style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/booking/${item.id}` as never)}
              >
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.border }]}>
                    <Feather name="image" size={24} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingTitleRow}>
                    <Text style={[styles.bookingProperty, { color: colors.foreground }]} numberOfLines={1}>
                      {item.propertyTitle ?? "Property"}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: STATUS_COLORS[status] + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: STATUS_COLORS[status] },
                        ]}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  {item.propertyAddress && (
                    <View style={styles.addressRow}>
                      <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.addressText, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {item.propertyAddress}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.bookingDates}>
                  <View style={styles.dateBlock}>
                    <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>CHECK IN</Text>
                    <Text style={[styles.dateValue, { color: colors.foreground }]}>{startDate}</Text>
                  </View>
                  <Feather name="arrow-right" size={16} color={colors.mutedForeground} />
                  <View style={styles.dateBlock}>
                    <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>CHECK OUT</Text>
                    <Text style={[styles.dateValue, { color: colors.foreground }]}>{endDate}</Text>
                  </View>
                  <View style={styles.priceBlock}>
                    <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>TOTAL</Text>
                    <Text style={[styles.priceValue, { color: colors.foreground }]}>
                      KES {item.totalPrice.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {status !== "cancelled" && (
                  <Pressable
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      handleCancel(item.id);
                    }}
                    disabled={isCancelling}
                  >
                    <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </Pressable>
                )}
              </Pressable>
            );
          }}
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
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingHorizontal: 40,
    },
    guestState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      paddingHorizontal: 40,
    },
    guestTitle: {
      fontSize: 20,
      fontFamily: "Outfit_700Bold",
    },
    guestSubtitle: {
      fontSize: 14,
      fontFamily: "Outfit_400Regular",
      textAlign: "center",
    },
    authBtn: {
      paddingHorizontal: 32,
      paddingVertical: 14,
      marginTop: 8,
      borderRadius: 8,
    },
    authBtnText: {
      fontSize: 15,
      fontFamily: "Outfit_600SemiBold",
    },
    listContent: {
      paddingTop: 8,
      paddingHorizontal: 20,
      gap: 16,
    },
    bookingCard: {
      borderWidth: 1,
      borderRadius: 12,
      overflow: "hidden",
    },
    thumbnail: {
      width: "100%",
      height: 140,
    },
    thumbnailPlaceholder: {
      width: "100%",
      height: 140,
      alignItems: "center",
      justifyContent: "center",
    },
    bookingHeader: {
      padding: 16,
      paddingBottom: 0,
      gap: 6,
    },
    bookingTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    bookingProperty: {
      fontSize: 16,
      fontFamily: "Outfit_600SemiBold",
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusText: {
      fontSize: 12,
      fontFamily: "Outfit_600SemiBold",
    },
    addressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    addressText: {
      fontSize: 12,
      fontFamily: "Outfit_400Regular",
    },
    divider: {
      height: 1,
      marginVertical: 14,
      marginHorizontal: 16,
    },
    bookingDates: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    dateBlock: {
      flex: 1,
      gap: 2,
    },
    dateLabel: {
      fontSize: 10,
      fontFamily: "Outfit_600SemiBold",
      letterSpacing: 1,
    },
    dateValue: {
      fontSize: 13,
      fontFamily: "Outfit_500Medium",
    },
    priceBlock: {
      alignItems: "flex-end",
      gap: 2,
    },
    priceLabel: {
      fontSize: 10,
      fontFamily: "Outfit_600SemiBold",
      letterSpacing: 1,
    },
    priceValue: {
      fontSize: 14,
      fontFamily: "Outfit_700Bold",
    },
    cancelBtn: {
      marginTop: 14,
      marginHorizontal: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center",
    },
    cancelText: {
      fontSize: 13,
      fontFamily: "Outfit_500Medium",
    },
    errorText: {
      fontSize: 15,
      fontFamily: "Outfit_400Regular",
    },
    retryBtn: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryText: {
      fontSize: 14,
      fontFamily: "Outfit_600SemiBold",
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Outfit_600SemiBold",
    },
    emptySubtitle: {
      fontSize: 14,
      fontFamily: "Outfit_400Regular",
      textAlign: "center",
    },
    browseBtn: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 24,
      paddingVertical: 12,
      marginTop: 8,
    },
    browseBtnText: {
      fontSize: 14,
      fontFamily: "Outfit_600SemiBold",
    },
  });
}
