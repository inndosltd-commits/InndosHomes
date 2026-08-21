/**
 * Analytics screen — shows owner analytics or tenant analytics based on user role.
 * Mirrors the website's Analytics/TenantAnalytics dashboard tabs.
 *
 * Display-only metrics (StatCard, InfoRow) are not Pressable.
 * Action rows (rows that can navigate to a meaningful screen) are Pressable
 * and clearly distinguished by a chevron indicator.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl } from "@/utils/api";

// ── Stat card (display only — not Pressable) ──────────────────────────────────
function StatCard({ label, value, icon, color, sub, colors }: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  sub?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[st.iconWrap, { backgroundColor: color + "1a" }]}>
        <Feather name={icon as React.ComponentProps<typeof Feather>["name"]} size={20} color={color} />
      </View>
      <Text style={[st.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[st.label, { color: colors.mutedForeground }]}>{label}</Text>
      {sub && <Text style={[st.sub, { color: colors.mutedForeground }]}>{sub}</Text>}
    </View>
  );
}
const st = StyleSheet.create({
  card: { flex: 1, alignItems: "center", padding: 16, borderWidth: 1, borderRadius: 14, gap: 6, minWidth: 140 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  value: { fontSize: 24, fontFamily: "Outfit_700Bold" },
  label: { fontSize: 12, fontFamily: "Outfit_400Regular", textAlign: "center" },
  sub: { fontSize: 11, fontFamily: "Outfit_400Regular", textAlign: "center" },
});

// ── Display-only info row ─────────────────────────────────────────────────────
function InfoRow({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[rowS.row, { borderBottomColor: colors.border }]}>
      <Text style={[rowS.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[rowS.value, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

// ── Navigable action row (has chevron, is Pressable) ──────────────────────────
function ActionRow({ label, value, onPress, colors }: {
  label: string;
  value: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        rowS.row,
        { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={onPress}
    >
      <Text style={[rowS.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={rowS.actionRight}>
        <Text style={[rowS.value, { color: colors.foreground }]}>{value}</Text>
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

const rowS = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 14, fontFamily: "Outfit_400Regular" },
  value: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  actionRight: { flexDirection: "row", alignItems: "center", gap: 4 },
});

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const isOwnerOrHost = user?.role === "owner" || user?.role === "host";
  const isAdmin = user?.role === "admin";

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!user || !token) return;
    const base = getApiBaseUrl();
    const endpoint = isAdmin ? "/api/admin/stats" : isOwnerOrHost ? "/api/owner-analytics" : "/api/tenant-analytics";
    try {
      setError(null);
      const res = await fetch(`${base}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    }
  }, [user, token, isAdmin, isOwnerOrHost]);

  useEffect(() => {
    setLoading(true);
    fetch_().finally(() => setLoading(false));
  }, [fetch_]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetch_();
    setRefreshing(false);
  };

  const formatKES = (val: unknown) => {
    const n = Number(val);
    return isNaN(n) ? "—" : `KES ${n.toLocaleString()}`;
  };
  const fmt = (val: unknown) => (val == null ? "—" : String(val));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Analytics</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {isAdmin ? "Platform performance overview" : isOwnerOrHost ? "Property performance overview" : "Your booking & spending overview"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Could not load analytics</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{error}</Text>
          <Pressable style={[styles.retryBtn, { borderColor: colors.border }]} onPress={handleRefresh}>
            <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84, gap: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        >
          {isAdmin ? (
            <>
              {/* Admin stat cards — display only */}
              <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                <StatCard label="Total Users" value={fmt(data?.totalUsers)} icon="users" color="#1d4ed8" colors={colors} />
                <StatCard label="Properties" value={fmt(data?.totalProperties)} icon="home" color="#7c3aed" colors={colors} />
              </View>
              <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                <StatCard label="Link-Ups" value={fmt(data?.totalBookings)} icon="link" color="#16a34a" colors={colors} />
                <StatCard label="Revenue" value={formatKES(data?.totalRevenue)} icon="credit-card" color="#d97706" colors={colors} />
              </View>
              {/* Admin breakdown — navigable rows */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Platform Breakdown</Text>
                <ActionRow
                  label="Pending properties"
                  value={fmt(data?.pendingProperties)}
                  colors={colors}
                  onPress={() => router.push("/(tabs)/admin" as never)}
                />
                <InfoRow label="Active subscriptions" value={fmt(data?.activeSubscriptions)} colors={colors} />
                <ActionRow
                  label="Confirmed rentals"
                  value={fmt(data?.confirmedRentals)}
                  colors={colors}
                  onPress={() => router.push("/(tabs)/bookings" as never)}
                />
                <InfoRow label="Confirmed sales" value={fmt(data?.confirmedSales)} colors={colors} />
                <InfoRow label="Marketplace value" value={formatKES(data?.totalMarketplaceValue)} colors={colors} />
              </View>
            </>
          ) : isOwnerOrHost ? (
            <>
              {/* Owner stat cards — display only */}
              <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                <StatCard label="Total Revenue" value={formatKES(data?.totalRevenue)} icon="trending-up" color="#16a34a" colors={colors} />
                <StatCard label="Total Bookings" value={fmt(data?.totalBookings)} icon="link" color="#1d4ed8" colors={colors} />
              </View>
              <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                <StatCard label="Active Listings" value={fmt(data?.activeListings ?? data?.totalProperties)} icon="home" color="#7c3aed" colors={colors} />
                <StatCard label="Avg. Rating" value={data?.averageRating ? `${Number(data.averageRating).toFixed(1)} ★` : "—"} icon="star" color="#d97706" colors={colors} />
              </View>
              {/* Owner breakdown — navigable booking rows, display-only metrics */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Breakdown</Text>
                <ActionRow
                  label="Confirmed bookings"
                  value={fmt(data?.confirmedBookings)}
                  colors={colors}
                  onPress={() => router.push("/(tabs)/bookings" as never)}
                />
                <ActionRow
                  label="Pending bookings"
                  value={fmt(data?.pendingBookings)}
                  colors={colors}
                  onPress={() => router.push("/(tabs)/bookings" as never)}
                />
                <ActionRow
                  label="Cancelled bookings"
                  value={fmt(data?.cancelledBookings)}
                  colors={colors}
                  onPress={() => router.push("/(tabs)/bookings" as never)}
                />
                <InfoRow label="Monthly revenue" value={formatKES(data?.monthlyRevenue)} colors={colors} />
                <InfoRow label="Occupancy rate" value={data?.occupancyRate != null ? `${Number(data.occupancyRate).toFixed(1)}%` : "—"} colors={colors} />
              </View>
            </>
          ) : (
            <>
              {/* Tenant stat cards — display only */}
              <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                <StatCard label="Total Bookings" value={fmt(data?.totalBookings)} icon="link" color="#1d4ed8" colors={colors} />
                <StatCard label="Total Spent" value={formatKES(data?.totalSpent)} icon="credit-card" color="#7c3aed" colors={colors} />
              </View>
              {/* Tenant breakdown — booking rows are navigable */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Booking History</Text>
                <ActionRow
                  label="Confirmed"
                  value={fmt(data?.confirmedBookings)}
                  colors={colors}
                  onPress={() => router.push("/(tabs)/bookings" as never)}
                />
                <ActionRow
                  label="Pending"
                  value={fmt(data?.pendingBookings)}
                  colors={colors}
                  onPress={() => router.push("/(tabs)/bookings" as never)}
                />
                <ActionRow
                  label="Cancelled"
                  value={fmt(data?.cancelledBookings)}
                  colors={colors}
                  onPress={() => router.push("/(tabs)/bookings" as never)}
                />
                <InfoRow label="Avg. stay" value={data?.avgStayDays ? `${Number(data.avgStayDays).toFixed(1)} days` : "—"} colors={colors} />
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 4 },
  title: { fontSize: 24, fontFamily: "Outfit_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: "Outfit_700Bold", textAlign: "center" },
  emptySub: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center" },
  retryBtn: { borderWidth: 1, paddingHorizontal: 24, paddingVertical: 10, marginTop: 4, borderRadius: 8 },
  retryText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 0 },
  cardTitle: { fontSize: 15, fontFamily: "Outfit_700Bold", marginBottom: 8 },
});
