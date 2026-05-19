import React from "react";
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

  const handleOpenMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>LOCATION</Text>
      <Pressable
        style={[styles.card, { backgroundColor: colors.muted, borderColor: colors.border }]}
        onPress={handleOpenMaps}
      >
        <Feather name="map-pin" size={20} color={colors.primary} />
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.coords, { color: colors.mutedForeground }]}>
            {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
          </Text>
        </View>
        <Feather name="external-link" size={16} color={colors.mutedForeground} />
      </Pressable>
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
});
