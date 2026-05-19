import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, MapPressEvent } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useColors } from "@/hooks/useColors";

interface LocationPickerProps {
  lat: string;
  lng: string;
  onLocationChange: (lat: string, lng: string) => void;
  latError?: string;
  lngError?: string;
}

const SCREEN_WIDTH = Dimensions.get("window").width;

const DEFAULT_REGION = {
  latitude: -1.2921,
  longitude: 36.8219,
  latitudeDelta: 0.4,
  longitudeDelta: 0.4,
};

export function LocationPicker({ lat, lng, onLocationChange, latError, lngError }: LocationPickerProps) {
  const colors = useColors();
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<MapView>(null);

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

  async function handleUseMyLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Location access is required to auto-fill the pin. You can still tap the map to set a location manually."
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = position.coords;
      onLocationChange(latitude.toFixed(7), longitude.toFixed(7));
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        600
      );
    } catch {
      Alert.alert("Location error", "Could not get your current location. Please try again or tap the map.");
    } finally {
      setLocating(false);
    }
  }

  const hasError = !!latError || !!lngError;

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.useLocationBtn,
          {
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
        onPress={handleUseMyLocation}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Feather name="crosshair" size={15} color={colors.primary} />
        )}
        <Text style={[styles.useLocationText, { color: colors.primary }]}>
          {locating ? "Getting location…" : "Use my location"}
        </Text>
      </Pressable>

      <View style={[styles.mapWrapper, { borderColor: hasError ? colors.destructive : colors.border }]}>
        <MapView
          ref={mapRef}
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

      {latError ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>{latError}</Text>
      ) : lngError ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>{lngError}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  useLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 8,
  },
  useLocationText: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
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
  errorText: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
  },
});
