import {
  useListProperties,
  getListPropertiesQueryKey,
} from "@workspace/api-client-react";
import type { Property } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { getImageUrl } from "@/utils/imageUrl";
import { getApiBaseUrl } from "@/utils/api";

function getTypeLabel(type: string): string {
  switch (type) {
    case "rent":
      return "For Rent";
    case "sale":
      return "For Sale";
    case "bnb":
      return "B&B";
    case "hotel":
      return "Hotel";
    case "hostel":
      return "Hostel";
    default:
      return type;
  }
}

function getPriceLabel(property: Property): string {
  const price = `KES ${property.price.toLocaleString()}`;
  if (property.type === "rent") return `${price}/mo`;
  if (
    property.type === "bnb" ||
    property.type === "hotel" ||
    property.type === "hostel"
  )
    return `${price}/night`;
  return price;
}

function ListingCard({
  property,
  colors,
  savesCount,
  onStatus,
  onEdit,
  onDelete,
  isMutating,
}: {
  property: Property;
  colors: ReturnType<typeof useColors>;
  /** null = saves data not yet loaded or failed; badge is hidden */
  savesCount: number | null;
  onStatus: (property: Property, action: "deactivate" | "reactivate" | "sold") => void;
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
  isMutating: boolean;
}) {
  const router = useRouter();
  const isPending = !property.isVerified;
  const status = String((property as Property & { propertyStatus?: string }).propertyStatus ?? "");
  const isDeactivated = status === "inactive" || status === "deactivated";
  const isSold = status === "sold";
  const canMarkSold =
    property.type === "sale" &&
    ["apartment", "home", "land"].includes(
      String(property.subtype ?? "").toLowerCase()
    );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isPending ? "#f59e0b" : colors.border,
          borderWidth: isPending ? 1.5 : 1,
        },
      ]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: getImageUrl(property.image) }}
          style={[styles.image, isPending && styles.imagePending]}
          resizeMode="cover"
        />
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: colors.primary }]}>
            <Text
              style={[
                styles.typeBadgeText,
                { color: colors.primaryForeground },
              ]}
            >
              {getTypeLabel(property.type)}
            </Text>
          </View>
          {isPending ? (
            <View style={styles.pendingBadge}>
              <Feather name="clock" size={11} color="#92400e" />
              <Text style={styles.pendingBadgeText}>Pending Approval</Text>
            </View>
          ) : (
            <View style={styles.verifiedBadge}>
              <Feather name="check-circle" size={11} color="#166534" />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          )}
          {isDeactivated && (
            <View style={styles.inactiveBadge}>
              <Feather name="pause-circle" size={11} color="#92400e" />
              <Text style={styles.inactiveBadgeText}>Deactivated</Text>
            </View>
          )}
          {isSold && (
            <View style={styles.soldBadge}>
              <Feather name="tag" size={11} color="#1d4ed8" />
              <Text style={styles.soldBadgeText}>Sold</Text>
            </View>
          )}
        </View>
        <View style={styles.priceOverlay}>
          <Text style={styles.priceText}>{getPriceLabel(property)}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTitleRow}>
          <Text
            style={[styles.cardTitle, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {property.title}
          </Text>
          {!isPending && (
            <Pressable
              hitSlop={8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: "/property/[id]",
                  params: { id: property.id },
                });
              }}
            >
              <Feather name="external-link" size={16} color={colors.primary} />
            </Pressable>
          )}
        </View>

        <View style={styles.addressRow}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text
            style={[styles.addressText, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {property.address}
          </Text>
        </View>

        {savesCount !== null && (
          <View style={styles.metaRow}>
            <View style={styles.savesBadge}>
              <Feather name="heart" size={12} color="#ef4444" />
              <Text style={styles.savesBadgeText}>
                {savesCount} {savesCount === 1 ? "save" : "saves"}
              </Text>
            </View>
          </View>
        )}

        {isPending && (
          <View
            style={[
              styles.pendingNote,
              { backgroundColor: "#fef3c7", borderColor: "#fde68a" },
            ]}
          >
            <Feather name="info" size={13} color="#92400e" />
            <Text style={styles.pendingNoteText}>
              This listing is awaiting admin review and is not yet visible to
              guests.
            </Text>
          </View>
        )}
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <Pressable
            style={[styles.actionButton, { borderColor: colors.border }]}
            disabled={isMutating}
            onPress={() => onEdit(property)}
          >
            <Feather name="edit-2" size={15} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>Edit</Text>
          </Pressable>
          {property.type !== "sale" && (
            <Pressable
              style={[styles.actionButton, { borderColor: colors.border }]}
              disabled={isMutating}
              onPress={() => router.push({ pathname: "/management-calendar/[id]", params: { id: property.id } })}
            >
              <Feather name="calendar" size={15} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.foreground }]}>Manage dates</Text>
            </Pressable>
          )}
          {!isPending && !isSold && (
            <Pressable
              style={[styles.actionButton, { borderColor: colors.border }]}
              disabled={isMutating}
              onPress={() => onStatus(property, isDeactivated ? "reactivate" : "deactivate")}
            >
              <Feather name={isDeactivated ? "play-circle" : "pause-circle"} size={15} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.foreground }]}>
                {isDeactivated ? "Reactivate" : "Deactivate"}
              </Text>
            </Pressable>
          )}
          {!isPending && canMarkSold && !isSold && (
            <Pressable
              style={[styles.actionButton, { borderColor: colors.border }]}
              disabled={isMutating}
              onPress={() => onStatus(property, "sold")}
            >
              <Feather name="tag" size={15} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.foreground }]}>Mark sold</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.actionButton, { borderColor: "#fecaca" }]}
            disabled={isMutating}
            onPress={() => onDelete(property)}
          >
            <Feather name="trash-2" size={15} color="#dc2626" />
            <Text style={[styles.actionText, { color: "#dc2626" }]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function MyListingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();
  const isWeb = Platform.OS === "web";

  const OWNER_ROLES = ["owner", "host", "admin"];
  const canList = user && OWNER_ROLES.includes(user.role);

  const {
    data: properties,
    isLoading,
    isRefetching,
    refetch,
  } = useListProperties(
    { ownerId: user?.id },
    {
      query: {
        queryKey: getListPropertiesQueryKey({ ownerId: user?.id }),
        enabled: !!user && !!canList,
      },
    }
  );

  // Fetch saves counts from /api/favorites/my-properties.
  // null = not yet loaded or failed (badge hidden); Record = successfully loaded.
  const [savesMap, setSavesMap] = useState<Record<string, number> | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const fetchSaves = useCallback(async () => {
    if (!user || !token || !canList) return;
    try {
        const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/favorites/my-properties`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return; // leave savesMap null; badge hidden on error
      const data: { id: string; totalLikes: number }[] = await res.json();
      const map: Record<string, number> = {};
      for (const p of data) map[p.id] = p.totalLikes;
      setSavesMap(map);
    } catch {
      // non-critical; leave savesMap null so no false zeros are shown
    }
  }, [user, token, canList]);

  useEffect(() => {
    fetchSaves();
  }, [fetchSaves]);

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 + 84 : insets.bottom + 84;

  const request = useCallback(async (url: string, method: "PATCH" | "DELETE", body?: unknown) => {
    if (!token) throw new Error("Please sign in again to manage this listing.");
    const response = await fetch(`${getApiBaseUrl()}${url}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string; message?: string } | null;
      throw new Error(data?.error ?? data?.message ?? "Could not update this listing.");
    }
  }, [token]);

  const handleStatus = useCallback((property: Property, action: "deactivate" | "reactivate" | "sold") => {
    const label = action === "sold" ? "mark this listing as sold" : action === "deactivate" ? "deactivate this listing" : "reactivate this listing";
    Alert.alert(
      action === "sold" ? "Mark as sold?" : action === "deactivate" ? "Deactivate listing?" : "Reactivate listing?",
      `Are you sure you want to ${label}?`,
      [{ text: "Cancel", style: "cancel" }, {
        text: action === "sold" ? "Mark sold" : action === "deactivate" ? "Deactivate" : "Reactivate",
        style: action === "deactivate" ? "destructive" : "default",
        onPress: () => void (async () => {
          setMutatingId(property.id);
          try {
            await request(`/api/properties/${property.id}/status`, "PATCH", { action });
            await refetch();
          } catch (error) {
            Alert.alert("Update failed", error instanceof Error ? error.message : "Could not update this listing.");
          } finally {
            setMutatingId(null);
          }
        })(),
      }]
    );
  }, [refetch, request]);

  const handleDelete = useCallback((property: Property) => {
    Alert.alert(
      "Permanently delete listing?",
      `"${property.title}" and its associated listing information will be permanently deleted. This cannot be undone.`,
      [{ text: "Cancel", style: "cancel" }, {
        text: "Delete permanently",
        style: "destructive",
        onPress: () => void (async () => {
          setMutatingId(property.id);
          try {
            await request(`/api/properties/${property.id}`, "DELETE");
            await refetch();
            await fetchSaves();
          } catch (error) {
            Alert.alert("Deletion failed", error instanceof Error ? error.message : "Could not delete this listing.");
          } finally {
            setMutatingId(null);
          }
        })(),
      }]
    );
  }, [fetchSaves, refetch, request]);

  const handleEdit = useCallback((property: Property) => {
    router.push({
      pathname: "/(tabs)/list-property",
      params: { editId: property.id },
    } as never);
  }, [router]);

  if (!user) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            My Listings
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <Feather name="home" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Sign in to view your listings
          </Text>
          <Text
            style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
          >
            Log in to manage the properties you have submitted
          </Text>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text
              style={[styles.primaryBtnText, { color: colors.primaryForeground }]}
            >
              Sign In
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!canList) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            My Listings
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <Feather name="lock" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Owner account required
          </Text>
          <Text
            style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
          >
            Only owners and hosts can manage listings. Contact support to
            upgrade your account.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          My Listings
        </Text>
        {properties && properties.length > 0 && (
          <Text style={[styles.countText, { color: colors.mutedForeground }]}>
            {properties.length}{" "}
            {properties.length === 1 ? "property" : "properties"}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading your listings…
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: bottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => { refetch(); fetchSaves(); }}
              tintColor={colors.primary}
            />
          }
        >
          {!properties || properties.length === 0 ? (
            <View style={styles.emptyInline}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: colors.muted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Feather
                  name="home"
                  size={40}
                  color={colors.mutedForeground}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No listings yet
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: colors.mutedForeground },
                ]}
              >
                Properties you submit will appear here, including those awaiting
                admin approval.
              </Text>
              <Pressable
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => router.push("/(tabs)/list-property")}
              >
                <Feather
                  name="plus"
                  size={16}
                  color={colors.primaryForeground}
                />
                <Text
                  style={[
                    styles.primaryBtnText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Add a Listing
                </Text>
              </Pressable>
            </View>
          ) : (
            properties.map((property) => (
              <ListingCard
                key={property.id}
                property={property}
                colors={colors}
                savesCount={savesMap !== null ? (savesMap[property.id] ?? 0) : null}
                onStatus={handleStatus}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isMutating={mutatingId === property.id}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 2,
  },
  title: {
    fontSize: 24,
    fontFamily: "Outfit_700Bold",
  },
  countText: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  emptyInline: {
    marginTop: 60,
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Outfit_700Bold",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
  },
  card: {
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: 180,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePending: {
    opacity: 0.8,
  },
  badgeRow: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#fef3c7",
  },
  pendingBadgeText: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    color: "#92400e",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#dcfce7",
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    color: "#166534",
  },
  inactiveBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#fef3c7",
  },
  inactiveBadgeText: { fontSize: 11, fontFamily: "Outfit_600SemiBold", color: "#92400e" },
  soldBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#dbeafe",
  },
  soldBadgeText: { fontSize: 11, fontFamily: "Outfit_600SemiBold", color: "#1d4ed8" },
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
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
    color: "#ffffff",
  },
  cardContent: {
    padding: 14,
    gap: 8,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
    flex: 1,
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  savesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#fee2e2",
    borderRadius: 4,
  },
  savesBadgeText: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
    color: "#ef4444",
  },
  pendingNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  pendingNoteText: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    color: "#92400e",
    flex: 1,
    lineHeight: 17,
  },
  actions: {
    marginTop: 4, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", flexWrap: "wrap", gap: 8,
  },
  actionButton: {
    flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 7,
  },
  actionText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
});
