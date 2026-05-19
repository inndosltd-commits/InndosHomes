import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface PropertyLocationMapProps {
  lat: string;
  lng: string;
  title: string;
}

export function PropertyLocationMap({ lat, lng, title }: PropertyLocationMapProps) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;

  const handleOpenMaps = () => {
    Linking.openURL(mapsUrl);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mapsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>LOCATION</Text>
      <View style={[styles.card, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name="map-pin" size={20} color={colors.primary} />
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.coords, { color: colors.mutedForeground }]}>
            {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
          </Text>
        </View>
        <Pressable
          onPress={handleCopy}
          style={styles.iconBtn}
          accessibilityLabel="Copy location link"
        >
          <Feather
            name={copied ? "check" : "copy"}
            size={16}
            color={copied ? colors.primary : colors.mutedForeground}
          />
        </Pressable>
        <Pressable
          onPress={handleOpenMaps}
          style={styles.iconBtn}
          accessibilityLabel="Open in maps"
        >
          <Feather name="external-link" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>
      {copied && (
        <Text style={[styles.copiedHint, { color: colors.primary }]}>
          Location link copied!
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  label: {
    fontSize: 10,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 1,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: "Outfit_500Medium",
  },
  coords: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
  },
  iconBtn: {
    padding: 4,
  },
  copiedHint: {
    fontSize: 12,
    fontFamily: "Outfit_500Medium",
    textAlign: "right",
  },
});
