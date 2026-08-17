import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Alert,
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

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const isWeb = Platform.OS === "web";

  const { data: profile } = useGetMe({ query: { queryKey: getGetMeQueryKey(), enabled: !!user } });

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const topPadding = isWeb ? 67 : insets.top;
  const styles = getStyles(colors);

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
          <Text style={[styles.guestSubtitle, { color: colors.mutedForeground }]}>
            Create an account to book properties and save your favorites
          </Text>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => router.push("/(auth)/signup")}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Create Account</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const displayUser = profile ?? user;
  const initials = displayUser.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const joinDate = new Date(displayUser.joinDate).toLocaleDateString("en-KE", {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Account</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: isWeb ? 34 + 84 : insets.bottom + 84 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={[styles.avatarLarge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initials}</Text>
          </View>
          <Text style={[styles.userName, { color: colors.foreground }]}>{displayUser.name}</Text>
          <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{displayUser.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.roleText, { color: colors.foreground }]}>
              {displayUser.role.charAt(0).toUpperCase() + displayUser.role.slice(1)}
            </Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow icon="calendar" label="Member since" value={joinDate} colors={colors} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <InfoRow icon="shield" label="Account status" value={displayUser.status} colors={colors} />
          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
          <InfoRow icon="mail" label="Email" value={displayUser.email} colors={colors} />
        </View>

        <View style={[styles.menuGroup, { borderColor: colors.border }]}>
          <Pressable
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push("/(tabs)/bookings")}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="link" size={20} color={colors.foreground} />
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>My Link-Ups</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push("/(tabs)/saved")}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="heart" size={20} color={colors.foreground} />
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>Saved Properties</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
          {(displayUser.role === "owner" || displayUser.role === "host") && (
            <>
              <Pressable
                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                onPress={() => router.push("/(tabs)/my-listings" as never)}
              >
                <View style={styles.menuItemLeft}>
                  <Feather name="home" size={20} color={colors.foreground} />
                  <Text style={[styles.menuItemText, { color: colors.foreground }]}>My Listings</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
              <Pressable
                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                onPress={() => router.push("/(tabs)/list-property" as never)}
              >
                <View style={styles.menuItemLeft}>
                  <Feather name="plus-square" size={20} color={colors.foreground} />
                  <Text style={[styles.menuItemText, { color: colors.foreground }]}>List a Property</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            </>
          )}
          <Pressable
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push("/(tabs)/transactions" as never)}
          >
            <View style={styles.menuItemLeft}>
              <Feather name="credit-card" size={20} color={colors.foreground} />
              <Text style={[styles.menuItemText, { color: colors.foreground }]}>Transactions</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
          {displayUser.role === "admin" && (
            <Pressable
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push("/(tabs)/admin" as never)}
            >
              <View style={styles.menuItemLeft}>
                <Feather name="shield" size={20} color={colors.foreground} />
                <Text style={[styles.menuItemText, { color: colors.foreground }]}>Admin Dashboard</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <Pressable
          style={[styles.logoutBtn, { borderColor: colors.destructive }]}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={infoRowStyles.row}>
      <Feather name={icon as keyof typeof Feather.glyphMap} size={16} color={colors.mutedForeground} />
      <Text style={[infoRowStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[infoRowStyles.value, { color: colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    flex: 1,
  },
  value: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
    maxWidth: "50%",
  },
});

function getStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    title: {
      fontSize: 24,
      fontFamily: "Outfit_700Bold",
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      gap: 16,
    },
    guestContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      paddingHorizontal: 40,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      marginBottom: 8,
    },
    guestTitle: {
      fontSize: 22,
      fontFamily: "Outfit_700Bold",
    },
    guestSubtitle: {
      fontSize: 14,
      fontFamily: "Outfit_400Regular",
      textAlign: "center",
      lineHeight: 20,
    },
    primaryBtn: {
      paddingHorizontal: 48,
      paddingVertical: 14,
      marginTop: 8,
      width: "100%",
      alignItems: "center",
    },
    primaryBtnText: {
      fontSize: 15,
      fontFamily: "Outfit_600SemiBold",
    },
    secondaryBtn: {
      borderWidth: 1,
      paddingHorizontal: 48,
      paddingVertical: 14,
      width: "100%",
      alignItems: "center",
    },
    secondaryBtnText: {
      fontSize: 15,
      fontFamily: "Outfit_500Medium",
    },
    profileSection: {
      alignItems: "center",
      paddingVertical: 16,
      gap: 8,
    },
    avatarLarge: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    avatarText: {
      fontSize: 28,
      fontFamily: "Outfit_700Bold",
    },
    userName: {
      fontSize: 22,
      fontFamily: "Outfit_700Bold",
    },
    userEmail: {
      fontSize: 14,
      fontFamily: "Outfit_400Regular",
    },
    roleBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    roleText: {
      fontSize: 12,
      fontFamily: "Outfit_600SemiBold",
    },
    infoCard: {
      borderWidth: 1,
    },
    rowDivider: {
      height: 1,
    },
    menuGroup: {
      borderWidth: 1,
      borderRadius: 12,
      overflow: "hidden",
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
    },
    menuItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    menuItemText: {
      fontSize: 15,
      fontFamily: "Outfit_500Medium",
    },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 14,
      borderWidth: 1,
      borderRadius: 12,
      marginTop: 8,
    },
    logoutText: {
      fontSize: 15,
      fontFamily: "Outfit_600SemiBold",
    },
  });
}
