import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { AdminMarketingPanel } from "@/components/AdminMarketingPanel";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/utils/api";
import { getImageUrl } from "@/utils/imageUrl";
import { normalizePropertySubtype, propertyCategoryLabel } from "@workspace/property-categories";

type Section =
  | "overview"
  | "properties"
  | "users"
  | "subscriptions"
  | "finance"
  | "notifications"
  | "reviews"
  | "marketing"
  | "settings";

type RecordData = Record<string, unknown>;

type FormField = {
  key: string;
  label: string;
  placeholder?: string;
  secure?: boolean;
  multiline?: boolean;
  options?: string[];
};

type FormConfig = {
  title: string;
  submitLabel: string;
  fields: FormField[];
  initial?: Record<string, string>;
  onSubmit: (values: Record<string, string>) => Promise<void>;
};

const SECTIONS: { key: Section; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { key: "overview", label: "Overview", icon: "grid" },
  { key: "properties", label: "Properties", icon: "home" },
  { key: "users", label: "Users", icon: "users" },
  { key: "subscriptions", label: "Plans", icon: "award" },
  { key: "finance", label: "Finance", icon: "credit-card" },
  { key: "notifications", label: "Templates", icon: "bell" },
  { key: "reviews", label: "Reviews", icon: "star" },
  { key: "marketing", label: "Marketing", icon: "trending-up" },
  { key: "settings", label: "Settings", icon: "settings" },
];

function value(record: RecordData, key: string, fallback = "—"): string {
  const raw = record[key];
  if (raw === null || raw === undefined || raw === "") return fallback;
  if (typeof raw === "number") return raw.toLocaleString();
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  return String(raw);
}

function numberValue(record: RecordData, key: string): number {
  const parsed = Number(record[key] ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function records(input: unknown): RecordData[] {
  return Array.isArray(input) ? input.filter((item): item is RecordData => !!item && typeof item === "object") : [];
}

function wrappedRecords(input: unknown): RecordData[] {
  if (input && typeof input === "object" && "data" in input) {
    return records((input as RecordData).data);
  }
  return records(input);
}

function formatKES(input: unknown): string {
  const amount = Number(input ?? 0);
  return `KES ${Number.isFinite(amount) ? amount.toLocaleString() : "0"}`;
}

function shortDate(input: unknown): string {
  if (!input) return "—";
  const date = new Date(String(input));
  return Number.isNaN(date.getTime()) ? String(input) : date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function statusLabel(input: unknown): string {
  return String(input ?? "unknown").replaceAll("_", " ");
}

function Card({ children, colors }: { children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>;
}

function ActionButton({
  label,
  onPress,
  colors,
  tone = "outline",
  icon,
  disabled,
  testID,
}: {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  tone?: "outline" | "primary" | "danger";
  icon?: React.ComponentProps<typeof Feather>["name"];
  disabled?: boolean;
  testID?: string;
}) {
  const backgroundColor = tone === "primary" ? colors.primary : tone === "danger" ? colors.destructive : "transparent";
  const foreground = tone === "primary" ? colors.primaryForeground : tone === "danger" ? colors.destructiveForeground : colors.foreground;
  const borderColor = tone === "danger" ? colors.destructive : tone === "primary" ? colors.primary : colors.border;
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={[styles.actionButton, { backgroundColor, borderColor, opacity: disabled ? 0.55 : 1 }]}
    >
      {icon ? <Feather name={icon} size={14} color={foreground} /> : null}
      <Text style={[styles.actionButtonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

function Metric({
  label,
  number,
  icon,
  colors,
}: {
  label: string;
  number: string | number;
  icon: React.ComponentProps<typeof Feather>["name"];
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon} size={17} color={colors.mutedForeground} />
      <Text style={[styles.metricNumber, { color: colors.foreground }]} numberOfLines={1}>{number}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function EmptyState({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.empty}>
      <Feather name="inbox" size={30} color={colors.mutedForeground} />
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function AdminFormSheet({
  form,
  onClose,
  colors,
}: {
  form: FormConfig | null;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (form) setValues(form.initial ?? {});
  }, [form]);

  if (!form) return null;
  const submit = async () => {
    setSaving(true);
    try {
      await form.onSubmit(values);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{form.title}</Text>
            <Pressable onPress={onClose} hitSlop={8}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
          </View>
          <KeyboardAwareScrollViewCompat contentContainerStyle={styles.formContent} bottomOffset={80}>
            {form.fields.map((field) => (
              <View key={field.key} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{field.label}</Text>
                {field.options ? (
                  <View style={styles.options}>
                    {field.options.map((option) => {
                      const selected = values[field.key] === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => setValues((current) => ({ ...current, [field.key]: option }))}
                          style={[styles.option, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.card }]}
                        >
                          <Text style={[styles.optionText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{statusLabel(option)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <TextInput
                    value={values[field.key] ?? ""}
                    onChangeText={(next) => setValues((current) => ({ ...current, [field.key]: next }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={field.secure}
                    multiline={field.multiline}
                    autoCapitalize={field.key.includes("email") || field.key.includes("password") ? "none" : "sentences"}
                    style={[styles.input, field.multiline && styles.textarea, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]}
                  />
                )}
              </View>
            ))}
            <ActionButton label={saving ? "Saving…" : form.submitLabel} onPress={submit} colors={colors} tone="primary" disabled={saving} icon="check" />
          </KeyboardAwareScrollViewCompat>
        </View>
      </View>
    </Modal>
  );
}

export function AdminOperations() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string }>();
  const { user, token } = useAuth();
  const isWeb = Platform.OS === "web";
  const [section, setSection] = useState<Section>("overview");
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [propertyStatusFilter, setPropertyStatusFilter] = useState("all");
  const [form, setForm] = useState<FormConfig | null>(null);
  const [marketerDetail, setMarketerDetail] = useState<{ details: RecordData; referrals: RecordData[] } | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<RecordData | null>(null);
  const [userProfileSubscription, setUserProfileSubscription] = useState<RecordData | null>(null);
  const [loadingUserProfileSubscription, setLoadingUserProfileSubscription] = useState(false);
  const [userProfileSubscriptionError, setUserProfileSubscriptionError] = useState<string | null>(null);

  const request = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token ?? ""}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
    });
    const text = await res.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!res.ok) {
      const message = body && typeof body === "object" && "error" in body ? String((body as RecordData).error) : `Request failed (${res.status})`;
      throw new Error(message);
    }
    return body as T;
  }, [token]);

  const loadSection = useCallback(async (target: Section = section) => {
    if (!token || user?.role !== "admin") return;
    setError(null);
    const jobs: Record<Section, () => Promise<Record<string, unknown>>> = {
      overview: async () => {
        const [stats, moderation, marketing] = await Promise.all([
          request<RecordData>("/api/admin/stats"),
          request<RecordData[]>("/api/admin/moderation"),
          request<RecordData>("/api/marketing/admin/overview"),
        ]);
        return { stats, moderation, marketing };
      },
      properties: async () => {
        const [properties, moderation] = await Promise.all([
          request<RecordData[]>("/api/properties"),
          request<RecordData[]>("/api/admin/moderation"),
        ]);
        return { properties, moderation };
      },
      users: async () => ({ users: await request<RecordData[]>("/api/admin/users") }),
      subscriptions: async () => {
        const [subscriptions, plans] = await Promise.all([
          request<RecordData[]>("/api/admin/subscriptions"),
          request<RecordData[]>("/api/admin/plans"),
        ]);
        return { subscriptions, plans };
      },
      finance: async () => {
        const [payments, transactions, transactionAnalytics] = await Promise.all([
          request<RecordData[]>("/api/admin/payments"),
          request<RecordData[]>("/api/transactions/admin"),
          request<RecordData>("/api/transactions/admin/analytics"),
        ]);
        return { payments, transactions, transactionAnalytics };
      },
      notifications: async () => ({ templates: await request<RecordData[]>("/api/admin/notification-templates") }),
      reviews: async () => ({ reviews: await request<RecordData>("/api/reviews/admin") }),
      marketing: async () => {
        const [overview, marketers, referrals, analytics, comparison, audit] = await Promise.all([
          request<RecordData>("/api/marketing/admin/overview"),
          request<RecordData>("/api/marketing/admin/marketers?limit=100"),
          request<RecordData>("/api/marketing/admin/referrals?limit=100"),
          request<RecordData>("/api/marketing/admin/analytics?range=30d"),
          request<RecordData>("/api/marketing/admin/comparison"),
          request<RecordData>("/api/marketing/admin/audit-log?limit=50"),
        ]);
        return { overview, marketers, referrals, analytics, comparison, audit };
      },
      settings: async () => {
        const [paymentSettings, smsSettings] = await Promise.all([
          request<RecordData>("/api/admin/settings"),
          request<RecordData>("/api/admin/sms-settings"),
        ]);
        return { paymentSettings, smsSettings };
      },
    };
    try {
      const next = await jobs[target]();
      setData((current) => ({ ...current, [target]: next }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this admin section.");
    }
  }, [request, section, token, user?.role]);

  useEffect(() => {
    const supplied = params.section;
    if (supplied && SECTIONS.some((item) => item.key === supplied)) setSection(supplied as Section);
  }, [params.section]);

  useEffect(() => {
    setLoading(true);
    setQuery("");
    setPropertyStatusFilter("all");
    loadSection(section).finally(() => setLoading(false));
  }, [loadSection, section]);

  const refresh = async () => {
    setRefreshing(true);
    await loadSection(section);
    setRefreshing(false);
  };

  const chooseSection = (next: Section) => {
    setSection(next);
    router.setParams({ section: next });
  };

  const mutate = async (path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: Record<string, unknown>, message = "Saved") => {
    try {
      await request(path, { method, body: body ? JSON.stringify(body) : undefined });
      Alert.alert("Updated", message);
      await loadSection(section);
      if (selectedUserProfile && body?.userId === value(selectedUserProfile, "id")) {
        await openUserProfile(selectedUserProfile);
      }
    } catch (cause) {
      Alert.alert("Could not update", cause instanceof Error ? cause.message : "Please try again.");
      throw cause;
    }
  };

  const confirm = (title: string, message: string, action: () => Promise<void>) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Continue", style: "destructive", onPress: () => { action().catch(() => undefined); } },
    ]);
  };

  const openForm = (config: FormConfig) => setForm(config);
  const loadMarketerDetail = async (id: string) => {
    try {
      const [details, referralResult] = await Promise.all([
        request<RecordData>(`/api/marketing/admin/marketers/${id}`),
        request<RecordData>(`/api/marketing/admin/marketers/${id}/referrals?limit=50`),
      ]);
      setMarketerDetail({ details, referrals: wrappedRecords(referralResult) });
    } catch (cause) {
      Alert.alert("Could not load marketer", cause instanceof Error ? cause.message : "Please try again.");
    }
  };
  const openUserProfile = async (member: RecordData) => {
    const id = value(member, "id", "");
    setSelectedUserProfile(member);
    setUserProfileSubscription(null);
    setUserProfileSubscriptionError(null);
    setLoadingUserProfileSubscription(true);
    try {
      const profile = await request<RecordData>(`/api/admin/users/${id}/profile`);
      const subscription = profile.subscription;
      setUserProfileSubscription(subscription && typeof subscription === "object" ? subscription as RecordData : null);
    } catch (cause) {
      setUserProfileSubscriptionError(cause instanceof Error ? cause.message : "Could not load subscription details.");
    } finally {
      setLoadingUserProfileSubscription(false);
    }
  };
  const activeData = (data[section] ?? {}) as RecordData;
  const topPadding = isWeb ? 67 : insets.top;

  if (user?.role !== "admin") {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Admin Dashboard</Text>
        </View>
        <EmptyState label="Admin access is required to use this dashboard." colors={colors} />
      </View>
    );
  }

  const renderOverview = () => {
    const stats = (activeData.stats ?? {}) as RecordData;
    const marketing = (activeData.marketing ?? {}) as RecordData;
    const moderation = records(activeData.moderation);
    const registrations = records(stats.monthlyRegistrations);
    const monthlyProperties = records(stats.monthlyProperties);
    const monthlyBookings = records(stats.monthlyBookings);
    const monthlyRevenue = records(stats.monthlyRevenue);
    const now = new Date();
    const trendMonths = Array.from({ length: 12 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
      return month.toLocaleString("en-US", { month: "short", year: "2-digit" });
    });
    return (
      <>
        <View style={styles.metrics}>
          <Metric label="Users" number={numberValue(stats, "totalUsers")} icon="users" colors={colors} />
          <Metric label="Properties" number={numberValue(stats, "totalProperties")} icon="home" colors={colors} />
          <Metric label="Link-Ups" number={numberValue(stats, "totalBookings")} icon="link" colors={colors} />
          <Metric label="Revenue" number={formatKES(stats.totalRevenue)} icon="credit-card" colors={colors} />
          <Metric label="Active plans" number={numberValue(stats, "activeSubscriptions")} icon="award" colors={colors} />
          <Metric label="Referrals" number={numberValue(marketing, "totalReferrals")} icon="trending-up" colors={colors} />
        </View>
        <Card colors={colors}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Needs attention</Text>
          <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
            {moderation.length} pending listing{moderation.length === 1 ? "" : "s"} · {numberValue(stats, "disputed")} flagged listing{numberValue(stats, "disputed") === 1 ? "" : "s"} · {numberValue(stats, "pendingBookings")} pending Link-Ups
          </Text>
          <View style={styles.actions}>
            <ActionButton label="Review listings" onPress={() => chooseSection("properties")} colors={colors} icon="check-square" />
            <ActionButton label="Open finance" onPress={() => chooseSection("finance")} colors={colors} icon="bar-chart-2" />
          </View>
        </Card>
        <Card colors={colors}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Platform analytics</Text>
          <View style={styles.keyValue}>
            <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Confirmed rentals</Text>
            <Text style={[styles.strong, { color: colors.foreground }]}>{numberValue(stats, "confirmedRentals")}</Text>
          </View>
          <View style={styles.keyValue}>
            <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Confirmed sales</Text>
            <Text style={[styles.strong, { color: colors.foreground }]}>{numberValue(stats, "confirmedSales")}</Text>
          </View>
          <View style={styles.keyValue}>
            <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Marketplace value</Text>
            <Text style={[styles.strong, { color: colors.foreground }]}>{formatKES(stats.totalMarketplaceValue)}</Text>
          </View>
        </Card>
        <Card colors={colors}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Monthly trends</Text>
          <Text style={[styles.sectionNote, { color: colors.mutedForeground }]}>Last 12 months · registrations, listings, Link-Ups, and payment revenue</Text>
          {trendMonths.length === 0 ? (
            <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>No monthly trend data yet.</Text>
          ) : trendMonths.map((month) => {
            const registration = registrations.find((item) => value(item, "month", "") === month);
            const listing = monthlyProperties.find((item) => value(item, "month", "") === month);
            const booking = monthlyBookings.find((item) => value(item, "month", "") === month);
            const revenue = monthlyRevenue.find((item) => value(item, "month", "") === month);
            return (
              <View key={month} style={styles.trendRow}>
                <Text style={[styles.strong, { color: colors.foreground }]}>{month}</Text>
                <Text style={[styles.minorText, { color: colors.mutedForeground }]}>
                  {numberValue(registration ?? {}, "count")} users · {numberValue(listing ?? {}, "count")} listings · {numberValue(booking ?? {}, "count")} Link-Ups · {formatKES(revenue?.revenue)}
                </Text>
              </View>
            );
          })}
        </Card>
      </>
    );
  };

  const renderProperties = () => {
    const allProperties = records(activeData.properties);
    const pending = records(activeData.moderation);
    const normalized = query.trim().toLowerCase();
    const filtered = allProperties.filter((item) => {
      const matchesSearch = [value(item, "title", ""), value(item, "address", ""), value(item, "type", ""), value(item, "subtype", ""), value(item, "ownerName", ""), value(item, "ownerBusinessName", "")]
        .some((part) => part.toLowerCase().includes(normalized));
      if (!matchesSearch) return false;
      if (propertyStatusFilter === "all") return true;
      if (propertyStatusFilter === "active") return item.isVerified === true && value(item, "propertyStatus") === "approved";
      return value(item, "propertyStatus", "").toLowerCase() === propertyStatusFilter;
    });
    return (
      <>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search listings or locations" placeholderTextColor={colors.mutedForeground} style={[styles.search, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {["all", "active", "pending", "flagged", "deactivated", "sold"].map((status) => {
            const selected = propertyStatusFilter === status;
            return (
              <Pressable
                key={status}
                onPress={() => setPropertyStatusFilter(status)}
                style={[styles.filterChip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.card }]}
              >
                <Text style={[styles.filterChipText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{statusLabel(status)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {pending.length > 0 ? <Text style={[styles.sectionNote, { color: colors.mutedForeground }]}>{pending.length} listing{pending.length === 1 ? "" : "s"} awaiting review</Text> : null}
        {filtered.length === 0 ? <EmptyState label="No platform properties match this search." colors={colors} /> : filtered.map((property) => {
          const id = value(property, "id", "");
          const verified = property.isVerified === true;
          const propertyStatus = value(property, "propertyStatus", "pending").toLowerCase();
          const isDeactivated = propertyStatus === "deactivated";
          const isSold = propertyStatus === "sold";
          const canMarkSold =
            value(property, "type", "").toLowerCase() === "sale" &&
            ["apartment", "home", "land"].includes(normalizePropertySubtype(value(property, "subtype", "")) ?? "");
          return (
            <Card key={id} colors={colors}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{value(property, "title")}</Text>
              <Text style={[styles.bodyText, { color: colors.mutedForeground }]} numberOfLines={1}>{propertyCategoryLabel(value(property, "type"), value(property, "subtype"))} · {value(property, "address")} · {statusLabel(property.propertyStatus)} · {formatKES(property.price)}</Text>
              <View style={styles.actions}>
                <ActionButton label="View" onPress={() => router.push(`/property/${id}` as never)} colors={colors} icon="eye" />
                {!verified && propertyStatus === "pending" ? <ActionButton label="Activate" onPress={() => mutate(`/api/admin/properties/${id}/verify`, "PATCH", {}, "Listing activated and published.")} colors={colors} tone="primary" icon="check" /> : null}
                {verified && !isSold ? (
                  <ActionButton
                    label={isDeactivated ? "Reactivate" : "Deactivate"}
                    onPress={() => mutate(
                      `/api/properties/${id}/status`,
                      "PATCH",
                      { action: isDeactivated ? "reactivate" : "deactivate" },
                      isDeactivated ? "Listing reactivated." : "Listing deactivated.",
                    )}
                    colors={colors}
                    icon="power"
                  />
                ) : null}
                {verified && canMarkSold && !isSold ? (
                  <ActionButton
                    label="Mark sold"
                    onPress={() => confirm(
                      "Mark listing as sold?",
                      "The listing will stay in management views but disappear from customers and stop accepting Link-Ups.",
                      () => mutate(`/api/properties/${id}/status`, "PATCH", { action: "sold" }, "Listing marked sold."),
                    )}
                    colors={colors}
                    icon="tag"
                  />
                ) : null}
                <ActionButton label="Flag" onPress={() => openForm({
                  title: "Flag listing",
                  submitLabel: "Return to owner",
                  fields: [{ key: "comment", label: "Reason for the owner", placeholder: "Explain what needs correction", multiline: true }],
                  onSubmit: async (values) => mutate(`/api/admin/properties/${id}/flag`, "PATCH", { comment: values.comment }, "Listing flagged with feedback."),
                })} colors={colors} icon="flag" />
                <ActionButton label="Delete" onPress={() => confirm("Delete listing?", "This permanently removes the listing and its Link-Ups.", () => mutate(`/api/admin/properties/${id}`, "DELETE", undefined, "Listing deleted."))} colors={colors} tone="danger" icon="trash-2" />
              </View>
            </Card>
          );
        })}
      </>
    );
  };

  const renderUsers = () => {
    const list = records(activeData.users);
    const normalized = query.trim().toLowerCase();
    const filtered = list.filter((item) => [value(item, "name", ""), value(item, "email", ""), value(item, "role", "")]
      .some((part) => part.toLowerCase().includes(normalized)));
    return (
      <>
        <View style={styles.toolbar}>
          <TextInput value={query} onChangeText={setQuery} placeholder="Search users" placeholderTextColor={colors.mutedForeground} style={[styles.search, styles.toolbarInput, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />
          <ActionButton label="Add" onPress={() => openForm({
            title: "Create user",
            submitLabel: "Create user",
            fields: [
              { key: "name", label: "Full name", placeholder: "Name" },
              { key: "email", label: "Email", placeholder: "name@example.com" },
              { key: "password", label: "Temporary password", placeholder: "At least 6 characters", secure: true },
              { key: "role", label: "Role", options: ["owner", "host", "tenant", "admin"] },
            ],
            initial: { role: "tenant" },
            onSubmit: async (values) => mutate("/api/admin/users", "POST", values, "User account created."),
          })} colors={colors} tone="primary" icon="user-plus" />
        </View>
        {filtered.length === 0 ? <EmptyState label="No users match this search." colors={colors} /> : filtered.map((member) => {
          const id = value(member, "id", "");
          const active = value(member, "status") === "active";
          const documentUrl = value(member, "idFront", "") !== "" ? value(member, "idFront", "") : value(member, "idDocument", "");
          return (
            <Card key={id} colors={colors}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{value(member, "name")}</Text>
              <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{value(member, "email")} · {statusLabel(member.role)} · {statusLabel(member.status)}</Text>
              {member.isRegisteredFirm === true ? <Text style={[styles.minorText, { color: colors.mutedForeground }]}>Registered firm · {value(member, "businessName")}</Text> : null}
              <Text style={[styles.minorText, { color: colors.mutedForeground }]} numberOfLines={1}>User ID: {id}</Text>
              <View style={styles.actions}>
                <ActionButton label="View profile" onPress={() => openUserProfile(member)} colors={colors} icon="user" testID={`admin-view-user-profile-${id}`} />
                <ActionButton label="Copy ID" onPress={() => Clipboard.setStringAsync(id).then(() => Alert.alert("Copied", "User ID copied to the clipboard."))} colors={colors} icon="copy" />
                <ActionButton label="Plan" onPress={() => openForm({
                  title: `Manage plan for ${value(member, "name")}`,
                  submitLabel: "Update plan",
                  fields: [
                    { key: "plan", label: "Plan", options: ["free", "basic", "pro", "enterprise"] },
                    { key: "billingMonths", label: "Paid plan months", placeholder: "1" },
                    { key: "amount", label: "Offline amount received (KES)", placeholder: "Required for paid plans" },
                    { key: "reference", label: "Receipt / transaction reference", placeholder: "Required for paid plans" },
                    { key: "paymentMethod", label: "Payment method", options: ["mobile_money", "bank_transfer", "cash", "card", "other"] },
                    { key: "featuredLimitOverride", label: "Enterprise featured limit (optional)", placeholder: "0" },
                    { key: "note", label: "Admin note (optional)", multiline: true },
                  ],
                  initial: { plan: "free", billingMonths: "1", paymentMethod: "mobile_money" },
                  onSubmit: async (values) => {
                    if (values.plan === "free") {
                      return mutate("/api/admin/subscriptions/assign", "POST", { userId: id, plan: "free" }, "Subscriber moved to Free.");
                    }
                    return mutate("/api/admin/subscriptions/offline-payment", "POST", {
                      userId: id,
                      plan: values.plan,
                      billingMonths: Number(values.billingMonths),
                      amount: Number(values.amount),
                      reference: values.reference,
                      paymentMethod: values.paymentMethod,
                      featuredLimitOverride: values.featuredLimitOverride ? Number(values.featuredLimitOverride) : null,
                      note: values.note,
                    }, "Offline payment recorded and subscription activated.");
                  },
                })} colors={colors} icon="award" />
                {documentUrl ? <ActionButton label="ID document" onPress={() => Linking.openURL(getImageUrl(documentUrl)).catch(() => Alert.alert("Unavailable", "This verification file could not be opened."))} colors={colors} icon="file-text" /> : null}
                <ActionButton label={active ? "Suspend" : "Activate"} onPress={() => mutate(`/api/admin/users/${id}/status`, "PATCH", { status: active ? "suspended" : "active" }, `User ${active ? "suspended" : "activated"}.`)} colors={colors} icon={active ? "user-x" : "user-check"} />
                {member.role !== "admin" ? <ActionButton label="Reset password" onPress={() => openForm({
                  title: `Reset password for ${value(member, "name")}`,
                  submitLabel: "Set password",
                  fields: [{ key: "password", label: "New password", placeholder: "At least 6 characters", secure: true }],
                  onSubmit: async (values) => mutate(`/api/admin/users/${id}/password`, "PATCH", values, "Password reset."),
                })} colors={colors} icon="key" /> : null}
                {member.role !== "admin" ? <ActionButton label="Delete" onPress={() => confirm("Delete user?", "This permanently deletes the user and their related platform data.", () => mutate(`/api/admin/users/${id}`, "DELETE", undefined, "User deleted."))} colors={colors} tone="danger" icon="trash-2" /> : null}
              </View>
            </Card>
          );
        })}
      </>
    );
  };

  const renderSubscriptions = () => {
    const subscriptions = records(activeData.subscriptions);
    const plans = records(activeData.plans);
    return (
      <>
        <View style={styles.toolbar}>
          <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Subscriptions</Text>
          <ActionButton label="Record offline payment" onPress={() => openForm({
            title: "Record offline payment",
            submitLabel: "Record & activate",
            fields: [
              { key: "userId", label: "User ID", placeholder: "Paste the user ID" },
              { key: "plan", label: "Paid plan", options: ["basic", "pro", "enterprise"] },
              { key: "billingMonths", label: "Billing months", placeholder: "1" },
              { key: "amount", label: "Amount received (KES)", placeholder: "599" },
              { key: "reference", label: "Receipt / transaction reference", placeholder: "M-Pesa, bank, cash, or card reference" },
              { key: "paymentMethod", label: "Payment method", options: ["mobile_money", "bank_transfer", "cash", "card", "other"] },
              { key: "featuredLimitOverride", label: "Enterprise featured limit (optional)", placeholder: "0" },
              { key: "note", label: "Admin note (optional)", placeholder: "How payment was confirmed", multiline: true },
            ],
            initial: { plan: "basic", billingMonths: "1", paymentMethod: "mobile_money" },
            onSubmit: async (values) => mutate("/api/admin/subscriptions/offline-payment", "POST", {
              userId: values.userId,
              plan: values.plan,
              billingMonths: Number(values.billingMonths),
              amount: Number(values.amount),
              reference: values.reference,
              paymentMethod: values.paymentMethod,
              featuredLimitOverride: values.featuredLimitOverride ? Number(values.featuredLimitOverride) : null,
              note: values.note,
            }, "Offline payment recorded and subscription activated."),
          })} colors={colors} tone="primary" icon="plus" />
        </View>
        {subscriptions.map((subscription) => {
          const id = value(subscription, "id", "");
          return (
            <Card key={id} colors={colors}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{value(subscription, "userName")}</Text>
              <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{value(subscription, "userEmail")} · {statusLabel(subscription.plan)} · {statusLabel(subscription.status)}</Text>
              <Text style={[styles.minorText, { color: colors.mutedForeground }]}>Ends {shortDate(subscription.endDate)} · {formatKES(subscription.amountPaid)}</Text>
              <View style={styles.actions}>
                <ActionButton label="Offline upgrade" onPress={() => openForm({
                  title: `Offline upgrade for ${value(subscription, "userName")}`,
                  submitLabel: "Record & activate",
                  fields: [
                    { key: "plan", label: "Paid plan", options: ["basic", "pro", "enterprise"] },
                    { key: "billingMonths", label: "Billing months", placeholder: "1" },
                    { key: "amount", label: "Amount received (KES)", placeholder: "599" },
                    { key: "reference", label: "Receipt / transaction reference" },
                    { key: "paymentMethod", label: "Payment method", options: ["mobile_money", "bank_transfer", "cash", "card", "other"] },
                    { key: "featuredLimitOverride", label: "Enterprise featured limit (optional)", placeholder: "0" },
                    { key: "note", label: "Admin note (optional)", multiline: true },
                  ],
                  initial: { plan: value(subscription, "plan", "basic"), billingMonths: "1", paymentMethod: "mobile_money" },
                  onSubmit: async (values) => mutate("/api/admin/subscriptions/offline-payment", "POST", {
                    userId: value(subscription, "userId"),
                    plan: values.plan,
                    billingMonths: Number(values.billingMonths),
                    amount: Number(values.amount),
                    reference: values.reference,
                    paymentMethod: values.paymentMethod,
                    featuredLimitOverride: values.featuredLimitOverride ? Number(values.featuredLimitOverride) : null,
                    note: values.note,
                  }, "Offline payment recorded and subscription activated."),
                })} colors={colors} icon="credit-card" />
                <ActionButton label="Move to Free" onPress={() => confirm("Move subscriber to Free?", "The active subscription will be replaced with the Free plan.", () => mutate("/api/admin/subscriptions/assign", "POST", { userId: value(subscription, "userId"), plan: "free" }, "Subscriber moved to Free."))} colors={colors} icon="arrow-down-circle" />
                <ActionButton label="Cancel" onPress={() => confirm("Cancel subscription?", "The subscription will be marked cancelled.", () => mutate(`/api/admin/subscriptions/${id}`, "DELETE", undefined, "Subscription cancelled."))} colors={colors} tone="danger" icon="x-circle" />
              </View>
            </Card>
          );
        })}
        <View style={styles.toolbar}>
          <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Subscription packages</Text>
          <ActionButton label="New package" onPress={() => openForm({
            title: "Create package",
            submitLabel: "Create package",
            fields: [
              { key: "name", label: "Internal name", placeholder: "starter-plan" },
              { key: "displayName", label: "Display name", placeholder: "Starter" },
              { key: "pricePerMonth", label: "Monthly price (KES)", placeholder: "0" },
              { key: "listingLimit", label: "Listing limit", placeholder: "3" },
              { key: "features", label: "Features", placeholder: "One feature per line", multiline: true },
            ],
            onSubmit: async (values) => mutate("/api/admin/plans", "POST", { ...values, pricePerMonth: Number(values.pricePerMonth), listingLimit: Number(values.listingLimit), features: values.features.split("\n").map((feature) => feature.trim()).filter(Boolean) }, "Subscription package created."),
          })} colors={colors} tone="primary" icon="plus" />
        </View>
        {plans.map((plan) => {
          const name = value(plan, "name", "");
          return (
            <Card key={name} colors={colors}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{value(plan, "displayName", name)}</Text>
              <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{formatKES(plan.pricePerMonth)} / month · {value(plan, "listingLimit")} listings · {plan.isActive === false ? "inactive" : "active"}</Text>
              <View style={styles.actions}>
                <ActionButton label="Edit" onPress={() => openForm({
                  title: "Edit package",
                  submitLabel: "Save package",
                  fields: [
                    { key: "displayName", label: "Display name" },
                    { key: "pricePerMonth", label: "Monthly price (KES)" },
                    { key: "listingLimit", label: "Listing limit" },
                  ],
                  initial: { displayName: value(plan, "displayName", name), pricePerMonth: value(plan, "pricePerMonth", "0"), listingLimit: value(plan, "listingLimit", "3") },
                  onSubmit: async (values) => mutate(`/api/admin/plans/${name}`, "PUT", { ...values, pricePerMonth: Number(values.pricePerMonth), listingLimit: Number(values.listingLimit) }, "Package updated."),
                })} colors={colors} icon="edit-3" />
                <ActionButton label="Delete" onPress={() => confirm("Delete package?", "Existing assignments are not automatically migrated.", () => mutate(`/api/admin/plans/${name}`, "DELETE", undefined, "Package deleted."))} colors={colors} tone="danger" icon="trash-2" />
              </View>
            </Card>
          );
        })}
      </>
    );
  };

  const renderFinance = () => {
    const payments = records(activeData.payments);
    const transactions = records(activeData.transactions);
    const analytics = (activeData.transactionAnalytics ?? {}) as RecordData;
    return (
      <>
        <View style={styles.metrics}>
          <Metric label="Transactions" number={numberValue(analytics, "total")} icon="repeat" colors={colors} />
          <Metric label="Disputed" number={numberValue(analytics, "disputed")} icon="alert-triangle" colors={colors} />
          <Metric label="Success rate" number={`${numberValue(analytics, "linkUpSuccessRate")}%`} icon="check-circle" colors={colors} />
          <Metric label="Confirmed value" number={formatKES(analytics.totalValue)} icon="dollar-sign" colors={colors} />
        </View>
        <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Transaction confirmations</Text>
        {transactions.map((transaction) => {
          const id = value(transaction, "id", "");
          const resolveable = ["disputed", "pending_confirmation", "confirmed_by_owner_only", "confirmed_by_tenant_only"].includes(value(transaction, "status", ""));
          return (
            <Card key={id} colors={colors}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{value(transaction, "propertyTitle")}</Text>
              <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{value(transaction, "ownerName")} ↔ {value(transaction, "tenantName")} · {statusLabel(transaction.status)}</Text>
              <Text style={[styles.minorText, { color: colors.mutedForeground }]}>{formatKES(transaction.transactionValue)} · {shortDate(transaction.createdAt)}</Text>
              {resolveable ? <View style={styles.actions}><ActionButton label="Resolve" onPress={() => openForm({
                title: "Resolve transaction",
                submitLabel: "Resolve",
                fields: [
                  { key: "status", label: "Outcome", options: ["fully_confirmed", "rented_via_inndos", "sold_via_inndos", "confirmed_outside_inndos", "not_completed", "cancelled"] },
                  { key: "adminNotes", label: "Admin note", placeholder: "Optional explanation", multiline: true },
                ],
                initial: { status: "fully_confirmed" },
                onSubmit: async (values) => mutate(`/api/transactions/admin/${id}/resolve`, "POST", values, "Transaction resolved and both parties notified."),
              })} colors={colors} tone="primary" icon="check" /></View> : null}
            </Card>
          );
        })}
        <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Payment history</Text>
        {payments.length === 0 ? <EmptyState label="No payments have been recorded yet." colors={colors} /> : payments.map((payment) => (
          <Card key={value(payment, "id", "")} colors={colors}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>{value(payment, "userName")} · {formatKES(payment.amount)}</Text>
            <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{statusLabel(payment.plan)} · {statusLabel(payment.status)} · {value(payment, "paymentMethod")}</Text>
            <Text style={[styles.minorText, { color: colors.mutedForeground }]}>{shortDate(payment.createdAt)} · {value(payment, "merchantReference")}</Text>
          </Card>
        ))}
      </>
    );
  };

  const renderNotifications = () => {
    const templates = records(activeData.templates);
    return (
      <>
        <Text style={[styles.sectionNote, { color: colors.mutedForeground }]}>Manage the notification content delivered by the platform. Personal inbox messages remain available from My Account.</Text>
        {templates.length === 0 ? <EmptyState label="No notification templates are configured." colors={colors} /> : templates.map((template) => {
          const key = value(template, "key", "");
          return (
            <Card key={key} colors={colors}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{value(template, "label", key)}</Text>
              <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{value(template, "subject")}</Text>
              <Text style={[styles.minorText, { color: colors.mutedForeground }]} numberOfLines={3}>{value(template, "body")}</Text>
              <Text style={[styles.minorText, { color: colors.mutedForeground }]}>CTA: {value(template, "ctaLabel", value(template, "cta_label", "None"))}</Text>
              <View style={styles.actions}>
                <ActionButton label="Edit content" onPress={() => openForm({
                  title: `Edit ${value(template, "label", "template")}`,
                  submitLabel: "Save template",
                  fields: [
                    { key: "subject", label: "Subject", multiline: true },
                    { key: "body", label: "Message", multiline: true },
                    { key: "ctaLabel", label: "Call to action label" },
                  ],
                  initial: { subject: value(template, "subject", ""), body: value(template, "body", ""), ctaLabel: value(template, "ctaLabel", value(template, "cta_label", "")) },
                  onSubmit: async (values) => mutate(`/api/admin/notification-templates/${key}`, "PUT", values, "Notification template updated."),
                })} colors={colors} icon="edit-3" />
                <ActionButton label="Reset" onPress={() => confirm("Reset template?", "This restores the default wording.", () => mutate(`/api/admin/notification-templates/${key}/reset`, "POST", undefined, "Template reset to default."))} colors={colors} icon="rotate-ccw" />
              </View>
            </Card>
          );
        })}
      </>
    );
  };

  const renderReviews = () => {
    const result = (activeData.reviews ?? {}) as RecordData;
    const list = records(result.reviews);
    return list.length === 0 ? <EmptyState label="No platform reviews yet." colors={colors} /> : (
      <>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search reviews" placeholderTextColor={colors.mutedForeground} style={[styles.search, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />
        {list.filter((review) => `${value(review, "propertyTitle", "")} ${value(review, "reviewerName", "")} ${value(review, "comment", "")}`.toLowerCase().includes(query.toLowerCase())).map((review) => {
          const id = value(review, "id", "");
          return (
            <Card key={id} colors={colors}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{"★".repeat(Math.max(0, Math.min(5, numberValue(review, "rating"))))} · {value(review, "propertyTitle")}</Text>
              <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{value(review, "reviewerName")} · {shortDate(review.createdAt)}</Text>
              <Text style={[styles.minorText, { color: colors.foreground }]}>{value(review, "comment")}</Text>
              <View style={styles.actions}>
                <ActionButton label="Reply" onPress={() => openForm({
                  title: "Reply to review",
                  submitLabel: "Post reply",
                  fields: [{ key: "reply", label: "Reply", placeholder: "Write an official response", multiline: true }],
                  onSubmit: async (values) => mutate(`/api/reviews/${id}/reply`, "POST", values, "Review reply posted."),
                })} colors={colors} icon="message-square" />
                <ActionButton label="Delete" onPress={() => confirm("Delete review?", "This permanently removes the review.", () => mutate(`/api/reviews/${id}`, "DELETE", undefined, "Review deleted."))} colors={colors} tone="danger" icon="trash-2" />
              </View>
            </Card>
          );
        })}
      </>
    );
  };

  const renderMarketing = () => {
    return <AdminMarketingPanel token={token ?? ""} onChanged={() => { void loadSection("marketing"); }} />;
  };

  const renderSettings = () => {
    const payment = (activeData.paymentSettings ?? {}) as RecordData;
    const sms = (activeData.smsSettings ?? {}) as RecordData;
    return (
      <>
        <Card colors={colors}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>PesaPal payment settings</Text>
          <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Mode: {value(payment, "pesapalMode")} · IPN: {value(payment, "pesapalIpnId", "not registered")}</Text>
          <View style={styles.actions}>
            <ActionButton label="Edit payment settings" onPress={() => openForm({
              title: "PesaPal settings",
              submitLabel: "Save payment settings",
              fields: [
                { key: "pesapalConsumerKey", label: "Consumer key" },
                { key: "pesapalConsumerSecret", label: "Consumer secret", secure: true },
                { key: "pesapalMode", label: "Mode", options: ["sandbox", "live"] },
                 { key: "pesapalIpnId", label: "Existing IPN ID (optional)" },
              ],
               initial: { pesapalConsumerKey: value(payment, "pesapalConsumerKey", ""), pesapalConsumerSecret: "", pesapalMode: value(payment, "pesapalMode", "sandbox"), pesapalIpnId: value(payment, "pesapalIpnId", "") },
               onSubmit: async (values) => mutate("/api/admin/settings", "PUT", values, "Payment settings saved."),
            })} colors={colors} icon="edit-3" />
            <ActionButton label="Register IPN" onPress={() => openForm({
              title: "Register PesaPal IPN",
              submitLabel: "Register IPN",
              fields: [{ key: "ipnUrl", label: "IPN callback URL", placeholder: "https://your-domain/api/subscriptions/ipn" }],
              onSubmit: async (values) => mutate("/api/admin/settings/register-ipn", "POST", values, "IPN registration requested."),
            })} colors={colors} icon="link" />
          </View>
        </Card>
        <Card colors={colors}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>SMS provider</Text>
          <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Provider: {value(sms, "provider")} · Sender: {value(sms, "senderId", "not set")} · {sms.configured === true ? "configured" : "not configured"}</Text>
          <View style={styles.actions}>
            <ActionButton label="Edit SMS settings" onPress={() => openForm({
              title: "SMS settings",
              submitLabel: "Save SMS settings",
              fields: [
                { key: "provider", label: "Provider", options: ["airtouch", "africastalking"] },
                { key: "senderId", label: "Sender ID" },
                { key: "username", label: "Username" },
                { key: "password", label: "Password", secure: true },
                { key: "apiKey", label: "API key", secure: true },
              ],
              initial: { provider: value(sms, "provider", "airtouch"), senderId: value(sms, "senderId", ""), username: value(sms, "username", ""), password: "", apiKey: "" },
              onSubmit: async (values) => mutate("/api/admin/sms-settings", "PUT", values, "SMS settings saved."),
            })} colors={colors} icon="edit-3" />
            <ActionButton label="Send test" onPress={() => openForm({
              title: "Send SMS test",
              submitLabel: "Send test",
              fields: [{ key: "phone", label: "Phone number", placeholder: "07XXXXXXXX or +254..." }],
              onSubmit: async (values) => mutate("/api/admin/sms-test", "POST", values, "Test SMS request sent."),
            })} colors={colors} icon="send" />
          </View>
        </Card>
      </>
    );
  };

  const content = useMemo(() => {
    switch (section) {
      case "properties": return renderProperties();
      case "users": return renderUsers();
      case "subscriptions": return renderSubscriptions();
      case "finance": return renderFinance();
      case "notifications": return renderNotifications();
      case "reviews": return renderReviews();
      case "marketing": return renderMarketing();
      case "settings": return renderSettings();
      default: return renderOverview();
    }
  // The rendered sections intentionally read the current network result and action closures.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeData, colors, propertyStatusFilter, query, section]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 14 }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Admin Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Manage INNDOS from your phone</Text>
        </View>
        <Pressable onPress={refresh} style={[styles.refresh, { borderColor: colors.border }]} accessibilityLabel="Refresh admin data">
          <Feather name="refresh-cw" size={17} color={colors.foreground} />
        </Pressable>
      </View>
      <View style={styles.sectionTabs}>
        {SECTIONS.map((item) => {
          const active = section === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => chooseSection(item.key)}
              style={[styles.sectionTab, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.card }]}
            >
              <Feather name={item.icon} size={14} color={active ? colors.primaryForeground : colors.foreground} />
              <Text numberOfLines={1} style={[styles.sectionTabText, { color: active ? colors.primaryForeground : colors.foreground }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.loading}>
          <Feather name="alert-circle" size={32} color={colors.destructive} />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>Could not load {SECTIONS.find((item) => item.key === section)?.label.toLowerCase()}</Text>
          <Text style={[styles.bodyText, { color: colors.mutedForeground, textAlign: "center" }]}>{error}</Text>
          <ActionButton label="Retry" onPress={() => loadSection(section)} colors={colors} icon="refresh-cw" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: isWeb ? 118 : insets.bottom + 104 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      )}
      <AdminFormSheet form={form} onClose={() => setForm(null)} colors={colors} />
      <Modal
        visible={!!selectedUserProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedUserProfile(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>User profile</Text>
                <Text style={[styles.minorText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {value(selectedUserProfile ?? {}, "name")}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedUserProfile(null)} hitSlop={8} accessibilityLabel="Close user profile">
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.formContent}>
              <View style={[styles.profileSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{value(selectedUserProfile ?? {}, "name")}</Text>
                <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>{value(selectedUserProfile ?? {}, "email")}</Text>
                <Text style={[styles.minorText, { color: colors.mutedForeground }]}>
                  {statusLabel(value(selectedUserProfile ?? {}, "role"))} · {statusLabel(value(selectedUserProfile ?? {}, "status"))}
                </Text>
              </View>
              <View style={[styles.profileSection, { borderTopColor: colors.border }]}>
                <View style={styles.profileSectionTitle}>
                  <Feather name="credit-card" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Subscription</Text>
                </View>
                {loadingUserProfileSubscription ? (
                  <View style={styles.profileLoading}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Loading plan…</Text>
                  </View>
                ) : userProfileSubscriptionError ? (
                  <View style={[styles.profileNotice, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Subscription information unavailable right now.</Text>
                    <View style={styles.actions}>
                      <ActionButton label="Retry" onPress={() => selectedUserProfile && openUserProfile(selectedUserProfile)} colors={colors} icon="refresh-cw" />
                      <ActionButton label="Close" onPress={() => setSelectedUserProfile(null)} colors={colors} />
                    </View>
                  </View>
                ) : (
                  <View style={[styles.profileSubscription, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.keyValue}>
                      <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Current plan</Text>
                      <Text style={[styles.strong, { color: colors.foreground }]}>{statusLabel(value(userProfileSubscription ?? {}, "plan", "free"))} plan</Text>
                    </View>
                    <View style={styles.keyValue}>
                      <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Status</Text>
                      <Text style={[styles.strong, { color: colors.foreground }]}>{statusLabel(value(userProfileSubscription ?? {}, "status", "active"))}</Text>
                    </View>
                    <View style={styles.keyValue}>
                      <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Billing period</Text>
                      <Text style={[styles.strong, { color: colors.foreground }]}>
                        {userProfileSubscription?.billingCycle
                          ? `${statusLabel(userProfileSubscription.billingCycle)}${userProfileSubscription.billingMonths ? ` · ${value(userProfileSubscription, "billingMonths")} month${Number(userProfileSubscription.billingMonths) === 1 ? "" : "s"}` : ""}`
                          : "Not applicable"}
                      </Text>
                    </View>
                    <View style={styles.keyValue}>
                      <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Started</Text>
                      <Text style={[styles.strong, { color: colors.foreground }]}>{shortDate(userProfileSubscription?.startDate)}</Text>
                    </View>
                    <View style={styles.keyValue}>
                      <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>Ends</Text>
                      <Text style={[styles.strong, { color: colors.foreground }]}>{shortDate(userProfileSubscription?.endDate)}</Text>
                    </View>
                  </View>
                )}
              </View>
              <ActionButton label="Done" onPress={() => setSelectedUserProfile(null)} colors={colors} tone="primary" icon="check" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontFamily: "Outfit_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Outfit_400Regular", marginTop: 2 },
  refresh: { width: 38, height: 38, borderWidth: 1, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  sectionTabs: { paddingHorizontal: 20, paddingBottom: 12, gap: 8, flexDirection: "row", flexWrap: "wrap" },
  sectionTab: { flexGrow: 1, flexBasis: "30%", minWidth: 96, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 18, paddingHorizontal: 8, paddingVertical: 9 },
  sectionTabText: { fontFamily: "Outfit_600SemiBold", fontSize: 12 },
  content: { paddingHorizontal: 20, gap: 12 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 7 },
  cardTitle: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  rowTitle: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  bodyText: { fontSize: 13, fontFamily: "Outfit_400Regular", lineHeight: 19 },
  minorText: { fontSize: 12, fontFamily: "Outfit_400Regular", lineHeight: 18 },
  strong: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  keyValue: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingTop: 4 },
  trendRow: { gap: 3, borderTopWidth: 1, borderTopColor: "rgba(127,127,127,0.18)", paddingTop: 8, marginTop: 3 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { width: "31.5%", minHeight: 108, borderRadius: 12, borderWidth: 1, padding: 11, justifyContent: "space-between", gap: 5 },
  metricNumber: { fontFamily: "Outfit_700Bold", fontSize: 16 },
  metricLabel: { fontFamily: "Outfit_400Regular", fontSize: 11, lineHeight: 14 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 3 },
  actionButton: { borderWidth: 1, minHeight: 34, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, flexDirection: "row", gap: 5, alignItems: "center", justifyContent: "center" },
  actionButtonText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
  empty: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 60, paddingHorizontal: 28 },
  emptyText: { fontFamily: "Outfit_400Regular", fontSize: 14, textAlign: "center" },
  errorTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, textAlign: "center" },
  search: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontFamily: "Outfit_400Regular", fontSize: 14 },
  filterRow: { gap: 7, paddingVertical: 2 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  filterChipText: { fontFamily: "Outfit_600SemiBold", fontSize: 11, textTransform: "capitalize" },
  toolbar: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "space-between" },
  toolbarInput: { flex: 1 },
  sectionHeading: { fontSize: 16, fontFamily: "Outfit_700Bold", flexShrink: 1 },
  sectionNote: { fontSize: 12, fontFamily: "Outfit_400Regular", lineHeight: 18 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.48)" },
  modalSheet: { maxHeight: "88%", borderWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  modalHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10 },
  modalHeader: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, flex: 1, paddingRight: 12 },
  formContent: { paddingHorizontal: 20, paddingBottom: 28, gap: 14 },
  profileSummary: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 4 },
  profileSection: { borderTopWidth: 1, paddingTop: 14, gap: 10 },
  profileSectionTitle: { flexDirection: "row", alignItems: "center", gap: 7 },
  profileLoading: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 14 },
  profileNotice: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 10 },
  profileSubscription: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 9 },
  field: { gap: 6 },
  fieldLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 10, fontFamily: "Outfit_400Regular", fontSize: 15, paddingHorizontal: 12, paddingVertical: 11, minHeight: 44 },
  textarea: { minHeight: 104, textAlignVertical: "top" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  option: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  optionText: { fontFamily: "Outfit_600SemiBold", fontSize: 12 },
});