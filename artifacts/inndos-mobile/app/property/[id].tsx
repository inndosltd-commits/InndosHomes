import {
  useCreateBooking,
  useGetProperty,
  useCheckFavorite,
  useAddFavorite,
  useRemoveFavorite,
  useListBookings,
  getGetPropertyQueryKey,
  getListFavoritesQueryKey,
  getCheckFavoriteQueryKey,
} from "@workspace/api-client-react";
import { getListBookingsQueryKey } from "@workspace/api-client-react";
import { getImageUrl } from "@/utils/imageUrl";
import { resolveAmenityLabel } from "@/utils/amenities";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useVideoPlayer, VideoView } from "expo-video";
import { PropertyLocationMap } from "@/components/PropertyLocationMap";
import { propertySubtypeLabel, propertyTypeLabel } from "@workspace/property-categories";

const SCREEN_WIDTH = Dimensions.get("window").width;

function PropertyVideo({ source }: { source: string }) {
  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = false;
  });

  useFocusEffect(
    useCallback(() => {
      return () => {
        player.pause();
      };
    }, [player]),
  );

  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: 220, backgroundColor: "#000000" }}
      nativeControls
      allowsFullscreen
      allowsPictureInPicture
      contentFit="cover"
    />
  );
}

function getPriceLabel(type: string, price: number, priceUnit?: string | null): string {
  const formatted = `KES ${price.toLocaleString()}`;
  const unitLabels: Record<string, string> = {
    month: "/mo",
    week: "/wk",
    night: "/night",
    semester: "/semester",
    year: "/yr",
    sqft: "/sq ft",
  };
  if (priceUnit && unitLabels[priceUnit]) return `${formatted}${unitLabels[priceUnit]}`;
  if (type === "rent") return `${formatted}/mo`;
  if (type === "bnb" || type === "hotel" || type === "hostel") return `${formatted}/night`;
  return formatted;
}

function getLandMeasurements(details: Record<string, unknown> | undefined): { acres?: string; plotSize?: string } {
  const land = details?.land;
  if (!land || typeof land !== "object" || Array.isArray(land)) return {};
  const values = land as { acres?: unknown; plotSizeFt?: unknown };
  const acres = values.acres === null || values.acres === undefined || String(values.acres).trim() === ""
    ? undefined : String(values.acres);
  const plotSize = values.plotSizeFt === null || values.plotSizeFt === undefined || String(values.plotSizeFt).trim() === ""
    ? undefined : String(values.plotSizeFt);
  return { acres, plotSize };
}

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isWeb = Platform.OS === "web";

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const lightboxRef = useRef<FlatList>(null);

  const [isLinkedUp, setIsLinkedUp] = useState(false);

  const propertyQueryKey = [
    ...getGetPropertyQueryKey(id ?? ""),
    user?.id ?? "signed-out",
  ];
  const { data: property, isLoading, error } = useGetProperty(id ?? "", {
    query: { queryKey: propertyQueryKey },
  });
  const { data: bookings } = useListBookings({
    query: {
      queryKey: [...getListBookingsQueryKey(), user?.id ?? "signed-out"],
      enabled: !!user,
    },
  });
  const { mutate: createBooking, isPending: isBooking } = useCreateBooking();

  const { data: favoriteStatus } = useCheckFavorite(id ?? "");
  const isFavorited = favoriteStatus?.isFavorited ?? false;
  const { mutate: addFavorite, isPending: isAdding } = useAddFavorite();
  const { mutate: removeFavorite, isPending: isRemoving } = useRemoveFavorite();
  const isFavoriteLoading = isAdding || isRemoving;
  const hasActiveLinkUp = isLinkedUp || (
    bookings?.some((booking) =>
      booking.propertyId === id && booking.status !== "cancelled"
    ) ?? false
  );

  const handleShare = async () => {
    if (!id) return;
    const deepLink = `inndos-mobile://property/${id}`;
    const title = property?.title ?? "Check out this property";
    const message = `${title}\n${deepLink}`;

    if (isWeb) {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(deepLink);
          Alert.alert("Link Copied", "Property link copied to clipboard.");
        } else {
          Alert.alert("Share Link", deepLink);
        }
      } catch {
        Alert.alert("Share Link", deepLink);
      }
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        await Share.share({ message, title, url: deepLink });
      } catch {
        // dismissed by user — no action needed
      }
    }
  };

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

  const handleLinkUp = () => {
    if (!user) {
      router.push("/(auth)/login");
      return;
    }
    if (!property) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Confirm Link Up",
      `Link Up with "${property.title}"?\n\nThe owner will review your request and contact you about availability and next steps.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            createBooking(
              {
                data: {
                  propertyId: property.id,
                  startDate: "1970-01-01",
                  endDate: "1970-01-02",
                  totalPrice: property.price,
                },
              },
              {
                onSuccess: async () => {
                  setIsLinkedUp(true);
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() }),
                    queryClient.invalidateQueries({ queryKey: propertyQueryKey }),
                  ]);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert("Linked Up! 🔗", "Your link-up has been submitted and is pending confirmation.", [
                    { text: "View Link-Ups", onPress: () => router.push("/(tabs)/bookings") },
                    { text: "OK" },
                  ]);
                },
                onError: () => Alert.alert("Error", "Failed to link up. Please try again."),
              }
            );
          },
        },
      ]
    );
  };

  const bottomPad = isWeb ? 34 : insets.bottom;
  const styles = getStyles(colors);

  const handleCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActivePhotoIndex(idx);
  };

  const openLightbox = (index: number) => {
    const safeIndex = Math.max(0, Math.min(index, allPhotos.length - 1));
    if (!allPhotos[safeIndex]) return;
    setLightboxIndex(safeIndex);
    setLightboxVisible(true);
    setTimeout(() => {
      try {
        lightboxRef.current?.scrollToIndex({ index: safeIndex, animated: false });
      } catch {
        lightboxRef.current?.scrollToOffset({ offset: safeIndex * SCREEN_WIDTH, animated: false });
      }
    }, 50);
  };

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

  const showBooking = true;

  const photoCandidates = (property.images && property.images.length > 0)
    ? property.images
    : Array.isArray((property as { videoPosters?: string[] }).videoPosters) &&
        (property as { videoPosters?: string[] }).videoPosters!.length > 0
      ? (property as { videoPosters: string[] }).videoPosters
    : [property.image];
  const allPhotos = photoCandidates
    .map((photo) => getImageUrl(photo))
    .filter((photo): photo is string => photo.length > 0);
  const propertyVideos = Array.isArray((property as { videos?: string[] }).videos)
    ? (property as { videos: string[] }).videos
        .map((video) => getImageUrl(video))
        .filter((video): video is string => video.length > 0)
    : [];
  const safeVideoIndex = Math.min(activeVideoIndex, Math.max(0, propertyVideos.length - 1));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Lightbox Modal */}
      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxVisible(false)}
      >
        <View style={styles.lightboxBackdrop}>
          <Pressable style={styles.lightboxClose} onPress={() => setLightboxVisible(false)}>
            <Feather name="x" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.lightboxCounter}>{lightboxIndex + 1} / {allPhotos.length}</Text>
          <FlatList
            ref={lightboxRef}
            data={allPhotos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={lightboxIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onScrollToIndexFailed={({ index }) => {
              lightboxRef.current?.scrollToOffset({ offset: index * SCREEN_WIDTH, animated: false });
            }}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setLightboxIndex(idx);
            }}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH, justifyContent: "center", alignItems: "center" }}>
                <Image
                  source={{ uri: getImageUrl(item) }}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                  resizeMode="contain"
                />
              </View>
            )}
          />
          {/* Thumbnail strip */}
          {allPhotos.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.lightboxThumbs}
            >
              {allPhotos.map((photo, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    setLightboxIndex(idx);
                    try {
                      lightboxRef.current?.scrollToIndex({ index: idx, animated: true });
                    } catch {
                      lightboxRef.current?.scrollToOffset({ offset: idx * SCREEN_WIDTH, animated: true });
                    }
                  }}
                  style={[
                    styles.lightboxThumb,
                    { borderColor: idx === lightboxIndex ? "#fff" : "transparent" },
                  ]}
                >
                  <Image
                    source={{ uri: getImageUrl(photo) }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 120 }}
      >
        {/* Photo Carousel */}
        <View style={styles.heroContainer}>
          {allPhotos.length > 0 ? (
            <FlatList
              ref={carouselRef}
              data={allPhotos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleCarouselScroll}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item, index }) => (
                <Pressable
                  style={{ width: SCREEN_WIDTH, height: 320 }}
                  onPress={() => openLightbox(index)}
                >
                  <Image
                    source={{ uri: item }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                  <View style={styles.heroOverlay} />
                </Pressable>
              )}
            />
          ) : (
            <View style={{ width: SCREEN_WIDTH, height: 320, alignItems: "center", justifyContent: "center", backgroundColor: colors.muted }}>
              <Feather name="home" size={42} color={colors.mutedForeground} />
            </View>
          )}

          {/* Nav buttons */}
          <View style={[styles.heroBackBtn, { top: isWeb ? 67 + 12 : insets.top + 12 }]}>
            <Pressable
              style={[styles.backCircle, { backgroundColor: "rgba(255,255,255,0.9)" }]}
              onPress={() => router.back()}
            >
              <Feather name="arrow-left" size={20} color="#000" />
            </Pressable>
            <View style={styles.heroRightActions}>
              <Pressable
                style={[styles.heartCircle]}
                onPress={handleShare}
              >
                <Feather name="share-2" size={20} color="#fff" />
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
          </View>

          {/* Price + type chip */}
          <View style={styles.heroPriceRow}>
            <Text style={styles.heroPriceText}>{getPriceLabel(property.type, property.price, property.priceUnit)}</Text>
            <View style={[styles.typeChip, { backgroundColor: colors.primary }]}>
              <Text style={[styles.typeChipText, { color: colors.primaryForeground }]}>
                {propertyTypeLabel(property.type)}
              </Text>
            </View>
            {propertySubtypeLabel(property.subtype) && (
              <View style={[styles.typeChip, { backgroundColor: colors.card }]}>
                <Text style={[styles.typeChipText, { color: colors.foreground }]}>
                  {propertySubtypeLabel(property.subtype)}
                </Text>
              </View>
            )}
          </View>

          {/* Dot indicators */}
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

          {/* Photo count badge */}
          {allPhotos.length > 1 && (
            <View style={styles.photoCountBadge}>
              <Feather name="image" size={12} color="#fff" />
              <Text style={styles.photoCountText}>{activePhotoIndex + 1}/{allPhotos.length}</Text>
            </View>
          )}
        </View>

        {propertyVideos.length > 0 && (
          <View style={styles.videoSection}>
            <View style={styles.videoSectionHeader}>
              <Feather name="video" size={17} color={colors.foreground} />
              <Text style={[styles.videoSectionTitle, { color: colors.foreground }]}>
                Video tour{propertyVideos.length === 1 ? "" : "s"}
              </Text>
            </View>
            <View key={propertyVideos[safeVideoIndex]} style={styles.videoCard}>
              <PropertyVideo source={propertyVideos[safeVideoIndex]} />
            </View>
            {propertyVideos.length > 1 && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 }}>
                <Pressable
                  onPress={() => setActiveVideoIndex((index) => Math.max(0, index - 1))}
                  disabled={safeVideoIndex === 0}
                  style={{ padding: 8, opacity: safeVideoIndex === 0 ? 0.35 : 1 }}
                >
                  <Feather name="chevron-left" size={22} color={colors.foreground} />
                </Pressable>
                <Text style={{ color: colors.mutedForeground }}>
                  {safeVideoIndex + 1} / {propertyVideos.length}
                </Text>
                <Pressable
                  onPress={() => setActiveVideoIndex((index) => Math.min(propertyVideos.length - 1, index + 1))}
                  disabled={safeVideoIndex === propertyVideos.length - 1}
                  style={{ padding: 8, opacity: safeVideoIndex === propertyVideos.length - 1 ? 0.35 : 1 }}
                >
                  <Feather name="chevron-right" size={22} color={colors.foreground} />
                </Pressable>
              </View>
            )}
          </View>
        )}

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

          {(() => {
            const isLand = property.subtype === "land" || Boolean(property.details?.land);
            const landMeasurements = getLandMeasurements(property.details);
            const showArea = !isLand && property.sqft > 0;
            const showLandMeasurements = isLand && (landMeasurements.acres || landMeasurements.plotSize);
            const showBedsOrBaths = !isLand && (property.beds > 0 || property.baths > 0);
            const showGuests = property.guests != null && property.guests > 0;
            return (showBedsOrBaths || showArea || showLandMeasurements || showGuests) && (
            <View style={[styles.specsRow, { borderColor: colors.border }]}>
            {!isLand && property.beds > 0 && (
              <View style={styles.specItem}>
                <Feather name="grid" size={20} color={colors.foreground} />
                <Text style={[styles.specValue, { color: colors.foreground }]}>{property.beds}</Text>
                <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>Beds</Text>
              </View>
            )}
            {!isLand && property.baths > 0 && (
              <View style={styles.specItem}>
                <Feather name="droplet" size={20} color={colors.foreground} />
                <Text style={[styles.specValue, { color: colors.foreground }]}>{property.baths}</Text>
                <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>Baths</Text>
              </View>
            )}
            {showArea && (
              <View style={styles.specItem}>
                <Feather name="maximize-2" size={20} color={colors.foreground} />
                <Text style={[styles.specValue, { color: colors.foreground }]}>{property.sqft}</Text>
                <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>sqft</Text>
              </View>
            )}
            {isLand && landMeasurements.acres && (
              <View style={styles.specItem}>
                <Feather name="maximize-2" size={20} color={colors.foreground} />
                <Text style={[styles.specValue, { color: colors.foreground }]}>{landMeasurements.acres}</Text>
                <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>acres</Text>
              </View>
            )}
            {isLand && landMeasurements.plotSize && (
              <View style={styles.specItem}>
                <Feather name="maximize-2" size={20} color={colors.foreground} />
                <Text style={[styles.specValue, { color: colors.foreground }]}>{landMeasurements.plotSize}</Text>
                <Text style={[styles.specLabel, { color: colors.mutedForeground }]}>plot size</Text>
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
            );
          })()}

          {property.description ? (
            <View style={styles.descriptionSection}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ABOUT THIS PLACE</Text>
              <Text style={[styles.descriptionText, { color: colors.foreground }]}>{property.description}</Text>
            </View>
          ) : null}

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
                    <Text style={[styles.tagText, { color: colors.foreground }]}>{resolveAmenityLabel(tag)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {property.lat && property.lng && property.lat !== "" && property.lng !== "" && (
            <PropertyLocationMap
              lat={property.lat}
              lng={property.lng}
              title={property.title}
              address={property.address}
            />
          )}

          {/* Direct contacts are private until this customer has linked up. */}
          {hasActiveLinkUp && (property.ownerPhone || property.ownerEmail) && (
            <View style={[styles.contactCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.contactTitle, { color: colors.foreground }]}>Contact Owner / Host</Text>
              <Text style={[styles.contactSubtitle, { color: colors.mutedForeground }]}>
                Reach the owner directly for queries or to confirm availability.
              </Text>
              {property.ownerPhone ? (
                <View style={styles.contactActions}>
                  <Pressable style={[styles.contactBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => Linking.openURL("tel:" + property.ownerPhone)}>
                    <Feather name="phone" size={14} color={colors.foreground} />
                    <Text style={[styles.contactBtnText, { color: colors.foreground }]}>Call</Text>
                  </Pressable>
                  <Pressable style={[styles.contactBtn, { backgroundColor: "#25D366" }]}
                    onPress={() => Linking.openURL("https://wa.me/" + String(property.ownerPhone).replace(/[^0-9]/g, ""))}>
                    <Feather name="message-circle" size={14} color="#fff" />
                    <Text style={[styles.contactBtnText, { color: "#fff" }]}>WhatsApp</Text>
                  </Pressable>
                </View>
              ) : null}
              {property.ownerEmail ? (
                <Pressable style={[styles.contactEmailBtn, { borderColor: colors.border }]}
                  onPress={() => Linking.openURL("mailto:" + property.ownerEmail)}>
                  <Feather name="mail" size={14} color={colors.foreground} />
                  <Text style={[styles.contactBtnText, { color: colors.foreground }]}>{property.ownerEmail}</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {showBooking && property.type === "rent" && (
            <View style={[styles.rentSummary, { backgroundColor: colors.muted }]}>
              <Feather name="info" size={16} color={colors.mutedForeground} />
              <Text style={[styles.rentSummaryText, { color: colors.mutedForeground }]}>
                Monthly rate · KES {property.price.toLocaleString()}/mo
              </Text>
            </View>
          )}

        </View>
      </ScrollView>

      {showBooking && !hasActiveLinkUp && (
        <View style={[styles.bookingBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad + 12 }]}>
          <View>
            <Text style={[styles.bookingPriceLabel, { color: colors.mutedForeground }]}>
              Listed price
            </Text>
            <Text style={[styles.bookingTotalPrice, { color: colors.foreground }]}>
              {getPriceLabel(property.type, property.price, property.priceUnit)}
            </Text>
          </View>
          <View style={styles.bookBtnWrapper}>
            <Pressable
              style={[
                styles.bookBtn,
                { backgroundColor: colors.primary },
                isBooking && { opacity: 0.4 },
              ]}
              onPress={handleLinkUp}
              disabled={isBooking}
            >
              {isBooking ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.bookBtnText, { color: colors.primaryForeground }]}>
                  {user ? "🔗 Link Up" : "Sign In to Link Up"}
                </Text>
              )}
            </Pressable>
          </View>
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
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.2)",
    },
    dotsRow: {
      position: "absolute",
      bottom: 56,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
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
      bottom: 16,
      right: 16,
      backgroundColor: "rgba(0,0,0,0.55)",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    photoCountText: {
      color: "#fff",
      fontSize: 12,
      fontFamily: "Outfit_500Medium",
    },
    lightboxBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.97)",
      justifyContent: "center",
      alignItems: "center",
    },
    lightboxClose: {
      position: "absolute",
      top: 48,
      right: 16,
      zIndex: 10,
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 20,
      padding: 8,
    },
    lightboxCounter: {
      position: "absolute",
      top: 54,
      alignSelf: "center",
      color: "#fff",
      fontSize: 14,
      fontFamily: "Outfit_500Medium",
      backgroundColor: "rgba(0,0,0,0.4)",
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      zIndex: 10,
    },
    lightboxThumbs: {
      paddingHorizontal: 16,
      gap: 8,
      paddingBottom: 32,
    },
    lightboxThumb: {
      width: 56,
      height: 56,
      borderRadius: 8,
      overflow: "hidden",
      borderWidth: 2,
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
    heroRightActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
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
    videoSection: {
      paddingHorizontal: 20,
      paddingTop: 20,
      gap: 10,
    },
    videoSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    videoSectionTitle: {
      fontSize: 16,
      fontFamily: "Outfit_700Bold",
    },
    videoCard: {
      overflow: "hidden",
      borderRadius: 12,
      backgroundColor: "#000000",
    },
    videoPlayer: {
      width: "100%",
      height: 220,
      backgroundColor: "#000000",
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
    descriptionSection: {
      gap: 4,
    },
    descriptionText: {
      fontSize: 15,
      fontFamily: "Outfit_400Regular",
      lineHeight: 24,
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
    availabilityRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 28,
    },
    availabilityBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderRadius: 20,
    },
    availabilityText: {
      fontSize: 13,
      fontFamily: "Outfit_600SemiBold",
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
    bookBtnWrapper: {
      alignItems: "center",
      gap: 4,
    },
    bookBtn: {
      paddingHorizontal: 32,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 140,
      borderRadius: 12,
    },
    bookBtnText: {
      fontSize: 15,
      fontFamily: "Outfit_600SemiBold",
    },
    bookBtnHint: {
      fontSize: 11,
      fontFamily: "Outfit_400Regular",
      textAlign: "center",
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
    contactCard: { padding: 16, gap: 10, borderWidth: 1, borderRadius: 12 },
    contactTitle: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
    contactSubtitle: { fontSize: 13, fontFamily: "Outfit_400Regular", lineHeight: 18 },
    contactActions: { flexDirection: "row", gap: 8 },
    contactBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 8, borderWidth: 1 },
    contactEmailBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderRadius: 8 },
    contactBtnText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
    unavailableBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderWidth: 1, borderRadius: 10 },
    unavailableBannerText: { fontSize: 13, fontFamily: "Outfit_400Regular", flex: 1, lineHeight: 18 },
  });
}
