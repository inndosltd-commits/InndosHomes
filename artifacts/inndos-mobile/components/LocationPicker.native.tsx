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
import MapView, { Marker, MapPressEvent, PROVIDER_GOOGLE } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useColors } from "@/hooks/useColors";
import Constants from "expo-constants";

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

function geocodeCacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
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
  const [mapReady, setMapReady] = useState(false);
  const [mapTimedOut, setMapTimedOut] = useState(false);
  const [mapRetryKey, setMapRetryKey] = useState(0);
  const mapRef = useRef<MapView>(null);
  const googleMapsConfigured = Constants.expoConfig?.extra?.googleMapsConfigured !== false;

  useEffect(() => {
    if (mapReady || !googleMapsConfigured) return;
    const timeout = setTimeout(() => setMapTimedOut(true), 8000);
    return () => clearTimeout(timeout);
  }, [googleMapsConfigured, mapReady]);

  const parsedLatitude = Number(lat);
  const parsedLongitude = Number(lng);
  const latitudeInputInvalid = lat.trim() !== ""
    && (!Number.isFinite(parsedLatitude) || Math.abs(parsedLatitude) > 90);
  const longitudeInputInvalid = lng.trim() !== ""
    && (!Number.isFinite(parsedLongitude) || Math.abs(parsedLongitude) > 180);
  const hasPinned = lat.trim() !== ""
    && lng.trim() !== ""
    && !latitudeInputInvalid
    && !longitudeInputInvalid;
  const pinCoord = hasPinned
    ? { latitude: parsedLatitude, longitude: parsedLongitude }
    : null;

  useEffect(() => {
    if (!hasPinned) {
      setAddress(null);
      return;
    }
    const cacheKey = geocodeCacheKey(parsedLatitude, parsedLongitude);
    if (geocodeCache.has(cacheKey)) {
      const cached = geocodeCache.get(cacheKey) ?? null;
      setAddress(cached);
      if (cached) onAddressResolved?.(cached);
      return;
    }
    let cancelled = false;
    setGeocoding(true);
    Location.reverseGeocodeAsync({ latitude: parsedLatitude, longitude: parsedLongitude })
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

  function handleRetryMap() {
    setMapReady(false);
    setMapTimedOut(false);
    setMapRetryKey((value) => value + 1);
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
        {googleMapsConfigured && (
          <MapView
            key={mapRetryKey}
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={initialRegion}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton
            onMapReady={() => { setMapReady(true); setMapTimedOut(false); }}
          >
            {pinCoord && (
              <Marker coordinate={pinCoord} pinColor={colors.primary} />
            )}
          </MapView>
        )}
        {googleMapsConfigured && !mapReady && !mapTimedOut ? (
          <View pointerEvents="none" style={[styles.mapState, { backgroundColor: colors.card + "E8" }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.mapStateText, { color: colors.mutedForeground }]}>Loading Google Maps…</Text>
          </View>
        ) : null}
        {!googleMapsConfigured ? (
          <View style={[styles.mapState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="map" size={22} color={colors.primary} />
            <Text style={[styles.mapStateTitle, { color: colors.foreground }]}>Google Maps needs a new build</Text>
            <Text style={[styles.mapStateText, { color: colors.mutedForeground }]}>
              Rebuild with the Google Maps key configured to choose a listing location.
            </Text>
          </View>
        ) : null}
        {googleMapsConfigured && !mapReady && mapTimedOut ? (
          <View style={[styles.mapState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="refresh-cw" size={22} color={colors.primary} />
            <Text style={[styles.mapStateTitle, { color: colors.foreground }]}>Google Maps is taking longer to load</Text>
            <Text style={[styles.mapStateText, { color: colors.mutedForeground }]}>
              Check your connection, then retry the listing-location map.
            </Text>
            <Pressable onPress={handleRetryMap} style={[styles.mapRetryButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.mapRetryText, { color: colors.primaryForeground }]}>Retry map</Text>
            </Pressable>
          </View>
        ) : null}
        {googleMapsConfigured && mapReady && !hasPinned && (
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
                {parsedLatitude.toFixed(5)}, {parsedLongitude.toFixed(5)}
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
                  borderColor: latError || latitudeInputInvalid ? colors.destructive : colors.border,
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
            {latError || latitudeInputInvalid ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {latError || "Enter a latitude between -90 and 90."}
              </Text>
            ) : null}
          </View>
          <View style={styles.manualHalf}>
            <Text style={[styles.manualLabel, { color: colors.foreground }]}>Longitude</Text>
            <TextInput
              style={[
                styles.manualInput,
                {
                  color: colors.foreground,
                  borderColor: lngError || longitudeInputInvalid ? colors.destructive : colors.border,
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
            {lngError || longitudeInputInvalid ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {lngError || "Enter a longitude between -180 and 180."}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {!manualExpanded && (latError || lngError || latitudeInputInvalid || longitudeInputInvalid) ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {latError
            || lngError
            || (latitudeInputInvalid ? "Enter a latitude between -90 and 90." : null)
            || "Enter a longitude between -180 and 180."}
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
  mapState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  mapStateTitle: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
  },
  mapStateText: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    lineHeight: 17,
    textAlign: "center",
  },
  mapRetryButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
  },
  mapRetryText: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
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
