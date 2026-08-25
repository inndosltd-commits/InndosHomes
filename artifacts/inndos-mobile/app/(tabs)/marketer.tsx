/**
 * Mobile marketer portal. It consumes the same profile and referral-list
 * endpoints as the web dashboard, including filters, dates, and pagination.
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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { getApiBaseUrl } from "@/utils/api";

type Tab = "dashboard" | "link" | "referrals";
type ReferralFilter = "all" | "today" | "yesterday" | "week" | "month" | "active" | "inactive";

type MarketingProfile = {
  marketer: { marketerCode: string; referralCode: string; status: "active" | "inactive"; createdAt: string };
  stats: { total: number; today: number; thisWeek: number; thisMonth: number; activeCount: number; inactiveCount: number; totalVisits?: number; conversionRate?: number };
  referralLink: string;
};

type Referral = {
  referralId: string;
  referralCode: string;
  createdAt: string;
  user?: { name?: string; email?: string; phone?: string; status?: string };
};

const FILTERS: { value: ReferralFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const dateText = (value?: string) => value
  ? new Date(value).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
  : "—";

export default function MarketerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const isWeb = Platform.OS === "web";
  const [tab, setTab] = useState<Tab>("dashboard");
  const [profile, setProfile] = useState<MarketingProfile | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ReferralFilter>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token ?? ""}` };

  const fetchProfile = useCallback(async () => {
    if (!user || !token) return;
    const response = await fetch(`${getApiBaseUrl()}/api/marketing/me`, { headers });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? "Your marketer dashboard is unavailable.");
    }
    setProfile(await response.json() as MarketingProfile);
  }, [user, token]);

  const fetchReferrals = useCallback(async () => {
    if (!token) return;
    setLoadingReferrals(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (filter !== "all") params.set("filter", filter);
      if (search.trim()) params.set("search", search.trim());
      if (dateFrom.trim()) params.set("dateFrom", dateFrom.trim());
      if (dateTo.trim()) params.set("dateTo", dateTo.trim());
      const response = await fetch(`${getApiBaseUrl()}/api/marketing/me/referrals?${params}`, { headers });
      if (!response.ok) throw new Error("Unable to load referrals.");
      const data = await response.json() as { data: Referral[]; total: number };
      setReferrals(data.data);
      setTotal(data.total);
    } catch (requestError) {
      Alert.alert("Could not load referrals", requestError instanceof Error ? requestError.message : "Please try again.");
    } finally {
      setLoadingReferrals(false);
    }
  }, [token, page, filter, search, dateFrom, dateTo]);

  useEffect(() => {
    setLoading(true);
    fetchProfile().catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load marketing data."))
      .finally(() => setLoading(false));
  }, [fetchProfile]);

  useEffect(() => {
    if (tab === "referrals") void fetchReferrals();
  }, [tab, fetchReferrals]);

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    await fetchProfile().catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not refresh marketing data."));
    if (tab === "referrals") await fetchReferrals();
    setRefreshing(false);
  };

  const copyLink = async () => {
    if (!profile?.referralLink) return;
    await Clipboard.setStringAsync(profile.referralLink);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", "Your referral link is ready to share.");
  };

  const shareLink = async () => {
    if (!profile?.referralLink) return;
    try {
      await Share.share({
        title: "Join INNDOS",
        message: `Join INNDOS using my referral link:\n${profile.referralLink}`,
      });
    } catch { /* Share sheet dismissed. */ }
  };

  const openFilteredReferrals = (nextFilter: ReferralFilter) => {
    setFilter(nextFilter);
    setPage(1);
    setTab("referrals");
  };

  const setDate = (kind: "from" | "to", value: string) => {
    const clean = value.replace(/[^0-9-]/g, "").slice(0, 10);
    kind === "from" ? setDateFrom(clean) : setDateTo(clean);
    setPage(1);
  };

  const contentPadding = { padding: 20, paddingBottom: isWeb ? 118 : insets.bottom + 96, gap: 16 };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (error || !profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Marketing unavailable</Text>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>{error ?? "This account is not an active marketer."}</Text>
        <Pressable style={[styles.outlineButton, { borderColor: colors.border }]} onPress={refresh}><Text style={{ color: colors.foreground, fontFamily: "Outfit_600SemiBold" }}>Try again</Text></Pressable>
      </View>
    );
  }

  const { marketer, stats, referralLink } = profile;
  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "link", label: "My Link" },
    { id: "referrals", label: `Referrals (${stats.total})` },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (isWeb ? 67 : insets.top) + 15, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Marketer Portal</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{marketer.marketerCode} · {marketer.status}</Text>
        </View>
        <Pressable onPress={refresh} hitSlop={10}><Feather name="refresh-cw" size={19} color={colors.foreground} /></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map((item) => (
          <Pressable key={item.id} onPress={() => setTab(item.id)} style={[styles.tab, tab === item.id && { borderBottomColor: colors.primary }]}>
            <Text style={{ color: tab === item.id ? colors.foreground : colors.mutedForeground, fontFamily: "Outfit_600SemiBold", fontSize: 13 }}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={contentPadding}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {tab === "dashboard" ? (
          <>
            <View style={[styles.linkCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <View style={styles.row}><Feather name="link-2" size={17} color={colors.foreground} /><Text style={[styles.cardTitle, { color: colors.foreground }]}>Your referral link</Text></View>
              <Text style={[styles.link, { color: colors.mutedForeground }]} numberOfLines={2}>{referralLink}</Text>
              <View style={styles.actionRow}>
                <Pressable onPress={copyLink} style={[styles.compactButton, { backgroundColor: colors.primary }]}><Feather name="copy" size={14} color={colors.primaryForeground} /><Text style={{ color: colors.primaryForeground, fontFamily: "Outfit_600SemiBold" }}>Copy</Text></Pressable>
                <Pressable onPress={shareLink} style={[styles.compactButton, { borderColor: colors.border, borderWidth: 1 }]}><Feather name="share-2" size={14} color={colors.foreground} /><Text style={{ color: colors.foreground, fontFamily: "Outfit_600SemiBold" }}>Share</Text></Pressable>
              </View>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>Code: {marketer.referralCode} · Assigned {dateText(marketer.createdAt)}</Text>
            </View>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>Tap a card to see the matching people.</Text>
            <View style={styles.statGrid}>
              <StatCard icon="users" label="Total joined" value={stats.total} colors={colors} onPress={() => openFilteredReferrals("all")} />
              <StatCard icon="sun" label="New today" value={stats.today} colors={colors} onPress={() => openFilteredReferrals("today")} />
              <StatCard icon="trending-up" label="This week" value={stats.thisWeek} colors={colors} onPress={() => openFilteredReferrals("week")} />
              <StatCard icon="calendar" label="This month" value={stats.thisMonth} colors={colors} onPress={() => openFilteredReferrals("month")} />
              <StatCard icon="check-circle" label="Active" value={stats.activeCount} colors={colors} onPress={() => openFilteredReferrals("active")} />
              <StatCard icon="clock" label="Inactive" value={stats.inactiveCount} colors={colors} onPress={() => openFilteredReferrals("inactive")} />
            </View>
            {(stats.totalVisits ?? 0) > 0 ? (
              <View style={[styles.funnel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Referral funnel</Text>
                <View style={styles.funnelRow}>
                  <Metric value={stats.totalVisits ?? 0} label="Visits" colors={colors} />
                  <Feather name="arrow-right" size={15} color={colors.mutedForeground} />
                  <Metric value={stats.total} label="Joined" colors={colors} />
                  <Feather name="arrow-right" size={15} color={colors.mutedForeground} />
                  <Metric value={`${stats.conversionRate ?? 0}%`} label="Converted" colors={colors} />
                </View>
              </View>
            ) : null}
          </>
        ) : tab === "link" ? (
          <View style={[styles.linkScreen, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="link-2" size={27} color={colors.foreground} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Share your referral link</Text>
            <Text style={[styles.helpText, { color: colors.mutedForeground }]}>When someone signs up through this link, INNDOS counts them as your referral.</Text>
            <Text selectable style={[styles.fullLink, { backgroundColor: colors.muted, color: colors.foreground }]}>{referralLink}</Text>
            <View style={styles.actionRow}>
              <Pressable onPress={copyLink} style={[styles.compactButton, { backgroundColor: colors.primary }]}><Feather name="copy" size={14} color={colors.primaryForeground} /><Text style={{ color: colors.primaryForeground, fontFamily: "Outfit_600SemiBold" }}>Copy link</Text></Pressable>
              <Pressable onPress={shareLink} style={[styles.compactButton, { borderColor: colors.border, borderWidth: 1 }]}><Feather name="share-2" size={14} color={colors.foreground} /><Text style={{ color: colors.foreground, fontFamily: "Outfit_600SemiBold" }}>Share</Text></Pressable>
            </View>
            <View style={[styles.accountInfo, { borderTopColor: colors.border }]}>
              <InfoRow label="Your code" value={marketer.referralCode} colors={colors} />
              <InfoRow label="Marketer ID" value={marketer.marketerCode} colors={colors} />
              <InfoRow label="Status" value={marketer.status} colors={colors} />
              <InfoRow label="Assigned" value={dateText(marketer.createdAt)} colors={colors} />
            </View>
          </View>
        ) : (
          <>
            <TextInput value={search} onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder="Search name, email, phone…" placeholderTextColor={colors.mutedForeground} style={[styles.search, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {FILTERS.map((item) => <Pressable key={item.value} onPress={() => { setFilter(item.value); setPage(1); }} style={[styles.filter, { borderColor: filter === item.value ? colors.primary : colors.border }, filter === item.value && { backgroundColor: colors.primary }]}><Text style={{ color: filter === item.value ? colors.primaryForeground : colors.foreground, fontFamily: "Outfit_500Medium", fontSize: 12 }}>{item.label}</Text></Pressable>)}
            </ScrollView>
            <View style={styles.dateRow}>
              <TextInput value={dateFrom} onChangeText={(value) => setDate("from", value)} placeholder="From YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} style={[styles.dateInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} />
              <TextInput value={dateTo} onChangeText={(value) => setDate("to", value)} placeholder="To YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} style={[styles.dateInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} />
            </View>
            {loadingReferrals ? <View style={styles.refLoading}><ActivityIndicator color={colors.primary} /></View> : referrals.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: colors.muted, borderColor: colors.border }]}><Feather name="user-plus" size={30} color={colors.mutedForeground} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{stats.total === 0 ? "No referrals yet" : "No results"}</Text><Text style={[styles.helpText, { color: colors.mutedForeground }]}>{stats.total === 0 ? "Share your referral link to get started." : "Try changing the filters or date range."}</Text></View>
            ) : referrals.map((referral) => (
              <View key={referral.referralId} style={[styles.referral, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}><Feather name="user" size={16} color={colors.primaryForeground} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.referralName, { color: colors.foreground }]}>{referral.user?.name ?? "User"}</Text>
                  <Text style={[styles.referralDetail, { color: colors.mutedForeground }]}>{referral.user?.email ?? "—"}</Text>
                  <Text style={[styles.referralDetail, { color: colors.mutedForeground }]}>{referral.user?.phone ?? "—"} · {dateText(referral.createdAt)}</Text>
                </View>
                <View style={[styles.status, { backgroundColor: referral.user?.status === "active" ? "#dcfce7" : colors.muted }]}><Text style={{ fontSize: 10, color: referral.user?.status === "active" ? "#15803d" : colors.mutedForeground, fontFamily: "Outfit_600SemiBold" }}>{referral.user?.status ?? "Unknown"}</Text></View>
              </View>
            ))}
            {total > 30 ? <View style={styles.pagination}><Pressable disabled={page === 1} onPress={() => setPage((current) => current - 1)} style={[styles.pageButton, { borderColor: colors.border, opacity: page === 1 ? 0.45 : 1 }]}><Text style={{ color: colors.foreground }}>Previous</Text></Pressable><Text style={{ color: colors.mutedForeground, fontFamily: "Outfit_400Regular" }}>Page {page} · {total} total</Text><Pressable disabled={page * 30 >= total} onPress={() => setPage((current) => current + 1)} style={[styles.pageButton, { borderColor: colors.border, opacity: page * 30 >= total ? 0.45 : 1 }]}><Text style={{ color: colors.foreground }}>Next</Text></Pressable></View> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, colors, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; value: number; colors: ReturnType<typeof useColors>; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name={icon} size={17} color={colors.foreground} /><Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text></Pressable>;
}
function Metric({ value, label, colors }: { value: number | string; label: string; colors: ReturnType<typeof useColors> }) {
  return <View style={{ alignItems: "center", gap: 1 }}><Text style={{ color: colors.foreground, fontFamily: "Outfit_700Bold", fontSize: 17 }}>{value}</Text><Text style={{ color: colors.mutedForeground, fontFamily: "Outfit_400Regular", fontSize: 11 }}>{label}</Text></View>;
}
function InfoRow({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.infoRow}><Text style={{ color: colors.mutedForeground, fontFamily: "Outfit_400Regular", fontSize: 13 }}>{label}</Text><Text style={{ color: colors.foreground, fontFamily: "Outfit_600SemiBold", fontSize: 13, maxWidth: "58%" }} numberOfLines={1}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  header: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 1 },
  title: { fontSize: 23, fontFamily: "Outfit_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Outfit_400Regular", marginTop: 2, textTransform: "capitalize" },
  tabBar: { paddingHorizontal: 14, gap: 18, borderBottomWidth: 1 },
  tab: { paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: "transparent" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  linkCard: { borderWidth: 1, borderRadius: 14, padding: 15, gap: 10 },
  cardTitle: { fontSize: 15, fontFamily: "Outfit_700Bold" },
  link: { fontSize: 12, fontFamily: "Outfit_400Regular", lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 9 },
  compactButton: { minHeight: 37, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 13, borderRadius: 8 },
  meta: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  hint: { fontSize: 12, fontFamily: "Outfit_400Regular", marginBottom: -7 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { width: "31.8%", minHeight: 103, padding: 12, borderRadius: 12, borderWidth: 1, gap: 6 },
  statValue: { fontSize: 23, fontFamily: "Outfit_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  funnel: { borderWidth: 1, padding: 15, borderRadius: 12, gap: 14 },
  funnelRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  linkScreen: { borderWidth: 1, padding: 20, borderRadius: 14, alignItems: "center", gap: 13 },
  helpText: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 19 },
  fullLink: { alignSelf: "stretch", fontSize: 12, fontFamily: "Outfit_400Regular", padding: 11, borderRadius: 8, lineHeight: 18 },
  accountInfo: { alignSelf: "stretch", borderTopWidth: 1, paddingTop: 10, gap: 9 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  search: { borderWidth: 1, minHeight: 44, paddingHorizontal: 12, borderRadius: 9, fontFamily: "Outfit_400Regular", fontSize: 13 },
  filters: { gap: 7 },
  filter: { height: 34, borderWidth: 1, borderRadius: 17, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  dateRow: { flexDirection: "row", gap: 9 },
  dateInput: { flex: 1, borderWidth: 1, minHeight: 40, paddingHorizontal: 10, borderRadius: 8, fontFamily: "Outfit_400Regular", fontSize: 12 },
  refLoading: { paddingVertical: 36, alignItems: "center" },
  empty: { padding: 28, borderWidth: 1, borderRadius: 13, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  referral: { borderWidth: 1, padding: 12, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  referralName: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  referralDetail: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  status: { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3 },
  pagination: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4 },
  pageButton: { borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 7 },
  errorTitle: { fontFamily: "Outfit_700Bold", fontSize: 18 },
  errorText: { fontFamily: "Outfit_400Regular", fontSize: 13, textAlign: "center" },
  outlineButton: { borderWidth: 1, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
});