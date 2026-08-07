/**
 * Transactions Tab
 * Shows pending transaction confirmation prompts, full history,
 * and transaction_confirmation_prompt notifications for owners and tenants.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

// ─── Types ────────────────────────────────────────────────────────────────────

type TxStatus =
  | "pending_confirmation"
  | "confirmed_by_owner_only"
  | "confirmed_by_tenant_only"
  | "fully_confirmed"
  | "disputed"
  | "cancelled"
  | "not_completed"
  | "confirmed_outside_inndos"
  | "sold_via_inndos"
  | "rented_via_inndos";

type ConfirmationChoice = "confirmed" | "not_completed" | "outside_inndos";

interface Transaction {
  id: string;
  bookingId: string | null;
  propertyId: string;
  ownerId: string;
  tenantId: string;
  transactionType: "rental" | "sale";
  propertyTitle: string;
  propertyAddress: string | null;
  transactionValue: number | null;
  ownerConfirmation: string;
  tenantConfirmation: string;
  status: TxStatus;
  ownerConfirmedAt: string | null;
  tenantConfirmedAt: string | null;
  adminNotes: string | null;
  adminResolvedBy: string | null;
  createdAt: string;
}

interface MobileNotification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<TxStatus, string> = {
  pending_confirmation: "Pending",
  confirmed_by_owner_only: "Owner Confirmed",
  confirmed_by_tenant_only: "Tenant Confirmed",
  fully_confirmed: "Fully Confirmed",
  disputed: "Disputed",
  cancelled: "Cancelled",
  not_completed: "Not Completed",
  confirmed_outside_inndos: "Outside inndos",
  sold_via_inndos: "Sold via inndos ✓",
  rented_via_inndos: "Rented via inndos ✓",
};

const PENDING_STATUSES: TxStatus[] = [
  "pending_confirmation",
  "confirmed_by_owner_only",
  "confirmed_by_tenant_only",
  "disputed",
];

function isPendingForUser(tx: Transaction, userId: string): boolean {
  if (tx.ownerId === userId && tx.ownerConfirmation === "pending") return true;
  if (tx.tenantId === userId && tx.tenantConfirmation === "pending") return true;
  return false;
}

function getStatusColor(
  status: TxStatus,
  colors: ReturnType<typeof useColors>
): { bg: string; text: string; border: string } {
  switch (status) {
    case "sold_via_inndos":
    case "rented_via_inndos":
    case "fully_confirmed":
      return { bg: "#dcfce7", text: "#166534", border: "#86efac" };
    case "pending_confirmation":
      return { bg: "#fef9c3", text: "#854d0e", border: "#fde047" };
    case "confirmed_by_owner_only":
    case "confirmed_by_tenant_only":
      return { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" };
    case "disputed":
      return { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" };
    case "confirmed_outside_inndos":
      return { bg: "#ffedd5", text: "#9a3412", border: "#fdba74" };
    default:
      return { bg: colors.muted, text: colors.mutedForeground, border: colors.border };
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

function getApiBase(): string {
  return process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "";
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────

interface ConfirmModalProps {
  tx: Transaction | null;
  submitting: boolean;
  onChoice: (choice: ConfirmationChoice) => void;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}

function ConfirmModal({ tx, submitting, onChoice, onClose, colors }: ConfirmModalProps) {
  if (!tx) return null;
  const isSale = tx.transactionType === "sale";
  const styles = getModalStyles(colors);

  return (
    <Modal
      visible={!!tx}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text style={[styles.title, { color: colors.foreground }]}>Confirm Transaction</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {isSale ? "Was this property sold via inndos?" : "Was this rental completed via inndos?"}
          </Text>
          <Text style={[styles.propertyName, { color: colors.foreground }]} numberOfLines={2}>
            {tx.propertyTitle}
          </Text>

          <View style={styles.options}>
            {/* Completed via inndos */}
            <Pressable
              style={[styles.optionBtn, { backgroundColor: "#16a34a", opacity: submitting ? 0.6 : 1 }]}
              disabled={submitting}
              onPress={() => onChoice("confirmed")}
            >
              <Feather name="check-circle" size={20} color="#fff" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>
                  {isSale ? "Successfully Sold via inndos" : "Successfully Rented via inndos"}
                </Text>
                <Text style={styles.optionDesc}>The transaction was completed through inndos</Text>
              </View>
            </Pressable>

            {/* Completed outside inndos */}
            <Pressable
              style={[styles.optionBtn, { backgroundColor: colors.muted, borderWidth: 1, borderColor: "#f97316", opacity: submitting ? 0.6 : 1 }]}
              disabled={submitting}
              onPress={() => onChoice("outside_inndos")}
            >
              <Feather name="external-link" size={20} color="#f97316" />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: "#c2410c" }]}>
                  {isSale ? "Not Sold via inndos" : "Not Rented via inndos"}
                </Text>
                <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                  Completed outside of the inndos platform
                </Text>
              </View>
            </Pressable>

            {/* Did not complete */}
            <Pressable
              style={[styles.optionBtn, { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border, opacity: submitting ? 0.6 : 1 }]}
              disabled={submitting}
              onPress={() => onChoice("not_completed")}
            >
              {submitting ? (
                <ActivityIndicator size={20} color={colors.mutedForeground} />
              ) : (
                <Feather name="x-circle" size={20} color={colors.mutedForeground} />
              )}
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.foreground }]}>Transaction Did Not Complete</Text>
                <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                  The deal fell through or is still ongoing
                </Text>
              </View>
            </Pressable>
          </View>

          <Pressable style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose} disabled={submitting}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const isWeb = Platform.OS === "web";

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmTx, setConfirmTx] = useState<Transaction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const topPadding = isWeb ? 67 : insets.top;
  const styles = getStyles(colors);

  const fetchData = useCallback(async () => {
    if (!user || !token) return;
    const base = getApiBase();
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [txRes, notifRes] = await Promise.all([
        fetch(`${base}/api/transactions`, { headers }),
        fetch(`${base}/api/notifications`, { headers }),
      ]);
      if (txRes.ok) setTransactions(await txRes.json());
      if (notifRes.ok) {
        const all: MobileNotification[] = await notifRes.json();
        setNotifications(all.filter(n => n.type === "transaction_confirmation_prompt" || n.type === "transaction_confirmed"));
      }
    } catch {
      // non-fatal
    }
  }, [user, token]);

  useEffect(() => {
    setIsLoading(true);
    fetchData().finally(() => setIsLoading(false));
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleConfirm = async (choice: ConfirmationChoice) => {
    if (!confirmTx || !token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/transactions/${confirmTx.id}/confirm`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmation: choice }),
      });
      if (!res.ok) throw new Error("Failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const label =
        choice === "confirmed"
          ? "Confirmed via inndos"
          : choice === "outside_inndos"
          ? "Recorded as outside inndos"
          : "Recorded as not completed";
      Alert.alert("Submitted", label);
      setConfirmTx(null);
      await fetchData();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to submit confirmation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const markNotifRead = async (id: string) => {
    if (!token) return;
    const base = getApiBase();
    fetch(`${base}/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Transactions</Text>
        </View>
        <View style={styles.center}>
          <Feather name="lock" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in required</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Sign in to view your transaction confirmations
          </Text>
        </View>
      </View>
    );
  }

  const pendingTxs = transactions.filter(tx => isPendingForUser(tx, user.id));
  const historyTxs = transactions.filter(tx => !isPendingForUser(tx, user.id));
  const unreadNotifCount = notifications.filter(n => !n.isRead).length;
  const promptNotifs = notifications.filter(n => n.type === "transaction_confirmation_prompt");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Transactions</Text>
        <Pressable
          onPress={() => setShowNotifications(v => !v)}
          style={[styles.bellBtn, showNotifications && { backgroundColor: colors.primary, borderRadius: 8 }]}
        >
          <Feather
            name="bell"
            size={22}
            color={showNotifications ? colors.primaryForeground : colors.foreground}
          />
          {unreadNotifCount > 0 && (
            <View style={[styles.badge, { backgroundColor: "#ef4444" }]}>
              <Text style={styles.badgeText}>
                {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* ── Notification Feed (transaction prompts) ── */}
          {showNotifications && (
            <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.muted }]}>
              <View style={styles.sectionHeader}>
                <Feather name="bell" size={15} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Transaction Notifications
                </Text>
              </View>
              {notifications.length === 0 ? (
                <View style={styles.emptySmall}>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No notifications
                  </Text>
                </View>
              ) : (
                notifications
                  .slice()
                  .reverse()
                  .map(n => (
                    <Pressable
                      key={n.id}
                      style={[
                        styles.notifCard,
                        {
                          backgroundColor: n.isRead ? colors.background : "#fffbeb",
                          borderColor: n.isRead ? colors.border : "#fde68a",
                        },
                      ]}
                      onPress={() => markNotifRead(n.id)}
                    >
                      <View style={styles.notifRow}>
                        <Feather
                          name={n.type === "transaction_confirmation_prompt" ? "alert-circle" : "check-circle"}
                          size={16}
                          color={n.type === "transaction_confirmation_prompt" ? "#d97706" : "#16a34a"}
                        />
                        <View style={styles.notifContent}>
                          <Text style={[styles.notifMsg, { color: colors.foreground }]}>
                            {n.message}
                          </Text>
                          <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
                            {timeAgo(n.createdAt)}
                          </Text>
                        </View>
                        {!n.isRead && (
                          <View style={[styles.unreadDot, { backgroundColor: "#f59e0b" }]} />
                        )}
                      </View>
                    </Pressable>
                  ))
              )}
            </View>
          )}

          {/* ── Pending Confirmations ── */}
          <View
            style={[
              styles.section,
              {
                borderColor: pendingTxs.length > 0 ? "#fde047" : colors.border,
                backgroundColor: pendingTxs.length > 0 ? "#fefce8" : colors.background,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Feather
                name="alert-triangle"
                size={15}
                color={pendingTxs.length > 0 ? "#d97706" : colors.mutedForeground}
              />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Action Required
              </Text>
              {pendingTxs.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: "#f59e0b" }]}>
                  <Text style={styles.countBadgeText}>{pendingTxs.length}</Text>
                </View>
              )}
            </View>

            {pendingTxs.length === 0 ? (
              <View style={styles.emptySmall}>
                <Feather name="check-circle" size={24} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No pending confirmations
                </Text>
              </View>
            ) : (
              pendingTxs.map(tx => {
                const sc = getStatusColor(tx.status, colors);
                const isSale = tx.transactionType === "sale";
                return (
                  <View
                    key={tx.id}
                    style={[
                      styles.txCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: "#fde047",
                        shadowColor: "#000",
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 2,
                      },
                    ]}
                  >
                    <View style={styles.txCardHeader}>
                      <View style={styles.txCardTitle}>
                        <Text style={[styles.txTitle, { color: colors.foreground }]} numberOfLines={2}>
                          {tx.propertyTitle}
                        </Text>
                        {tx.propertyAddress ? (
                          <Text style={[styles.txAddress, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {tx.propertyAddress}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.statusChip, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                        <Text style={[styles.statusChipText, { color: sc.text }]}>
                          {STATUS_LABEL[tx.status]}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.txMeta}>
                      <View style={[styles.typeTag, { backgroundColor: isSale ? "#ede9fe" : "#dbeafe" }]}>
                        <Text style={[styles.typeTagText, { color: isSale ? "#6d28d9" : "#1e40af" }]}>
                          {tx.transactionType}
                        </Text>
                      </View>
                      <Text style={[styles.txAge, { color: colors.mutedForeground }]}>
                        Link-up {timeAgo(tx.createdAt)}
                      </Text>
                    </View>

                    <View style={styles.confirmRow}>
                      <Text style={[styles.partyStatus, { color: colors.mutedForeground }]}>
                        Owner:{" "}
                        <Text style={{ color: tx.ownerConfirmation === "pending" ? "#d97706" : "#16a34a", fontFamily: "Outfit_600SemiBold" }}>
                          {tx.ownerConfirmation === "pending" ? "⏳ Awaiting" : `✓ ${tx.ownerConfirmation}`}
                        </Text>
                      </Text>
                      <Text style={[styles.partyStatus, { color: colors.mutedForeground }]}>
                        Tenant:{" "}
                        <Text style={{ color: tx.tenantConfirmation === "pending" ? "#d97706" : "#16a34a", fontFamily: "Outfit_600SemiBold" }}>
                          {tx.tenantConfirmation === "pending" ? "⏳ Awaiting" : `✓ ${tx.tenantConfirmation}`}
                        </Text>
                      </Text>
                    </View>

                    <Pressable
                      style={[styles.confirmBtn, { backgroundColor: "#16a34a" }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setConfirmTx(tx);
                      }}
                    >
                      <Feather name="check-circle" size={16} color="#fff" />
                      <Text style={styles.confirmBtnText}>Confirm Transaction</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>

          {/* ── Transaction History ── */}
          {historyTxs.length > 0 && (
            <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <View style={styles.sectionHeader}>
                <Feather name="clock" size={15} color={colors.mutedForeground} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>History</Text>
                <Text style={[styles.historyCount, { color: colors.mutedForeground }]}>
                  {historyTxs.length} transaction{historyTxs.length !== 1 ? "s" : ""}
                </Text>
              </View>

              {historyTxs.map(tx => {
                const sc = getStatusColor(tx.status, colors);
                const isSale = tx.transactionType === "sale";
                return (
                  <View
                    key={tx.id}
                    style={[
                      styles.historyCard,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.historyCardMain}>
                      <View style={styles.historyCardLeft}>
                        <Text style={[styles.txTitle, { color: colors.foreground }]} numberOfLines={1}>
                          {tx.propertyTitle}
                        </Text>
                        <View style={styles.historyMeta}>
                          <View style={[styles.typeTag, { backgroundColor: isSale ? "#ede9fe" : "#dbeafe" }]}>
                            <Text style={[styles.typeTagText, { color: isSale ? "#6d28d9" : "#1e40af" }]}>
                              {tx.transactionType}
                            </Text>
                          </View>
                          <Text style={[styles.txAge, { color: colors.mutedForeground }]}>
                            {timeAgo(tx.createdAt)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.historyCardRight}>
                        {tx.transactionValue != null && (
                          <Text style={[styles.txValue, { color: colors.primary }]}>
                            KES {tx.transactionValue.toLocaleString()}
                          </Text>
                        )}
                        <View style={[styles.statusChip, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                          <Text style={[styles.statusChipText, { color: sc.text }]}>
                            {STATUS_LABEL[tx.status]}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {transactions.length === 0 && (
            <View style={styles.center}>
              <Feather name="trending-up" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No transactions yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Transactions appear here after a Link-Up is confirmed between owner and tenant
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Confirmation bottom sheet modal */}
      <ConfirmModal
        tx={confirmTx}
        submitting={submitting}
        onChoice={handleConfirm}
        onClose={() => !submitting && setConfirmTx(null)}
        colors={colors}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function getStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: "Outfit_700Bold",
      letterSpacing: 1,
    },
    bellBtn: {
      padding: 8,
      position: "relative",
    },
    badge: {
      position: "absolute",
      top: 4,
      right: 4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    badgeText: {
      color: "#fff",
      fontSize: 9,
      fontFamily: "Outfit_700Bold",
    },
    scroll: {
      paddingHorizontal: 16,
      paddingTop: 4,
      gap: 16,
    },
    section: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      gap: 10,
      marginBottom: 4,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 2,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: "Outfit_700Bold",
      flex: 1,
    },
    countBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 5,
    },
    countBadgeText: {
      color: "#fff",
      fontSize: 11,
      fontFamily: "Outfit_700Bold",
    },
    historyCount: {
      fontSize: 12,
      fontFamily: "Outfit_400Regular",
    },
    emptySmall: {
      alignItems: "center",
      paddingVertical: 24,
      gap: 8,
    },
    txCard: {
      borderWidth: 1.5,
      borderRadius: 10,
      padding: 14,
      gap: 10,
    },
    txCardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    txCardTitle: {
      flex: 1,
      gap: 2,
    },
    txTitle: {
      fontSize: 14,
      fontFamily: "Outfit_600SemiBold",
    },
    txAddress: {
      fontSize: 12,
      fontFamily: "Outfit_400Regular",
    },
    txMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    typeTag: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    typeTagText: {
      fontSize: 11,
      fontFamily: "Outfit_600SemiBold",
      textTransform: "capitalize",
    },
    txAge: {
      fontSize: 12,
      fontFamily: "Outfit_400Regular",
    },
    statusChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    statusChipText: {
      fontSize: 11,
      fontFamily: "Outfit_600SemiBold",
    },
    confirmRow: {
      gap: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "#fde047",
      paddingTop: 8,
    },
    partyStatus: {
      fontSize: 12,
      fontFamily: "Outfit_400Regular",
    },
    confirmBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 2,
    },
    confirmBtnText: {
      color: "#fff",
      fontSize: 14,
      fontFamily: "Outfit_600SemiBold",
    },
    historyCard: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
    },
    historyCardMain: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    historyCardLeft: {
      flex: 1,
      gap: 6,
    },
    historyCardRight: {
      alignItems: "flex-end",
      gap: 4,
    },
    historyMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    txValue: {
      fontSize: 13,
      fontFamily: "Outfit_700Bold",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingHorizontal: 40,
      paddingTop: 80,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Outfit_600SemiBold",
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Outfit_400Regular",
      textAlign: "center",
    },
    // notification items
    notifCard: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
    },
    notifRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    notifContent: {
      flex: 1,
      gap: 2,
    },
    notifMsg: {
      fontSize: 13,
      fontFamily: "Outfit_400Regular",
      lineHeight: 18,
    },
    notifTime: {
      fontSize: 11,
      fontFamily: "Outfit_400Regular",
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 4,
    },
  });
}

function getModalStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 36,
      gap: 12,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 4,
    },
    title: {
      fontSize: 18,
      fontFamily: "Outfit_700Bold",
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      fontFamily: "Outfit_400Regular",
      textAlign: "center",
    },
    propertyName: {
      fontSize: 15,
      fontFamily: "Outfit_600SemiBold",
      textAlign: "center",
      marginBottom: 4,
    },
    options: {
      gap: 10,
    },
    optionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 10,
    },
    optionText: {
      flex: 1,
    },
    optionTitle: {
      color: "#fff",
      fontSize: 14,
      fontFamily: "Outfit_600SemiBold",
    },
    optionDesc: {
      color: "rgba(255,255,255,0.8)",
      fontSize: 12,
      fontFamily: "Outfit_400Regular",
      marginTop: 2,
    },
    cancelBtn: {
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 4,
    },
    cancelText: {
      fontSize: 14,
      fontFamily: "Outfit_500Medium",
    },
  });
}
