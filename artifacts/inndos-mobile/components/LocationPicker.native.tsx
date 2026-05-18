import React, { useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, MapPressEvent } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface LocationPickerProps {
  lat: string;
  lng: string;
  onLocationChange: (lat: string, lng: string) => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;

const DEFAULT_REGION = {
  latitude: -1.2921,
  longitude: 36.8219,
  latitudeDelta: 0.4,
  longitudeDelta: 0.4,
};

export function LocationPicker({ lat, lng, onLocationChange }: LocationPickerProps) {
  const colors = useColors();

  const hasPinned = lat !== "" && lng !== "";
  const pinCoord = hasPinned
    ? { latitude: parseFloat(lat), longitude: parseFloat(lng) }
    : null;

  const initialRegion = pinCoord
    ? { ...pinCoord, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : DEFAULT_REGION;

  function handleMapPress(event: MapPressEvent) {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    onLocationChange(latitude.toFixed(7), longitude.toFixed(7));
  }

  function handleClear() {
    onLocationChange("", "");
  }

  return (
    <View style={styles.container}>
      <View style={[styles.mapWrapper, { borderColor: colors.border }]}>
        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton
        >
          {pinCoord && (
            <Marker coordinate={pinCoord} pinColor={colors.primary} />
          )}
        </MapView>
        {!hasPinned && (
          <View
            pointerEvents="none"
            style={[styles.hint, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="map-pin" size={14} color={colors.mutedForeground} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Tap the map to drop a pin
            </Text>
          </View>
        )}
      </View>

      {hasPinned && (
        <View style={styles.coordRow}>
          <View style={[styles.coordBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="map-pin" size={13} color={colors.primary} />
            <Text style={[styles.coordText, { color: colors.foreground }]}>
              {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
            </Text>
          </View>
          <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  mapWrapper: {
    height: 220,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  hint: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  hintText: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
  },
  coordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  coordBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 6,
  },
  coordText: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
  },
  clearBtn: {
    padding: 4,
  },
});
