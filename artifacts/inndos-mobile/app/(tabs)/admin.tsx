/**
 * Admin Dashboard — matches the website's admin panel.
 * Sections: Overview stats, Pending moderation, All users (with actions).
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import Constants from "expo-constants";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { getImageUrl } from "@/utils/imageUrl";
import { getApiBaseUrl } from "@/utils/api";
import { AdminOperations } from "@/components/AdminOperations";

// ── Types ────────────────────────────────────────────────────────────────────

type AdminStats = {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalProperties: number;
  approvedProperties: number;
  pendingProperties: number;
  flaggedProperties: number;
  totalBookings?: number;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joinDate: string;
  isRegisteredFirm?: boolean;
  firmType?: "business_name" | "registered_company" | null;
};

type PendingProperty = {
  id: string;
  title: string;
  address: string;
  type: string;
  price: number;
  image?: string;
  ownerName?: string;
  createdAt?: string;
};

// ── Tab type ─────────────────────────────────────────────────────────────────
type Tab = "overview" | "moderation" | "users";

// ── Colors ───────────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = { admin: "#7c3aed", owner: "#1d4ed8", host: "#0369a1", tenant: "#065f46", guest: "#92400e" };
const STATUS_COLORS: Record<string, string> = { active: "#166534", suspended: "#991b1b", pending: "#92400e" };

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, colors }: { label: string; value: number | string; icon: string; color: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[statS.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[statS.iconWrap, { backgroundColor: color + "1a" }]}>
        <Feather name={icon as React.ComponentProps<typeof Feather>["name"]} size={18} color={color} />
      </View>
      <Text style={[statS.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[statS.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}
const statS = StyleSheet.create({
  card: { flex: 1, alignItems: "center", padding: 14, borderWidth: 1, borderRadius: 12, gap: 6 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 22, fontFamily: "Outfit_700Bold" },
  label: { fontSize: 11, fontFamily: "Outfit_400Regular", textAlign: "center" },
});

// ── Pending property card ─────────────────────────────────────────────────────
function PendingPropertyCard({ item, onApprove, onReject, colors }: {
  item: PendingProperty;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[propS.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[propS.imgWrap, { backgroundColor: colors.muted }]}>
        {item.image ? (
          <Image source={{ uri: getImageUrl(item.image) }} style={propS.img} resizeMode="cover" />
        ) : (
          <Feather name="home" size={24} color={colors.mutedForeground} />
        )}
        <View style={propS.typeBadge}>
          <Text style={propS.typeBadgeText}>{item.type.toUpperCase()}</Text>
        </View>
      </View>
      <View style={propS.body}>
        <Text style={[propS.title, { color: colors.foreground }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[propS.address, { color: colors.mutedForeground }]} numberOfLines={1}>{item.address}</Text>
        <Text style={[propS.price, { color: colors.primary }]}>KES {item.price?.toLocaleString()}</Text>
        {item.ownerName && <Text style={[propS.owner, { color: colors.mutedForeground }]}>By {item.ownerName}</Text>}
        <View style={propS.actionRow}>
          <Pressable style={[propS.approveBtn, { backgroundColor: "#16a34a" }]} onPress={() => onApprove(item.id)}>
            <Feather name="check" size={14} color="#fff" />
            <Text style={propS.actionBtnText}>Approve</Text>
          </Pressable>
          <Pressable style={[propS.rejectBtn, { borderColor: "#dc2626" }]} onPress={() => onReject(item.id)}>
            <Feather name="x" size={14} color="#dc2626" />
            <Text style={[propS.actionBtnText, { color: "#dc2626" }]}>Reject</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
const propS = StyleSheet.create({
  card: { flexDirection: "row", borderWidth: 1, borderRadius: 12, overflow: "hidden", marginBottom: 10 },
  imgWrap: { width: 90, alignItems: "center", justifyContent: "center" },
  img: { width: 90, height: "100%" },
  typeBadge: { position: "absolute", top: 8, left: 8, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeBadgeText: { fontSize: 9, fontFamily: "Outfit_600SemiBold", color: "#fff" },
  body: { flex: 1, padding: 12, gap: 3 },
  title: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  address: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  price: { fontSize: 13, fontFamily: "Outfit_700Bold", marginTop: 2 },
  owner: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  approveBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 },
  rejectBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, borderWidth: 1 },
  actionBtnText: { fontSize: 12, fontFamily: "Outfit_600SemiBold", color: "#fff" },
});

// ── User row ──────────────────────────────────────────────────────────────────
function UserRow({ item, onToggleStatus, colors }: { item: AdminUser; onToggleStatus: (id: string, currentStatus: string) => void; colors: ReturnType<typeof useColors> }) {
  const initials = item.name.split(" ").map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase();
  const roleColor = ROLE_COLORS[item.role] ?? "#374151";
  const statusColor = STATUS_COLORS[item.status] ?? "#374151";
  return (
    <View style={[userS.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[userS.avatar, { backgroundColor: colors.primary }]}>
        <Text style={[userS.avatarText, { color: colors.primaryForeground }]}>{initials}</Text>
      </View>
      <View style={userS.info}>
        <Text style={[userS.name, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[userS.email, { color: colors.mutedForeground }]} numberOfLines={1}>{item.email}</Text>
        <View style={userS.badges}>
          <View style={[userS.badge, { backgroundColor: roleColor + "18", borderColor: roleColor + "44" }]}>
            <Text style={[userS.badgeText, { color: roleColor }]}>{item.role}</Text>
          </View>
          <View style={[userS.badge, { backgroundColor: statusColor + "18", borderColor: statusColor + "44" }]}>
            <Text style={[userS.badgeText, { color: statusColor }]}>{item.status}</Text>
          </View>
          {item.isRegisteredFirm && (
            <View style={[userS.badge, { backgroundColor: "#faf5ff", borderColor: "#d8b4fe" }]}>
              <Text style={[userS.badgeText, { color: "#7e22ce" }]}>Firm</Text>
            </View>
          )}
        </View>
      </View>
      <Pressable
        style={[userS.statusBtn, { borderColor: item.status === "active" ? "#dc2626" : "#16a34a" }]}
        onPress={() => onToggleStatus(item.id, item.status)}
      >
        <Text style={[userS.statusBtnText, { color: item.status === "active" ? "#dc2626" : "#16a34a" }]}>
          {item.status === "active" ? "Suspend" : "Activate"}
        </Text>
      </Pressable>
    </View>
  );
}
const userS = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 1, borderRadius: 10, marginBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontFamily: "Outfit_700Bold" },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  email: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  badges: { flexDirection: "row", gap: 4, marginTop: 3, flexWrap: "wrap" },
  badge: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 },
  badgeText: { fontSize: 10, fontFamily: "Outfit_500Medium" },
  statusBtn: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  statusBtnText: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },
});

// ── Tab bar ───────────────────────────────────────────────────────────────────
function TabBar({ active, onChange, pendingCount, colors }: { active: Tab; onChange: (t: Tab) => void; pendingCount: number; colors: ReturnType<typeof useColors> }) {
  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "overview",   label: "Overview" },
    { key: "moderation", label: "Review",   badge: pendingCount },
    { key: "users",      label: "Users" },
  ];
  return (
    <View style={[tabS.bar, { borderBottomColor: colors.border }]}>
      {tabs.map((t) => (
        <Pressable key={t.key} style={[tabS.tab, active === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]} onPress={() => onChange(t.key)}>
          <Text style={[tabS.label, { color: active === t.key ? colors.primary : colors.mutedForeground }]}>{t.label}</Text>
          {t.badge !== undefined && t.badge > 0 && (
            <View style={tabS.badge}>
              <Text style={tabS.badgeText}>{t.badge}</Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}
const tabS = StyleSheet.create({
  bar: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 4 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, flexDirection: "row", justifyContent: "center", gap: 6 },
  label: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  badge: { backgroundColor: "#dc2626", borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Outfit_700Bold" },
});

// ── Main screen ───────────────────────────────────────────────────────────────
function LegacyAdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const isWeb = Platform.OS === "web";

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [moderation, setModeration] = useState<PendingProperty[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 + 84 : insets.bottom + 84;

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchAll = useCallback(async () => {
    if (!user || user.role !== "admin") return;
    const base = getApiBaseUrl();
    try {
      setError(null);
      const [sRes, mRes, uRes] = await Promise.all([
        fetch(`${base}/api/admin/stats`, { headers: authHeaders }),
        fetch(`${base}/api/admin/moderation`, { headers: authHeaders }),
        fetch(`${base}/api/admin/users`, { headers: authHeaders }),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (mRes.ok) setModeration(await mRes.json());
      if (uRes.ok) setAdminUsers(await uRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
  }, [user, token]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const handleApprove = async (propertyId: string) => {
    const base = getApiBaseUrl();
    try {
      const res = await fetch(`${base}/api/admin/properties/${propertyId}/verify`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: true, propertyStatus: "approved" }),
      });
      if (res.ok) {
        setModeration((prev) => prev.filter((p) => p.id !== propertyId));
        setStats((s) => s ? { ...s, pendingProperties: Math.max(0, s.pendingProperties - 1), approvedProperties: s.approvedProperties + 1 } : s);
      }
    } catch { Alert.alert("Error", "Could not approve property. Try again."); }
  };

  const handleReject = (propertyId: string) => {
    Alert.alert("Reject Listing", "Are you sure you want to delete this listing?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const base = getApiBaseUrl();
          try {
            const res = await fetch(`${base}/api/admin/properties/${propertyId}`, { method: "DELETE", headers: authHeaders });
            if (res.ok) {
              setModeration((prev) => prev.filter((p) => p.id !== propertyId));
              setStats((s) => s ? { ...s, pendingProperties: Math.max(0, s.pendingProperties - 1) } : s);
            }
          } catch { Alert.alert("Error", "Could not reject property. Try again."); }
        },
      },
    ]);
  };

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    Alert.alert(
      newStatus === "suspended" ? "Suspend User" : "Activate User",
      `${newStatus === "suspended" ? "Suspend" : "Activate"} this user?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: newStatus === "suspended" ? "destructive" : "default",
          onPress: async () => {
            const base = getApiBaseUrl();
            try {
              const res = await fetch(`${base}/api/admin/users/${userId}/status`, {
                method: "PATCH",
                headers: { ...authHeaders, "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
              });
              if (res.ok) {
                setAdminUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u));
              }
            } catch { Alert.alert("Error", "Could not update user status."); }
          },
        },
      ]
    );
  };

  if (!user || user.role !== "admin") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Admin</Text>
        </View>
        <View style={styles.center}>
          <Feather name="lock" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Admin access required</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Admin Dashboard</Text>
      </View>

      {/* Tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} pendingCount={moderation.length} colors={colors} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={36} color={colors.destructive} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Could not load data</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>{error}</Text>
          <Pressable style={[styles.retryBtn, { borderColor: colors.border }]} onPress={handleRefresh}>
            <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        >
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && stats && (
            <View style={{ gap: 16 }}>
              {/* Stats grid */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <StatCard label="Total Users" value={stats.totalUsers} icon="users" color="#1d4ed8" colors={colors} />
                <StatCard label="Active Users" value={stats.activeUsers} icon="user-check" color="#16a34a" colors={colors} />
                <StatCard label="Suspended" value={stats.suspendedUsers} icon="user-x" color="#dc2626" colors={colors} />
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <StatCard label="Properties" value={stats.totalProperties} icon="home" color="#7c3aed" colors={colors} />
                <StatCard label="Approved" value={stats.approvedProperties} icon="check-circle" color="#16a34a" colors={colors} />
                <StatCard label="Pending" value={stats.pendingProperties} icon="clock" color="#d97706" colors={colors} />
              </View>
              {/* Quick actions */}
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
              <View style={{ gap: 8 }}>
                <Pressable style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setActiveTab("moderation")}>
                  <View style={[styles.actionIcon, { backgroundColor: "#fef9c3" }]}>
                    <Feather name="clock" size={16} color="#ca8a04" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.actionTitle, { color: colors.foreground }]}>Review Pending Listings</Text>
                    <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>{stats.pendingProperties} awaiting review</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </Pressable>
                <Pressable style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setActiveTab("users")}>
                  <View style={[styles.actionIcon, { backgroundColor: "#eff6ff" }]}>
                    <Feather name="users" size={16} color="#1d4ed8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.actionTitle, { color: colors.foreground }]}>Manage Users</Text>
                    <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>{stats.totalUsers} registered users</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>
          )}

          {/* MODERATION TAB */}
          {activeTab === "moderation" && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Pending Review ({moderation.length})
              </Text>
              {moderation.length === 0 ? (
                <View style={[styles.center, { paddingVertical: 60 }]}>
                  <Feather name="check-circle" size={40} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All caught up!</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>No listings waiting for review.</Text>
                </View>
              ) : (
                moderation.map((item) => (
                  <PendingPropertyCard key={item.id} item={item} onApprove={handleApprove} onReject={handleReject} colors={colors} />
                ))
              )}
            </View>
          )}

          {/* USERS TAB */}
          {activeTab === "users" && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                All Users ({adminUsers.length})
              </Text>
              {adminUsers.map((u) => (
                <UserRow key={u.id} item={u} onToggleStatus={handleToggleStatus} colors={colors} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 0, gap: 2 },
  title: { fontSize: 24, fontFamily: "Outfit_700Bold" },
  sectionTitle: { fontSize: 16, fontFamily: "Outfit_700Bold", marginBottom: 12, marginTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: "Outfit_700Bold", textAlign: "center" },
  emptySubtitle: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 20 },
  retryBtn: { borderWidth: 1, paddingHorizontal: 24, paddingVertical: 10, marginTop: 4, borderRadius: 8 },
  retryText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1, borderRadius: 12 },
  actionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  actionTitle: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  actionSub: { fontSize: 12, fontFamily: "Outfit_400Regular" },
});

export default function AdminScreen() {
  return <AdminOperations />;
}
