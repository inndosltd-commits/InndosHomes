/**
 * Property Saves Tab
 * Shows owners who saved each of their listings, grouped by property.
 * Calls GET /api/favorites/my-properties
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getImageUrl } from "@/utils/imageUrl";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Saver {
  likerId: string;
  likerName: string | null;
  likerEmail: string | null;
  likerAvatar: string | null;
  savedAt: string;
}

interface PropertyWithSaves {
  id: string;
  title: string;
  type: string;
  price: number;
  address: string | null;
  image: string | null;
  isVerified: boolean;
  propertyStatus: string | null;
  totalLikes: number;
  likedBy: Saver[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getApiBase(): string {
  return process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Saver Row ────────────────────────────────────────────────────────────────

function SaverRow({ saver, colors }: { saver: Saver; colors: ReturnType<typeof useColors> }) {
  const bg = avatarColor(saver.likerId);
  const initials = getInitials(saver.likerName);

  return (
    <View style={[saverStyles.row, { borderBottomColor: colors.border }]}>
      {saver.likerAvatar ? (
        <Image
          source={{ uri: getImageUrl(saver.likerAvatar) }}
          style={saverStyles.avatar}
        />
      ) : (
        <View style={[saverStyles.avatar, saverStyles.avatarInitials, { backgroundColor: bg }]}>
          <Text style={saverStyles.initialsText}>{initials}</Text>
        </View>
      )}
      <View style={saverStyles.info}>
        <Text style={[saverStyles.name, { color: colors.foreground }]} numberOfLines={1}>
          {saver.likerName ?? saver.likerEmail ?? "Guest"}
        </Text>
        {saver.likerEmail && saver.likerName && (
          <Text style={[saverStyles.email, { color: colors.mutedForeground }]} numberOfLines={1}>
            {saver.likerEmail}
          </Text>
        )}
      </View>
      <View style={saverStyles.dateWrap}>
        <Feather name="heart" size={12} color="#ef4444" />
        <Text style={[saverStyles.date, { color: colors.mutedForeground }]}>
          {formatDate(saver.savedAt)}
        </Text>
      </View>
    </View>
  );
}

const saverStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarInitials: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontFamily: "Outfit_500Medium",
  },
  email: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
  },
  dateWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  date: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
  },
});

// ─── Property Card ────────────────────────────────────────────────────────────

function PropertySavesCard({
  property,
  colors,
}: {
  property: PropertyWithSaves;
  colors: ReturnType<typeof useColors>;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header row */}
      <Pressable
        style={cardStyles.header}
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`${property.title}, ${property.totalLikes} saves. ${expanded ? "Collapse" : "Expand"}`}
      >
        <Image
          source={{ uri: getImageUrl(property.image) }}
          style={cardStyles.thumbnail}
          resizeMode="cover"
        />
        <View style={cardStyles.headerInfo}>
          <Text
            style={[cardStyles.propertyTitle, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {property.title}
          </Text>
          <Text
            style={[cardStyles.propertyAddress, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {property.address ?? "—"}
          </Text>
          <View style={cardStyles.statsRow}>
            <View style={[cardStyles.likeBadge, { backgroundColor: "#fee2e2" }]}>
              <Feather name="heart" size={11} color="#ef4444" />
              <Text style={cardStyles.likeBadgeText}>
                {property.totalLikes} {property.totalLikes === 1 ? "save" : "saves"}
              </Text>
            </View>
            {property.isVerified && (
              <View style={[cardStyles.verifiedBadge]}>
                <Feather name="check-circle" size={11} color="#166534" />
                <Text style={cardStyles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
        </View>
        <View style={cardStyles.actions}>
          <Pressable
            hitSlop={8}
            onPress={() =>
              router.push({ pathname: "/property/[id]", params: { id: property.id } })
            }
            style={cardStyles.viewBtn}
            accessibilityLabel="View listing"
          >
            <Feather name="external-link" size={15} color={colors.primary} />
          </Pressable>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.mutedForeground}
          />
        </View>
      </Pressable>

      {/* Saver list */}
      {expanded && (
        <View style={[cardStyles.saverList, { borderTopColor: colors.border }]}>
          {property.likedBy.length === 0 ? (
            <Text style={[cardStyles.noSavers, { color: colors.mutedForeground }]}>
              No saves yet
            </Text>
          ) : (
            property.likedBy.map((saver) => (
              <SaverRow key={saver.likerId} saver={saver} colors={colors} />
            ))
          )}
        </View>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  propertyTitle: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
  },
  propertyAddress: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  likeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  likeBadgeText: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    color: "#ef4444",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "#dcfce7",
  },
  verifiedText: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    color: "#166534",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  viewBtn: {
    padding: 4,
  },
  saverList: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  noSavers: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PropertySavesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();
  const isWeb = Platform.OS === "web";

  const OWNER_ROLES = ["owner", "host", "admin"];
  const canView = user && OWNER_ROLES.includes(user.role);

  const [properties, setProperties] = useState<PropertyWithSaves[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 + 84 : insets.bottom + 84;

  const fetchSaves = useCallback(async () => {
    if (!user || !token || !canView) return;
    const base = getApiBase();
    setError(null);
    try {
      const res = await fetch(`${base}/api/favorites/my-properties`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: PropertyWithSaves[] = await res.json();
      setProperties(data);
    } catch (err) {
      setError("Could not load saves. Pull down to retry.");
    }
  }, [user, token, canView]);

  useEffect(() => {
    setIsLoading(true);
    fetchSaves().finally(() => setIsLoading(false));
  }, [fetchSaves]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSaves();
    setRefreshing(false);
  };

  const totalSaves = properties.reduce((sum, p) => sum + p.totalLikes, 0);

  // ── Not signed in ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Property Saves</Text>
        </View>
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="heart" size={38} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in required</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Log in to see who saved your listings
          </Text>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Not an owner ───────────────────────────────────────────────────────────
  if (!canView) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Property Saves</Text>
        </View>
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="lock" size={38} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Owner account required</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Only owners and hosts can view who saved their listings.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Property Saves</Text>
        {!isLoading && properties.length > 0 && (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {totalSaves} {totalSaves === 1 ? "save" : "saves"} across {properties.length}{" "}
            {properties.length === 1 ? "listing" : "listings"}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading saves…
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {error ? (
            <View style={styles.center}>
              <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Couldn't load saves
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                {error}
              </Text>
            </View>
          ) : properties.length === 0 ? (
            <View style={[styles.center, { marginTop: 60 }]}>
              <View
                style={[styles.iconCircle, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <Feather name="heart" size={38} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No saves yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                When guests save your listings, they'll appear here.
              </Text>
            </View>
          ) : (
            properties.map((property) => (
              <PropertySavesCard key={property.id} property={property} colors={colors} />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 2,
  },
  title: {
    fontSize: 24,
    fontFamily: "Outfit_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
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
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
  },
});
