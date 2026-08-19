/**
 * Notifications screen — lists all notifications and allows mark-as-read.
 * Available to owners/hosts. Mirrors the website's NotificationBell panel.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import Constants from "expo-constants";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl } from "@/utils/api";

type Notification = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  propertyId?: string;
  bookingId?: string;
};

function getNotifIcon(type: string): React.ComponentProps<typeof Feather>["name"] {
  if (type.includes("booking")) return "link";
  if (type.includes("review")) return "star";
  if (type.includes("payment") || type.includes("transaction")) return "credit-card";
  if (type.includes("property")) return "home";
  if (type.includes("message")) return "message-square";
  return "bell";
}

function getNotifColor(type: string): string {
  if (type.includes("booking")) return "#1d4ed8";
  if (type.includes("review")) return "#d97706";
  if (type.includes("payment") || type.includes("transaction")) return "#16a34a";
  if (type.includes("property")) return "#7c3aed";
  return "#6b7280";
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifs = useCallback(async () => {
    if (!user || !token) return;
    const base = getApiBaseUrl();
    try {
      setError(null);
      const res = await fetch(`${base}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNotifications(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    }
  }, [user, token]);

  useEffect(() => {
    setLoading(true);
    fetchNotifs().finally(() => setLoading(false));
  }, [fetchNotifs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifs();
    setRefreshing(false);
  };

  const markAsRead = async (id: string) => {
    const base = getApiBaseUrl();
    try {
      await fetch(`${base}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    const base = getApiBaseUrl();
    try {
      await fetch(`${base}/api/notifications/mark-all-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { /* silent */ }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
        {unreadCount > 0 && (
          <Pressable onPress={markAllRead} style={[styles.markAllBtn, { borderColor: colors.border }]}>
            <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Could not load notifications</Text>
          <Pressable style={[styles.retryBtn, { borderColor: colors.border }]} onPress={handleRefresh}>
            <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
          ListEmptyComponent={() => (
            <View style={[styles.center, { paddingTop: 80 }]}>
              <Feather name="bell-off" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notifications</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>You're all caught up!</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const iconColor = getNotifColor(item.type);
            return (
              <Pressable
                style={[styles.notifRow, !item.isRead && { backgroundColor: colors.primary + "08" }]}
                onPress={() => !item.isRead && markAsRead(item.id)}
              >
                <View style={[styles.iconWrap, { backgroundColor: iconColor + "1a" }]}>
                  <Feather name={getNotifIcon(item.type)} size={18} color={iconColor} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.notifMessage, { color: colors.foreground }]}>{item.message}</Text>
                  <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
                    {new Date(item.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                {!item.isRead && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24, fontFamily: "Outfit_700Bold" },
  markAllBtn: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  markAllText: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontFamily: "Outfit_700Bold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center" },
  retryBtn: { borderWidth: 1, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 20 },
  notifRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 14 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  notifMessage: { fontSize: 14, fontFamily: "Outfit_400Regular", lineHeight: 20 },
  notifTime: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
});
