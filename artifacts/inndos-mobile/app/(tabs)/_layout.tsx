import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs, usePathname } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useListFavorites, getListFavoritesQueryKey } from "@workspace/api-client-react";

interface TabLayoutProps {
  savedCount: number;
}

function ClassicTabLayout({ savedCount }: TabLayoutProps) {
  const colors = useColors();
  const { effectiveScheme } = useTheme();
  const isDark = effectiveScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          paddingBottom: safeAreaInsets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Outfit_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Browse",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          href: null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="magnifyingglass" tintColor={color} size={24} />
            ) : (
              <Feather name="search" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarBadge: savedCount > 0 ? savedCount : undefined,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="heart" tintColor={color} size={24} />
            ) : (
              <Feather name="heart" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Link-Ups",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="link" tintColor={color} size={24} />
            ) : (
              <Feather name="link" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          href: null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="arrow.left.arrow.right" tintColor={color} size={24} />
            ) : (
              <Feather name="repeat" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="my-listings"
        options={{
          title: "My Listings",
          href: null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="building.2" tintColor={color} size={24} />
            ) : (
              <Feather name="list" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="property-saves"
        options={{
          title: "Saves",
          href: null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="heart.text.square" tintColor={color} size={24} />
            ) : (
              <Feather name="heart" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="list-property"
        options={{
          title: "List",
          href: null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="plus.circle" tintColor={color} size={24} />
            ) : (
              <Feather name="plus-circle" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.2" tintColor={color} size={24} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          href: null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.bar" tintColor={color} size={24} />
            ) : (
              <Feather name="bar-chart-2" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          href: null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="bell" tintColor={color} size={24} />
            ) : (
              <Feather name="bell" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="marketer"
        options={{
          title: "Marketing",
          href: null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="megaphone" tintColor={color} size={24} />
            ) : (
              <Feather name="share-2" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile-settings"
        options={{
          title: "Profile settings",
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "My Account",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.crop.circle.fill" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { data: savedProperties } = useListFavorites({
    query: { queryKey: getListFavoritesQueryKey(), enabled: !!user },
  });
  const savedCount = user ? (savedProperties?.length ?? 0) : 0;
  const [seenSavedCount, setSeenSavedCount] = useState<number | null>(null);
  const isSavedScreen = pathname === "/saved" || pathname.endsWith("/saved");

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setSeenSavedCount(null);
      return () => {
        isMounted = false;
      };
    }

    const storageKey = `inndos:saved-badge-count:${user.id}`;
    void AsyncStorage.getItem(storageKey).then((storedCount) => {
      if (!isMounted) return;
      const parsedCount = Number(storedCount);
      setSeenSavedCount(
        Number.isSafeInteger(parsedCount) && parsedCount >= 0 ? parsedCount : 0
      );
    });

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (
      !user ||
      savedProperties === undefined ||
      seenSavedCount === null ||
      savedCount >= seenSavedCount
    ) {
      return;
    }

    const storageKey = `inndos:saved-badge-count:${user.id}`;
    setSeenSavedCount(savedCount);
    void AsyncStorage.setItem(storageKey, String(savedCount));
  }, [savedCount, savedProperties, seenSavedCount, user]);

  useEffect(() => {
    if (
      !user ||
      !isSavedScreen ||
      seenSavedCount === null ||
      savedProperties === undefined ||
      seenSavedCount === savedCount
    ) {
      return;
    }

    const storageKey = `inndos:saved-badge-count:${user.id}`;
    setSeenSavedCount(savedCount);
    void AsyncStorage.setItem(storageKey, String(savedCount));
  }, [isSavedScreen, savedCount, savedProperties, seenSavedCount, user]);

  const unreadSavedCount =
    seenSavedCount === null ? 0 : Math.max(0, savedCount - seenSavedCount);
  // NativeTabs only registers declared triggers. That leaves profile dashboard
  // destinations unreachable on iOS/Android, so use the fully registered Tabs
  // navigator with the existing iOS blur treatment for all devices.
  return <ClassicTabLayout savedCount={unreadSavedCount} />;
}
