import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
  onAddressResolved?: (address: string) => void;
  latError?: string;
  lngError?: string;
}

const SCREEN_WIDTH = Dimensions.get("window").width;

const geocodeCache = new Map<string, string | null>();

function geocodeCacheKey(lat: string, lng: string): string {
  return `${parseFloat(lat).toFixed(4)},${parseFloat(lng).toFixed(4)}`;
}

const DEFAULT_REGION = {
  latitude: -1.2921,
  longitude: 36.8219,
  latitudeDelta: 0.4,
  longitudeDelta: 0.4,
};

export function LocationPicker({ lat, lng, onLocationChange, onAddressResolved, latError, lngError }: LocationPickerProps) {
  const colors = useColors();
  const [locating, setLocating] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [manualExpanded, setManualExpanded] = useState(false);
  const mapRef = useRef<MapView>(null);

  const hasPinned = lat !== "" && lng !== "";
  const pinCoord = hasPinned
    ? { latitude: parseFloat(lat), longitude: parseFloat(lng) }
    : null;

  useEffect(() => {
    if (!hasPinned) {
      setAddress(null);
      return;
    }
    const cacheKey = geocodeCacheKey(lat, lng);
    if (geocodeCache.has(cacheKey)) {
      const cached = geocodeCache.get(cacheKey) ?? null;
      setAddress(cached);
      if (cached) onAddressResolved?.(cached);
      return;
    }
    let cancelled = false;
    setGeocoding(true);
    Location.reverseGeocodeAsync({ latitude: parseFloat(lat), longitude: parseFloat(lng) })
      .then((results) => {
        if (cancelled) return;
        const r = results[0];
        if (!r) {
          geocodeCache.set(cacheKey, null);
          setAddress(null);
          return;
        }
        const parts: string[] = [];
        if (r.streetNumber && r.street) parts.push(`${r.streetNumber} ${r.street}`);
        else if (r.street) parts.push(r.street);
        if (r.city) parts.push(r.city);
        else if (r.subregion) parts.push(r.subregion);
        const resolved = parts.length > 0 ? parts.join(", ") : null;
        geocodeCache.set(cacheKey, resolved);
        setAddress(resolved);
        if (resolved) onAddressResolved?.(resolved);
      })
      .catch(() => {
        if (!cancelled) setAddress(null);
      })
      .finally(() => { if (!cancelled) setGeocoding(false); });
    return () => { cancelled = true; };
  }, [lat, lng, hasPinned]);

  const initialRegion = pinCoord
    ? { ...pinCoord, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : DEFAULT_REGION;

  function handleMapPress(event: MapPressEvent) {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    onLocationChange(latitude.toFixed(7), longitude.toFixed(7));
    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      400
    );
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
        <View style={styles.pinInfoColumn}>
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
          {geocoding ? (
            <View style={styles.addressRow}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
              <Text style={[styles.addressText, { color: colors.mutedForeground }]}>Looking up address…</Text>
            </View>
          ) : address ? (
            <View style={styles.addressRow}>
              <Feather name="navigation" size={12} color={colors.mutedForeground} />
              <Text style={[styles.addressText, { color: colors.mutedForeground }]} numberOfLines={2}>
                {address}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      <Pressable
        style={[styles.manualToggle, { borderColor: colors.border, backgroundColor: colors.card }]}
        onPress={() => setManualExpanded((v) => !v)}
      >
        <Feather name="edit-2" size={13} color={colors.mutedForeground} />
        <Text style={[styles.manualToggleText, { color: colors.mutedForeground }]}>
          Enter coordinates manually
        </Text>
        <Feather
          name={manualExpanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={colors.mutedForeground}
          style={styles.manualToggleChevron}
        />
      </Pressable>

      {manualExpanded && (
        <View style={styles.manualRow}>
          <View style={styles.manualHalf}>
            <Text style={[styles.manualLabel, { color: colors.foreground }]}>Latitude</Text>
            <TextInput
              style={[
                styles.manualInput,
                {
                  color: colors.foreground,
                  borderColor: latError ? colors.destructive : colors.border,
                  backgroundColor: colors.card,
                },
              ]}
              placeholder="-1.2921"
              placeholderTextColor={colors.mutedForeground}
              value={lat}
              onChangeText={(v) => onLocationChange(v, lng)}
              keyboardType="decimal-pad"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {latError ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>{latError}</Text>
            ) : null}
          </View>
          <View style={styles.manualHalf}>
            <Text style={[styles.manualLabel, { color: colors.foreground }]}>Longitude</Text>
            <TextInput
              style={[
                styles.manualInput,
                {
                  color: colors.foreground,
                  borderColor: lngError ? colors.destructive : colors.border,
                  backgroundColor: colors.card,
                },
              ]}
              placeholder="36.8219"
              placeholderTextColor={colors.mutedForeground}
              value={lng}
              onChangeText={(v) => onLocationChange(lat, v)}
              keyboardType="decimal-pad"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
            {lngError ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>{lngError}</Text>
            ) : null}
          </View>
        </View>
      )}

      {!manualExpanded && (latError || lngError) ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {latError || lngError}
        </Text>
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
  pinInfoColumn: {
    gap: 6,
  },
  coordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  addressText: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    flex: 1,
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
  manualToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 8,
  },
  manualToggleText: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    flex: 1,
  },
  manualToggleChevron: {
    marginLeft: "auto",
  },
  manualRow: {
    flexDirection: "row",
    gap: 10,
  },
  manualHalf: {
    flex: 1,
    gap: 6,
  },
  manualLabel: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
  },
  manualInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
  },
});
