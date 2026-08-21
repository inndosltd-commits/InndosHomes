import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl } from "@/utils/api";
import Constants from "expo-constants";

interface PropertyLocationMapProps {
  lat: string;
  lng: string;
  title: string;
}

interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
  end: { latitude: number; longitude: number } | null;
}

interface RouteInfo {
  polyline: string;
  distance: string;
  duration: string;
  steps: RouteStep[];
}

function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 });
  }
  return points;
}

function distanceInMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const rad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = rad(to.latitude - from.latitude);
  const dLng = rad(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

/** Arrival threshold in metres */
const ARRIVAL_THRESHOLD = 50;

export function PropertyLocationMap({ lat, lng, title }: PropertyLocationMapProps) {
  const colors = useColors();
  const { token } = useAuth();
  const [sharing, setSharing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [mapTimedOut, setMapTimedOut] = useState(false);
  const [mapRetryKey, setMapRetryKey] = useState(0);
  const mapRef = useRef<MapView>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const googleMapsConfigured = Constants.expoConfig?.extra?.googleMapsConfigured !== false;
  const latitude = Number(lat);
  const longitude = Number(lng);
  const validLocation = Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

  const region = {
    latitude,
    longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  useEffect(() => {
    if (mapReady || !googleMapsConfigured) return;
    const timeout = setTimeout(() => setMapTimedOut(true), 8000);
    return () => clearTimeout(timeout);
  }, [googleMapsConfigured, mapReady]);

  const destination = { latitude, longitude };
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;

  const handleOpenMaps = async () => {
    try {
      await Linking.openURL(mapsUrl);
    } catch {
      Alert.alert("Google Maps unavailable", "Could not open Google Maps on this device.");
    }
  };

  const handleRetryMap = () => {
    setMapReady(false);
    setMapTimedOut(false);
    setMapRetryKey((value) => value + 1);
  };

  useEffect(() => () => {
    subscriptionRef.current?.remove();
  }, []);

  const stopNavigation = () => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setIsNavigating(false);
    setArrived(false);
    setRoute(null);
    setCurrentLocation(null);
    setActiveStep(0);
  };

  const handleDirections = async () => {
    if (isNavigating || arrived) {
      stopNavigation();
      return;
    }
    if (!token) {
      Alert.alert(
        "Sign in required",
        "Sign in to use live in-app directions.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open in Google Maps", onPress: handleOpenMaps },
        ]
      );
      return;
    }
    setLoadingRoute(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Location access needed",
          "Allow location access to receive live directions inside INNDOS.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open in Google Maps", onPress: handleOpenMaps },
          ]
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const origin = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const response = await fetch(
        `${getApiBaseUrl()}/api/maps/directions?origin=${origin.latitude},${origin.longitude}&destination=${latitude},${longitude}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await response.json() as RouteInfo & { error?: string };
      if (!response.ok || !json.polyline) throw new Error(json.error ?? "No driving route is available");
      const coordinates = decodePolyline(json.polyline);
      if (coordinates.length < 2) throw new Error("No driving route is available");

      setRoute(json);
      setCurrentLocation(origin);
      setIsNavigating(true);
      setArrived(false);
      setActiveStep(0);
      mapRef.current?.fitToCoordinates([...coordinates, origin], {
        edgePadding: { top: 56, right: 36, bottom: 110, left: 36 },
        animated: true,
      });
      subscriptionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 5000 },
        (nextPosition) => {
          const next = { latitude: nextPosition.coords.latitude, longitude: nextPosition.coords.longitude };
          setCurrentLocation(next);
          mapRef.current?.animateCamera(
            { center: next, zoom: 16 },
            { duration: 600 }
          );

          // Check arrival at destination
          const distToDest = distanceInMeters(next, destination);
          if (distToDest < ARRIVAL_THRESHOLD) {
            setArrived(true);
            subscriptionRef.current?.remove();
            subscriptionRef.current = null;
            return;
          }

          setActiveStep((stepIndex) => {
            const stepEnd = json.steps?.[stepIndex]?.end;
            return stepEnd && distanceInMeters(next, stepEnd) < 45
              ? Math.min(stepIndex + 1, Math.max(0, json.steps.length - 1))
              : stepIndex;
          });
        }
      );
    } catch (error) {
      Alert.alert(
        "Directions unavailable",
        error instanceof Error ? error.message : "Please try again.",
        [
          { text: "OK", style: "cancel" },
          { text: "Open in Google Maps", onPress: handleOpenMaps },
        ]
      );
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await Share.share({
        title,
        message: `${title}\n${mapsUrl}`,
        url: mapsUrl,
      });
    } catch {
    } finally {
      setSharing(false);
    }
  };

  if (!validLocation) {
    return (
      <View style={[styles.invalidLocation, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Feather name="map-pin" size={20} color={colors.mutedForeground} />
        <Text style={[styles.invalidLocationText, { color: colors.mutedForeground }]}>This property does not have a valid map location yet.</Text>
      </View>
    );
  }

  const routeCoordinates = route ? decodePolyline(route.polyline) : [];
  const currentStep = route?.steps[activeStep];
  // Progress: fraction of steps completed
  const stepCount = route?.steps.length ?? 0;
  const progressFraction = stepCount > 0 ? activeStep / stepCount : 0;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>LOCATION</Text>
      <View style={[styles.mapContainer, { borderRadius: 12 }]}>
        {googleMapsConfigured && (
          <MapView
            key={mapRetryKey}
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={region}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            pointerEvents="none"
            onMapReady={() => { setMapReady(true); setMapTimedOut(false); }}
          >
            <Marker coordinate={{ latitude, longitude }} title={title} />
            {routeCoordinates.length > 1 && (
              <Polyline coordinates={routeCoordinates} strokeColor={colors.primary} strokeWidth={5} />
            )}
            {currentLocation && (
              <Marker coordinate={currentLocation} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={[styles.userDot, { borderColor: colors.card, backgroundColor: colors.primary }]} />
              </Marker>
            )}
          </MapView>
        )}

        {/* Loading state */}
        {googleMapsConfigured && !mapReady && !mapTimedOut ? (
          <View pointerEvents="none" style={[styles.mapState, { backgroundColor: colors.card + "E8" }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.mapStateText, { color: colors.mutedForeground }]}>Loading Google Maps…</Text>
          </View>
        ) : null}

        {/* No Maps key */}
        {!googleMapsConfigured ? (
          <View style={[styles.mapState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="map" size={22} color={colors.primary} />
            <Text style={[styles.mapStateTitle, { color: colors.foreground }]}>Google Maps needs a new build</Text>
            <Text style={[styles.mapStateText, { color: colors.mutedForeground }]}>
              This app build does not contain the Google Maps key.
            </Text>
          </View>
        ) : null}

        {/* Timeout state */}
        {googleMapsConfigured && !mapReady && mapTimedOut ? (
          <View style={[styles.mapState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="refresh-cw" size={22} color={colors.primary} />
            <Text style={[styles.mapStateTitle, { color: colors.foreground }]}>Google Maps is taking longer to load</Text>
            <Text style={[styles.mapStateText, { color: colors.mutedForeground }]}>
              Check your connection, then retry this property map.
            </Text>
            <Pressable onPress={handleRetryMap} style={[styles.mapRetryButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.mapRetryText, { color: colors.primaryForeground }]}>Retry map</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Arrived banner */}
        {arrived && (
          <View style={[styles.arrivedCard, { backgroundColor: "#16a34a" }]}>
            <Feather name="check-circle" size={16} color="#fff" />
            <View style={styles.arrivedTextCol}>
              <Text style={styles.arrivedTitle}>You have arrived!</Text>
              <Text style={styles.arrivedSub}>{title}</Text>
            </View>
            <Pressable onPress={stopNavigation} hitSlop={8}>
              <Feather name="x" size={16} color="#fff" />
            </Pressable>
          </View>
        )}

        {/* Live navigation card */}
        {isNavigating && !arrived && route && (
          <View style={[styles.navigationCard, { backgroundColor: colors.card }]}>
            <View style={styles.navigationTop}>
              <Feather name="navigation" size={14} color={colors.primary} />
              <Text style={[styles.navigationTitle, { color: colors.foreground }]}>Live directions</Text>
              <Text style={[styles.navigationStats, { color: colors.mutedForeground }]}>
                {route.distance} · {route.duration}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${Math.round(progressFraction * 100)}%` },
                ]}
              />
            </View>

            {/* Current instruction */}
            <Text style={[styles.instruction, { color: colors.foreground }]} numberOfLines={2}>
              {currentStep?.instruction || "Continue to your destination"}
            </Text>
            {currentStep?.distance ? (
              <Text style={[styles.stepDistance, { color: colors.mutedForeground }]}>
                {currentStep.distance} · turn {activeStep + 1} of {stepCount}
              </Text>
            ) : null}
          </View>
        )}

        {/* Button row */}
        <View style={styles.buttonsRow}>
          {/* Share (secondary) */}
          <Pressable
            onPress={handleShare}
            style={[styles.secondaryBtn, { backgroundColor: colors.card }]}
            hitSlop={4}
          >
            <Feather name="share-2" size={13} color={colors.foreground} />
          </Pressable>

          {/* Open in Google Maps (secondary, small text link) */}
          {!isNavigating && !arrived && (
            <Pressable
              onPress={handleOpenMaps}
              style={[styles.secondaryBtn, { backgroundColor: colors.card }]}
              hitSlop={4}
            >
              <Feather name="external-link" size={13} color={colors.mutedForeground} />
              <Text style={[styles.secondaryBtnText, { color: colors.mutedForeground }]}>Maps</Text>
            </Pressable>
          )}

          {/* Primary: In-app directions */}
          <Pressable
            onPress={handleDirections}
            disabled={loadingRoute}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: arrived
                  ? "#16a34a"
                  : isNavigating
                  ? colors.destructive
                  : colors.primary,
                opacity: loadingRoute ? 0.65 : 1,
              },
            ]}
          >
            {loadingRoute ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Feather
                name={arrived ? "check" : isNavigating ? "x" : "navigation"}
                size={13}
                color={colors.primaryForeground}
              />
            )}
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
              {arrived ? "Arrived" : isNavigating ? "End" : "Directions"}
            </Text>
          </Pressable>
        </View>
      </View>
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
  mapContainer: {
    height: 280,
    overflow: "hidden",
  },
  invalidLocation: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  invalidLocationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
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
  buttonsRow: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  secondaryBtnText: {
    fontSize: 11,
    fontFamily: "Outfit_500Medium",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
  },
  navigationCard: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 10,
    borderRadius: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  navigationTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  navigationTitle: { fontSize: 12, fontFamily: "Outfit_700Bold" },
  navigationStats: { marginLeft: "auto", fontSize: 12, fontFamily: "Outfit_500Medium" },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginVertical: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  instruction: { fontSize: 14, fontFamily: "Outfit_600SemiBold", lineHeight: 19 },
  stepDistance: { fontSize: 11, fontFamily: "Outfit_400Regular", marginTop: 2 },
  userDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
  arrivedCard: {
    position: "absolute",
    left: 10,
    right: 10,
    top: 10,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  arrivedTextCol: { flex: 1 },
  arrivedTitle: { fontSize: 13, fontFamily: "Outfit_700Bold", color: "#fff" },
  arrivedSub: { fontSize: 11, fontFamily: "Outfit_400Regular", color: "rgba(255,255,255,0.85)" },
});
