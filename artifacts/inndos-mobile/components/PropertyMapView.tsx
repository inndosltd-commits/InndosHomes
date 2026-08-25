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
  focusRegion?: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null;
}

export function PropertyMapView({ properties, onSearchArea, focusRegion }: PropertyMapViewProps) {
  const colors = useColors();
  React.useEffect(() => {
    if (!focusRegion) return;
    onSearchArea?.({
      minLat: focusRegion.latitude - focusRegion.latitudeDelta / 2,
      maxLat: focusRegion.latitude + focusRegion.latitudeDelta / 2,
      minLng: focusRegion.longitude - focusRegion.longitudeDelta / 2,
      maxLng: focusRegion.longitude + focusRegion.longitudeDelta / 2,
    });
  }, [focusRegion, onSearchArea]);
  return (
    <View style={[styles.container, { backgroundColor: colors.muted }]}>
      <Feather name="map" size={48} color={colors.mutedForeground} />
      <Text style={[styles.title, { color: colors.foreground }]}>
        {properties.length} matching properties
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Native builds show the interactive Google map. Results stay synchronized with the selected area.
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
