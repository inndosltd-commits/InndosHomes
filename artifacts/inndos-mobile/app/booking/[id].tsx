import {
  useListBookings,
  useListReceivedBookings,
  useGetProperty,
  getListBookingsQueryKey,
  getListReceivedBookingsQueryKey,
  getGetPropertyQueryKey,
} from "@workspace/api-client-react";
import { getImageUrl } from "@/utils/imageUrl";
import { getApiBaseUrl } from "@/utils/api";
import { useAuth } from "@/context/AuthContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

const SCREEN_WIDTH = Dimensions.get("window").width;

type BookingStatus = "pending" | "confirmed" | "cancelled";
type ConfirmationChoice = "confirmed" | "outside_inndos" | "not_completed";

interface Transaction {
  id: string;
  bookingId: string | null;
  ownerId: string;
  tenantId: string;
  transactionType: "rental" | "sale";
  ownerConfirmation: string;
  tenantConfirmation: string;
  status: string;
}

interface ReviewCheck {
  hasReviewed: boolean;
  review: { rating: number; comment: string | null } | null;
}

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
    case "bnb": return "B&B";
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
  const queryClient = useQueryClient();
  const { user, token } = useAuth();
  const isWeb = Platform.OS === "web";

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ConfirmationChoice | null>(null);
  const [reviewCheck, setReviewCheck] = useState<ReviewCheck | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const { data: bookings, isLoading: bookingsLoading } = useListBookings({
    query: { queryKey: getListBookingsQueryKey() },
  });
  const { data: receivedBookings, isLoading: receivedBookingsLoading } = useListReceivedBookings({
    query: { queryKey: getListReceivedBookingsQueryKey(), enabled: !!user && (user.role === "owner" || user.role === "host") },
  });

  const booking = [...(bookings ?? []), ...(receivedBookings ?? [])].find((b) => b.id === id);

  const { data: property, isLoading: propertyLoading } = useGetProperty(
    booking?.propertyId ?? "",
    {
      query: {
        queryKey: getGetPropertyQueryKey(booking?.propertyId ?? ""),
        enabled: !!booking?.propertyId,
      },
    }
  );

  const isLoading = bookingsLoading || receivedBookingsLoading || (!!booking?.propertyId && propertyLoading);

  useEffect(() => {
    if (!booking || booking.status !== "confirmed" || !token) {
      setTransaction(null);
      setTransactionError(null);
      return;
    }
    let active = true;
    void fetch(`${getApiBaseUrl()}/api/transactions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const data = await response.json().catch(() => null) as Transaction[] | { error?: string } | null;
        if (!response.ok) {
          throw new Error(!Array.isArray(data) && data && "error" in data ? data.error : "Could not load confirmation.");
        }
        if (!Array.isArray(data)) throw new Error("Could not load confirmation.");
        if (active) setTransaction(data.find((item) => item.bookingId === booking.id) ?? null);
      })
      .catch((error: unknown) => {
        if (active) setTransactionError(error instanceof Error ? error.message : "Could not load confirmation.");
      });
    return () => { active = false; };
  }, [booking?.id, booking?.status, token]);

  const isGuest = !!booking && booking.userId === user?.id;
  useEffect(() => {
    if (!booking || booking.status !== "confirmed" || !isGuest || !token) {
      setReviewCheck(null);
      setReviewError(null);
      return;
    }
    let active = true;
    void fetch(`${getApiBaseUrl()}/api/reviews/check/${booking.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const data = await response.json().catch(() => null) as ReviewCheck | { error?: string } | null;
        if (!response.ok) {
          throw new Error(data && "error" in data ? data.error : "Could not load review.");
        }
        if (active) setReviewCheck(data as ReviewCheck);
      })
      .catch((error: unknown) => {
        if (active) setReviewError(error instanceof Error ? error.message : "Could not load review.");
      });
    return () => { active = false; };
  }, [booking?.id, booking?.status, isGuest, token]);

  const submitConfirmation = async (choice: ConfirmationChoice) => {
    if (!transaction || !token) return;
    setConfirming(choice);
    setTransactionError(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/transactions/${transaction.id}/confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: choice }),
      });
      const data = await response.json().catch(() => null) as Transaction | { error?: string } | null;
      if (!response.ok) {
        throw new Error(data && "error" in data ? data.error : "Could not confirm transaction.");
      }
      setTransaction(data as Transaction);
      await queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getListReceivedBookingsQueryKey() });
    } catch (error) {
      setTransactionError(error instanceof Error ? error.message : "Could not confirm transaction.");
    } finally {
      setConfirming(null);
    }
  };

  const submitReview = async () => {
    if (!booking || !token || rating < 1) {
      setReviewError("Please select a rating.");
      return;
    }
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/reviews`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, rating, comment }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "Could not submit review.");
      setReviewCheck({ hasReviewed: true, review: { rating, comment: comment.trim() || null } });
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Could not submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

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
                     Linked {booking.createdAt ? new Date(booking.createdAt).toLocaleString() : "recently"}
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

          {booking.status === "confirmed" && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TRANSACTION CONFIRMATION</Text>
                {transaction ? (() => {
                  const isOwner = transaction.ownerId === user?.id;
                  const myConfirmation = isOwner ? transaction.ownerConfirmation : transaction.tenantConfirmation;
                  const canConfirm = myConfirmation === "pending";
                  const completedLabel = transaction.transactionType === "sale"
                    ? "Sold via inndos"
                    : "Rented via inndos";
                  return (
                    <View style={[styles.confirmationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.confirmationRow}>
                        <Text style={[styles.confirmationLabel, { color: colors.mutedForeground }]}>OWNER</Text>
                        <Text style={[styles.confirmationValue, { color: colors.foreground }]}>{transaction.ownerConfirmation.replace(/_/g, " ")}</Text>
                      </View>
                      <View style={styles.confirmationRow}>
                        <Text style={[styles.confirmationLabel, { color: colors.mutedForeground }]}>TENANT</Text>
                        <Text style={[styles.confirmationValue, { color: colors.foreground }]}>{transaction.tenantConfirmation.replace(/_/g, " ")}</Text>
                      </View>
                      {canConfirm ? (
                        <View style={styles.confirmationActions}>
                          <Text style={[styles.confirmPrompt, { color: colors.foreground }]}>Confirm your outcome</Text>
                          {([
                            ["confirmed", completedLabel, "check-circle"],
                            ["outside_inndos", "Completed outside inndos", "external-link"],
                            ["not_completed", "Transaction did not complete", "x-circle"],
                          ] as const).map(([choice, label, icon]) => (
                            <Pressable
                              key={choice}
                              style={[
                                styles.confirmChoice,
                                { borderColor: choice === "confirmed" ? colors.primary : colors.border },
                                confirming && { opacity: 0.6 },
                              ]}
                              disabled={!!confirming}
                              onPress={() => void submitConfirmation(choice)}
                            >
                              {confirming === choice
                                ? <ActivityIndicator size="small" color={colors.primary} />
                                : <Feather name={icon} size={15} color={choice === "confirmed" ? colors.primary : colors.mutedForeground} />}
                              <Text style={[styles.confirmChoiceText, { color: colors.foreground }]}>{label}</Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : (
                        <Text style={[styles.confirmWaiting, { color: colors.mutedForeground }]}>
                          Your confirmation has been recorded. Waiting for the other party if needed.
                        </Text>
                      )}
                    </View>
                  );
                })() : (
                  <Text style={[styles.compactMessage, { color: transactionError ? "#ef4444" : colors.mutedForeground }]}>
                    {transactionError || "No transaction confirmation is available yet."}
                  </Text>
                )}
                {transaction && transactionError ? (
                  <Text style={[styles.compactMessage, { color: "#ef4444" }]}>{transactionError}</Text>
                ) : null}
              </View>
            </>
          )}

          {booking.status === "confirmed" && isGuest && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>YOUR REVIEW</Text>
                {!reviewCheck && !reviewError ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : reviewCheck?.hasReviewed ? (
                  <View style={[styles.reviewedCard, { backgroundColor: colors.muted }]}>
                    <Feather name="check-circle" size={16} color={colors.primary} />
                    <Text style={[styles.reviewedText, { color: colors.foreground }]}>
                      Reviewed {reviewCheck.review ? `(${reviewCheck.review.rating}/5)` : ""}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Pressable key={star} onPress={() => setRating(star)} hitSlop={6}>
                          <Feather name="star" size={25} color={star <= rating ? colors.primary : colors.border} />
                        </Pressable>
                      ))}
                    </View>
                    <TextInput
                      style={[styles.reviewInput, { color: colors.foreground, borderColor: colors.border }]}
                      placeholder="Optional comment"
                      placeholderTextColor={colors.mutedForeground}
                      value={comment}
                      onChangeText={setComment}
                      multiline
                      maxLength={1000}
                    />
                    {reviewError ? <Text style={styles.reviewError}>{reviewError}</Text> : null}
                    <Pressable
                      style={[styles.reviewSubmit, { backgroundColor: colors.primary }, submittingReview && { opacity: 0.6 }]}
                      disabled={submittingReview}
                      onPress={() => void submitReview()}
                    >
                      {submittingReview
                        ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                        : <Text style={[styles.reviewSubmitText, { color: colors.primaryForeground }]}>Submit review</Text>}
                    </Pressable>
                  </View>
                )}
              </View>
            </>
          )}

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
          {(booking.ownerName || property?.ownerName) && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LISTED BY</Text>
                <View style={[styles.ownerCard, { backgroundColor: colors.muted }]}>
                  <View style={[styles.ownerAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.ownerInitial, { color: colors.primaryForeground }]}>
                       {(booking.ownerBusinessName || booking.ownerName || property?.ownerName || "L").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                   <View style={styles.ownerDetails}>
                     <Text style={[styles.ownerName, { color: colors.foreground }]}>
                       {booking.ownerBusinessName || booking.ownerName || property?.ownerName}
                     </Text>
                     {booking.ownerBusinessName && booking.ownerName ? (
                       <Text style={[styles.ownerSub, { color: colors.mutedForeground }]}>{booking.ownerName}</Text>
                     ) : null}
                    <Text style={[styles.ownerSub, { color: colors.mutedForeground }]}>Property Owner</Text>
                     {booking.ownerPhone ? (
                       <Pressable onPress={() => void Linking.openURL(`tel:${booking.ownerPhone}`)}>
                         <Text style={[styles.contactLink, { color: colors.primary }]}>{booking.ownerPhone}</Text>
                       </Pressable>
                     ) : null}
                     {booking.ownerEmail ? (
                       <Pressable onPress={() => void Linking.openURL(`mailto:${booking.ownerEmail}`)}>
                         <Text style={[styles.contactLink, { color: colors.primary }]}>{booking.ownerEmail}</Text>
                       </Pressable>
                     ) : null}
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
              View linked property
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
    confirmationCard: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      gap: 10,
    },
    confirmationRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    confirmationLabel: {
      fontSize: 11,
      fontFamily: "Outfit_600SemiBold",
      letterSpacing: 0.8,
    },
    confirmationValue: {
      fontSize: 12,
      fontFamily: "Outfit_500Medium",
      textTransform: "capitalize",
      textAlign: "right",
    },
    confirmationActions: {
      gap: 8,
      marginTop: 2,
    },
    confirmPrompt: {
      fontSize: 13,
      fontFamily: "Outfit_600SemiBold",
    },
    confirmChoice: {
      minHeight: 38,
      borderWidth: 1,
      borderRadius: 7,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    confirmChoiceText: {
      fontSize: 12,
      fontFamily: "Outfit_500Medium",
      flex: 1,
    },
    confirmWaiting: {
      fontSize: 12,
      fontFamily: "Outfit_400Regular",
      lineHeight: 17,
    },
    compactMessage: {
      fontSize: 12,
      fontFamily: "Outfit_400Regular",
    },
    reviewCard: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      gap: 10,
    },
    starsRow: {
      flexDirection: "row",
      gap: 8,
    },
    reviewInput: {
      minHeight: 68,
      borderWidth: 1,
      borderRadius: 7,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 13,
      fontFamily: "Outfit_400Regular",
      textAlignVertical: "top",
    },
    reviewError: {
      color: "#ef4444",
      fontSize: 12,
      fontFamily: "Outfit_400Regular",
    },
    reviewSubmit: {
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 7,
    },
    reviewSubmitText: {
      fontSize: 13,
      fontFamily: "Outfit_600SemiBold",
    },
    reviewedCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderRadius: 8,
    },
    reviewedText: {
      fontSize: 13,
      fontFamily: "Outfit_500Medium",
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
    ownerDetails: {
      flex: 1,
      gap: 2,
    },
    contactLink: {
      fontSize: 13,
      fontFamily: "Outfit_500Medium",
      marginTop: 3,
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
