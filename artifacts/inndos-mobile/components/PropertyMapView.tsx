import type { Property } from "@workspace/api-client-react";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

export interface MapBBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface PropertyMapViewProps {
  properties: Property[];
  onSearchArea?: (bbox: MapBBox) => void;
}

export function PropertyMapView({ properties: _ }: PropertyMapViewProps) {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.muted }]}>
      <Feather name="map" size={48} color={colors.mutedForeground} />
      <Text style={[styles.title, { color: colors.foreground }]}>
        Map view not available on web
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Use the mobile app to explore properties on the map
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 40,
  },
  title: {
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
  },
});
