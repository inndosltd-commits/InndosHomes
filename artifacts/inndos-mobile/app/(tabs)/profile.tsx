import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import { getImageUrl } from "@/utils/imageUrl";
import { getApiBaseUrl } from "@/utils/api";
import { AccountUpgradeModal } from "@/components/AccountUpgradeModal";

// ── Nav menu item ─────────────────────────────────────────────────────────────
function MenuItem({ icon, label, badge, onPress, colors }: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  badge?: number;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable style={[menuS.item, { borderBottomColor: colors.border }]} onPress={onPress}>
      <View style={menuS.left}>
        <Feather name={icon} size={20} color={colors.foreground} />
        <Text style={[menuS.label, { color: colors.foreground }]}>{label}</Text>
      </View>
      <View style={menuS.right}>
        {badge !== undefined && badge > 0 && (
          <View style={[menuS.badge, { backgroundColor: colors.primary }]}>
            <Text style={[menuS.badgeText, { color: colors.primaryForeground }]}>{badge}</Text>
          </View>
        )}
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}
const menuS = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1 },
  left: { flexDirection: "row", alignItems: "center", gap: 12 },
  right: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 15, fontFamily: "Outfit_500Medium" },
  badge: { borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { fontSize: 10, fontFamily: "Outfit_700Bold" },
});

// ── Info row ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={infoS.row}>
      <Feather name={icon as React.ComponentProps<typeof Feather>["name"]} size={16} color={colors.mutedForeground} />
      <Text style={[infoS.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[infoS.value, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}
const infoS = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  label: { fontSize: 13, fontFamily: "Outfit_400Regular", flex: 1 },
  value: { fontSize: 13, fontFamily: "Outfit_500Medium", maxWidth: "50%" },
});

// ── Section title ─────────────────────────────────────────────────────────────
function SectionTitle({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{label}</Text>;
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, token, updateUser } = useAuth();
  const isWeb = Platform.OS === "web";

  const { data: profile, refetch: refetchProfile } = useGetMe({ query: { queryKey: getGetMeQueryKey(), enabled: !!user } });
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (!token || !user || !["owner", "host"].includes(user.role)) {
      setSubscriptionPlan(null);
      return;
    }
    fetch(`${getApiBaseUrl()}/api/subscriptions/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((subscription: { plan?: string } | null) => setSubscriptionPlan(subscription?.plan ?? "free"))
      .catch(() => setSubscriptionPlan(null));
  }, [token, user]);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await logout(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
    ]);
  };

  const handleAvatarPress = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") { Alert.alert("Permission needed", "Please allow photo library access."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAvatarUri(asset.uri);
      setUploadingAvatar(true);
      try {
        const filename = asset.uri.split("/").pop() || "avatar.jpg";
        const ext = filename.split(".").pop() || "jpg";
        const formData = new FormData();
        formData.append("file", { uri: asset.uri, name: filename, type: `image/${ext}` } as never);
        const base = getApiBaseUrl();
        const uploadRes = await fetch(`${base}/api/storage/objects`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token ?? ""}` },
          body: formData,
        });
        if (uploadRes.ok) {
          const { url, path } = await uploadRes.json();
          const avatarUrl = url || path;
          // Update user profile with new avatar
          const profileRes = await fetch(`${base}/api/auth/profile`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
            body: JSON.stringify({ avatar: avatarUrl }),
          });
          if (!profileRes.ok) throw new Error("Profile photo could not be saved");
          await updateUser(await profileRes.json());
          await refetchProfile();
        }
      } catch { Alert.alert("Upload failed", "Could not update your profile photo. Try again."); }
      finally { setUploadingAvatar(false); }
    }
  };

  const topPadding = isWeb ? 67 : insets.top;

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>My Account</Text>
        </View>
        <View style={styles.guestContainer}>
          <View style={[styles.avatar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="user" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.foreground }]}>Hello, guest</Text>
          <Text style={[styles.guestSubtitle, { color: colors.mutedForeground }]}>Create an account to book properties and save your favorites</Text>
          <Pressable style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/(auth)/login")}>
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
          </Pressable>
          <Pressable style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => router.push("/(auth)/signup")}>
            <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Create Account</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // The auth context is updated immediately after a role switch, while the
  // query cache can still contain the previous tenant/guest profile.
  const displayUser = { ...(profile ?? {}), ...user };
  const initials = displayUser.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const joinDate = new Date(displayUser.joinDate).toLocaleDateString("en-KE", { month: "long", year: "numeric" });
  const role = displayUser.role;
  const isAdmin = role === "admin";
  const isOwnerOrHost = role === "owner" || role === "host";
  const isTenant = role === "tenant" || role === "guest";
  const profileFields = displayUser as unknown as { avatar?: string | null; isMarketer?: boolean };
  const isMarketer = role === "marketer" || Boolean(profileFields.isMarketer);

  const handleListPropertyPress = () => {
    if (isTenant) {
      setShowUpgradeModal(true);
    } else {
      router.push("/(tabs)/list-property" as never);
    }
  };

  // Profile photo URL
  const photoUrl = avatarUri ?? profileFields.avatar ?? null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Account</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.profileSection}>
          <Pressable style={styles.avatarWrap} onPress={handleAvatarPress}>
            {photoUrl ? (
              <Image source={{ uri: getImageUrl(photoUrl) }} style={styles.avatarLarge} />
            ) : (
              <View style={[styles.avatarLarge, { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }]}>
                <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initials}</Text>
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
              {uploadingAvatar ? (
                <Feather name="loader" size={10} color={colors.primaryForeground} />
              ) : (
                <Feather name="camera" size={10} color={colors.primaryForeground} />
              )}
            </View>
          </Pressable>
          <Text style={[styles.userName, { color: colors.foreground }]}>{displayUser.name}</Text>
          <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{displayUser.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.roleText, { color: colors.foreground }]}>
              {displayUser.role.charAt(0).toUpperCase() + displayUser.role.slice(1)}
            </Text>
          </View>
        </View>

        {/* Account info */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow icon="calendar" label="Member since" value={joinDate} colors={colors} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <InfoRow icon="shield" label="Account status" value={displayUser.status} colors={colors} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <InfoRow icon="credit-card" label="Subscription" value={isOwnerOrHost ? `${subscriptionPlan ?? "Loading"} plan` : "Not required"} colors={colors} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <InfoRow icon="mail" label="Email" value={displayUser.email} colors={colors} />
        </View>

        <SectionTitle label="ACCOUNT" colors={colors} />
        <View style={[styles.menuGroup, { borderColor: colors.border }]}>
          <MenuItem icon="edit-3" label="Edit Profile" onPress={() => router.push("/(tabs)/profile-settings" as never)} colors={colors} />
          <MenuItem icon="sun" label="Appearance" onPress={() => router.push("/(tabs)/profile-settings" as never)} colors={colors} />
          {isOwnerOrHost && <MenuItem icon="credit-card" label="Manage subscription" onPress={() => router.push("/subscription")} colors={colors} />}
        </View>

        {/* Navigation menu — All users */}
        <SectionTitle label="MY ACTIVITY" colors={colors} />
        <View style={[styles.menuGroup, { borderColor: colors.border }]}>
          <MenuItem icon="link" label="My Link-Ups" onPress={() => router.push("/(tabs)/bookings")} colors={colors} />
          {isOwnerOrHost && <MenuItem icon="calendar" label="Reservations" onPress={() => router.push("/(tabs)/bookings?view=received" as never)} colors={colors} />}
          <MenuItem icon="heart" label="Saved Properties" onPress={() => router.push("/(tabs)/saved")} colors={colors} />
          <MenuItem icon="credit-card" label="Transactions" onPress={() => router.push("/(tabs)/transactions" as never)} colors={colors} />
        </View>

        {/* Owner / Host menu */}
        {isOwnerOrHost && (
          <>
            <SectionTitle label="MY LISTINGS" colors={colors} />
            <View style={[styles.menuGroup, { borderColor: colors.border }]}>
              <MenuItem icon="home" label="My Listings" onPress={() => router.push("/(tabs)/my-listings" as never)} colors={colors} />
              <MenuItem icon="plus-square" label="List a Property" onPress={() => router.push("/(tabs)/list-property" as never)} colors={colors} />
            </View>
            <SectionTitle label="DASHBOARD" colors={colors} />
            <View style={[styles.menuGroup, { borderColor: colors.border }]}>
              <MenuItem icon="bar-chart-2" label="Analytics" onPress={() => router.push("/(tabs)/analytics" as never)} colors={colors} />
              <MenuItem icon="bell" label="Notifications" onPress={() => router.push("/(tabs)/notifications" as never)} colors={colors} />
            </View>
          </>
        )}

        {isTenant && (
          <>
            <SectionTitle label="MY LISTINGS" colors={colors} />
            <View style={[styles.menuGroup, { borderColor: colors.border }]}>
              <MenuItem icon="plus-square" label="List a Property" onPress={handleListPropertyPress} colors={colors} />
            </View>
          </>
        )}

        {/* Tenant menu */}
        {isTenant && !isMarketer && (
          <>
            <SectionTitle label="DASHBOARD" colors={colors} />
            <View style={[styles.menuGroup, { borderColor: colors.border }]}>
              <MenuItem icon="bar-chart-2" label="Analytics" onPress={() => router.push("/(tabs)/analytics" as never)} colors={colors} />
            </View>
          </>
        )}

        {/* Marketer menu */}
        {(role === "marketer" || (role === "guest" && profileFields.isMarketer)) && (
          <>
            <SectionTitle label="MARKETING" colors={colors} />
            <View style={[styles.menuGroup, { borderColor: colors.border }]}>
              <MenuItem icon="share-2" label="My Marketing" onPress={() => router.push("/(tabs)/marketer" as never)} colors={colors} />
            </View>
          </>
        )}

        {/* Admin menu */}
        {isAdmin && (
          <>
            <SectionTitle label="ADMIN" colors={colors} />
            <View style={[styles.menuGroup, { borderColor: colors.border }]}>
              <MenuItem icon="shield" label="Admin Dashboard" onPress={() => router.push("/(tabs)/admin" as never)} colors={colors} />
              <MenuItem icon="bar-chart-2" label="Platform Analytics" onPress={() => router.push("/(tabs)/analytics" as never)} colors={colors} />
              <MenuItem icon="credit-card" label="Transactions & Payments" onPress={() => router.push("/(tabs)/admin?section=finance" as never)} colors={colors} />
              <MenuItem icon="home" label="Property Management" onPress={() => router.push("/(tabs)/admin?section=properties" as never)} colors={colors} />
              <MenuItem icon="users" label="User Management" onPress={() => router.push("/(tabs)/admin?section=users" as never)} colors={colors} />
              <MenuItem icon="bell" label="Notification Templates" onPress={() => router.push("/(tabs)/admin?section=notifications" as never)} colors={colors} />
              <MenuItem icon="trending-up" label="Marketing & Referrals" onPress={() => router.push("/(tabs)/admin?section=marketing" as never)} colors={colors} />
              <MenuItem icon="settings" label="Payment & SMS Settings" onPress={() => router.push("/(tabs)/admin?section=settings" as never)} colors={colors} />
            </View>
          </>
        )}

        {/* Sign out */}
        <Pressable style={[styles.logoutBtn, { borderColor: colors.destructive }]} onPress={handleLogout}>
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
        </Pressable>
      </ScrollView>
      <AccountUpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={() => router.replace("/(tabs)/list-property" as never)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontFamily: "Outfit_700Bold" },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  sectionLabel: { fontSize: 11, fontFamily: "Outfit_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 4, marginBottom: -4 },
  guestContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 8 },
  guestTitle: { fontSize: 22, fontFamily: "Outfit_700Bold" },
  guestSubtitle: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 20 },
  primaryBtn: { paddingHorizontal: 48, paddingVertical: 14, marginTop: 8, width: "100%", alignItems: "center" },
  primaryBtnText: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  secondaryBtn: { borderWidth: 1, paddingHorizontal: 48, paddingVertical: 14, width: "100%", alignItems: "center" },
  secondaryBtnText: { fontSize: 15, fontFamily: "Outfit_500Medium" },
  profileSection: { alignItems: "center", paddingVertical: 16, gap: 8 },
  avatarWrap: { position: "relative", marginBottom: 4 },
  avatarLarge: { width: 80, height: 80, borderRadius: 40 },
  editBadge: { position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 28, fontFamily: "Outfit_700Bold" },
  userName: { fontSize: 22, fontFamily: "Outfit_700Bold" },
  userEmail: { fontSize: 14, fontFamily: "Outfit_400Regular" },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  infoCard: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  rowDivider: { height: 1 },
  menuGroup: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14, borderWidth: 1, borderRadius: 12, marginTop: 8 },
  logoutText: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
});
