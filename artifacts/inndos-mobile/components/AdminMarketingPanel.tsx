import * as Clipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/utils/api";

type Data = Record<string, unknown>;
type Tab = "overview" | "marketers" | "referrals" | "analytics" | "audit";
type Colors = ReturnType<typeof useColors>;

function stringValue(record: Data | undefined, key: string, fallback = "—"): string {
  const raw = record?.[key];
  if (raw === null || raw === undefined || raw === "") return fallback;
  return String(raw);
}

function numberValue(record: Data | undefined, key: string): number {
  const parsed = Number(record?.[key] ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rows(input: unknown): Data[] {
  if (Array.isArray(input)) return input.filter((item): item is Data => !!item && typeof item === "object");
  if (input && typeof input === "object" && "data" in input) {
    const data = (input as Data).data;
    return Array.isArray(data) ? data.filter((item): item is Data => !!item && typeof item === "object") : [];
  }
  return [];
}

function dateText(input: unknown, withTime = false): string {
  if (!input) return "—";
  const date = new Date(String(input));
  if (Number.isNaN(date.getTime())) return String(input);
  return date.toLocaleString("en-KE", withTime
    ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" });
}

function statusText(input: unknown): string {
  return String(input ?? "unknown").replaceAll("_", " ");
}

function initials(name: unknown): string {
  return String(name ?? "?").split(" ").map((part) => part[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

function Card({ children, colors }: { children: React.ReactNode; colors: Colors }) {
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>;
}

function Button({
  label,
  icon,
  onPress,
  colors,
  tone = "outline",
  disabled = false,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  colors: Colors;
  tone?: "outline" | "primary" | "danger";
  disabled?: boolean;
}) {
  const backgroundColor = tone === "primary" ? colors.primary : tone === "danger" ? colors.destructive : "transparent";
  const foreground = tone === "primary" ? colors.primaryForeground : tone === "danger" ? colors.destructiveForeground : colors.foreground;
  const borderColor = tone === "primary" ? colors.primary : tone === "danger" ? colors.destructive : colors.border;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { backgroundColor, borderColor, opacity: disabled ? 0.55 : 1 }]}
    >
      {icon ? <Feather name={icon} size={14} color={foreground} /> : null}
      <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

function Metric({ label, value, icon, colors }: { label: string; value: string | number; icon: React.ComponentProps<typeof Feather>["name"]; colors: Colors }) {
  return (
    <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon} size={16} color={colors.mutedForeground} />
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function Segment({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: Colors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segment, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" }]}
    >
      <Text style={[styles.segmentText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function AdminMarketingPanel({ token, onChanged }: { token: string; onChanged?: () => void }) {
  const colors = useColors();
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Data>({});
  const [marketers, setMarketers] = useState<Data[]>([]);
  const [marketersTotal, setMarketersTotal] = useState(0);
  const [marketersPage, setMarketersPage] = useState(1);
  const [marketersSearchInput, setMarketersSearchInput] = useState("");
  const [marketersSearch, setMarketersSearch] = useState("");
  const [marketersStatus, setMarketersStatus] = useState("all");
  const [marketersSort, setMarketersSort] = useState("createdAt");
  const [referrals, setReferrals] = useState<Data[]>([]);
  const [referralsTotal, setReferralsTotal] = useState(0);
  const [referralsPage, setReferralsPage] = useState(1);
  const [referralsSearchInput, setReferralsSearchInput] = useState("");
  const [referralsSearch, setReferralsSearch] = useState("");
  const [chartData, setChartData] = useState<Data[]>([]);
  const [chartRange, setChartRange] = useState("7d");
  const [chartMarketerId, setChartMarketerId] = useState("all");
  const [comparison, setComparison] = useState<Data[]>([]);
  const [audit, setAudit] = useState<Data[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addSearchInput, setAddSearchInput] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [userResults, setUserResults] = useState<Data[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Data | null>(null);
  const [detailReferrals, setDetailReferrals] = useState<Data[]>([]);
  const [detailReferralTotal, setDetailReferralTotal] = useState(0);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const request = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
    });
    const text = await response.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!response.ok) {
      const message = body && typeof body === "object" && "error" in body ? String((body as Data).error) : `Request failed (${response.status})`;
      throw new Error(message);
    }
    return body as T;
  }, [token]);

  const loadOverview = useCallback(async () => {
    setOverview(await request<Data>("/api/marketing/admin/overview"));
  }, [request]);

  const loadMarketers = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({
        page: String(marketersPage),
        limit: "20",
        sortBy: marketersSort,
      });
      if (marketersSearch) params.set("search", marketersSearch);
      if (marketersStatus !== "all") params.set("status", marketersStatus);
      const result = await request<{ data?: Data[]; total?: number }>(`/api/marketing/admin/marketers?${params}`);
      setMarketers(result.data ?? []);
      setMarketersTotal(Number(result.total ?? 0));
    } finally {
      setLoadingList(false);
    }
  }, [request, marketersPage, marketersSearch, marketersStatus, marketersSort]);

  const loadReferrals = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ page: String(referralsPage), limit: "50" });
      if (referralsSearch) params.set("search", referralsSearch);
      const result = await request<{ data?: Data[]; total?: number }>(`/api/marketing/admin/referrals?${params}`);
      setReferrals(result.data ?? []);
      setReferralsTotal(Number(result.total ?? 0));
    } finally {
      setLoadingList(false);
    }
  }, [request, referralsPage, referralsSearch]);

  const loadAnalytics = useCallback(async () => {
    const params = new URLSearchParams({ range: chartRange });
    if (chartMarketerId !== "all") params.set("marketerId", chartMarketerId);
    const result = await request<{ data?: Data[] }>(`/api/marketing/admin/analytics?${params}`);
    setChartData(result.data ?? []);
  }, [request, chartRange, chartMarketerId]);

  const loadComparison = useCallback(async () => {
    const result = await request<{ data?: Data[] }>("/api/marketing/admin/comparison");
    setComparison(result.data ?? []);
  }, [request]);

  const loadAudit = useCallback(async () => {
    const result = await request<{ data?: Data[]; total?: number }>(`/api/marketing/admin/audit-log?page=${auditPage}&limit=30`);
    setAudit(result.data ?? []);
    setAuditTotal(Number(result.total ?? 0));
  }, [request, auditPage]);

  const reload = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([loadOverview(), loadMarketers(), loadReferrals(), loadComparison()]);
      if (tab === "analytics") await loadAnalytics();
      if (tab === "audit") await loadAudit();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load marketing data.");
    } finally {
      setLoading(false);
    }
  }, [loadOverview, loadMarketers, loadReferrals, loadComparison, loadAnalytics, loadAudit, tab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMarketersSearch(marketersSearchInput.trim());
      setMarketersPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [marketersSearchInput]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setReferralsSearch(referralsSearchInput.trim());
      setReferralsPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [referralsSearchInput]);

  useEffect(() => {
    const timer = setTimeout(() => setAddSearch(addSearchInput.trim()), 280);
    return () => clearTimeout(timer);
  }, [addSearchInput]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    if (tab === "marketers") void loadMarketers().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load marketers."));
    if (tab === "referrals") void loadReferrals().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load referrals."));
    if (tab === "analytics") void loadAnalytics().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load analytics."));
    if (tab === "audit") void loadAudit().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load audit log."));
  }, [tab, loadMarketers, loadReferrals, loadAnalytics, loadAudit]);

  useEffect(() => {
    if (!showAdd || addSearch.length < 2) {
      setUserResults([]);
      return;
    }
    setSearchingUsers(true);
    void request<{ data?: Data[] }>(`/api/marketing/admin/search-users?q=${encodeURIComponent(addSearch)}`)
      .then((result) => setUserResults(result.data ?? []))
      .catch((cause) => Alert.alert("Search failed", cause instanceof Error ? cause.message : "Could not search users."))
      .finally(() => setSearchingUsers(false));
  }, [request, showAdd, addSearch]);

  const openDetail = async (marketer: Data) => {
    const id = stringValue(marketer, "id", "");
    setLoadingDetail(true);
    setDetail({ marketer, user: marketer.user });
    try {
      const [details, referralResult] = await Promise.all([
        request<Data>(`/api/marketing/admin/marketers/${id}`),
        request<{ data?: Data[]; total?: number }>(`/api/marketing/admin/marketers/${id}/referrals?limit=100`),
      ]);
      setDetail(details);
      setDetailReferrals(referralResult.data ?? []);
      setDetailReferralTotal(Number(referralResult.total ?? 0));
    } catch (cause) {
      Alert.alert("Could not load marketer", cause instanceof Error ? cause.message : "Please try again.");
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const convertUser = async (targetUserId: string) => {
    setAddingUserId(targetUserId);
    try {
      await request("/api/marketing/admin/marketers", {
        method: "POST",
        body: JSON.stringify({ targetUserId }),
      });
      Alert.alert("Marketer added", "The user now has marketing access. Their in-app notification, email, and SMS are being sent.");
      setShowAdd(false);
      setAddSearchInput("");
      setUserResults([]);
      await reload();
      onChanged?.();
    } catch (cause) {
      Alert.alert("Could not add marketer", cause instanceof Error ? cause.message : "Please try again.");
    } finally {
      setAddingUserId(null);
    }
  };

  const updateMarketer = async (id: string, body: Data, message: string) => {
    try {
      await request(`/api/marketing/admin/marketers/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      Alert.alert("Updated", message);
      await Promise.all([loadMarketers(), loadOverview(), loadComparison()]);
      if (detail) await openDetail((detail.marketer as Data) ?? detail);
      onChanged?.();
    } catch (cause) {
      Alert.alert("Could not update marketer", cause instanceof Error ? cause.message : "Please try again.");
    }
  };

  const copyText = async (text: string, message: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", message);
  };

  const exportCsv = async (type: "marketers" | "referrals", marketerId?: string) => {
    try {
      const suffix = marketerId ? `&marketerId=${encodeURIComponent(marketerId)}` : "";
      const csv = await request<string>(`/api/marketing/admin/export?type=${type}${suffix}`);
      await copyText(csv, `${type === "marketers" ? "Marketers" : "Referrals"} CSV copied to your clipboard.`);
    } catch (cause) {
      Alert.alert("Export failed", cause instanceof Error ? cause.message : "Please try again.");
    }
  };

  const shareReferralLink = async (code: string) => {
    const link = `https://inndos.com/#/login?ref=${code}`;
    try {
      await Share.share({ title: "INNDOS referral link", message: link });
    } catch {
      await copyText(link, "Referral link copied to your clipboard.");
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
    { id: "overview", label: "Overview", icon: "bar-chart-2" },
    { id: "marketers", label: "Marketers", icon: "users" },
    { id: "referrals", label: "Referrals", icon: "link-2" },
    { id: "analytics", label: "Analytics", icon: "trending-up" },
    { id: "audit", label: "Audit Log", icon: "activity" },
  ];

  const chartMax = Math.max(1, ...chartData.map((item) => numberValue(item, "count")));
  const marketerOptions = useMemo(() => marketers.filter((item) => stringValue(item, "id", "") && item.user), [marketers]);

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (error && Object.keys(overview).length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={34} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Marketing unavailable</Text>
        <Text style={[styles.helpText, { color: colors.mutedForeground }]}>{error}</Text>
        <Button label="Try again" icon="refresh-cw" onPress={() => { setLoading(true); void reload(); }} colors={colors} />
      </View>
    );
  }

  const renderOverview = () => {
    const top = overview.topMarketer && typeof overview.topMarketer === "object" ? overview.topMarketer as Data : null;
    const topUser = overview.topMarketerUser && typeof overview.topMarketerUser === "object" ? overview.topMarketerUser as Data : null;
    return (
      <>
        <View style={styles.metricGrid}>
          <Metric label="Total marketers" value={numberValue(overview, "totalMarketers")} icon="users" colors={colors} />
          <Metric label="Active marketers" value={numberValue(overview, "activeMarketers")} icon="user-check" colors={colors} />
          <Metric label="Total referrals" value={numberValue(overview, "totalReferrals")} icon="link-2" colors={colors} />
          <Metric label="This month" value={numberValue(overview, "monthReferrals")} icon="calendar" colors={colors} />
          <Metric label="Today" value={numberValue(overview, "todayReferrals")} icon="sun" colors={colors} />
          <Metric label="This week" value={numberValue(overview, "weekReferrals")} icon="trending-up" colors={colors} />
          <Metric label="This year" value={numberValue(overview, "yearReferrals")} icon="calendar" colors={colors} />
          <Metric label="Average / marketer" value={numberValue(overview, "avgReferrals")} icon="bar-chart-2" colors={colors} />
        </View>
        {top ? (
          <Card colors={colors}>
            <View style={styles.cardHeader}>
              <View style={styles.row}><Feather name="award" size={17} color={colors.primary} /><Text style={[styles.cardTitle, { color: colors.foreground }]}>Top performer</Text></View>
              <Button label="View" icon="chevron-right" onPress={() => void openDetail({ ...top, user: topUser })} colors={colors} />
            </View>
            <View style={styles.personRow}>
              <View style={[styles.avatar, { backgroundColor: colors.muted }]}><Text style={[styles.avatarText, { color: colors.foreground }]}>{initials(topUser?.name)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{stringValue(topUser ?? undefined, "name")}</Text>
                <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{stringValue(top, "marketerCode")} · {stringValue(top, "referralCode")}</Text>
              </View>
              <Text style={[styles.bigNumber, { color: colors.primary }]}>{numberValue(overview, "topMarketerCount")}</Text>
            </View>
          </Card>
        ) : null}
        <Card colors={colors}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Latest referrals</Text>
            <Button label="View all" icon="chevron-right" onPress={() => setTab("referrals")} colors={colors} />
          </View>
          {referrals.slice(0, 5).map((item) => {
            const referred = item.referredUser && typeof item.referredUser === "object" ? item.referredUser as Data : {};
            const marketerUser = item.marketerUser && typeof item.marketerUser === "object" ? item.marketerUser as Data : {};
            return <View key={stringValue(item, "id")} style={[styles.listRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{stringValue(referred, "name")}</Text><Text style={[styles.minorText, { color: colors.mutedForeground }]}>{stringValue(marketerUser, "name")}</Text></View>
              <Text style={[styles.minorText, { color: colors.mutedForeground }]}>{dateText(item.createdAt)}</Text>
            </View>;
          })}
          {referrals.length === 0 ? <Text style={[styles.helpText, { color: colors.mutedForeground }]}>No referrals recorded yet.</Text> : null}
        </Card>
      </>
    );
  };

  const renderMarketers = () => (
    <>
      <View style={styles.toolbar}>
        <TextInput
          value={marketersSearchInput}
          onChangeText={setMarketersSearchInput}
          placeholder="Name, email, phone, code…"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.search, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
          returnKeyType="search"
          testID="admin-marketers-search"
        />
        <Button label="Export" icon="download" onPress={() => void exportCsv("marketers")} colors={colors} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>
        {["all", "active", "inactive"].map((item) => <Segment key={item} label={item === "all" ? "All status" : item} selected={marketersStatus === item} onPress={() => { setMarketersStatus(item); setMarketersPage(1); }} colors={colors} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>
        {[
          ["createdAt", "Date assigned"],
          ["totalReferrals", "Most referrals"],
          ["totalReferralsAsc", "Fewest referrals"],
        ].map(([value, label]) => <Segment key={value} label={label} selected={marketersSort === value} onPress={() => { setMarketersSort(value); setMarketersPage(1); }} colors={colors} />)}
      </ScrollView>
      {loadingList ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : marketers.length === 0 ? (
        <Card colors={colors}><View style={styles.centerSmall}><Feather name="users" size={28} color={colors.mutedForeground} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No marketers found</Text><Text style={[styles.helpText, { color: colors.mutedForeground }]}>Use Add Marketer above to convert an existing user.</Text></View></Card>
      ) : marketers.map((item) => {
        const user = item.user && typeof item.user === "object" ? item.user as Data : {};
        const active = stringValue(item, "status") === "active";
        return <Card key={stringValue(item, "id")} colors={colors}>
          <Pressable onPress={() => void openDetail(item)}>
            <View style={styles.personRow}>
              <View style={[styles.avatar, { backgroundColor: colors.muted }]}><Text style={[styles.avatarText, { color: colors.foreground }]}>{initials(user.name)}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={styles.row}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{stringValue(user, "name")}</Text><Text style={[styles.status, { color: active ? colors.primary : colors.mutedForeground }]}>{statusText(item.status)}</Text></View>
                <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{stringValue(user, "email")}</Text>
                <Text style={[styles.minorText, { color: colors.mutedForeground }]}>{stringValue(item, "marketerCode")} · {stringValue(item, "referralCode")} · {dateText(item.createdAt)}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </View>
            <View style={styles.statsLine}>
              <Text style={[styles.statText, { color: colors.foreground }]}>{numberValue(item, "totalReferrals")} <Text style={{ color: colors.mutedForeground }}>total</Text></Text>
              <Text style={[styles.statText, { color: colors.foreground }]}>{numberValue(item, "todayReferrals")} <Text style={{ color: colors.mutedForeground }}>today</Text></Text>
              <Text style={[styles.statText, { color: colors.foreground }]}>{numberValue(item, "weekReferrals")} <Text style={{ color: colors.mutedForeground }}>week</Text></Text>
              <Text style={[styles.statText, { color: colors.foreground }]}>{numberValue(item, "monthReferrals")} <Text style={{ color: colors.mutedForeground }}>month</Text></Text>
            </View>
          </Pressable>
          <View style={styles.actions}>
            <Button label="Copy link" icon="copy" onPress={() => void copyText(`https://inndos.com/#/login?ref=${stringValue(item, "referralCode", "")}`, "Referral link copied.")} colors={colors} />
            <Button label={active ? "Deactivate" : "Activate"} icon="power" onPress={() => void updateMarketer(stringValue(item, "id", ""), { status: active ? "inactive" : "active" }, `Marketer ${active ? "deactivated" : "activated"}.`)} colors={colors} />
            <Button label="Share" icon="share-2" onPress={() => void shareReferralLink(stringValue(item, "referralCode", ""))} colors={colors} />
          </View>
        </Card>;
      })}
      {marketersTotal > 20 ? <View style={styles.pagination}><Button label="Prev" onPress={() => setMarketersPage((page) => page - 1)} disabled={marketersPage === 1} colors={colors} /><Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Page {marketersPage} · {marketersTotal} total</Text><Button label="Next" onPress={() => setMarketersPage((page) => page + 1)} disabled={marketersPage * 20 >= marketersTotal} colors={colors} /></View> : null}
    </>
  );

  const renderReferrals = () => (
    <>
      <View style={styles.toolbar}>
        <TextInput value={referralsSearchInput} onChangeText={setReferralsSearchInput} placeholder="Name, email, phone, marketer…" placeholderTextColor={colors.mutedForeground} style={[styles.search, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} testID="admin-referrals-search" />
        <Button label="Export" icon="download" onPress={() => void exportCsv("referrals")} colors={colors} />
      </View>
      {loadingList ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : referrals.length === 0 ? (
        <Card colors={colors}><Text style={[styles.helpText, { color: colors.mutedForeground }]}>No referrals found.</Text></Card>
      ) : referrals.map((item) => {
        const referred = item.referredUser && typeof item.referredUser === "object" ? item.referredUser as Data : {};
        const marketer = item.marketerUser && typeof item.marketerUser === "object" ? item.marketerUser as Data : {};
        return <Card key={stringValue(item, "id")} colors={colors}><View style={styles.listRow}><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{stringValue(referred, "name")}</Text><Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{stringValue(referred, "email")} · {stringValue(referred, "phone")}</Text><Text style={[styles.minorText, { color: colors.mutedForeground }]}>Brought by {stringValue(marketer, "name")} · {stringValue(item, "referralCode")}</Text></View><Text style={[styles.minorText, { color: colors.mutedForeground }]}>{dateText(item.createdAt, true)}</Text></View></Card>;
      })}
      {referralsTotal > 50 ? <View style={styles.pagination}><Button label="Prev" onPress={() => setReferralsPage((page) => page - 1)} disabled={referralsPage === 1} colors={colors} /><Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Page {referralsPage} · {referralsTotal} total</Text><Button label="Next" onPress={() => setReferralsPage((page) => page + 1)} disabled={referralsPage * 50 >= referralsTotal} colors={colors} /></View> : null}
    </>
  );

  const renderAnalytics = () => (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>
        {[["7d", "7 days"], ["30d", "30 days"], ["3m", "3 months"], ["6m", "6 months"], ["12m", "12 months"]].map(([value, label]) => <Segment key={value} label={label} selected={chartRange === value} onPress={() => setChartRange(value)} colors={colors} />)}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>
        <Segment label="All marketers" selected={chartMarketerId === "all"} onPress={() => setChartMarketerId("all")} colors={colors} />
        {marketerOptions.map((item) => {
          const user = item.user as Data;
          return <Segment key={stringValue(item, "id")} label={stringValue(user, "name")} selected={chartMarketerId === stringValue(item, "id")} onPress={() => setChartMarketerId(stringValue(item, "id"))} colors={colors} />;
        })}
      </ScrollView>
      <Card colors={colors}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Referral registrations over time</Text>
        {chartData.map((item) => {
          const count = numberValue(item, "count");
          return <View key={stringValue(item, "label")} style={styles.chartRow}><Text style={[styles.chartLabel, { color: colors.mutedForeground }]}>{stringValue(item, "label")}</Text><View style={[styles.chartTrack, { backgroundColor: colors.muted }]}><View style={[styles.chartBar, { backgroundColor: colors.primary, width: `${Math.max(2, (count / chartMax) * 100)}%` }]} /></View><Text style={[styles.chartCount, { color: colors.foreground }]}>{count}</Text></View>;
        })}
        {chartData.length === 0 ? <Text style={[styles.helpText, { color: colors.mutedForeground }]}>No analytics data for this range.</Text> : null}
      </Card>
      <Card colors={colors}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Marketer performance</Text>
        {comparison.map((item, index) => <Pressable key={stringValue(item, "marketerCode")} onPress={() => { const found = marketers.find((marketer) => stringValue(marketer, "marketerCode") === stringValue(item, "marketerCode")); if (found) void openDetail(found); }} style={[styles.listRow, { borderBottomColor: colors.border }]}><Text style={[styles.rank, { color: colors.mutedForeground }]}>{index + 1}</Text><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{stringValue(item, "name")}</Text><Text style={[styles.minorText, { color: colors.mutedForeground }]}>{stringValue(item, "marketerCode")} · {statusText(item.status)}</Text></View><Text style={[styles.bigNumber, { color: colors.primary }]}>{numberValue(item, "totalReferrals")}</Text><Feather name="chevron-right" size={16} color={colors.mutedForeground} /></Pressable>)}
      </Card>
    </>
  );

  const renderAudit = () => (
    <>
      {audit.length === 0 ? <Card colors={colors}><Text style={[styles.helpText, { color: colors.mutedForeground }]}>No audit records yet.</Text></Card> : audit.map((item) => <Card key={stringValue(item, "id")} colors={colors}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{statusText(item.action)}</Text><Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{stringValue(item, "details")}</Text><Text style={[styles.minorText, { color: colors.mutedForeground }]}>{dateText(item.createdAt, true)} · Admin {stringValue(item, "adminId", "").slice(0, 8)}</Text></Card>)}
      {auditTotal > 30 ? <View style={styles.pagination}><Button label="Prev" onPress={() => setAuditPage((page) => page - 1)} disabled={auditPage === 1} colors={colors} /><Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Page {auditPage} · {auditTotal} total</Text><Button label="Next" onPress={() => setAuditPage((page) => page + 1)} disabled={auditPage * 30 >= auditTotal} colors={colors} /></View> : null}
    </>
  );

  const detailMarketer: Data = detail?.marketer && typeof detail.marketer === "object" ? detail.marketer as Data : detail ?? {};
  const detailUser = detail?.user && typeof detail.user === "object" ? detail.user as Data : {};
  const detailLink = detailMarketer ? `https://inndos.com/#/login?ref=${stringValue(detailMarketer, "referralCode", "")}` : "";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.foreground }]}>Marketing & Referrals</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Manage marketers, referrals, performance, and audit history.</Text></View>
        <View style={styles.headerActions}><Button label="Refresh" icon="refresh-cw" onPress={() => { setLoading(true); void reload(); }} colors={colors} /><Button label="Add marketer" icon="user-plus" tone="primary" onPress={() => setShowAdd(true)} colors={colors} /></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {tabs.map((item) => <Pressable key={item.id} onPress={() => setTab(item.id)} style={[styles.tab, { borderBottomColor: tab === item.id ? colors.primary : "transparent" }]}><Feather name={item.icon} size={15} color={tab === item.id ? colors.primary : colors.mutedForeground} /><Text style={[styles.tabText, { color: tab === item.id ? colors.primary : colors.mutedForeground }]}>{item.label}</Text></Pressable>)}
      </ScrollView>
      {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {tab === "overview" ? renderOverview() : tab === "marketers" ? renderMarketers() : tab === "referrals" ? renderReferrals() : tab === "analytics" ? renderAnalytics() : renderAudit()}
      </ScrollView>

      <Modal visible={showAdd} onClose={() => setShowAdd(false)} title="Add marketer" colors={colors}>
        <Text style={[styles.helpText, { color: colors.mutedForeground }]}>Search an existing inndos user by name, email, or phone. They keep their current account role and receive marketing access.</Text>
        <TextInput value={addSearchInput} onChangeText={setAddSearchInput} placeholder="Type at least 2 characters…" placeholderTextColor={colors.mutedForeground} autoFocus style={[styles.search, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} />
        {searchingUsers ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : addSearch.length < 2 ? <Text style={[styles.helpText, { color: colors.mutedForeground }]}>Start typing to find a user.</Text> : userResults.length === 0 ? <Text style={[styles.helpText, { color: colors.mutedForeground }]}>No users found for “{addSearch}”.</Text> : userResults.map((item) => <View key={stringValue(item, "id")} style={[styles.personRow, { borderBottomColor: colors.border }]}><View style={[styles.avatar, { backgroundColor: colors.muted }]}><Text style={[styles.avatarText, { color: colors.foreground }]}>{initials(item.name)}</Text></View><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{stringValue(item, "name")}</Text><Text style={[styles.minorText, { color: colors.mutedForeground }]}>{stringValue(item, "email")} · {stringValue(item, "phone")}</Text></View>{item.isMarketer ? <Text style={[styles.status, { color: colors.mutedForeground }]}>Already added</Text> : <Button label="Add" icon="user-plus" tone="primary" disabled={addingUserId === stringValue(item, "id")} onPress={() => void convertUser(stringValue(item, "id", ""))} colors={colors} />}</View>)}
      </Modal>

      <Modal visible={!!detail} onClose={() => setDetail(null)} title={stringValue(detailUser, "name", "Marketer details")} colors={colors}>
        {loadingDetail ? <ActivityIndicator color={colors.primary} style={styles.loading} /> : detail ? <><Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{stringValue(detailUser, "email")} · {stringValue(detailUser, "phone")}</Text><Text style={[styles.minorText, { color: colors.mutedForeground }]}>{stringValue(detailMarketer, "marketerCode")} · {statusText(detailMarketer?.status)}</Text><View style={[styles.linkBox, { backgroundColor: colors.muted }]}><Text selectable style={[styles.minorText, { color: colors.foreground }]}>{detailLink}</Text></View><View style={styles.actions}><Button label="Copy link" icon="copy" onPress={() => void copyText(detailLink, "Referral link copied.")} colors={colors} /><Button label={stringValue(detailMarketer, "status") === "active" ? "Deactivate" : "Activate"} icon="power" onPress={() => void updateMarketer(stringValue(detailMarketer, "id", ""), { status: stringValue(detailMarketer, "status") === "active" ? "inactive" : "active" }, "Marketer status updated.")} colors={colors} /><Button label="New code" icon="refresh-cw" onPress={() => void updateMarketer(stringValue(detailMarketer, "id", ""), { regenerateCode: true }, "Referral code regenerated.")} colors={colors} /></View><View style={styles.actions}><Button label="Export referrals" icon="download" onPress={() => void exportCsv("referrals", stringValue(detailMarketer, "id", ""))} colors={colors} /><Button label="Share link" icon="share-2" onPress={() => void shareReferralLink(stringValue(detailMarketer, "referralCode", ""))} colors={colors} /></View><Text style={[styles.cardTitle, { color: colors.foreground }]}>People brought ({detailReferralTotal})</Text>{detailReferrals.length === 0 ? <Text style={[styles.helpText, { color: colors.mutedForeground }]}>No referrals yet.</Text> : detailReferrals.map((item) => { const user = item.user && typeof item.user === "object" ? item.user as Data : {}; return <View key={stringValue(item, "referralId", stringValue(item, "id"))} style={[styles.listRow, { borderBottomColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{stringValue(user, "name")}</Text><Text style={[styles.minorText, { color: colors.mutedForeground }]}>{stringValue(user, "email")} · {stringValue(user, "phone")}</Text></View><Text style={[styles.minorText, { color: colors.mutedForeground }]}>{dateText(item.createdAt)}</Text></View>; })}</> : null}
      </Modal>
    </View>
  );
}

function Modal({ visible, onClose, title, colors, children }: { visible: boolean; onClose: () => void; title: string; colors: Colors; children: React.ReactNode }) {
  return (
    <View>
      {visible ? <View style={styles.modalBackdrop}><View style={[styles.modal, { backgroundColor: colors.background, borderColor: colors.border }]}><View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text><Pressable onPress={onClose} hitSlop={8}><Feather name="x" size={22} color={colors.foreground} /></Pressable></View><KeyboardAwareScrollViewCompat contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">{children}</KeyboardAwareScrollViewCompat></View></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  headerActions: { gap: 7, alignItems: "flex-end" },
  title: { fontSize: 22, fontFamily: "Outfit_700Bold" },
  subtitle: { fontSize: 12, lineHeight: 17, fontFamily: "Outfit_400Regular", marginTop: 3 },
  tabs: { paddingHorizontal: 14, borderBottomWidth: 1, gap: 4 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 13, borderBottomWidth: 2 },
  tabText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  content: { padding: 20, paddingBottom: 100, gap: 14 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  metric: { width: "23.5%", minHeight: 95, padding: 10, borderRadius: 11, borderWidth: 1, gap: 5 },
  metricValue: { fontSize: 20, fontFamily: "Outfit_700Bold" },
  metricLabel: { fontSize: 10, lineHeight: 13, fontFamily: "Outfit_400Regular" },
  card: { borderRadius: 13, borderWidth: 1, padding: 14, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { fontSize: 15, fontFamily: "Outfit_700Bold" },
  row: { flexDirection: "row", alignItems: "center", gap: 7 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 2 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontFamily: "Outfit_700Bold" },
  rowTitle: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  bodyText: { fontSize: 12, lineHeight: 17, fontFamily: "Outfit_400Regular" },
  minorText: { fontSize: 11, lineHeight: 16, fontFamily: "Outfit_400Regular" },
  helpText: { fontSize: 12, lineHeight: 18, fontFamily: "Outfit_400Regular" },
  bigNumber: { fontSize: 22, fontFamily: "Outfit_700Bold" },
  status: { fontSize: 10, fontFamily: "Outfit_600SemiBold", textTransform: "capitalize" },
  statsLine: { flexDirection: "row", justifyContent: "space-between", paddingTop: 9, marginTop: 10, borderTopWidth: 1, borderTopColor: "rgba(128,128,128,0.18)" },
  statText: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  button: { minHeight: 34, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  buttonText: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },
  toolbar: { flexDirection: "row", gap: 8, alignItems: "center" },
  search: { flex: 1, minHeight: 42, borderRadius: 9, borderWidth: 1, paddingHorizontal: 12, fontSize: 13, fontFamily: "Outfit_400Regular" },
  segmentRow: { gap: 7 },
  segment: { minHeight: 33, borderRadius: 17, borderWidth: 1, paddingHorizontal: 11, alignItems: "center", justifyContent: "center" },
  segmentText: { fontSize: 11, fontFamily: "Outfit_500Medium" },
  listRow: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  pagination: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap" },
  loading: { paddingVertical: 25 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 28 },
  centerSmall: { alignItems: "center", gap: 8, paddingVertical: 20 },
  emptyTitle: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  errorText: { paddingHorizontal: 20, paddingBottom: 8, fontSize: 12, fontFamily: "Outfit_500Medium" },
  chartRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 10 },
  chartLabel: { width: 70, fontSize: 10, fontFamily: "Outfit_400Regular" },
  chartTrack: { flex: 1, height: 9, borderRadius: 5, overflow: "hidden" },
  chartBar: { height: "100%", borderRadius: 5 },
  chartCount: { width: 24, textAlign: "right", fontSize: 11, fontFamily: "Outfit_600SemiBold" },
  rank: { width: 20, fontSize: 12, textAlign: "center", fontFamily: "Outfit_600SemiBold" },
  linkBox: { padding: 11, borderRadius: 8 },
  modalBackdrop: { position: "absolute", zIndex: 20, left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.48)", justifyContent: "flex-end" },
  modal: { maxHeight: "92%", borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, padding: 18 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12 },
  modalTitle: { fontSize: 19, fontFamily: "Outfit_700Bold" },
  modalContent: { gap: 13, paddingBottom: 28 },
});