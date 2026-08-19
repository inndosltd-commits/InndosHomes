/**
 * Marketer Dashboard — referral code, stats, and list of referrals.
 * Mirrors the website's MarketerDashboard component.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { getApiBaseUrl } from "@/utils/api";

type MarketingMe = {
  referralCode?: string;
  totalReferrals?: number;
  totalCommission?: number;
  pendingCommission?: number;
  paidCommission?: number;
};

type Referral = {
  id: string;
  referredUserName?: string;
  referredUserEmail?: string;
  status?: string;
  commission?: number;
  createdAt?: string;
};

export default function MarketerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const [me, setMe] = useState<MarketingMe | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user || !token) return;
    const base = getApiBaseUrl();
    try {
      setError(null);
      const [meRes, refRes] = await Promise.all([
        fetch(`${base}/api/marketing/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${base}/api/marketing/me/referrals`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (meRes.ok) setMe(await meRes.json());
      if (refRes.ok) setReferrals(await refRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load marketing data");
    }
  }, [user, token]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCopyCode = async () => {
    if (!me?.referralCode) return;
    await Clipboard.setStringAsync(me.referralCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied!", "Referral code copied to clipboard.");
  };

  const handleShareCode = async () => {
    if (!me?.referralCode) return;
    try {
      await Share.share({
        message: `Join INNDOS with my referral code: ${me.referralCode}\nhttps://inndos.com`,
        title: "Join INNDOS",
      });
    } catch { /* dismissed */ }
  };

  const formatKES = (v?: number) => (v == null ? "—" : `KES ${Number(v).toLocaleString()}`);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Marketing</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Referrals and commission overview</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Could not load data</Text>
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
          {/* Referral code card */}
          {me?.referralCode && (
            <View style={[styles.codeCard, { backgroundColor: colors.primary }]}>
              <Text style={[styles.codeLabel, { color: colors.primaryForeground + "bb" }]}>Your Referral Code</Text>
              <Text style={[styles.code, { color: colors.primaryForeground }]}>{me.referralCode}</Text>
              <View style={styles.codeActions}>
                <Pressable style={[styles.codeBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]} onPress={handleCopyCode}>
                  <Feather name="copy" size={14} color={colors.primaryForeground} />
                  <Text style={[styles.codeBtnText, { color: colors.primaryForeground }]}>Copy</Text>
                </Pressable>
                <Pressable style={[styles.codeBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]} onPress={handleShareCode}>
                  <Feather name="share-2" size={14} color={colors.primaryForeground} />
                  <Text style={[styles.codeBtnText, { color: colors.primaryForeground }]}>Share</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Stats */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="users" size={20} color="#1d4ed8" />
              <Text style={[styles.statVal, { color: colors.foreground }]}>{me?.totalReferrals ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Referrals</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="trending-up" size={20} color="#16a34a" />
              <Text style={[styles.statVal, { color: colors.foreground }]}>{formatKES(me?.totalCommission)}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Commission</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="clock" size={20} color="#d97706" />
              <Text style={[styles.statVal, { color: colors.foreground }]}>{formatKES(me?.pendingCommission)}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Pending</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="check-circle" size={20} color="#16a34a" />
              <Text style={[styles.statVal, { color: colors.foreground }]}>{formatKES(me?.paidCommission)}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Paid Out</Text>
            </View>
          </View>

          {/* Referrals list */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Referrals ({referrals.length})</Text>
          {referrals.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="user-plus" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No referrals yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Share your referral code to earn commission</Text>
            </View>
          ) : (
            referrals.map((r) => (
              <View key={r.id} style={[styles.refRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.refAvatar, { backgroundColor: colors.primary }]}>
                  <Feather name="user" size={16} color={colors.primaryForeground} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.refName, { color: colors.foreground }]}>{r.referredUserName ?? "User"}</Text>
                  <Text style={[styles.refEmail, { color: colors.mutedForeground }]}>{r.referredUserEmail ?? ""}</Text>
                  {r.createdAt && (
                    <Text style={[styles.refDate, { color: colors.mutedForeground }]}>
                      {new Date(r.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  {r.commission != null && <Text style={[styles.refCommission, { color: colors.primary }]}>+KES {Number(r.commission).toLocaleString()}</Text>}
                  {r.status && (
                    <View style={[styles.statusBadge, { backgroundColor: r.status === "paid" ? "#dcfce7" : "#fef9c3" }]}>
                      <Text style={[styles.statusText, { color: r.status === "paid" ? "#16a34a" : "#92400e" }]}>{r.status}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
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
  codeCard: { padding: 20, borderRadius: 16, alignItems: "center", gap: 8 },
  codeLabel: { fontSize: 12, fontFamily: "Outfit_600SemiBold", letterSpacing: 1, textTransform: "uppercase" },
  code: { fontSize: 32, fontFamily: "Outfit_700Bold", letterSpacing: 4 },
  codeActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  codeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  codeBtnText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  statCard: { flex: 1, alignItems: "center", padding: 16, borderWidth: 1, borderRadius: 14, gap: 6 },
  statVal: { fontSize: 18, fontFamily: "Outfit_700Bold", textAlign: "center" },
  statLabel: { fontSize: 11, fontFamily: "Outfit_400Regular", textAlign: "center" },
  sectionTitle: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  emptyBox: { alignItems: "center", padding: 32, borderWidth: 1, borderRadius: 16, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Outfit_700Bold", textAlign: "center" },
  emptyText: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center" },
  refRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1, borderRadius: 12, marginBottom: 8 },
  refAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  refName: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  refEmail: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  refDate: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  refCommission: { fontSize: 13, fontFamily: "Outfit_700Bold" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  statusText: { fontSize: 10, fontFamily: "Outfit_600SemiBold" },
  retryBtn: { borderWidth: 1, paddingHorizontal: 24, paddingVertical: 10, marginTop: 4, borderRadius: 8 },
  retryText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
});
