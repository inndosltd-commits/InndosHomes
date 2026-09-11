import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl } from "@/utils/api";
import Constants from "expo-constants";

interface LocationPickerProps {
  lat: string;
  lng: string;
  onLocationChange: (lat: string, lng: string) => void;
  onAddressResolved?: (address: string, options?: { replace?: boolean }) => void;
  latError?: string;
  lngError?: string;
}

interface PlacePrediction {
  placeId: string;
  description: string;
  secondaryText: string;
}

interface PlaceDetails {
  placeId: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
}

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
  const { token } = useAuth();
  const [locating, setLocating] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [manualExpanded, setManualExpanded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapTimedOut, setMapTimedOut] = useState(false);
  const [mapRetryKey, setMapRetryKey] = useState(0);
  const mapRef = useRef<MapView>(null);
  const googleMapsConfigured = Constants.expoConfig?.extra?.googleMapsConfigured !== false;

  // Place search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectingPlaceId, setSelectingPlaceId] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchRequestIdRef = useRef(0);
  // Stable session token per search session (resets on selection)
  const sessionTokenRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (mapReady || !googleMapsConfigured) return;
    const timeout = setTimeout(() => setMapTimedOut(true), 8000);
    return () => clearTimeout(timeout);
  }, [googleMapsConfigured, mapReady]);

  useEffect(() => () => {
    searchRequestIdRef.current += 1;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchAbortRef.current?.abort();
  }, []);

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

  // Reverse geocode when pin changes from map tap / GPS / manual coords
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

  /** Forward place search via server proxy (keeps API key server-side) */
  const performSearch = useCallback(async (query: string, requestId: number) => {
    if (!query.trim() || query.trim().length < 2) {
      if (requestId === searchRequestIdRef.current) {
        setSearchResults([]);
        setIsSearching(false);
      }
      return;
    }
    if (!token) {
      if (requestId === searchRequestIdRef.current) setIsSearching(false);
      return;
    }
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setIsSearching(true);
    try {
      const url = `${getApiBaseUrl()}/api/maps/places?query=${encodeURIComponent(query.trim())}&sessiontoken=${sessionTokenRef.current}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const json = await response.json() as { results?: PlacePrediction[]; error?: string };
      if (requestId !== searchRequestIdRef.current) return;
      if (!response.ok) {
        setSearchResults([]);
        return;
      }
      setSearchResults(json.results ?? []);
    } catch (error) {
      if (requestId === searchRequestIdRef.current && !(error instanceof Error && error.name === "AbortError")) {
        setSearchResults([]);
      }
    } finally {
      if (requestId === searchRequestIdRef.current) setIsSearching(false);
    }
  }, [token]);

  function cancelPendingSearch() {
    searchRequestIdRef.current += 1;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchAbortRef.current?.abort();
    searchAbortRef.current = null;
    setIsSearching(false);
    setSelectingPlaceId(null);
  }

  /** Debounce search input */
  const handleSearchChange = (text: string) => {
    cancelPendingSearch();
    setSearchQuery(text);
    if (!text.trim() || text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const requestId = searchRequestIdRef.current;
    setIsSearching(true);
    searchDebounceRef.current = setTimeout(() => {
      performSearch(text, requestId);
    }, 400);
  };

  /** User picks a place from results */
  const handleSelectPlace = async (prediction: PlacePrediction) => {
    cancelPendingSearch();
    if (!token) return;

    const sessionToken = sessionTokenRef.current;
    setSelectingPlaceId(prediction.placeId);
    try {
      const url = `${getApiBaseUrl()}/api/maps/places/${encodeURIComponent(prediction.placeId)}?sessiontoken=${sessionToken}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json() as { place?: PlaceDetails; error?: string };
      if (!response.ok || !json.place) {
        throw new Error(json.error ?? "Could not resolve this place");
      }
      const place = json.place;
      sessionTokenRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setSearchQuery(prediction.description);
      setSearchResults([]);
      setSearchFocused(false);

      const latStr = place.latitude.toFixed(7);
      const lngStr = place.longitude.toFixed(7);
      onLocationChange(latStr, lngStr);

      const cacheKey = geocodeCacheKey(place.latitude, place.longitude);
      geocodeCache.set(cacheKey, place.address);
      setAddress(place.address);
      if (place.address) onAddressResolved?.(place.address, { replace: true });

      mapRef.current?.animateToRegion(
        { latitude: place.latitude, longitude: place.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        500
      );
    } catch (error) {
      Alert.alert(
        "Place unavailable",
        error instanceof Error ? error.message : "Could not resolve this place. Please try again."
      );
    } finally {
      setSelectingPlaceId(null);
    }
  };

  const initialRegion = pinCoord
    ? { ...pinCoord, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : DEFAULT_REGION;

  function handleMapPress(event: MapPressEvent) {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    cancelPendingSearch();
    setSearchQuery("");
    setSearchResults([]);
    onLocationChange(latitude.toFixed(7), longitude.toFixed(7));
    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      400
    );
  }

  function handleClear() {
    cancelPendingSearch();
    onLocationChange("", "");
    setSearchQuery("");
    setSearchResults([]);
    setAddress(null);
  }

  function handleRetryMap() {
    setMapReady(false);
    setMapTimedOut(false);
    setMapRetryKey((value) => value + 1);
  }

  async function handleUseMyLocation() {
    cancelPendingSearch();
    setLocating(true);
    setSearchQuery("");
    setSearchResults([]);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Location access is required to auto-fill the pin. You can still tap the map or search for a place."
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
  const showDropdown = searchFocused
    && searchQuery.trim().length >= 2
    && (isSearching || selectingPlaceId !== null || searchResults.length > 0);

  return (
    <View style={styles.container}>
      {/* ── Place Search ── */}
      <View style={styles.searchWrapper}>
        <View style={[
          styles.searchBox,
          {
            borderColor: searchFocused ? colors.primary : colors.border,
            backgroundColor: colors.card,
          },
        ]}>
          <Feather name="search" size={14} color={colors.mutedForeground} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search place or address…"
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => {
              // Small delay to allow tap on result
              setTimeout(() => setSearchFocused(false), 150);
            }}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {isSearching && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.searchSpinner} />
          )}
        </View>

        {/* Dropdown results */}
        {showDropdown && (
          <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {isSearching && searchResults.length === 0 ? (
              <View style={styles.dropdownRow}>
                <ActivityIndicator size="small" color={colors.mutedForeground} />
                <Text style={[styles.dropdownText, { color: colors.mutedForeground }]}>Searching…</Text>
              </View>
            ) : searchResults.length === 0 ? (
              <View style={styles.dropdownRow}>
                <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                <Text style={[styles.dropdownText, { color: colors.mutedForeground }]}>No places found</Text>
              </View>
            ) : (
              searchResults.map((place, idx) => (
                <Pressable
                  key={place.placeId}
                  style={[
                    styles.dropdownItem,
                    idx < searchResults.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                  onPress={() => handleSelectPlace(place)}
                  disabled={selectingPlaceId !== null}
                >
                  {selectingPlaceId === place.placeId ? (
                    <ActivityIndicator size="small" color={colors.primary} style={styles.dropdownItemIcon} />
                  ) : (
                    <Feather name="map-pin" size={13} color={colors.primary} style={styles.dropdownItemIcon} />
                  )}
                  <View style={styles.dropdownItemText}>
                    <Text style={[styles.dropdownItemMain, { color: colors.foreground }]} numberOfLines={1}>
                      {place.description}
                    </Text>
                    {!!place.secondaryText && (
                      <Text style={[styles.dropdownItemSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {place.secondaryText}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))
            )}
          </View>
        )}
      </View>

      {/* ── Use my location button ── */}
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

      {/* ── Map ── */}
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
              Search above or tap the map to drop a pin
            </Text>
          </View>
        )}
      </View>

      {/* ── Pin info ── */}
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

      {/* ── Manual coords toggle ── */}
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
  searchWrapper: {
    position: "relative",
    zIndex: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 0,
    height: 42,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    height: "100%",
  },
  searchSpinner: {
    marginLeft: 6,
  },
  dropdown: {
    position: "absolute",
    top: 44,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
    overflow: "hidden",
  },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemIcon: {
    marginRight: 8,
    flexShrink: 0,
  },
  dropdownItemText: {
    flex: 1,
  },
  dropdownItemMain: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
  },
  dropdownItemSub: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    marginTop: 1,
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
