import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

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

const ROLE_COLORS: Record<string, string> = {
  admin: "#7c3aed",
  owner: "#1d4ed8",
  host: "#0369a1",
  tenant: "#065f46",
  guest: "#92400e",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#166534",
  suspended: "#991b1b",
  pending: "#92400e",
};

function getFirmTypeLabel(firmType?: "business_name" | "registered_company" | null): string {
  if (firmType === "registered_company") return "Registered Company";
  return "Business Name";
}

function UserRow({
  user,
  colors,
}: {
  user: AdminUser;
  colors: ReturnType<typeof useColors>;
}) {
  const initials = user.name
    .split(" ")
    .map((n: string) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleColor = ROLE_COLORS[user.role] ?? "#374151";
  const statusColor = STATUS_COLORS[user.status] ?? "#374151";

  const handleFirmLongPress = () => {
    Alert.alert(
      "Registered Firm",
      getFirmTypeLabel(user.firmType),
      [{ text: "OK" }]
    );
  };

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
          {initials}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.rowInfo}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={[styles.email, { color: colors.mutedForeground }]} numberOfLines={1}>
          {user.email}
        </Text>

        {/* Badges */}
        <View style={styles.badgeRow}>
          {/* Role */}
          <View style={[styles.badge, { backgroundColor: roleColor + "18", borderColor: roleColor + "44" }]}>
            <Text style={[styles.badgeText, { color: roleColor }]}>{user.role}</Text>
          </View>

          {/* Firm badge */}
          {user.isRegisteredFirm && (
            <Pressable
              onLongPress={handleFirmLongPress}
              delayLongPress={300}
              style={styles.firmBadge}
              accessibilityLabel={`Firm: ${getFirmTypeLabel(user.firmType)}`}
              accessibilityHint="Long-press to see firm type"
            >
              <Feather name="shield" size={9} color="#7e22ce" />
              <Text style={styles.firmBadgeText}>Firm</Text>
            </Pressable>
          )}

          {/* Status */}
          <View
            style={[
              styles.badge,
              {
                backgroundColor: statusColor + "18",
                borderColor: statusColor + "44",
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: statusColor }]}>{user.status}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const isWeb = Platform.OS === "web";

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 + 84 : insets.bottom + 84;

  const fetchUsers = useCallback(async () => {
    if (!user || user.role !== "admin") return;
    try {
      setError(null);
      const base = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : "";
      const res = await fetch(`${base}/api/admin/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AdminUser[] = await res.json();
      setAdminUsers(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load users";
      setError(msg);
    }
  }, [user, token]);

  useEffect(() => {
    setIsLoading(true);
    fetchUsers().finally(() => setIsLoading(false));
  }, [fetchUsers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsers();
    setIsRefreshing(false);
  };

  if (!user || user.role !== "admin") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Admin</Text>
        </View>
        <View style={styles.center}>
          <Feather name="lock" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Admin access required
          </Text>
        </View>
      </View>
    );
  }

  const firmCount = adminUsers.filter((u) => u.isRegisteredFirm).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Users</Text>
        {adminUsers.length > 0 && (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {adminUsers.length} total
            {firmCount > 0 ? ` · ${firmCount} firm${firmCount !== 1 ? "s" : ""}` : ""}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={36} color={colors.destructive} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Could not load users
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            {error}
          </Text>
          <Pressable
            style={[styles.retryBtn, { borderColor: colors.border }]}
            onPress={handleRefresh}
          >
            <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
          </Pressable>
        </View>
      ) : adminUsers.length === 0 ? (
        <View style={styles.center}>
          <Feather name="users" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No users found</Text>
        </View>
      ) : (
        <FlatList
          data={adminUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: bottomPadding, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => <UserRow user={item} colors={colors} />}
        />
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
  subtitle: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Outfit_700Bold",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Outfit_500Medium",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: "Outfit_700Bold",
  },
  rowInfo: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
  },
  email: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 4,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Outfit_500Medium",
  },
  firmBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: "#d8b4fe",
    backgroundColor: "#faf5ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  firmBadgeText: {
    fontSize: 10,
    fontFamily: "Outfit_600SemiBold",
    color: "#7e22ce",
  },
});
