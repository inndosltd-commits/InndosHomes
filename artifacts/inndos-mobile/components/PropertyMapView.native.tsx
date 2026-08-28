import type { Property } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";
import * as Location from "expo-location";
import Constants from "expo-constants";
import { useColors } from "@/hooks/useColors";
import { getImageUrl } from "@/utils/imageUrl";
import { Feather } from "@expo/vector-icons";

export interface MapBBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface PropertyMapViewProps {
  properties: Property[];
  onSearchArea?: (bbox: MapBBox, source: "focus" | "user") => void;
  focusRegion?: Region | null;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const PROPERTY_PIN_ICON = require("@/assets/images/map-pin.png");

function getPriceLabel(property: Property): string {
  const price = `KES ${property.price.toLocaleString()}`;
  if (property.type === "rent") return `${price}/mo`;
  if (
    property.type === "bnb" ||
    property.type === "hotel" ||
    property.type === "hostel"
  )
    return `${price}/night`;
  return price;
}

const DEFAULT_REGION: Region = {
  latitude: -1.2921,
  longitude: 36.8219,
  // Matches the website's Nairobi home-map zoom (Google Maps zoom level 11).
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

function isValidCoordinate(lat: unknown, lng: unknown): lat is string {
  if (
    lat === null ||
    lat === undefined ||
    String(lat).trim() === "" ||
    lng === null ||
    lng === undefined ||
    String(lng).trim() === ""
  ) return false;
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

function isValidRegion(region: Region): boolean {
  return Number.isFinite(region.latitude)
    && Number.isFinite(region.longitude)
    && Number.isFinite(region.latitudeDelta)
    && Number.isFinite(region.longitudeDelta)
    && Math.abs(region.latitude) <= 90
    && Math.abs(region.longitude) <= 180
    && region.latitudeDelta > 0
    && region.longitudeDelta > 0;
}

function regionToMapBBox(region: Region): MapBBox {
  return {
    minLat: region.latitude - region.latitudeDelta / 2,
    maxLat: region.latitude + region.latitudeDelta / 2,
    minLng: region.longitude - region.longitudeDelta / 2,
    maxLng: region.longitude + region.longitudeDelta / 2,
  };
}

function regionsAreSimilar(a: Region, b: Region, threshold = 0.01): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < threshold &&
    Math.abs(a.longitude - b.longitude) < threshold &&
    Math.abs(a.latitudeDelta - b.latitudeDelta) < threshold * 5 &&
    Math.abs(a.longitudeDelta - b.longitudeDelta) < threshold * 5
  );
}

export function PropertyMapView({ properties, onSearchArea, focusRegion }: PropertyMapViewProps) {
  const colors = useColors();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapTimedOut, setMapTimedOut] = useState(false);
  const [mapRetryKey, setMapRetryKey] = useState(0);
  const [trackMarkerChanges, setTrackMarkerChanges] = useState(Platform.OS === "android");
  const googleMapsConfigured = Constants.expoConfig?.extra?.googleMapsConfigured !== false;

  useEffect(() => {
    setThumbError(false);
  }, [selectedId]);

  useEffect(() => {
    if (mapReady || !googleMapsConfigured) return;
    const timeout = setTimeout(() => setMapTimedOut(true), 8000);
    return () => clearTimeout(timeout);
  }, [googleMapsConfigured, mapReady]);

  const mappableProperties = useMemo(
    () =>
      properties.filter(
        (p) => isValidCoordinate(p.lat, p.lng)
      ),
    [properties]
  );

  useEffect(() => {
    if (Platform.OS !== "android" || mappableProperties.length === 0) return;
    // Android can snapshot a custom marker before its local image is painted.
    // Track briefly after each result-set change, then stop for map performance.
    setTrackMarkerChanges(true);
    const timeout = setTimeout(() => setTrackMarkerChanges(false), 1200);
    return () => clearTimeout(timeout);
  }, [mappableProperties]);

  useEffect(() => {
    if (!focusRegion || !mapReady || !isValidRegion(focusRegion)) return;
    // Android's onMapReady can fire before the map has completed its first
    // layout. A short delay prevents its initial camera update being dropped.
    const timeout = setTimeout(
      () => mapRef.current?.animateToRegion(focusRegion, 700),
      Platform.OS === "android" ? 350 : 0,
    );
    setRegion(focusRegion);
    committedRegionRef.current = focusRegion;
    onSearchArea?.(regionToMapBBox(focusRegion), "focus");
    return () => clearTimeout(timeout);
  }, [focusRegion, mapReady, onSearchArea]);

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [showSearchButton, setShowSearchButton] = useState(false);
  const committedRegionRef = useRef<Region>(DEFAULT_REGION);
  const userPannedMapRef = useRef(false);

  const handleRegionChangeComplete = useCallback((newRegion: Region) => {
    setRegion(newRegion);
    if (userPannedMapRef.current) {
      setSelectedId(null);
      userPannedMapRef.current = false;
    }
    if (!regionsAreSimilar(newRegion, committedRegionRef.current)) {
      setShowSearchButton(true);
    }
  }, []);

  const handleSearchArea = useCallback(() => {
    setShowSearchButton(false);
    committedRegionRef.current = region;
    onSearchArea?.(regionToMapBBox(region), "user");
  }, [region, onSearchArea]);

  const selectedProperty = mappableProperties.find((p) => p.id === selectedId);
  const selectedPreview = selectedProperty
    ? (selectedProperty.images?.[0] ?? selectedProperty.videoPosters?.[0] ?? selectedProperty.image)
    : null;

  const handleRetryMap = useCallback(() => {
    setMapReady(false);
    setMapTimedOut(false);
    setMapRetryKey((value) => value + 1);
  }, []);

  return (
    <View style={styles.container}>
      {googleMapsConfigured && (
        <MapView
          key={mapRetryKey}
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={DEFAULT_REGION}
          showsUserLocation
          showsMyLocationButton
          onMapReady={() => { setMapReady(true); setMapTimedOut(false); }}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPanDrag={() => { userPannedMapRef.current = true; }}
          onPress={() => setSelectedId(null)}
        >
        {mappableProperties.map((property) => {
          const coordinate = {
            latitude: Number(property.lat),
            longitude: Number(property.lng),
          };
          return (
            <Marker
              key={property.id}
              coordinate={coordinate}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={trackMarkerChanges}
              onPress={(event) => {
                event.stopPropagation();
                setSelectedId(property.id);
              }}
            >
              <Image source={PROPERTY_PIN_ICON} style={styles.propertyPin} resizeMode="contain" />
            </Marker>
          );
        })}
        </MapView>
      )}

      {!googleMapsConfigured && (
        <View style={[styles.mapState, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="map" size={28} color={colors.primary} />
          <Text style={[styles.mapStateTitle, { color: colors.foreground }]}>Google Maps is unavailable in this build</Text>
          <Text style={[styles.mapStateText, { color: colors.mutedForeground }]}>
            Install a new native build with the Google Maps API key configured to view property locations.
          </Text>
        </View>
      )}

      {googleMapsConfigured && !mapReady && mapTimedOut && (
        <View style={[styles.mapState, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="refresh-cw" size={28} color={colors.primary} />
          <Text style={[styles.mapStateTitle, { color: colors.foreground }]}>Google Maps is taking longer to load</Text>
          <Text style={[styles.mapStateText, { color: colors.mutedForeground }]}>
            Check your connection, then retry the browse map.
          </Text>
          <Pressable onPress={handleRetryMap} style={[styles.mapRetryButton, { backgroundColor: colors.primary }]}>
            <Text style={[styles.mapRetryText, { color: colors.primaryForeground }]}>Retry map</Text>
          </Pressable>
        </View>
      )}

      {googleMapsConfigured && !mapReady && !mapTimedOut && (
        <View pointerEvents="none" style={[styles.mapLoading, { backgroundColor: colors.background + "D9" }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.mapLoadingText, { color: colors.mutedForeground }]}>Loading map…</Text>
        </View>
      )}

      {showSearchButton && onSearchArea && (
        <View style={styles.searchButtonContainer}>
          <Pressable
            style={[
              styles.searchButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
            onPress={handleSearchArea}
          >
            <Feather name="search" size={14} color={colors.primaryForeground} />
            <Text style={[styles.searchButtonText, { color: colors.primaryForeground }]}>
              Search this area
            </Text>
          </Pressable>
        </View>
      )}

      {googleMapsConfigured && mapReady && mappableProperties.length === 0 && (
        <View style={[styles.emptyOverlay, { backgroundColor: colors.muted }]}>
          <Feather name="map-pin" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No properties with locations
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Properties with saved coordinates will appear as pins on the map
          </Text>
        </View>
      )}

      {selectedProperty && (
        <Pressable
          style={[
            styles.calloutCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() =>
            router.push({
              pathname: "/property/[id]",
              params: { id: selectedProperty.id },
            })
          }
        >
          {selectedPreview && !thumbError ? (
            <Image
              source={{ uri: getImageUrl(selectedPreview) }}
              style={styles.calloutThumb}
              resizeMode="cover"
              onError={() => setThumbError(true)}
            />
          ) : (
            <View
              style={[styles.calloutThumbFallback, { backgroundColor: colors.muted }]}
            >
              <Feather name="map-pin" size={22} color={colors.mutedForeground} />
            </View>
          )}
          <View style={styles.calloutContent}>
            <Text
              style={[styles.calloutTitle, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {selectedProperty.title}
            </Text>
            <Text
              style={[styles.calloutAddress, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {selectedProperty.address}
            </Text>
            <Text style={[styles.calloutPrice, { color: colors.primary }]}>
              {getPriceLabel(selectedProperty)}
            </Text>
          </View>
          <View style={[styles.calloutArrow, { backgroundColor: colors.primary }]}>
            <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
  propertyPin: {
    width: 38,
    height: 48,
  },
  searchButtonContainer: {
    position: "absolute",
    top: 16,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  searchButtonText: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
  },
  emptyOverlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapLoadingText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
  },
  mapState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 28,
    borderWidth: 1,
  },
  mapStateTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    textAlign: "center",
  },
  mapStateText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  mapRetryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  mapRetryText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 13,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
  },
  calloutCard: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  calloutThumb: {
    width: 80,
    alignSelf: "stretch",
  },
  calloutThumbFallback: {
    width: 80,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  calloutContent: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  calloutTitle: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
  },
  calloutAddress: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
  },
  calloutPrice: {
    fontSize: 14,
    fontFamily: "Outfit_700Bold",
  },
  calloutArrow: {
    width: 48,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
});
